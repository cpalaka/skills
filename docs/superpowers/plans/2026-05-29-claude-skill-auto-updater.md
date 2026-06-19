# Claude Skill Auto-Updater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a manually-invoked meta-skill that detects and installs updates for every installed Claude skill across both ecosystems — auto-applying trusted sources and confirming the rest.

**Architecture:** A dependency-free Python engine (`skillsync.py`) does the deterministic work — detect updates (plugins via local marketplace manifests; agent-skills via shallow sparse git clone + `diff -r`), and apply a single update. `SKILL.md` orchestrates: run detect, auto-apply trusted, present community updates for confirmation via `AskUserQuestion`, apply chosen, report. A `trusted-sources.json` allowlist decides trusted vs. confirm.

**Tech Stack:** Python 3 (stdlib only: `argparse`, `json`, `subprocess`, `fnmatch`, `pathlib`, `tempfile`, `shutil`, `os`); `pytest` for tests; `git`, `claude plugin`, and `npx skills@latest` as external CLIs.

---

## File Structure

| File | Responsibility |
|---|---|
| `skill/scripts/skillsync.py` | Engine. Subcommands `detect`, `apply-plugin`, `apply-skills`, `diff-skill`. Pure logic + thin subprocess wrappers + argparse `main()`. |
| `skill/scripts/test_skillsync.py` | pytest unit tests (pure logic) + integration tests (diff/clone against local fixtures, no network). |
| `skill/trusted-sources.json` | Allowlist: trusted plugin marketplaces + agent-skill repo globs. |
| `skill/SKILL.md` | Orchestrator prompt: run flow, confirm gate, report. |
| `~/.claude/skills/skill-updater` | Symlink → `skill/` so Claude Code loads it. |
| `README.md` | Update status to "implemented". |

All paths below are relative to the project root `~/Claude/claude-skill-auto-updater/` unless absolute.

**Run tests with:** `cd ~/Claude/claude-skill-auto-updater/skill/scripts && python3 -m pytest test_skillsync.py -v`

---

### Task 1: Module skeleton, constants, and config loading

**Files:**
- Create: `skill/scripts/skillsync.py`
- Create: `skill/scripts/test_skillsync.py`

- [ ] **Step 1: Write the failing test**

Create `skill/scripts/test_skillsync.py`:

```python
import json
from pathlib import Path
import skillsync


def test_load_trusted_config(tmp_path):
    cfg = tmp_path / "trusted-sources.json"
    cfg.write_text(json.dumps({"marketplaces": ["claude-plugins-official"],
                               "repos": ["anthropics/*", "vercel-labs/*"]}))
    marketplaces, repos = skillsync.load_trusted_config(cfg)
    assert marketplaces == ["claude-plugins-official"]
    assert repos == ["anthropics/*", "vercel-labs/*"]


def test_is_trusted_marketplace():
    assert skillsync.is_trusted_marketplace("claude-plugins-official", ["claude-plugins-official"])
    assert not skillsync.is_trusted_marketplace("karpathy-skills", ["claude-plugins-official"])


def test_is_trusted_repo_glob():
    repos = ["anthropics/*", "vercel-labs/*"]
    assert skillsync.is_trusted_repo("anthropics/skills", repos)
    assert skillsync.is_trusted_repo("vercel-labs/agent-skills", repos)
    assert not skillsync.is_trusted_repo("mattpocock/skills", repos)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'skillsync'`.

- [ ] **Step 3: Write minimal implementation**

Create `skill/scripts/skillsync.py`:

```python
#!/usr/bin/env python3
"""skillsync.py — detect and apply updates for installed Claude skills.

Two ecosystems:
  - Claude Code plugins (claude plugin CLI; ~/.claude/plugins/installed_plugins.json)
  - npx-skills agent-skills (~/.agents/.skill-lock.json, ~/.agents/skills/)

Subcommands:
  detect [--refresh] [--config PATH]   -> JSON report on stdout
  apply-plugin <plugin_id>             -> claude plugin update <id> --scope user
  apply-skills <name> [<name> ...]     -> npx skills@latest update <names> -g -y
  diff-skill <name> [--config PATH]    -> unified diff of local vs upstream skill folder
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HOME = Path.home()
PLUGINS_INSTALLED = HOME / ".claude/plugins/installed_plugins.json"
MARKETPLACES_DIR = HOME / ".claude/plugins/marketplaces"
SKILL_LOCK = HOME / ".agents/.skill-lock.json"
AGENT_SKILLS_DIR = HOME / ".agents/skills"
DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "trusted-sources.json"


# ---------- trusted-source classification ----------
def load_trusted_config(config_path):
    data = json.loads(Path(config_path).read_text())
    return data.get("marketplaces", []), data.get("repos", [])


def is_trusted_marketplace(marketplace, trusted_marketplaces):
    return marketplace in set(trusted_marketplaces)


def is_trusted_repo(repo, trusted_repos):
    return any(fnmatch.fnmatch(repo, pat) for pat in trusted_repos)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add skill/scripts/skillsync.py skill/scripts/test_skillsync.py
git commit -m "feat: skillsync module skeleton + trusted-source classification"
```

