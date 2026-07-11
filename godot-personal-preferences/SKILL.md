---
name: godot-personal-preferences
description: Personal index of workflow preferences for Godot 4.x projects — how to handle .tscn edits, when to skip per-task F5 verification during plan execution, when to invoke other Godot skills proactively, public-repo hygiene rules. Use whenever working on a Godot project (.gd, .tscn, .tres files, project.godot, godot-mcp tools) — these are active behavioral rules, not just reference material.
---

# Godot Personal Preferences

A growing index of workflow preferences that apply across all my Godot projects. Sibling to `godot-personal-gotchas` — that skill catalogs engine quirks (what surprises me), this one catalogs my workflow choices (how I want to be assisted).

## How to use

These are **active rules**, not reference material. When the current task matches a preference's "When this applies" criteria, follow the rule.

When in doubt about whether a preference applies, scan the index table first by situation keyword, then read the matching entry's full body.

If a preference's "How to apply" conflicts with what the user just asked for, follow the user, then surface the conflict so we can decide whether to update the preference.

## Preference index

| # | Situation | Preferred behavior |
|---|---|---|
| 1 | Asked to edit a `.tscn` (or `.tres`) file | Hand-edit inline + read-back for atomic changes (single property, single-node delete, single resource ref, sub-resource setup with no scene-view spatial feedback). Defer to user (editor-side) only for structural restructures (multi-node moves, tree reorg, hand-authoring Transform3D basis). Template-extract one slot in editor if property names uncertain |
| 2 | Executing a fully-specified multi-task plan via subagent-driven execution in a Godot project | Skip per-task F5/USER-ACTION verification scaffolds. Batch all manual verification at end-of-plan. Add prints/instrumentation working-tree-only; revert on user confirmation |
| 3 | Working on a Godot project (any session) | Invoke `godot-personal-gotchas` skill explicitly via the Skill tool — don't rely on its auto-activation. The skill description is too generic to fire on intent contexts |
| 4 | Godot project is or is about to become public (open-source, demo deployment, portfolio piece) | Audit `.gitignore` for AI-workflow plumbing + process-scratch before pushing publicly. Hide: `CLAUDE.md`, `.claude/`, `docs/superpowers/`, plan/spec scratch, frozen handoffs. Keep: `.mcp.json`, MCP guides, gotchas catalog, vendored addons |
| 5 | Before instructing on Godot 4.x class API specifics, Inspector workflow, or sub-resource property names | Fetch current docs via `mcp__godot-mcp__godot_docs fetch_class <ClassName>` before composing the response (**godot-mcp-EXCLUSIVE** — godot-ai has no docs tool, so keep godot-mcp connected even when godot-ai is the writer). Training-data drift to older 4.x and Godot 3.x conventions is the failure mode; fresh docs ground the response |
| 6 | About to claim "all scripts compile" or "compile clean" from a green GUT run | Don't. GUT only compiles scripts its tests/targets touch. Parse coverage: `--headless --check-only --quit` (editor closed) or `get_log_messages source="editor"` (editor open) — but neither catches runtime-compile errors (gotcha #44); the real backstop is a **preload-smoke test** so the suite compiles every script (details in body). Capture down (#43) → treat the script as UNVERIFIED |
| 7 | About to commit a scene/wiring task whose changed code **consumes values produced by another module** (animator reads gameplay state, UI binds sibling nodes, one system drives another via a shared convention) | After your own headless/automated verification, BEFORE the commit, dispatch a read-only adversarial review subagent prompted to trace every consumed value back to its producer and check the convention matches (units, sign, screen-Y-down, angle-wrapping / ±π branch cut, facing-relative-vs-world). Self-consistent solo verification asserts against your own assumption and misses producer/consumer mismatches living OUTSIDE the changed diff. Reconcile + fix, then commit. Skip for pure test-covered helper tasks |
| 8 | Deciding whether to stay solo on the main thread or fan out subagents for a piece of work | Discriminator is **plan specificity, not implementation-vs-exploration**. Fan out subagents for exploration / research / codebase reconnaissance regardless. While a plan is still fluid or being discovered, stay solo and surgical on the main thread so the user sees and steers each change. Once a plan is **fully specified** (exact code / field tables + verification commands), subagent-driven execution is fine |
| 9 | About to F5 / smoke-verify a task that flips a project-wide or global setting (a render/physics mode like `physics_interpolation`, a feature flag, a display/quality toggle) | Scope the smoke to the setting's FULL blast radius — every node-type / subsystem it affects — not just the feature's obvious surface. The headless suite is often structurally blind to render-time settings, so the human F5 is the only gate; aim it at ALL affected movers/surfaces, or a regression in a *different* subsystem signs off clean. Enumerate the blast radius first ("what does this setting touch?"), then verify each |
| 10 | About to hand a visual/feel change (toggle, lighting, shader, LUT, compositing) to the user for an F5 reaction round | First capture engine-side framebuffer A/B screenshots yourself and eyeball them: a `--shot=/abs/path.png` cmdline hook (`get_viewport().get_texture().get_image().save_png()` + quit) launched per-variant from the CLI, then Read the PNGs. OS `screencapture` (unfocused window) and embedded-run MCP capture (gotcha #43) both fail here. Exaggerated-parameter shots separate "not working" from "too subtle". Hand off only once the change visibly reads — or with the honest finding that it doesn't |

The index rows above are the active rules. When a row's "Situation" matches the current task and you need the full When-this-applies / Why / How-to-apply detail (edge cases, classification criteria), Read the matching `preferences/N-<slug>.md` file before acting — each file is named by its preference number (e.g. preference #3 lives at `preferences/3-*.md`).

## Adding new preferences

To add a new preference (one new index row + one `preferences/N-<slug>.md` body, memory-first curation), follow [`ADDING.md`](ADDING.md).

## Boundaries

- **Project-specific feedback lives in per-project memory only.** Things tied to a specific repo, a specific contributor, or a specific session stay there; this skill is for workflow rules that apply across all Godot projects.
- **Portable preferences travel via the project.** This skill is per-machine — for rules that should follow a project to other machines and contributors, put them in the project's `CLAUDE.md` (which may be gitignored per preference #4, but that's a separate concern).
