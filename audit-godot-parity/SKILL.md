---
name: audit-godot-parity
description: Audit parity between a Godot project's docs/memory and the source skills that seeded them (the init-project godot templates, godot-personal-gotchas, godot-personal-preferences, godot-architecture-review), propagating generalizable learnings UP — project → skill, never the reverse. Use to run a parity check, propagate a new gotcha / preference / template or process learning into its skill, run the gotcha leak-audit + gated doc-shrink, or when the user says "audit godot parity" / "audit godot skills" or invokes $audit-godot-parity in Codex or /audit-godot-parity in Claude Code.
---

# Audit Godot Parity

Audit parity between a Godot project's docs/memory and the source skills that bootstrap them. Find drift, make surgical updates to the **skills only**, leave the project files alone. Direction is project → skill, never the reverse (the skill might be ahead from other projects).

## Pre-check

Verify cwd is a Godot project root — `ls project.godot` should succeed. If not, abort and tell the user which directory to run from.

## Locations to resolve

- Project root: cwd.
- Project docs: `docs/` under cwd.
- Project memory: Claude Code's `~/.claude/projects/<slug>/memory/`, if present, where `<slug>` = the cwd with slashes replaced by hyphens (leading hyphen). Verify by listing `~/.claude/projects/` and matching the directory whose name encodes the cwd. On Codex this is an optional Claude-side input, not a Codex memory convention; absence means skip memory-only pairs and report the reduced scope.
- Skill roots: resolve each canonical skill as a sibling of this skill's real directory first. If that is unavailable, try Codex's `~/.agents/skills/`, then Claude Code's `~/.claude/skills/`. Resolve symlinks before comparing so both hosts edit the same canonical files.
- Skill 1 (init template): `init-project/profiles/godot/templates/`.
- Skill 2 (personal gotchas): `godot-personal-gotchas/` — split layout: `SKILL.md` = symptom index; `gotchas/NN-<slug>.md` = full entry bodies. Check both.
- Skill 3 (personal preferences): `godot-personal-preferences/` — split layout: `SKILL.md` = preference index; `preferences/N-<slug>.md` = full entry bodies. Check both.
- Skill 4 (architecture review): `godot-architecture-review/` (SKILL.md, ARTIFACTS.md, PHASES.md).

## File pairs to diff