---

### Task 2: Plugin update decision logic

**Files:**
- Modify: `skill/scripts/skillsync.py` (append functions)
- Modify: `skill/scripts/test_skillsync.py` (append tests)

- [ ] **Step 1: Write the failing test**

Append to `test_skillsync.py`:

```python
def test_decide_plugin_update_version_bumped():
    upd, label = skillsync.decide_plugin_update("1.0.0", "abc", "1.1.0", "./")
    assert upd is True
    assert label == "1.1.0"


def test_decide_plugin_update_version_same():
    upd, label = skillsync.decide_plugin_update("2.0.0", None, "2.0.0", "./plugins/x")
    assert upd is False
    assert label is None


def test_decide_plugin_update_sha_pinned_changed():
    # superpowers case: manifest has no version, pins a sha
    src = {"source": "url", "url": "https://github.com/obra/superpowers.git",
           "sha": "f2cbfbefebbfef77321e4c9abc9e949826bea9d7"}
    upd, label = skillsync.decide_plugin_update(
        "5.1.0", "917e5f53b16b115b70a3a355ed5f4993b9f8b73d", None, src)
    assert upd is True
    assert label == "f2cbfbefebbf"  # first 12 chars of the new sha


def test_decide_plugin_update_sha_pinned_same():
    src = {"source": "url", "url": "https://x.git", "sha": "deadbeef" * 5}
    upd, label = skillsync.decide_plugin_update("0", "deadbeef" * 5, None, src)
    assert upd is False
    assert label is None


def test_find_manifest_entry():
    manifest = {"plugins": [{"name": "a", "version": "1"}, {"name": "b", "version": "2"}]}
    assert skillsync.find_manifest_entry(manifest, "b") == {"name": "b", "version": "2"}
    assert skillsync.find_manifest_entry(manifest, "z") is None
    assert skillsync.find_manifest_entry(None, "a") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -k plugin_update -v`
Expected: FAIL — `AttributeError: module 'skillsync' has no attribute 'decide_plugin_update'`.

- [ ] **Step 3: Write minimal implementation**

Append to `skillsync.py`:

```python
# ---------- plugin update decision ----------
def decide_plugin_update(installed_version, installed_sha, manifest_version, manifest_source):
    """Return (update_available: bool, available_label: str|None).

    If the manifest carries a version, compare versions. Otherwise the plugin is
    SHA-pinned (e.g. superpowers) — compare the manifest source sha to the installed
    gitCommitSha.
    """
    if manifest_version is not None:
        if manifest_version != installed_version:
            return True, manifest_version
        return False, None
    msha = manifest_source.get("sha") if isinstance(manifest_source, dict) else None
    if msha and installed_sha and msha != installed_sha:
        return True, msha[:12]
    return False, None


def read_marketplace_manifest(marketplace):
    p = MARKETPLACES_DIR / marketplace / ".claude-plugin" / "marketplace.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())


def find_manifest_entry(manifest, plugin_name):
    if not manifest:
        return None
    for entry in manifest.get("plugins", []):
        if entry.get("name") == plugin_name:
            return entry
    return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -v`
