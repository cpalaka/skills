---
name: godot-personal-preferences
description: Personal index of workflow preferences for Godot 4.x projects — how to handle .tscn edits, when to skip per-task F5 verification during plan execution, when to invoke other Godot skills proactively, public-repo hygiene rules. Use whenever working on a Godot project (.gd, .tscn, .tres files, project.godot, godot-mcp tools) — these are active behavioral rules, not just reference material.
---

# Godot Personal Preferences

A growing index of workflow preferences that apply across all my Godot projects. Sibling to `godot-personal-gotchas` — that skill catalogs engine quirks (what surprises me), this one catalogs my workflow choices (how I want to be assisted).

## How to use

These are **active rules**, not reference material. When the current task matches a preference's "When this applies" criteria, follow the rule.

When in doubt about whether a preference applies, scan the index table first by situation keyword, then read the matching entry's full body.

If a preference's "How to apply" conflicts with what the user just asked for, follow the user — user instructions always override stored preferences. Then surface the conflict so we can decide whether to update the preference.

## Preference index

| # | Situation | Preferred behavior |
|---|---|---|
| 1 | Asked to edit a `.tscn` (or `.tres`) file | Hand-edit inline + read-back for atomic changes (single property, single-node delete, single resource ref, sub-resource setup with no scene-view spatial feedback). Defer to user (editor-side) only for structural restructures (multi-node moves, tree reorg, hand-authoring Transform3D basis). Template-extract one slot in editor if property names uncertain |
| 2 | Executing a multi-task plan via `subagent-driven-development` in a Godot project | Skip per-task F5/USER-ACTION verification scaffolds. Batch all manual verification at end-of-plan. Add prints/instrumentation working-tree-only; revert on user confirmation |
| 3 | Working on a Godot project (any session) | Invoke `godot-personal-gotchas` skill explicitly via the Skill tool — don't rely on its auto-activation. The skill description is too generic to fire on intent contexts |
| 4 | Godot project is or is about to become public (open-source, demo deployment, portfolio piece) | Audit `.gitignore` for AI-workflow plumbing + process-scratch before pushing publicly. Hide: `CLAUDE.md`, `.claude/`, `docs/superpowers/`, plan/spec scratch, frozen handoffs. Keep: `.mcp.json`, MCP guides, gotchas catalog, vendored addons |
| 5 | Before instructing on Godot 4.x class API specifics, Inspector workflow, or sub-resource property names | Fetch current docs via `mcp__godot-mcp__godot_docs fetch_class <ClassName>` before composing the response (**godot-mcp-EXCLUSIVE** — godot-ai has no docs tool, so keep godot-mcp connected even when godot-ai is the writer). Training-data drift to older 4.x and Godot 3.x conventions is the failure mode; fresh docs ground the response |
| 6 | About to claim "all scripts compile" or "compile clean" from a green GUT run | Don't. GUT only compiles scripts its tests/targets touch. Run `--headless --check-only --quit` for exhaustive parse (when editor closed), OR `mcp__godot-mcp__godot_editor get_log_messages source="editor"` (when editor open), OR godot-ai `logs_read` after a `project_run` (the write-side server's own log read). Skipping this on the basis of GUT green is the trap |
| 7 | About to commit a scene/wiring task whose changed code **consumes values produced by another module** (animator reads gameplay state, UI binds sibling nodes, one system drives another via a shared convention) | After your own headless/automated verification, BEFORE the commit, dispatch a read-only adversarial review subagent prompted to trace every consumed value back to its producer and check the convention matches (units, sign, screen-Y-down, angle-wrapping / ±π branch cut, facing-relative-vs-world). Self-consistent solo verification asserts against your own assumption and misses producer/consumer mismatches living OUTSIDE the changed diff. Reconcile + fix, then commit. Skip for pure test-covered helper tasks |
| 8 | Deciding whether to stay solo on the main thread or fan out subagents for a piece of work | Discriminator is **plan specificity, not implementation-vs-exploration**. Fan out subagents for exploration / research / codebase reconnaissance regardless. While a plan is still fluid or being discovered, stay solo and surgical on the main thread so the user sees and steers each change. Once a plan is **fully specified** (exact code / field tables + verification commands), subagent-driven execution is fine |

The index rows above are the active rules. When a row's "Situation" matches the current task and you need the full When-this-applies / Why / How-to-apply detail (edge cases, classification criteria), Read the matching `preferences/N-<slug>.md` file before acting — each file is named by its preference number (e.g. preference #3 lives at `preferences/3-*.md`).

## Adding new preferences

When a new workflow preference is established (user corrects approach, or user confirms an unusual approach worked):

1. **First — save to per-project memory** as `feedback_<slug>.md` in `~/.claude/projects/<slug>/memory/`. This is the per-project layer, where it accumulates first.
2. **Later — propagate via `audit-godot-parity`** (pair 7: feedback memories ↔ this skill). The sync run handles translation from project-specific to generalized form.

If the preference is clearly generalizable from the start, you can write it here directly — but the curation discipline of "memory first, sync to skill" mirrors the gotcha pattern and is less error-prone.

Layout: a new preference = one new row in the index table above + one new `preferences/N-<slug>.md` body file (N = the next preference number; slug = short kebab-case from the title). Body format: title + "When this applies" + "Preferred behavior" + "Why" + "How to apply" — match the existing entries' structure.

## Boundaries

- **User overrides preferences.** If a user instruction conflicts with a preference here, follow the user. Then surface the conflict — we may need to revise the preference.
- **Project-specific feedback does NOT belong here.** Things tied to a specific repo, a specific contributor, or a specific session belong in per-project memory only. This skill is for workflow rules that apply across all Godot projects.
- **This skill is per-machine.** Other machines and other contributors don't have it. For preferences that should travel with the project, put them in the project's `CLAUDE.md` (which may be gitignored per preference #4, but that's a separate concern).
