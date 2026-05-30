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


# ---------- cloning ----------
def clone_skill_folders(source_url, folders, ref, dest):
    """Shallow, blob-filtered, sparse clone of `folders` from source_url into dest.

    source_url/ref/folders come from the untrusted ~/.agents/.skill-lock.json, so
    reject any value git could read as an option (argv flag smuggling — e.g. a
    sourceUrl of "--upload-pack=<cmd>" is RCE) and separate positionals with "--".
    """
    for val, label in [(source_url, "sourceUrl"), (ref or "", "ref")]:
        if val.startswith("-"):
            raise ValueError(f"unsafe {label}: {val!r}")
    for folder in folders:
        if folder.startswith("-"):
            raise ValueError(f"unsafe folder: {folder!r}")
    cmd = ["git", "clone", "--depth", "1", "--filter=blob:none", "--no-checkout"]
    if ref:
        cmd += ["--branch", ref]
    cmd += ["--", source_url, str(dest)]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    subprocess.run(["git", "-C", str(dest), "sparse-checkout", "init", "--cone"],
                   check=True, capture_output=True, text=True)
    subprocess.run(["git", "-C", str(dest), "sparse-checkout", "set", "--", *folders],
                   check=True, capture_output=True, text=True)
    subprocess.run(["git", "-C", str(dest), "checkout"],
                   check=True, capture_output=True, text=True)


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
