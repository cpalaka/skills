# Godot 4.7 Staleness Audit — Design Spec

**Date:** 2026-06-18 · **Status:** design, pending user review → workflow execution

## Context & intent

Godot 4.7 stable released 2026-06-18. The user is **migrating all projects from 4.6.2 to 4.7 today, immediately**. The Godot skills in this repo are the canonical backbone of the user's game development, built against a 4.6.2 reference. This audit finds and corrects 4.7 staleness across them.

**Locked decisions (from brainstorming):**
- **Scope:** this repo's 5 hand-authored skills ONLY. The 5 upstream skills (`godot-gdscript-patterns`, `godot-animation-tree-mastery`, `godot-particles`, `godot-procedural-generation`, `godot-shaders-basics`) symlink out to `~/.agents/skills/` and are NOT edited here — staleness in them is *reported only*, routed via `skill-updater`.
- **Strictly a staleness audit.** Do NOT proactively add coverage for new 4.7 features (HDR, AreaLight3D, DrawableTexture, VirtualJoystick). New gotchas/prefs get added later, only if the user hits them.
- **Execution = approach #1**: report-first triaged workflow → parity table → user approval → apply.
- **Fold in all version axes:** Godot 4.7 staleness PLUS `godot-ai` (now 2.7.5), `godot-mcp` (3.6.1), Rapier (0.8.32) version drift, incl. the deferred 2.7.2→2.7.5 re-anchor (`~/Claude/godot-ai-gotcha-revalidation-2.7.5.md`).

## The anchor rule (load-bearing — governs every edit)

Migration-now does NOT mean re-stamping. Two distinct things:
- **"Confirmed by" anchors** (`observed <date>, <project>, Godot 4.6.2`) are *immutable history*. Never re-stamped, never deleted. (Matches `sync-godot-skills`: anchors are preserved.)
- **Active guidance** (symptom / fix / framing the skill instructs you to follow) re-targets to 4.7 — but **only after verification against 4.7**, never by guessing.

