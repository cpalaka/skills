# Codex repository instructions

Before changing this repository, read [CLAUDE.md](CLAUDE.md), [CONTEXT.md](CONTEXT.md), and any relevant decision in [docs/adr/](docs/adr/). `CLAUDE.md` remains the canonical repository operating guide; this file is the Codex entry point, not a duplicate.

This repository is the canonical source for the personal skills and chunks it contains. Claude Code discovers selected skills through `~/.claude/skills/`; Codex discovers selected skills through `~/.agents/skills/`. Preserve both hosts and prefer symlinks back to this repository over copied skill bodies.

Codex invokes skills as `$skill-name`. Claude Code's `/skill-name` spelling in source-side documentation is host-specific; do not mechanically rewrite it unless the document is explicitly cross-host. When an updater-managed vendored skill body names another skill as `/skill-name`, treat that as source-host notation and load the corresponding `$skill-name` in Codex; never send the slash form to the Codex CLI.

Do not stage, commit, or push changes unless the user explicitly requests it. This working tree may already contain user changes; preserve and distinguish them from the current task's edits.
