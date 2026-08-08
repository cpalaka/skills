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
| 1 | Asked to edit a `.tscn` (or `.tres`) file | Hand-edit inline + read-back for atomic changes (single property, single-node delete, single resource ref). Defer to the editor only for structural restructures (multi-node moves, tree reorg, Transform3D basis). Template-extract a slot in-editor if property names are uncertain |
| 2 | Executing a fully-specified multi-task plan via subagent-driven execution in a Godot project | Skip per-task F5/USER-ACTION verification scaffolds. Batch all manual verification at end-of-plan. Add prints/instrumentation working-tree-only; revert on user confirmation |
| 4 | Godot project is or is about to become public (open-source, demo deployment, portfolio piece) | Audit `.gitignore` for AI-workflow plumbing + process-scratch before pushing publicly. Hide: `CLAUDE.md`, `.claude/`, `docs/superpowers/`, plan/spec scratch, frozen handoffs. Keep: `.mcp.json`, MCP guides, gotchas catalog, vendored addons |
| 5 | Before instructing on Godot 4.x class API specifics, Inspector workflow, or sub-resource property names | Fetch docs before composing — never from memory. godot-ai `api_manage(op="get_class")` for live ClassDB **metadata** (property/method/signal names — what sub-resource work needs); godot-mcp `godot_docs` for the **prose** ClassDB lacks. Training-data drift to older 4.x/3.x is the failure mode |
| 6 | About to claim "all scripts compile" or "compile clean" from a green GUT run | Don't — GUT only compiles what its tests touch. Parse coverage: `--headless --check-only --quit`, or godot-ai `logs_read source="editor"` if it's open (**not** godot-mcp's `get_log_messages source="editor"` — phantom, silently stripped). Neither catches runtime-compile errors; use a preload-smoke test (#44, #96) |
| 7 | About to commit a wiring task whose changed code consumes values produced by another module | After your own verification, BEFORE committing, dispatch a read-only adversarial subagent to trace each consumed value to its producer and check the convention (units, sign, screen-Y-down, ±π branch cut, facing-vs-world). Solo verification asserts against your own assumption, missing mismatches outside the diff |
| 8 | Deciding whether to stay solo on the main thread or fan out subagents for a piece of work | Discriminator is **plan specificity, not implementation-vs-exploration**. Fan out for exploration/research/recon regardless. While a plan is still fluid, stay solo and surgical so the user steers each change. Once **fully specified** (exact code / field tables + verification commands), subagent execution is fine |
| 9 | About to smoke-verify a task that flips a project-wide or global setting | Scope the smoke to the setting's FULL blast radius — every node-type/subsystem it touches, not the feature's obvious surface. Headless is structurally blind to render-time settings, so the human F5 is the only gate; a regression in a *different* subsystem signs off clean. Enumerate the radius first, then verify each |
| 10 | About to hand a visual/feel change (lighting, shader, LUT, compositing) to the user for an F5 round | First capture engine-side framebuffer A/B shots yourself and eyeball them: a `--shot=<abs path>` cmdline hook (`get_viewport().get_texture().get_image().save_png()` + quit) per variant, then Read the PNGs. OS `screencapture` and embedded MCP capture (#43) both fail here. Hand off only once it visibly reads |

**Retired — do NOT reinstate:** 3 (explicit gotcha invocation / skill loader; the loader fires reliably now). Body kept at `preferences/3-*.md`; numbers are never reused.

The index rows above are the active rules. When a row's "Situation" matches the current task and you need the full When-this-applies / Why / How-to-apply detail (edge cases, classification criteria), Read the matching `preferences/N-<slug>.md` file before acting — each file is named by its preference number (e.g. preference #3 lives at `preferences/3-*.md`).

## Adding new preferences

To add a new preference (one new index row + one `preferences/N-<slug>.md` body, memory-first curation), follow [`ADDING.md`](ADDING.md).

## Boundaries

- **Project-specific feedback lives in per-project memory only.** Things tied to a specific repo, a specific contributor, or a specific session stay there; this skill is for workflow rules that apply across all Godot projects.
- **Portable preferences travel via the project.** This skill is per-machine — for rules that should follow a project to other machines and contributors, put them in the project's `CLAUDE.md` (which may be gitignored per preference #4, but that's a separate concern).