Per-claim edit outcomes:
- **4.7 confirms same behavior** → add `Re-confirmed on 4.7 (2026-06-18)` line; leave guidance.
- **4.7 changed the behavior** → version-scope: keep the 4.6.2 note as historical, add `4.7: now <X>`, update the active fix to the 4.7 path.
- **4.7 removed it / made it irrelevant** → mark resolved/version-scoped, keep the historical entry.
- **Cannot verify in-workflow** (dock/Inspector affordances docs don't describe) → **NO edit**. Emit a live-editor checklist item for the user to confirm on 4.7 today; edit only after confirmation.
- **NEVER guess 4.7 behavior.** Positive evidence or it stays flagged.

## Files in scope (with the duplication map)

1. `godot-personal-gotchas/SKILL.md` — symptom index, 38 rows.
2. `godot-personal-gotchas/gotchas/NN-*.md` — 38 entry bodies.
3. `init-godot-claude-project/templates/godot-gotchas.md` — **DUPLICATES** much of the gotchas content. Every gotcha correction must hit this AND #1/#2 in sync (the `sync-godot-skills` pairing).
4. `godot-personal-preferences/SKILL.md` + `preferences/N-*.md` — esp. #5 (`fetch-current-godot-docs`, references "reworked in 4.6.x (and beyond)").
5. `godot-architecture-review/` (SKILL.md, PHASES.md, ARTIFACTS.md, HTML-REPORT.md) — largely version-agnostic; light scan for version-coupled examples only.
6. `sync-godot-skills/SKILL.md` — process skill; check version-coupled *examples* (e.g. "`get_errors` removed in v3.6.1") for accuracy, do not rewrite the process.
7. Other `init-godot-claude-project/templates/` files — `godot-mcp-guide.md`, `blender-mcp-guide.md`, `asset-pipeline.md`, `CLAUDE.md.full`, `CLAUDE.md.snippet`, `agents/`, `mcp/`, `mcp.json`, `settings.local.json`, `godot-mcp-clean` — version-reference scan (tool names, version pins, engine-version mentions).

## Triage model (A–E)

- **A — Universal version language.** Framing that claims breadth (pref #5 "4.6.x and beyond"). Confirm accuracy; update to name 4.7 as current.
- **B — Changelog-confirmed-stale.** 4.7 explicitly changed it. Candidates from 4.7 breaking-changes: AnimationTree **BlendSpace points handling** (#8, #14, #25 + template AnimationTree blocks), **shader preprocessor restrictions** (#21, marginal), **animation track editor** UI rework (#4, #5), **keyboard/mouse device ID** renumbering (input injection / `input_map_manage`, low). Action: verify → version-scope per anchor rule.
- **C — Version-coupled, at-risk (verify on 4.7).** `texture_filter` enum members (#20), Skeleton2D `bone_index` Inspector auto-fill (#11), Inspector null-override writes (#3), embedded Game tab default/label (#1), AnimationTree dock affordances (#4). API-level claims → ground against 4.7 class docs. Affordance-level → live-editor checklist.
- **D — Fundamental, version-stable.** GDScript semantics (#2, #6, #9, #12, #18), `-Z`-forward (#17), headless exit-code/autoload/ready behaviors (#26, #27, #31, #35, #13), Euler spring (#10), `.gdignore` (#7), `@abstract`/`is_abstract` (#28). Spot-check; expect no change; default verdict still-valid only with evidence.
- **E — Non-engine version axes.** godot-ai 2.7.2→2.7.5 re-anchor (#19, #22, #23, #24, #25, #38 + template L323/L396/L415/L438/L455/L469 per the deferred spec); godot-mcp 3.6.1 stamps (#15); Rapier 0.8.32 (#33); godot-ai env traps (#36, #37). PLUS migration-risk flag: GDExtension ABI recompile for 4.7 (#30, #33 — Rapier especially).

## Verification sources (priority order)

1. **Authoritative 4.7.0-stable changelog + breaking-changes** — `godotengine.org` release article, `github.com/godotengine/godot-builds/releases`, `godotengine.github.io/godot-interactive-changelog/`. (Brainstorm-phase search hit RC3/beta pages; execution MUST pin 4.7.0 stable.)
2. **Online 4.7 class reference** — `docs.godotengine.org/en/4.7/classes/class_<name>.html` for enum members / property names / method signatures (Tier C API claims).
3. **`godot_docs` MCP** — only if the user connects a 4.7 editor in-session (not connected now); auto-version-detects. Optional accelerator, not required.
4. **Vendored godot-ai 2.7.5 source** — `~/gamedev/godot/space-miner-prototype/addons/godot_ai/handlers/` + `utils/`; python tool defs via the uvx server / `git checkout v2.7.5` (only the AnimationTree entry cites `.py`). For Tier E line-citation re-anchoring.
5. **Live 4.7 editor (user eyeball)** — dock/Inspector affordances docs can't settle → checklist.

## Workflow shape (approach #1)

**Phase 0 — Inventory + 4.7 delta sheet.**
- One agent fetches and distills the authoritative 4.7.0-stable changelog/breaking-changes into a structured delta sheet keyed by area (GDScript, AnimationTree, shaders, editor UI, input, particles, removals, addons/GDExtension).
- Re-confirm the **currently-installed** tool versions (vendored `addons/godot_ai/plugin.cfg`, `~/.agents/.skill-lock.json`, any Rapier `.gdextension`) — do NOT assume the deferred spec's `godot-ai 2.7.5` / `godot-mcp 3.6.1` / `Rapier 0.8.32` are still current as of today; anchor Tier E to whatever is actually installed.
- Build the claim inventory: every gotcha (38) + preference (8) + each version-reference in the init templates + version-coupled examples in `sync-godot-skills`. Each claim = `{id, source_files[], text, area, tier_guess, version_stamp}`. A claim may carry **two axes** (e.g. #25 is both engine-version/AnimationTree-B and MCP-version-E) — record both concerns, verify both, surface once in the parity table. No silent caps — log the full count.

**Phase 1 — Adversarial verify (fan-out, one agent per claim; pipeline).**
- Input: claim text + cited refs + the 4.7 delta sheet + permitted sources for its tier.
- Task: try to **refute** "still valid on 4.7." Tier E routes to the 2.7.5-source verifier (deferred-spec shape: read source at cited lines, refute "still true", return corrected line numbers).
- Output schema per claim: `{id, tier, verdict (still-valid | changed | removed | needs-live-verify | cannot-determine), evidence (source_url_or_path + quote), proposed_action (none | reconfirm-stamp | version-scope-edit | live-checklist | re-anchor-version), proposed_edit (exact text for BOTH locations where duplicated), confidence}`.
- Bias: `still-valid` requires positive 4.7 evidence; absent evidence → `needs-live-verify` / `cannot-determine`, never silently valid. Tier C API claims that read as "changed" get a second verifier confirming the enum/property name against the same 4.7 docs URL before the verdict sticks.

**Phase 2 — Synthesis.** Dedupe, group by file, emit:
- (a) **Parity table** — `claim | tier | verdict | evidence | proposed action` (the `sync-godot-skills` ritual).
- (b) **Edit plan** — exact per-file edits, gotchas-skill ↔ init-template kept in sync.
- (c) **Live-editor checklist** — affordance/Inspector items to confirm on the 4.7 editor today.
- (d) **Migration-risk notes** — GDExtension/Rapier ABI recompile; addon 4.7-compat; any upstream-skill staleness spotted (report only).

**PAUSE → user reviews parity table + approves the edit plan.**

**Phase 3 (post-approval) — Apply.** Surgical edits to skill files only, both duplicated locations in sync. Re-verify: re-diff `godot-personal-gotchas` bodies ↔ `templates/godot-gotchas.md`; grep for stale version tokens. Expected residue: only immutable historical anchors + intentional version-scoped notes. Report what changed in 2–3 sentences.

## Out of scope

- Editing upstream skills (report staleness only).
- Adding new 4.7-feature gotchas/prefs proactively.
- Editing any project `docs/` copies (downstream of templates; re-synced separately per `sync-godot-skills`).
- Full Rapier/addon 4.7 compatibility testing (flag the ABI risk; don't test it here).
- Auto-committing skill edits (the repo convention: committing is the user's call after review).

## Deliverables

1. Parity table + edit plan (workflow output, surfaced for approval).
2. Applied edits (post-approval) to `godot-personal-gotchas` + `init-godot-claude-project` template, kept in sync.
3. Live-editor verification checklist (dock/Inspector affordances on 4.7).
4. Migration-risk notes (GDExtension/addon ABI).
5. This spec.

## Acceptance / verification of the audit itself

- Full inventory accounted for (38 gotchas + 8 prefs + template refs + sync examples); skips logged.
- Post-apply diff of the two duplicated gotcha locations shows them back in sync.
- Every Tier C live-checklist item is either resolved (user-confirmed on 4.7) or explicitly left open with the flag intact.
- No active guidance changed without positive 4.7 evidence cited in the edit plan.
