import json
import os
from pathlib import Path
import pytest
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


def test_clone_skill_folders_rejects_flag_smuggling(tmp_path):
    # Untrusted lock-file values starting with "-" must be refused before git runs.
    dest = tmp_path / "dest"
    with pytest.raises(ValueError):
        skillsync.clone_skill_folders("--upload-pack=touch /tmp/pwned", ["skills/eng/tdd"], None, dest)
    with pytest.raises(ValueError):
        skillsync.clone_skill_folders("https://github.com/x/y.git", ["--evil"], None, dest)
    with pytest.raises(ValueError):
        skillsync.clone_skill_folders("https://github.com/x/y.git", ["skills/eng/tdd"], "-bad", dest)
    assert not dest.exists()  # nothing was cloned


def _make_root_skill_repo(root):
    """Create a git repo whose skill IS the whole repo (SKILL.md at root + a subdir)."""
    root.mkdir(parents=True, exist_ok=True)
    (root / "SKILL.md").write_text("root skill v1\n")
    (root / "references").mkdir()
    (root / "references/guide.md").write_text("guide body\n")
    env = {"GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t",
           "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t", "PATH": os.environ["PATH"]}
    _sp.run(["git", "init", "-q"], cwd=root, check=True, env=env)
    _sp.run(["git", "add", "-A"], cwd=root, check=True, env=env)
    _sp.run(["git", "commit", "-qm", "init"], cwd=root, check=True, env=env)
    return root


def test_diff_dirs_ignores_git_metadata(tmp_path):
    # A fresh clone carries a .git/ dir the local install lacks; it must not count as a diff.
    up = tmp_path / "up"; local = tmp_path / "local"
    up.mkdir(); local.mkdir()
    (up / "SKILL.md").write_text("same\n")
    (local / "SKILL.md").write_text("same\n")
    (up / ".git").mkdir()
    (up / ".git/HEAD").write_text("ref: refs/heads/main\n")
    changed, _stat, full = skillsync.diff_dirs(up, local)
    assert changed is False
    assert full == ""


def test_clone_root_skill_materializes_subtree(tmp_path):
    # skillPath "SKILL.md" -> folder "" (whole repo is the skill): the full subtree must check out.
    remote = _make_root_skill_repo(tmp_path / "remote")
    dest = tmp_path / "dest"
    skillsync.clone_skill_folders(str(remote), [""], None, dest)
    assert (dest / "SKILL.md").read_text() == "root skill v1\n"
    assert (dest / "references/guide.md").read_text() == "guide body\n"


def test_root_skill_no_false_positive(tmp_path):
    # End-to-end regression for the design-doc-mermaid bug: an up-to-date root skill
    # (local byte-identical to upstream HEAD) must report no change.
    remote = _make_root_skill_repo(tmp_path / "remote")
    dest = tmp_path / "dest"
    skillsync.clone_skill_folders(str(remote), [""], None, dest)
    local = tmp_path / "local"
    local.mkdir()
    (local / "SKILL.md").write_text("root skill v1\n")
    (local / "references").mkdir()
    (local / "references/guide.md").write_text("guide body\n")
    changed, _stat, full = skillsync.diff_dirs(dest, local)
    assert changed is False, full


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
