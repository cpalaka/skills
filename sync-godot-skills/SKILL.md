---
name: sync-godot-skills
description: Audit and propagate learnings from a Godot project's docs and per-project memory back to the source skills (init-godot-claude-project, godot-personal-gotchas, godot-personal-preferences, godot-architecture-review). Identifies drift, presents a parity table for user approval, applies surgical updates to skill files only. Direction is always project → skill, never the reverse. Use when wanting to run a parity check between project docs/memory and skills, sync new Godot gotchas to the godot-personal-gotchas skill, sync new workflow feedback to the godot-personal-preferences skill, propagate doc updates to the init-godot-claude-project templates, sync architecture-process learnings to the godot-architecture-review skill, or when the user says "audit godot skill parity", "sync godot skills", or invokes /sync-godot-skills.
---

# Sync Godot Skills

Audit parity between a Godot project's docs/memory and the source skills that bootstrap them. Find drift, make surgical updates to the **skills only**, leave the project files alone. Direction is project → skill, never the reverse (the skill might be ahead from other projects).

## Pre-check

Verify cwd is a Godot project root — `ls project.godot` should succeed. If not, abort and tell the user which directory to run from.

## Locations to resolve

- Project root: cwd.
- Project docs: `docs/` under cwd.
- Project memory: `~/.claude/projects/<slug>/memory/` where `<slug>` = the cwd with slashes replaced by hyphens (leading hyphen). Verify by listing `~/.claude/projects/` and matching the directory whose name encodes the cwd.
- Skill 1 (init template): `~/.claude/skills/init-godot-claude-project/templates/`.
- Skill 2 (personal gotchas): `~/.claude/skills/godot-personal-gotchas/SKILL.md` (or `gotchas/<slug>.md` files if the skill has been split — check both).
- Skill 3 (personal preferences): `~/.claude/skills/godot-personal-preferences/SKILL.md`.
- Skill 4 (architecture review): `~/.claude/skills/godot-architecture-review/` (SKILL.md, ARTIFACTS.md, PHASES.md).

## File pairs to diff

1. `docs/godot-mcp-guide.md`   ↔ `init-godot-claude-project/templates/godot-mcp-guide.md`
2. `docs/godot-gotchas.md`     ↔ `init-godot-claude-project/templates/godot-gotchas.md`
3. `docs/blender-mcp-guide.md` ↔ `init-godot-claude-project/templates/blender-mcp-guide.md`
4. `docs/asset-pipeline.md`    ↔ `init-godot-claude-project/templates/asset-pipeline.md`
5. `CLAUDE.md`                 ↔ `init-godot-claude-project/templates/CLAUDE.md.full`
6. Memory `gotcha_*.md` files  ↔ entries in `godot-personal-gotchas/SKILL.md` (match by symptom keyword or section title). Only Godot-engine gotchas belong in the personal-gotchas skill.
7. Memory `feedback_*.md` files ↔ entries in `godot-personal-preferences/SKILL.md` (match by topic keyword or section title). Only generalizable workflow preferences propagate; project-specific feedback stays in memory only (see Rules below).
8. `docs/architecture/refactor-process.md` (or `docs/architecture/campaign.md`) ↔ entries in `godot-architecture-review/` (SKILL.md / ARTIFACTS.md / PHASES.md — match by section title). Only generalizable process knowledge propagates (guardrails, gates, artifact conventions, phase mechanics); project parameters (drivers, anchor tasks, population labels, candidates, run log) stay in the project.

## Process

1. Pre-check + resolve all paths. Confirm each exists.
2. Pairs 1–5: run `diff` via Bash. Capture hunks.
3. Pair 6: list `gotcha_*.md` files; for each, grep `godot-personal-gotchas/SKILL.md` for the symptom keyword. Build an "in skill / missing / stale" table.
4. Pair 7: list `feedback_*.md` files; for each, grep `godot-personal-preferences/SKILL.md` for the topic keyword. Build the same "in skill / missing / stale" table. Project-specific feedback (see Rules) is auto-classified as "stays in memory only" — flag but don't propose to propagate.
5. Pair 8: if `docs/architecture/refactor-process.md` or `docs/architecture/campaign.md` exists, scan it for generalizable process rules (guardrails, gates, artifact conventions, phase mechanics) and grep the `godot-architecture-review` files by section title. Build the same table. Project parameters are auto-classified "stays in the project". Absent file → skip the pair.
6. Classify each diff hunk and each missing entry: propagate / skip / ask (see Rules).
7. **PRESENT a parity table to the user and PAUSE for approval before editing.** Do not edit until they confirm.
8. After approval: apply edits to skill files only. For new gotcha entries in `godot-personal-gotchas/SKILL.md`, match the existing structure (index row + body section with Symptom / Cause / Fix / Detect proactively / Confirmed by). For new preference entries in `godot-personal-preferences/SKILL.md`, match the existing structure (index row + body section with When this applies / Preferred behavior / Why / How to apply). For `godot-architecture-review` changes, match its file split (SKILL.md = core rules; ARTIFACTS.md = artifact shapes; PHASES.md = phase mechanics + kickoff prompts).
9. Verify by re-running `diff` on each pair. Expected residue: only the project-specific content you explicitly scrubbed.
10. Report what changed in 2–3 sentences.