Expected: PASS (8 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add skill/scripts/skillsync.py skill/scripts/test_skillsync.py
git commit -m "feat: plugin update decision (version + sha-pinned) and manifest reading"
```

---

### Task 3: Agent-skill helpers (path, command builders, repo grouping)

**Files:**
- Modify: `skill/scripts/skillsync.py` (append)
- Modify: `skill/scripts/test_skillsync.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `test_skillsync.py`:

```python
def test_skill_folder_from_path():
    assert skillsync.skill_folder_from_path("skills/productivity/caveman/SKILL.md") == "skills/productivity/caveman"
    assert skillsync.skill_folder_from_path("SKILL.md") == ""


def test_plugin_update_cmd():
    assert skillsync.plugin_update_cmd("superpowers@claude-plugins-official") == [
        "claude", "plugin", "update", "superpowers@claude-plugins-official", "--scope", "user"]


def test_skills_update_cmd():
    assert skillsync.skills_update_cmd(["caveman", "tdd"]) == [
        "npx", "skills@latest", "update", "caveman", "tdd", "-g", "-y"]


def test_repo_from_url():
    assert skillsync.repo_from_url("https://github.com/mattpocock/skills.git") == "mattpocock/skills"
    assert skillsync.repo_from_url("https://github.com/vercel-labs/agent-skills") == "vercel-labs/agent-skills"


def test_group_skills_by_repo_skips_legacy():
    lock_skills = {
        "caveman": {"sourceUrl": "https://github.com/mattpocock/skills.git",
                    "skillPath": "skills/productivity/caveman/SKILL.md"},
        "tdd": {"sourceUrl": "https://github.com/mattpocock/skills.git",
                "skillPath": "skills/engineering/tdd/SKILL.md"},
        "legacy": {"source": "x/y"},  # no skillPath/sourceUrl -> skipped
    }
    groups = skillsync.group_skills_by_repo(lock_skills)
    assert set(groups.keys()) == {"https://github.com/mattpocock/skills.git"}
    items = sorted(groups["https://github.com/mattpocock/skills.git"])
    assert ("caveman", "skills/productivity/caveman", None) in items
    assert ("tdd", "skills/engineering/tdd", None) in items
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -k "skill_folder or update_cmd or repo_from or group_skills" -v`
Expected: FAIL — `AttributeError: module 'skillsync' has no attribute 'skill_folder_from_path'`.

- [ ] **Step 3: Write minimal implementation**

Append to `skillsync.py`:

```python
# ---------- agent-skill helpers ----------
def skill_folder_from_path(skill_path):
    """'skills/productivity/caveman/SKILL.md' -> 'skills/productivity/caveman'."""
    return os.path.dirname(skill_path)


def plugin_update_cmd(plugin_id):
    return ["claude", "plugin", "update", plugin_id, "--scope", "user"]


def skills_update_cmd(names):
    return ["npx", "skills@latest", "update", *names, "-g", "-y"]


def repo_from_url(source_url):
    """'https://github.com/mattpocock/skills.git' -> 'mattpocock/skills'."""
    s = source_url.rstrip("/")
    if s.endswith(".git"):
        s = s[:-4]
    parts = s.split("/")
    return "/".join(parts[-2:]) if len(parts) >= 2 else s


def group_skills_by_repo(lock_skills):
    """lock_skills: dict name->entry. Returns {sourceUrl: [(name, folder, ref)]}.

    Entries without skillPath/sourceUrl (legacy) are skipped here; detect_skills
    surfaces them separately as 'manual update only'.
    """
    groups = {}
    for name, entry in lock_skills.items():
        skill_path = entry.get("skillPath")
        source_url = entry.get("sourceUrl")
        if not skill_path or not source_url:
            continue
        folder = skill_folder_from_path(skill_path)
        groups.setdefault(source_url, []).append((name, folder, entry.get("ref")))
    return groups
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -v`
Expected: PASS (13 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add skill/scripts/skillsync.py skill/scripts/test_skillsync.py
git commit -m "feat: agent-skill path/command helpers and repo grouping"
```

---

### Task 4: Directory diffing (`diff_dirs` + `summarize` via the brief output)

**Files:**
- Modify: `skill/scripts/skillsync.py` (append)
- Modify: `skill/scripts/test_skillsync.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `test_skillsync.py`:

```python
def test_diff_dirs_identical(tmp_path):
    a = tmp_path / "a"; b = tmp_path / "b"
    a.mkdir(); b.mkdir()
    (a / "SKILL.md").write_text("hello\n")
    (b / "SKILL.md").write_text("hello\n")
    changed, diffstat, full = skillsync.diff_dirs(a, b)
    assert changed is False
    assert full == ""


def test_diff_dirs_changed(tmp_path):
    local = tmp_path / "local"; up = tmp_path / "up"
    local.mkdir(); up.mkdir()
    (local / "SKILL.md").write_text("old line\n")
    (up / "SKILL.md").write_text("old line\nnew line\n")
    changed, diffstat, full = skillsync.diff_dirs(up, local)
    assert changed is True
    assert "1 file" in diffstat
    assert "+1" in diffstat
    assert "new line" in full
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -k diff_dirs -v`
Expected: FAIL — `AttributeError: module 'skillsync' has no attribute 'diff_dirs'`.

- [ ] **Step 3: Write minimal implementation**

Append to `skillsync.py`:

```python
# ---------- diffing ----------
def diff_dirs(upstream_dir, local_dir):
    """Return (changed: bool, diffstat: str, full_diff: str).

    `diff` exit codes: 0 = same, 1 = differences, 2 = trouble (e.g. missing dir).
    Raises RuntimeError on exit code 2.
    """
    brief = subprocess.run(
        ["diff", "-rq", str(local_dir), str(upstream_dir)],
        capture_output=True, text=True)
    if brief.returncode == 2:
        raise RuntimeError(brief.stderr.strip() or "diff failed")
    changed = brief.returncode == 1
    changed_files = len([ln for ln in brief.stdout.splitlines() if ln.strip()])
    full = subprocess.run(
        ["diff", "-ruN", str(local_dir), str(upstream_dir)],
        capture_output=True, text=True)
    added = sum(1 for ln in full.stdout.splitlines()
                if ln.startswith("+") and not ln.startswith("+++"))
    removed = sum(1 for ln in full.stdout.splitlines()
                  if ln.startswith("-") and not ln.startswith("---"))
    diffstat = f"{changed_files} file(s), +{added}/-{removed} lines"
    return changed, diffstat, (full.stdout if changed else "")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -v`
Expected: PASS (15 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add skill/scripts/skillsync.py skill/scripts/test_skillsync.py
git commit -m "feat: directory diffing with diffstat summary"
```

---

### Task 5: Shallow sparse clone of skill folders (offline-testable)

**Files:**
- Modify: `skill/scripts/skillsync.py` (append)
- Modify: `skill/scripts/test_skillsync.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `test_skillsync.py` (uses a local git repo as the "remote" — no network):

```python
import subprocess as _sp


def _make_local_repo(root):
    """Create a git repo at root with two skill folders; return its path."""
    root.mkdir(parents=True, exist_ok=True)
    (root / "skills/eng/tdd").mkdir(parents=True)
    (root / "skills/prod/caveman").mkdir(parents=True)
    (root / "skills/eng/tdd/SKILL.md").write_text("tdd v2\n")
    (root / "skills/prod/caveman/SKILL.md").write_text("caveman v2\n")
    env = {"GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t",
           "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t", "PATH": os.environ["PATH"]}
    _sp.run(["git", "init", "-q"], cwd=root, check=True, env=env)
    _sp.run(["git", "add", "-A"], cwd=root, check=True, env=env)
    _sp.run(["git", "commit", "-qm", "init"], cwd=root, check=True, env=env)
    return root


def test_clone_skill_folders(tmp_path):
    remote = _make_local_repo(tmp_path / "remote")
    dest = tmp_path / "dest"
    skillsync.clone_skill_folders(str(remote), ["skills/eng/tdd", "skills/prod/caveman"], None, dest)
    assert (dest / "skills/eng/tdd/SKILL.md").read_text() == "tdd v2\n"
    assert (dest / "skills/prod/caveman/SKILL.md").read_text() == "caveman v2\n"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -k clone_skill -v`
Expected: FAIL — `AttributeError: module 'skillsync' has no attribute 'clone_skill_folders'`.

- [ ] **Step 3: Write minimal implementation**

Append to `skillsync.py`:

```python
# ---------- cloning ----------
def clone_skill_folders(source_url, folders, ref, dest):
    """Shallow, blob-filtered, sparse clone of `folders` from source_url into dest."""
    cmd = ["git", "clone", "--depth", "1", "--filter=blob:none", "--no-checkout"]
    if ref:
        cmd += ["--branch", ref]
    cmd += [source_url, str(dest)]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    subprocess.run(["git", "-C", str(dest), "sparse-checkout", "init", "--cone"],
                   check=True, capture_output=True, text=True)
    subprocess.run(["git", "-C", str(dest), "sparse-checkout", "set", *folders],
                   check=True, capture_output=True, text=True)
    subprocess.run(["git", "-C", str(dest), "checkout"],
                   check=True, capture_output=True, text=True)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -v`
Expected: PASS (16 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add skill/scripts/skillsync.py skill/scripts/test_skillsync.py
git commit -m "feat: shallow sparse clone of skill folders"
```

---

### Task 6: `detect` orchestration (plugins + skills → JSON report)

**Files:**
- Modify: `skill/scripts/skillsync.py` (append)
- Modify: `skill/scripts/test_skillsync.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `test_skillsync.py` (tests the plugin branch against fixtures + monkeypatched paths; the skills branch is exercised end-to-end in Task 12's live smoke test):

```python
def test_detect_plugins_version_and_sha(tmp_path, monkeypatch):
    # Fixture installed_plugins.json
    installed = {"version": 2, "plugins": {
        "superpowers@claude-plugins-official": [
            {"version": "5.1.0", "gitCommitSha": "917e5f53b16b115b70a3a355ed5f4993b9f8b73d"}],
        "obsidian@obsidian-skills": [{"version": "1.0.1", "gitCommitSha": "ac93"}],
    }}
    inst_path = tmp_path / "installed_plugins.json"
    inst_path.write_text(json.dumps(installed))

    # Fixture marketplaces dir with two manifests
    mk = tmp_path / "marketplaces"
    (mk / "claude-plugins-official/.claude-plugin").mkdir(parents=True)
    (mk / "claude-plugins-official/.claude-plugin/marketplace.json").write_text(json.dumps(
        {"plugins": [{"name": "superpowers", "version": None,
                      "source": {"source": "url", "url": "https://github.com/obra/superpowers.git",
                                 "sha": "f2cbfbefebbfef77321e4c9abc9e949826bea9d7"}}]}))
    (mk / "obsidian-skills/.claude-plugin").mkdir(parents=True)
    (mk / "obsidian-skills/.claude-plugin/marketplace.json").write_text(json.dumps(
        {"plugins": [{"name": "obsidian", "version": "1.0.1", "source": "./"}]}))

    monkeypatch.setattr(skillsync, "PLUGINS_INSTALLED", inst_path)
    monkeypatch.setattr(skillsync, "MARKETPLACES_DIR", mk)

    report = {"plugins": [], "skills": [], "errors": []}
    skillsync.detect_plugins(report, ["claude-plugins-official"])

    by_id = {p["id"]: p for p in report["plugins"]}
    sp = by_id["superpowers@claude-plugins-official"]
    assert sp["updateAvailable"] is True
    assert sp["availableLabel"] == "f2cbfbefebbf"
    assert sp["trusted"] is True
    ob = by_id["obsidian@obsidian-skills"]
    assert ob["updateAvailable"] is False
    assert ob["trusted"] is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -k detect_plugins -v`
Expected: FAIL — `AttributeError: module 'skillsync' has no attribute 'detect_plugins'`.

- [ ] **Step 3: Write minimal implementation**

Append to `skillsync.py`:

```python
# ---------- detect orchestration ----------
def detect(refresh=False, config_path=DEFAULT_CONFIG):
    trusted_marketplaces, trusted_repos = load_trusted_config(config_path)
    report = {"plugins": [], "skills": [], "errors": []}
    if refresh:
        r = subprocess.run(["claude", "plugin", "marketplace", "update"],
                           capture_output=True, text=True)
        if r.returncode != 0:
            report["errors"].append("marketplace update failed: " + (r.stderr or "").strip()[:200])
    detect_plugins(report, trusted_marketplaces)
    detect_skills(report, trusted_repos)
    return report


def detect_plugins(report, trusted_marketplaces):
    if not PLUGINS_INSTALLED.exists():
        return
    data = json.loads(PLUGINS_INSTALLED.read_text())
    for plugin_key, installs in data.get("plugins", {}).items():
        name, _, marketplace = plugin_key.partition("@")
        manifest = read_marketplace_manifest(marketplace)
        entry = find_manifest_entry(manifest, name)
        if entry is None:
            report["errors"].append(f"no manifest entry for {plugin_key}")
            continue
        for inst in installs:
            upd, label = decide_plugin_update(
                inst.get("version"), inst.get("gitCommitSha"),
                entry.get("version"), entry.get("source"))
            report["plugins"].append({
                "id": plugin_key,
                "name": name,
                "marketplace": marketplace,
                "installedVersion": inst.get("version"),
                "availableLabel": label,
                "trusted": is_trusted_marketplace(marketplace, trusted_marketplaces),
                "updateAvailable": upd,
            })


def detect_skills(report, trusted_repos):
    if not SKILL_LOCK.exists():
        return
    lock = json.loads(SKILL_LOCK.read_text())
    skills = lock.get("skills", {})
    # Surface legacy entries (no skillPath/sourceUrl) as manual-only.
    for name, entry in skills.items():
        if not entry.get("skillPath") or not entry.get("sourceUrl"):
            report["skills"].append({
                "name": name, "source": entry.get("source"),
                "skillPath": None, "trusted": False, "updateAvailable": False,
                "diffstat": None, "note": "legacy entry (no skillPath) — update manually",
            })
    for source_url, items in group_skills_by_repo(skills).items():
        repo = repo_from_url(source_url)
        trusted = is_trusted_repo(repo, trusted_repos)
        ref = items[0][2]
        tmp = Path(tempfile.mkdtemp(prefix="skillsync-"))
        try:
            clone_skill_folders(source_url, [f for (_, f, _) in items], ref, tmp)
            for (name, folder, _ref) in items:
                try:
                    changed, diffstat, _full = diff_dirs(tmp / folder, AGENT_SKILLS_DIR / name)
                except Exception as e:  # missing local folder, etc.
                    report["errors"].append(f"diff {name}: {e}")
                    continue
                report["skills"].append({
                    "name": name, "source": repo, "skillPath": folder,
                    "trusted": trusted, "updateAvailable": changed,
                    "diffstat": diffstat if changed else None, "note": None,
                })
        except subprocess.CalledProcessError as e:
            detail = (e.stderr or str(e))[:200]
            report["errors"].append(f"clone {repo} failed: {detail}")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -v`
Expected: PASS (17 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add skill/scripts/skillsync.py skill/scripts/test_skillsync.py
git commit -m "feat: detect orchestration for plugins and agent-skills"
```

---

### Task 7: Apply + diff-skill subcommands and `main()` dispatch

**Files:**
- Modify: `skill/scripts/skillsync.py` (append)
- Modify: `skill/scripts/test_skillsync.py` (append)

- [ ] **Step 1: Write the failing test**

Append to `test_skillsync.py`:

```python
def test_main_apply_plugin_invokes_cmd(monkeypatch):
    calls = []
    monkeypatch.setattr(skillsync.subprocess, "run", lambda cmd, **k: calls.append(cmd) or type("R", (), {"returncode": 0})())
    rc = skillsync.main(["apply-plugin", "superpowers@claude-plugins-official"])
    assert rc == 0
    assert calls[-1] == ["claude", "plugin", "update", "superpowers@claude-plugins-official", "--scope", "user"]


def test_main_apply_skills_invokes_cmd(monkeypatch):
    calls = []
    monkeypatch.setattr(skillsync.subprocess, "run", lambda cmd, **k: calls.append(cmd) or type("R", (), {"returncode": 0})())
    rc = skillsync.main(["apply-skills", "caveman", "tdd"])
    assert rc == 0
    assert calls[-1] == ["npx", "skills@latest", "update", "caveman", "tdd", "-g", "-y"]


def test_main_detect_prints_json(monkeypatch, capsys, tmp_path):
    cfg = tmp_path / "trusted-sources.json"
    cfg.write_text(json.dumps({"marketplaces": [], "repos": []}))
    monkeypatch.setattr(skillsync, "PLUGINS_INSTALLED", tmp_path / "none.json")
    monkeypatch.setattr(skillsync, "SKILL_LOCK", tmp_path / "none-lock.json")
    rc = skillsync.main(["detect", "--config", str(cfg)])
    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert out == {"plugins": [], "skills": [], "errors": []}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -k "main_apply or main_detect" -v`
Expected: FAIL — `AttributeError: module 'skillsync' has no attribute 'main'`.

- [ ] **Step 3: Write minimal implementation**

Append to `skillsync.py`:

```python
# ---------- apply + diff ----------
def apply_plugin(plugin_id):
    return subprocess.run(plugin_update_cmd(plugin_id)).returncode


def apply_skills(names):
    if not names:
        return 0
    return subprocess.run(skills_update_cmd(names)).returncode


def diff_skill(name, config_path=DEFAULT_CONFIG):
    lock = json.loads(SKILL_LOCK.read_text())
    entry = lock.get("skills", {}).get(name)
    if not entry or not entry.get("skillPath") or not entry.get("sourceUrl"):
        print(f"No updatable lock entry for skill: {name}", file=sys.stderr)
        return 1
    folder = skill_folder_from_path(entry["skillPath"])
    tmp = Path(tempfile.mkdtemp(prefix="skillsync-diff-"))
    try:
        clone_skill_folders(entry["sourceUrl"], [folder], entry.get("ref"), tmp)
        _changed, _stat, full = diff_dirs(tmp / folder, AGENT_SKILLS_DIR / name)
        print(full if full.strip() else "(no differences)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return 0


# ---------- CLI ----------
def main(argv=None):
    parser = argparse.ArgumentParser(prog="skillsync.py")
    sub = parser.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("detect", help="emit JSON update report")
    d.add_argument("--refresh", action="store_true", help="refresh marketplaces first")
    d.add_argument("--config", default=str(DEFAULT_CONFIG))

    ap = sub.add_parser("apply-plugin", help="update one plugin")
    ap.add_argument("plugin_id")

    ask = sub.add_parser("apply-skills", help="update named agent-skills")
    ask.add_argument("names", nargs="+")

    ds = sub.add_parser("diff-skill", help="print unified diff for one skill")
    ds.add_argument("name")
    ds.add_argument("--config", default=str(DEFAULT_CONFIG))

    args = parser.parse_args(argv)
    if args.cmd == "detect":
        print(json.dumps(detect(args.refresh, args.config), indent=2))
        return 0
    if args.cmd == "apply-plugin":
        return apply_plugin(args.plugin_id)
    if args.cmd == "apply-skills":
        return apply_skills(args.names)
    if args.cmd == "diff-skill":
        return diff_skill(args.name, args.config)
    return 1


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skill/scripts && python3 -m pytest test_skillsync.py -v`
Expected: PASS (20 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add skill/scripts/skillsync.py skill/scripts/test_skillsync.py
git commit -m "feat: apply-plugin/apply-skills/diff-skill subcommands + main() dispatch"
```

---

### Task 8: `trusted-sources.json` config file

**Files:**
- Create: `skill/trusted-sources.json`

- [ ] **Step 1: Write the config**

Create `skill/trusted-sources.json`:

```json
{
  "marketplaces": ["claude-plugins-official"],
  "repos": ["anthropics/*", "vercel-labs/*"]
}
```

- [ ] **Step 2: Verify the default config loads and resolves from the script's default path**

Run:
```bash
cd ~/Claude/claude-skill-auto-updater/skill/scripts
python3 -c "import skillsync; print(skillsync.load_trusted_config(skillsync.DEFAULT_CONFIG))"
```
Expected: `(['claude-plugins-official'], ['anthropics/*', 'vercel-labs/*'])`

- [ ] **Step 3: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add skill/trusted-sources.json
git commit -m "feat: default trusted-sources allowlist"
```

---

### Task 9: Author `SKILL.md` (orchestrator prompt)

**Files:**
- Create: `skill/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `skill/SKILL.md`:

```markdown
---
name: skill-updater
description: Check installed Claude skills for upstream updates and install them. Auto-applies updates from trusted sources (Anthropic, Vercel, official marketplace) and confirms community sources first. Covers both ecosystems — Claude Code plugins (claude plugin CLI) and npx-skills agent-skills (~/.agents). Use when the user says "check my skills for updates", "update my skills", "any skill updates?", or invokes /skill-updater. Does NOT touch hand-authored personal skills.
---

# Skill Updater

Detects and installs updates for every installed skill across both ecosystems. The
deterministic work is done by the bundled `scripts/skillsync.py`; you orchestrate.

**Engine path:** `~/.claude/skills/skill-updater/scripts/skillsync.py`
(`python3` must be on PATH; `git`, `claude`, and `npx` are used by the engine.)

## Steps

### 1. Announce and detect

Tell the user you're checking both ecosystems and that this fetches from GitHub
(marketplace metadata + a shallow clone per agent-skill repo). Then run:

```bash
python3 ~/.claude/skills/skill-updater/scripts/skillsync.py detect --refresh
```

Parse the JSON. It has three keys: `plugins`, `skills`, `errors`. Each plugin/skill
entry has `trusted` (bool), `updateAvailable` (bool), an identifier (`id` for plugins,
`name` for skills), `availableLabel`/`diffstat`, and an optional `note`.

If every entry has `updateAvailable: false` and `errors` is empty, report
"✓ All skills are up to date" and stop.

Always surface anything in `errors` (e.g. a repo that failed to clone) — report it but
keep going with what succeeded.

### 2. Auto-apply trusted updates

Collect the trusted entries with `updateAvailable: true`:

- **Plugins** (`trusted: true`): for each, run
  `python3 ~/.claude/skills/skill-updater/scripts/skillsync.py apply-plugin <id>`.
- **Skills** (`trusted: true`): collect their `name`s and run ONE batched call:
  `python3 ~/.claude/skills/skill-updater/scripts/skillsync.py apply-skills <name1> <name2> ...`.

Record each result (success/failure from exit code and output).

### 3. Confirm community updates

For the entries with `updateAvailable: true` and `trusted: false`, present them to the
user with their source and `diffstat`/`availableLabel`. Use the `AskUserQuestion` tool
with `multiSelect: true` so the user can pick which to apply. Include the option to see a
full diff first — if asked, run for that skill:

```bash
python3 ~/.claude/skills/skill-updater/scripts/skillsync.py diff-skill <name>
```

(Plugin community updates — e.g. `karpathy-skills`, `obsidian-skills` — have no per-file
diff; present them by version/`availableLabel` and confirm the same way.)

Apply only the chosen ones using the same `apply-plugin` / `apply-skills` commands as
Step 2.

### 4. Report

Summarize grouped by ecosystem: what was applied, skipped (declined), and failed. Then
end with this note verbatim:

> **Restart Claude Code (or start a new session) to load the updated skills.** Plugin
> updates explicitly require a restart; agent-skills are loaded at session start.

## Notes

- **Never touches personal skills.** Hand-authored skills (real directories in
  `~/.claude/skills/` that are not symlinks, and not in `~/.agents/.skill-lock.json`) are
  invisible to the engine by construction.
- **Trusted vs. community** is defined in `~/.claude/skills/skill-updater/trusted-sources.json`.
  To promote a source to auto-apply, add its marketplace name to `marketplaces` or its
  `owner/*` glob to `repos`.
- **Offline / failures** are isolated per source and reported; the other ecosystem still runs.
- Set `GITHUB_TOKEN` in the environment to avoid GitHub rate limits on the clones.
```

- [ ] **Step 2: Validate the frontmatter parses**

Run:
```bash
python3 - <<'PY'
import re, pathlib
text = pathlib.Path.home().joinpath("Claude/claude-skill-auto-updater/skill/SKILL.md").read_text()
assert text.startswith("---\n"), "missing frontmatter"
fm = text.split("---\n")[1]
assert "name: skill-updater" in fm
assert "description:" in fm
print("SKILL.md frontmatter OK")
PY
```
Expected: `SKILL.md frontmatter OK`

- [ ] **Step 3: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add skill/SKILL.md
git commit -m "feat: SKILL.md orchestrator for skill-updater"
```

---

### Task 10: Install symlink, live smoke test, README update

**Files:**
- Create (symlink): `~/.claude/skills/skill-updater` → `~/Claude/claude-skill-auto-updater/skill`
- Modify: `README.md`

- [ ] **Step 1: Run the full test suite once more**

Run: `cd ~/Claude/claude-skill-auto-updater/skill/scripts && python3 -m pytest test_skillsync.py -v`
Expected: PASS (20 passed).

- [ ] **Step 2: Create the install symlink**

```bash
ln -s ~/Claude/claude-skill-auto-updater/skill ~/.claude/skills/skill-updater
ls -ld ~/.claude/skills/skill-updater
```
Expected: a symlink pointing at `…/claude-skill-auto-updater/skill`.

- [ ] **Step 3: Live smoke test of `detect` against the real machine**

Run (this hits GitHub — it only reads, applies nothing):
```bash
python3 ~/.claude/skills/skill-updater/scripts/skillsync.py detect --refresh | python3 -m json.tool | head -60
```
Expected: valid JSON with `plugins` (4 entries incl. `superpowers@claude-plugins-official`),
`skills` (~28 entries), and `errors`. Confirm `superpowers` shows `trusted: true`, and
community skills (e.g. from `mattpocock/skills`) show `trusted: false`. Do NOT apply
anything yet — this is verification only.

- [ ] **Step 4: Update README status**

In `README.md`, replace the `## Status` section body with:

```markdown
## Status

Implemented. Engine: `skill/scripts/skillsync.py` (run tests:
`cd skill/scripts && python3 -m pytest test_skillsync.py -v`). Installed via symlink at
`~/.claude/skills/skill-updater`. Invoke by asking Claude to "check my skills for updates"
(after restarting so the skill loads).
```

- [ ] **Step 5: Commit**

```bash
cd ~/Claude/claude-skill-auto-updater
git add README.md
git commit -m "docs: mark implemented; record install + smoke-test steps"
```

---

## Self-Review

**1. Spec coverage**

| Spec requirement | Task |
|---|---|
| Both ecosystems | Tasks 2 (plugins), 5–6 (skills) |
| Auto-apply trusted / confirm community | Task 9 (SKILL.md Steps 2–3); classification Tasks 1, 8 |
| Trusted classification (marketplaces + repo globs) | Tasks 1, 8 |
| Non-destructive plugin detection (version + SHA) | Tasks 2, 6 |
| Non-destructive skill detection (sparse clone + diff) | Tasks 4, 5, 6 |
| `skillsync.py` subcommands `detect`/`apply`/`diff` | Tasks 6, 7 |
| `diff` shown at confirm step | Tasks 7 (diff-skill), 9 (Step 3) |
| Manual invocation only | Task 9 (no schedule created) |
| Personal skills excluded | Task 9 Notes; true by construction (engine only reads lock file + plugin manifest) |
| Restart note | Task 9 Step 4 |
| Error isolation / offline / legacy entries / GITHUB_TOKEN | Tasks 6 (errors, legacy), 9 (Notes) |
| `skill/` → `~/.claude/skills/skill-updater` symlink install | Task 10 |
| Testing strategy | Tasks 1–7 (unit + offline integration), Task 10 (live smoke) |

No gaps found.

**2. Placeholder scan:** No `TBD`/`TODO`/"handle edge cases"/"similar to Task N". Every code step contains complete code; every run step has an exact command and expected output.

**3. Type consistency:** Detect report keys (`plugins`/`skills`/`errors`; entry fields `id`/`name`/`trusted`/`updateAvailable`/`availableLabel`/`diffstat`/`note`) are identical across `detect`, the tests, and SKILL.md's parsing instructions. Command builders (`plugin_update_cmd`, `skills_update_cmd`) are asserted in Task 3 and reused unchanged in Task 7. `diff_dirs` signature `(upstream_dir, local_dir) -> (changed, diffstat, full)` is consistent across Tasks 4, 6, 7.
