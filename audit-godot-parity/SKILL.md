---
name: audit-godot-parity
description: Audit parity between a Godot project's docs/memory and the source skills it was seeded from (the init-project godot profile/templates, godot-personal-gotchas, godot-personal-preferences, godot-architecture-review), and propagate generalizable learnings UP into those skills. Strictly one-directional (project → skill, never the reverse): identify drift, present a parity table for approval, then apply surgical updates to skill files only — plus the one gated project-side write, the single-source gotcha-doc shrink + leak-audit. Use to run a parity check between a project's docs/memory and its skills, propagate a new Godot gotcha to godot-personal-gotchas or new workflow feedback to godot-personal-preferences, propagate doc updates to the init-project godot templates or architecture-process learnings to godot-architecture-review, run the gotcha leak-audit + gated single-source doc-shrink, or when the user says "audit godot parity", "audit godot skills", or invokes /audit-godot-parity.
---

# Sync Godot Skills

Audit parity between a Godot project's docs/memory and the source skills that bootstrap them. Find drift, make surgical updates to the **skills only**, leave the project files alone. Direction is project → skill, never the reverse (the skill might be ahead from other projects).

## Pre-check

Verify cwd is a Godot project root — `ls project.godot` should succeed. If not, abort and tell the user which directory to run from.

## Locations to resolve

- Project root: cwd.
- Project docs: `docs/` under cwd.
- Project memory: `~/.claude/projects/<slug>/memory/` where `<slug>` = the cwd with slashes replaced by hyphens (leading hyphen). Verify by listing `~/.claude/projects/` and matching the directory whose name encodes the cwd.
- Skill 1 (init template): `~/.claude/skills/init-project/profiles/godot/templates/`.
- Skill 2 (personal gotchas): `~/.claude/skills/godot-personal-gotchas/` — split layout: `SKILL.md` = symptom index; `gotchas/NN-<slug>.md` = full entry bodies. Check both.
- Skill 3 (personal preferences): `~/.claude/skills/godot-personal-preferences/` — split layout: `SKILL.md` = preference index; `preferences/N-<slug>.md` = full entry bodies. Check both.
- Skill 4 (architecture review): `~/.claude/skills/godot-architecture-review/` (SKILL.md, ARTIFACTS.md, PHASES.md).

## File pairs to diff

1. `docs/godot-mcp-guide.md`   ↔ `init-project/profiles/godot/templates/godot-mcp-guide.md`
2. `docs/godot-gotchas.md`     ↔ `init-project/profiles/godot/templates/godot-gotchas.md`
3. `docs/blender-mcp-guide.md` ↔ `init-project/profiles/godot/templates/blender-mcp-guide.md`  (conditional — only if the project stamped the Blender guide)
4. `docs/asset-pipeline.md`    ↔ `init-project/profiles/godot/templates/asset-pipeline.md`
5. `CLAUDE.md` — **no doc-parity pair in the chunk era.** A migrated project's CLAUDE.md is the 3-zone chunk shape (`@import`s + knob blocks + inline-leaf), not a copy of `CLAUDE.md.full`. Godot guidance that used to live in `CLAUDE.md.full` now lives in the relevant **chunk** (single-source) — propagate it by editing `cpalaka-claude-skills/chunks/`, not a template. (`CLAUDE.md.full` is now only the starter for a project that has no CLAUDE.md yet.)
6. `docs/godot-gotchas.md` entries ↔ entries in `godot-personal-gotchas/` (index row in SKILL.md + `gotchas/NN-<slug>.md` body; match by symptom keyword or section title). Only Godot-engine gotchas belong in the personal-gotchas skill. (Memory `gotcha-*.md` files exist only for gotchas with no doc counterpart — include any found.) (Under single-source, new universal gotchas are filed straight into the skill at discovery, so this pair is now primarily a LEAK-AUDIT: flag any universal entry that nonetheless appears in a project doc, ensure it is in the skill, and propose the gated shrink — see "## Gotcha-doc shrink".)
7. Memory `feedback_*.md` files ↔ entries in `godot-personal-preferences/` (index row in SKILL.md + `preferences/N-<slug>.md` body; match by topic keyword or section title). Only generalizable workflow preferences propagate; project-specific feedback stays in memory only (see Rules below).
8. `docs/architecture/refactor-process.md` (or `docs/architecture/campaign.md`) ↔ entries in `godot-architecture-review/` (SKILL.md / ARTIFACTS.md / PHASES.md — match by section title). Only generalizable process knowledge propagates (guardrails, gates, artifact conventions, phase mechanics); project parameters (drivers, anchor tasks, population labels, candidates, run log) stay in the project.

## Process