1. `docs/godot-mcp-guide.md`   ↔ `init-project/profiles/godot/templates/godot-mcp-guide.md`
2. `docs/godot-gotchas.md`     ↔ `init-project/profiles/godot/templates/godot-gotchas.md`
3. `docs/blender-mcp-guide.md` ↔ `init-project/profiles/godot/templates/blender-mcp-guide.md`  (conditional — only if the project stamped the Blender guide)
4. `docs/asset-pipeline.md`    ↔ `init-project/profiles/godot/templates/asset-pipeline.md`
5. `CLAUDE.md` — **no doc-parity pair in the chunk era.** A migrated project's CLAUDE.md is the 3-zone chunk shape (`@import`s + knob blocks + inline-leaf), not a copy of `CLAUDE.md.full`. Godot guidance that used to live in `CLAUDE.md.full` now lives in the relevant **chunk** (single-source) — propagate it by editing `skills/chunks/`, not a template. (`CLAUDE.md.full` is now only the starter for a project that has no CLAUDE.md yet.)
6. `docs/godot-gotchas.md` entries ↔ entries in `godot-personal-gotchas/` (index row in SKILL.md + `gotchas/NN-<slug>.md` body; match by symptom keyword or section title). Only Godot-engine gotchas belong in the personal-gotchas skill. (Also scan project memory for gotcha-shaped entries with no doc counterpart — read `MEMORY.md` and each candidate's frontmatter `metadata.type`; filenames are descriptive slugs, NOT `gotcha-*` prefixes, and universal candidates often self-tag "candidate for godot-personal-gotchas" in the body. Include any found.) (Under single-source, new universal gotchas are filed straight into the skill at discovery, so this pair is now primarily a LEAK-AUDIT: flag any universal entry that nonetheless appears in a project doc, ensure it is in the skill, and propose the gated shrink — read [`DOC-SHRINK.md`](DOC-SHRINK.md) before proposing it; its four rails gate the only project-side write.)
7. Memory entries carrying workflow feedback ↔ entries in `godot-personal-preferences/` (index row in SKILL.md + `preferences/N-<slug>.md` body; match by topic keyword or section title). Find them by reading `MEMORY.md` + frontmatter: `metadata.type: feedback`, plus preference-shaped `project` entries — filenames are descriptive slugs, NOT `feedback_*` prefixes. Only generalizable workflow preferences propagate; project-specific feedback stays in memory only (see Rules below).
8. `docs/architecture/refactor-process.md` (or `docs/architecture/campaign.md`) ↔ entries in `godot-architecture-review/` (SKILL.md / ARTIFACTS.md / PHASES.md — match by section title). Only generalizable process knowledge propagates (guardrails, gates, artifact conventions, phase mechanics); project parameters (drivers, anchor tasks, population labels, candidates, run log) stay in the project.

## Process

1. Pre-check + resolve all paths. Confirm each exists.
2. Pairs 1–5: run `diff` via Bash. Capture hunks.
3. Pair 6: list `docs/godot-gotchas.md` entry titles (plus the gotcha-shaped memories from the MEMORY.md/frontmatter scan); for each, grep the `godot-personal-gotchas` index and `gotchas/` bodies for the symptom keyword. Build an "in skill / missing / stale" table.
4. Pair 7: list the feedback-type memory entries (from the MEMORY.md/frontmatter scan); for each, grep the `godot-personal-preferences` index and `preferences/` bodies for the topic keyword. Build the same "in skill / missing / stale" table. Project-specific feedback (see Rules) is auto-classified as "stays in memory only" — flag but don't propose to propagate.
5. Pair 8: if `docs/architecture/refactor-process.md` or `docs/architecture/campaign.md` exists, scan it for generalizable process rules (guardrails, gates, artifact conventions, phase mechanics) and grep the `godot-architecture-review` files by section title. Build the same table. Project parameters are auto-classified "stays in the project". Absent file → skip the pair.
6. Classify each diff hunk and each missing entry: propagate / skip / ask (see Rules).
7. **PRESENT a parity table to the user and PAUSE for approval before editing.** Do not edit until they confirm.
8. After approval: apply edits to skill files only. For new gotcha entries in `godot-personal-gotchas/`, match the split structure (index row in SKILL.md + a `gotchas/NN-<slug>.md` body file with Symptom / Cause / Fix / Detect proactively / Confirmed by). For new preference entries in `godot-personal-preferences/`, match the split structure (index row in SKILL.md + a `preferences/N-<slug>.md` body file with When this applies / Preferred behavior / Why / How to apply). For `godot-architecture-review` changes, match its file split (SKILL.md = core rules; ARTIFACTS.md = artifact shapes; PHASES.md = phase mechanics + kickoff prompts).
9. Verify by re-running `diff` on each pair. Expected residue: only the project-specific content you explicitly scrubbed.
10. Report what changed in 2–3 sentences.

## Rules for what propagates

PROPAGATE (= portable Godot/Blender knowledge or generalizable workflow):
- New gotchas about engine behavior, editor UI, tooling quirks, parser failures.
- New sections in the MCP guides documenting tool surfaces or workflow rules.
- New CLAUDE.md guidance about which skills/docs to consult and when.
- New workflow preferences that generalize across Godot projects: how to handle a class of edits, when to invoke a skill, plan-execution discipline, conditional rules tied to project-state (public/private, has-a-deploy-workflow, etc.).
- **MCP tool-surface changes** — when an MCP server renames or removes a tool action (e.g. godot-mcp's `get_errors`/`get_debug_output` → `get_log_messages` in v3.6.1, or the unprefixed → `godot_*` prefix migration), or version-scopes a behavior (e.g. the struct-write no-op narrowing to `Rect2`-only). These are CROSS-CUTTING — before classifying such a hunk, read [`MCP-SWEEP.md`](MCP-SWEEP.md) and handle it as the sweep it specifies, never as a single-pair diff.

DO NOT propagate (= project-specific):
- Convention decisions made by this project (axis-flip choices, naming choices, game-design rules).
- "Confirmed by: <this project's> Step N / Phase X / specific session" anchors when going into the init template (a fresh project doesn't have those sessions). Such anchors ARE acceptable in `godot-personal-gotchas/SKILL.md` and `godot-personal-preferences/SKILL.md`, which already have project-specific refs.
- File path references to this project's specific scripts/scenes.
- Git/branch/commit-discipline notes that encode project policy (e.g. "this project went under version control on 2026-05-24"), not engine knowledge.
- Feedback tied to a single specific decision in one project (e.g. "for THIS repo we keep the local editor cache / session transcripts out of publishing" — propagate the general principle, drop the project-specific scope).

For unclear cases, INCLUDE the entry in your report and ASK before propagating.

## Constraints

- The hand-authored skill dirs live in the `skills` git repo (symlinked into `~/.agents/skills/` for Codex and/or `~/.claude/skills/` for Claude Code) — apply file writes only; committing there is the user's decision after reviewing the sync, never part of this skill's run.
- Do NOT modify any project file **except the one gated operation defined in [`DOC-SHRINK.md`](DOC-SHRINK.md)**: that step may DELETE verified-duplicate universal entries from a project's `docs/godot-gotchas.md`, and only after parity-table approval. Everything else in a project stays read-only — find typos/improvements? mention them in the report; the user decides.
- Use `diff` via Bash, not Read + manual comparison.
- Don't delete content from skills unless newer project content clearly supersedes it (and even then, surface the deletion in your report).
- Be terse in status updates — the user has likely run this audit before. Assume they remember the pattern.

## Out of scope

- Don't auto-sync exact version numbers, server lists, or per-project allow-list entries between `.mcp.json` / `settings.local.json` and their templates — those drift per-project and noisy-diff. DO sync **structural learnings** about these files (pin-vs-unpinned policy, integrity-hash expectations, command-shape conventions, default permission classes). When a feedback memory documents a config-shape decision (e.g. "pin exact versions in `.mcp.json`"), propagate the pattern into the template even though the artifact is config.
  - **But the template's own pin is not "per-project drift" — it is the default every new project inherits, and this rule left it unowned.** Because parity flows project → skill only, nothing was ever going to bump it: on 2026-08-08 `templates/mcp/package.json` still pinned godot-mcp **3.6.1** and `godot-mcp-guide.md` carried 9 references to it plus 2 to godot-ai **2.7.5**, while the live servers were **4.1.0** and **3.1.3**. Any project scaffolded in that window started two versions stale. **So: at each audit, read the newest version actually in the fleet (`tools/mcp/node_modules/@satelliteoflove/godot-mcp/package.json` across `~/gamedev/godot/*`, and the vendored `addons/godot_ai/plugin.cfg`) and report the template pin against it.** Bumping stays a proposal, never automatic — but an unreported gap is how this one survived.
- `godot-gdscript-patterns` and `godot-animation-tree-mastery` skills — authored upstream, not edited by this project.
- Project-side improvements — flag in report, don't apply.