## Rules for what propagates

PROPAGATE (= portable Godot/Blender knowledge or generalizable workflow):
- New gotchas about engine behavior, editor UI, tooling quirks, parser failures.
- New sections in the MCP guides documenting tool surfaces or workflow rules.
- New CLAUDE.md guidance about which skills/docs to consult and when.
- New workflow preferences that generalize across Godot projects: how to handle a class of edits, when to invoke a skill, plan-execution discipline, conditional rules tied to project-state (public/private, has-a-deploy-workflow, etc.).
- **MCP tool-surface changes** — when an MCP server renames or removes a tool action (e.g. godot-mcp's `get_errors`/`get_debug_output` → `get_log_messages source="editor"` in v3.6.1, or the unprefixed → `godot_*` prefix migration), or version-scopes a behavior (e.g. the struct-write no-op narrowing to `Rect2`-only). These are CROSS-CUTTING — handle them as a sweep, not a single-pair diff (see "Handling cross-cutting MCP action changes" below).

DO NOT propagate (= project-specific):
- Convention decisions made by this project (axis-flip choices, naming choices, game-design rules).
- "Confirmed by: <this project's> Step N / Phase X / specific session" anchors when going into the init template (a fresh project doesn't have those sessions). Such anchors ARE acceptable in `godot-personal-gotchas/SKILL.md` and `godot-personal-preferences/SKILL.md`, which already have project-specific refs.
- File path references to this project's specific scripts/scenes.
- Git/branch/commit-discipline notes that encode project policy (e.g. "this project went under version control on 2026-05-24"), not engine knowledge.
- Feedback tied to a single specific decision in one project (e.g. "for THIS repo we chose to keep CLAUDE.md out of public" — propagate the general principle, drop the project-specific scope).

For unclear cases, INCLUDE the entry in your report and ASK before propagating.

## Handling cross-cutting MCP action changes

A renamed/removed MCP action (or a version-scoped behavior change) is NOT a single-pair diff — the stale token is scattered across the MCP guide, every agent definition, the personal-gotchas/preferences skills, and any tool-selection matrix/preamble. Handle it as a sweep, in this order:

1. **Fix the canonical source first.** Update the project's `docs/godot-mcp-guide.md` (and any memory that downstream content cites — e.g. an A/B verdict or tooling-research memory) before touching templates/skills. Downstream files quote these; fixing them first stops you copying the error forward.
2. **Propagate to templates AND personal skills together** — not one pair at a time. A half-applied rename leaves contradictory guidance live in a session.
3. **Re-verify by grepping every skill + template file for the OLD token** (e.g. `grep -rn 'get_errors\|mcp__godot-mcp__editor[^_]' …`). Expected residue: only "X was removed / does not exist" notes and dated "Confirmed by" historical anchors.

Distinguish **active guidance** (update to the new action) from **historical anchors** ("Confirmed by: <date> … surfaced via <old tool>") and **deprecation notes** ("`get_errors` was removed in v3.6.1") — the latter two are preserved or version-scoped, not blindly renamed. An active *recommendation* to use the old action is a miss; a "was removed" note is correct.

## Constraints

- The hand-authored skill dirs live in the `cpalaka-claude-skills` git repo (symlinked into `~/.claude/skills/`) — apply file writes only; committing there is the user's decision after reviewing the sync, never part of this skill's run.
- Do NOT modify any project file. If you find typos or improvements in project files, mention them in the report; the user decides whether to fix.
- Use `diff` via Bash, not Read + manual comparison.
- Don't delete content from skills unless newer project content clearly supersedes it (and even then, surface the deletion in your report).
- Be terse in status updates — the user has likely run this audit before. Assume they remember the pattern.

## Out of scope

- Don't auto-sync exact version numbers, server lists, or per-project allow-list entries between `.mcp.json` / `settings.local.json` and their templates — those drift per-project and noisy-diff. DO sync **structural learnings** about these files (pin-vs-unpinned policy, integrity-hash expectations, command-shape conventions, default permission classes). When a `feedback_*.md` memory documents a config-shape decision (e.g. "pin exact versions in `.mcp.json`"), propagate the pattern into the template even though the artifact is config.
- `godot-gdscript-patterns` and `godot-animation-tree-mastery` skills — authored upstream, not edited by this project.
- Project-side improvements — flag in report, don't apply.