1. Pre-check + resolve all paths. Confirm each exists.
2. Pairs 1–5: run `diff` via Bash. Capture hunks.
3. Pair 6: list `docs/godot-gotchas.md` entry titles (plus any memory `gotcha-*.md` files); for each, grep the `godot-personal-gotchas` index and `gotchas/` bodies for the symptom keyword. Build an "in skill / missing / stale" table.
4. Pair 7: list `feedback_*.md` files; for each, grep the `godot-personal-preferences` index and `preferences/` bodies for the topic keyword. Build the same "in skill / missing / stale" table. Project-specific feedback (see Rules) is auto-classified as "stays in memory only" — flag but don't propose to propagate.
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
- **MCP tool-surface changes** — when an MCP server renames or removes a tool action (e.g. godot-mcp's `get_errors`/`get_debug_output` → `get_log_messages source="editor"` in v3.6.1, or the unprefixed → `godot_*` prefix migration), or version-scopes a behavior (e.g. the struct-write no-op narrowing to `Rect2`-only). These are CROSS-CUTTING — handle them as a sweep, not a single-pair diff (see "Handling cross-cutting MCP action changes" below).

DO NOT propagate (= project-specific):
- Convention decisions made by this project (axis-flip choices, naming choices, game-design rules).
- "Confirmed by: <this project's> Step N / Phase X / specific session" anchors when going into the init template (a fresh project doesn't have those sessions). Such anchors ARE acceptable in `godot-personal-gotchas/SKILL.md` and `godot-personal-preferences/SKILL.md`, which already have project-specific refs.
- File path references to this project's specific scripts/scenes.
- Git/branch/commit-discipline notes that encode project policy (e.g. "this project went under version control on 2026-05-24"), not engine knowledge.
- Feedback tied to a single specific decision in one project (e.g. "for THIS repo we keep the local editor cache / session transcripts out of publishing" — propagate the general principle, drop the project-specific scope).

For unclear cases, INCLUDE the entry in your report and ASK before propagating.

## Handling cross-cutting MCP action changes

A renamed/removed MCP action (or a version-scoped behavior change) is NOT a single-pair diff — the stale token is scattered across the MCP guide, every agent definition, the personal-gotchas/preferences skills, and any tool-selection matrix/preamble. Handle it as a sweep, in this order:

1. **Fix the canonical source first.** Update the project's `docs/godot-mcp-guide.md` (and any memory that downstream content cites — e.g. an A/B verdict or tooling-research memory) before touching templates/skills. Downstream files quote these; fixing them first stops you copying the error forward.
2. **Propagate to templates AND personal skills together** — not one pair at a time. A half-applied rename leaves contradictory guidance live in a session.
3. **Re-verify by grepping every skill + template file for the OLD token** (e.g. `grep -rn 'get_errors\|mcp__godot-mcp__editor[^_]' …`). Expected residue: only "X was removed / does not exist" notes and dated "Confirmed by" historical anchors.

Distinguish **active guidance** (update to the new action) from **historical anchors** ("Confirmed by: <date> … surfaced via <old tool>") and **deprecation notes** ("`get_errors` was removed in v3.6.1") — the latter two are preserved or version-scoped, not blindly renamed. An active *recommendation* to use the old action is a miss; a "was removed" note is correct.

## Gotcha-doc shrink (single-source migration)

Universal gotchas are single-source in the `godot-personal-gotchas` skill; a project's
`docs/godot-gotchas.md` should hold only project-local entries + a pointer. When a project doc
still mirrors the skill (a pre-migration full copy), offer to shrink it. The shrink DELETES
project-doc entries, so it is gated and **content-unidirectional** — it removes redundant project
copies; it never pushes skill content into the project.

Rails (all four hold; a shrink that can't satisfy them is not proposed):

1. **Removal only for verified BODY-level duplicates.** Propose deleting a doc entry only when its
   body is materially equivalent to a `gotchas/NN-<slug>.md` entry; show the matching entry + a
   `diff` in the parity table. A same-symptom entry whose FIX diverges is NOT a duplicate.
2. **Provenance/locality is KEEP-by-default.** A doc entry with a project `Confirmed by:` anchor, a
   project file path, param-tuned values, or a divergent fix is auto-classified KEEP and never
   auto-proposed for removal — surface it separately for a manual call. Before deleting a
   universal-bodied entry that carried an anchor, verify the anchor is captured in the skill entry
   first; if a divergence is a universal improvement, propagate it UP to the skill before removing
   the copy.
3. **Conservative default:** uncertain → keep + flag, never propose removal.
4. **Demarcate the project-write half** of the parity table from the skills-only half, so "this run
   will delete project-doc lines" is unmissable.

After approval: edit the project doc to the thin shape (project-local entries + the skill pointer,
matching `init-project/profiles/godot/templates/godot-gotchas.md`); re-grep to confirm only
project-local + pointer remain.

## Constraints

- The hand-authored skill dirs live in the `cpalaka-claude-skills` git repo (symlinked into `~/.claude/skills/`) — apply file writes only; committing there is the user's decision after reviewing the sync, never part of this skill's run.
- Do NOT modify any project file **except the one gated operation in "## Gotcha-doc shrink"**: that step may DELETE verified-duplicate universal entries from a project's `docs/godot-gotchas.md`, and only after parity-table approval. Everything else in a project stays read-only — find typos/improvements? mention them in the report; the user decides.
- Use `diff` via Bash, not Read + manual comparison.
- Don't delete content from skills unless newer project content clearly supersedes it (and even then, surface the deletion in your report).
- Be terse in status updates — the user has likely run this audit before. Assume they remember the pattern.

## Out of scope

- Don't auto-sync exact version numbers, server lists, or per-project allow-list entries between `.mcp.json` / `settings.local.json` and their templates — those drift per-project and noisy-diff. DO sync **structural learnings** about these files (pin-vs-unpinned policy, integrity-hash expectations, command-shape conventions, default permission classes). When a `feedback_*.md` memory documents a config-shape decision (e.g. "pin exact versions in `.mcp.json`"), propagate the pattern into the template even though the artifact is config.
- `godot-gdscript-patterns` and `godot-animation-tree-mastery` skills — authored upstream, not edited by this project.
- Project-side improvements — flag in report, don't apply.
