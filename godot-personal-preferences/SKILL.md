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

## Preferences

### 1. `.tscn` / `.tres` hand-edit calibration

**When this applies**

User asks to change a Godot scene file (`.tscn`) or resource file (`.tres`) — e.g. "tweak the camera FOV", "delete the placeholder node", "swap this resource reference."

**Preferred behavior**

Classify the change before acting:

- **Simple → hand-edit inline + read back to verify**
  - Single property tweak (`fov = 30.2` → `fov = 40.0`)
  - Single-node deletion (one `[node ...]` block)
  - Single resource path swap
  - Single-line script reference change
  - Removing a `property = null` orphan (the null-override gotcha)
  - Sub-resource property setup with **no scene-view spatial feedback** — dropdowns, typed numeric/text fields, NodePath pickers. Even when adding a new sub-resource block, the lack of visual feedback makes inline editing equivalent to (and faster than) walking the user through the Inspector

- **Structural → defer to user (editor-side)**
  - Multi-node moves or scene-tree reorganization
  - Inserting a new node type in the middle of an existing tree
  - Hand-authoring `Transform3D` basis (drifts gray — must come from the editor's normalization)
  - Anything that touches `SubResource` IDs across multiple nodes
  - Changes that require regenerating UIDs

**Why**

Inline edits with read-back are fast and reliable for atomic changes. Structural changes risk silent `.tscn` corruption (orphan references, broken parent-child anchors, mismatched IDs, drift in Transform3D basis) — the editor handles those without those risks.

**How to apply**

Don't ask "should I do this inline or in the editor?" — just classify and act. If borderline, surface the classification ("I'll do this inline since it's a single property; if you'd rather I open the editor, say so").

After any inline `.tscn` edit, immediately Read the file back and verify the change landed as intended — Godot's tscn format has subtle quoting rules that can silently misformat.

**Empirical fallback for unfamiliar sub-resource shapes:** if uncertain about the exact property surface in the current Godot version (training-data drift — see preference #5 on fetching current docs), have the user author **one** instance in the editor as a template-extraction step. Read the serialized form, then propagate inline for any remaining slots. This is the bridge between "structural / defer" and "simple / inline" when you don't know the property surface ahead of time.

---

### 2. F5 verification batching during subagent-driven plan execution

**When this applies**

Executing a multi-task plan via the `superpowers:subagent-driven-development` skill in a Godot project, where individual tasks would otherwise prompt for F5 manual verification. (Whether subagent-driven execution is the right mode at all is gated by preference #8 — plan specificity; this preference presumes that question already answered yes.)

**Preferred behavior**

- **Skip per-task verification scaffolds.** Don't add "USER ACTION: F5 and verify X" steps per-task in subagent dispatches. Don't add temp `print()` calls that get committed and reverted.
- **Add instrumentation working-tree-only.** If verification needs debug prints, overlays, or visualizers, add them in the working tree but DO NOT commit them. Note their existence so they can be reverted in one shot.
- **Batch verification at end-of-plan.** Present a single F5 verification checklist after all tasks complete. User runs through it once.
- **Revert instrumentation on confirmation.** Once user confirms verification passes, revert all working-tree-only instrumentation in a single revert before finalizing.

**Why**

Per-task F5 pauses break the subagent flow (user has to context-switch to the editor for every micro-step) and pollute commits with add-then-revert print noise that defeats the one-commit-per-task discipline. Batching preserves both: clean per-task commits AND single user-attention burst at the end.

**How to apply**

When dispatching subagents during a Godot plan execution:

1. Plan tasks as logical units (not verification gates).
2. If a task needs instrumentation to be verifiable, add it in the working tree without committing.
3. Maintain a running list of "things to verify at the end."
4. Final task: present the F5 checklist + the instrumentation-revert plan.
5. On user OK: revert instrumentation, commit any non-instrumentation residue, mark plan complete.

---

### 3. Explicit invocation of `godot-personal-gotchas` skill

**When this applies**

Any session where I'm working on a Godot project. The skill loader's auto-activation via description matching is too soft to fire reliably on subtle Godot contexts (intent-based triggers, not file-extension triggers).

**Preferred behavior**

Invoke the `godot-personal-gotchas` skill EXPLICITLY via the Skill tool. Don't wait for auto-activation. Specifically invoke it when:

- **A Godot operation produces a silent no-op** (call succeeds, no error, no visible change)
- **A GDScript parser warning fires** (especially Variant-inference warnings)
- **About to hand-edit `.tscn` or `.tres`** files
- **About to change window or display state from script** (`window_set_mode`, mode setters)
- **About to write GDScript using** `clamp`/`min`/`max`/`abs`/`sign`/`floor`/`ceil`/`round` (the un-suffixed variants)
- **About to mutate scenes via MCP tools**
- **Before assuming "I know what's happening"** on any unexpected Godot behavior — check the skill FIRST, not after spending time debugging

**Why**

The skill description matches on file extensions and tooling context, but doesn't fire on intent context ("I'm about to do X risky thing"). Explicit invocation is the safety net — it treats the skill as a checklist, not as overhead.

**How to apply**

Use the Skill tool with `skill: godot-personal-gotchas` proactively. If the skill turns out not to apply to the current task, the cost is small (one tool call). The cost of not invoking it and tripping a known gotcha is much higher (debugging time + the user catching me using an outdated approach).

---

### 4. Public-repo hygiene audit before publishing

**When this applies**

A Godot project is being made public for the first time (open-sourced, deployed as a portfolio demo, pushed to a public GitHub repo, etc.) — OR an existing public Godot project is having new top-level files added.

**Preferred behavior**

Audit `.gitignore` for AI-workflow plumbing and process-scratch BEFORE the public push (not after). The default is: showcase the project, not the workflow.

**Gitignore by default (private):**
- `CLAUDE.md` — project workflow contract for Claude
- `.claude/` — subagents, settings.local.json, any other Claude-tooling files
- `docs/superpowers/{plans,specs}/` — mid-iteration plans and design specs
- One-shot frozen reference docs (session handoffs, authoring guides) under `docs/`
- `.superpowers/` — ephemeral session state

**Keep public (community-valuable):**
- `.mcp.json` — benign config listing which MCP servers
- `docs/godot-mcp-guide.md`, `docs/blender-mcp-guide.md` — useful to other Godot devs
- `docs/godot-gotchas.md` — useful to other Godot devs
- `addons/godot_mcp/` — vendored MCP plugin (standard practice to commit Godot addons)

**Why**

Going public raises the bar. The framing: "showcase the project, not the workflow." MCP guides and gotchas catalog stay because they have community value to other Godot devs; AI plumbing and process scratch is personal-workspace exposure that doesn't serve outside readers.

**How to apply**

When the user signals a public push is imminent ("let's publish this", "I'm pushing to a public repo", "set up the demo deploy") — proactively audit `.gitignore` and surface a punch list before they push. Don't wait for them to ask.

When adding a new top-level doc to an already-public Godot project, ask "should this be public?" before committing — default to private unless there's a clear community-value argument.

---

### 5. Fetch current Godot docs before version-dependent instructions

**When this applies**

Before instructing on Godot 4.x class API specifics (property names, method signatures, sub-resource shapes), Inspector workflow, or version-sensitive editor affordances.

**Preferred behavior**

Run `mcp__godot-mcp__godot_docs fetch_class <ClassName>` (with `--section properties` / `--section description` as needed) to ground the response on the current engine version's docs rather than memory. Especially relevant for:

- AnimationTree dock UI (reworked in 4.6.x — see personal-gotchas #4)
- Skeleton2D modifications (Inspector behavior shifted — see personal-gotchas #11)
- Tween API, EditorPlugin hooks, FileSystem dock affordances
- Anywhere a walkthrough mentions specific button positions, right-click menu entries, or property names by hand

**Why**

Training data skews to older 4.x and Godot 3.x. Subtle API surface shifts in 4.6.x (and beyond) silently change Inspector workflows. Recommending an outdated step burns user trust and often surfaces as "I think you're using outdated info from a past version's docs" — the user calling out the stale answer mid-task. Catching this BEFORE composing the response is cheaper than fixing it after.

**How to apply**

Make the docs fetch proactive, not reactive — before composing the instructions, not after the user pushes back. The MCP tool auto-detects the editor's connected version; even when patch-level detail is unavailable, "stable" returns reasonable answers (minor patches rarely shift property names).

If the public class doc is incomplete (some classes have editor-internal properties that don't appear in the public API surface — e.g. `SkeletonModification2DTwoBoneIK`'s joint fields), use the template-extraction pattern from preference #1: have the user author one instance in the editor, read the serialized form, propagate inline from there. The two preferences compose.

---

### 6. GUT green does NOT mean "all scripts compile"

**When this applies**

About to claim "all scripts compile" or "compile clean" from a green GUT run in a Godot project.

**Preferred behavior**

Don't. GUT only compiles scripts that its tests (or their tested scenes/targets) directly reference. Untested support scripts — camera controllers, overlays, helpers, debug-only autoloads — can carry parse errors invisible to GUT and surface only when F5 instantiates a scene that loads them.

The strongest verification chain pre-F5:

1. **GUT** — unit-tested logic
2. **`godot --headless --path . --check-only --quit`** — exhaustive parse coverage; works when the editor is closed
3. **F5 with `mcp__godot-mcp__godot_editor get_log_messages source="editor"`** (or godot-ai `logs_read` after `project_run`) — runtime errors AND parse errors when scenes load scripts

Layers (1) and (2) overlap with (3) but catch failures earlier and cheaper. Skipping (2) on the basis of (1) is the trap.

**Why**

This is a strict superset of the warnings-as-errors gates that GUT covers. The failure mode: a script authored in an earlier session, never exercised by tests, carries `expf(-rate)` or cross-script-without-`class_name` (personal-gotchas #6 and #12) — invisible until F5 instantiates a scene that loads it. The cost of saying "compile clean" when it isn't is a fresh-session F5 that explodes immediately.

**How to apply**

When the editor is open, prefer `mcp__godot-mcp__godot_editor get_log_messages source="editor"` over `--check-only --quit` — the headless command tries to bind the godot-mcp WebSocket port (6550) and hangs if the editor's already on it, leaving orphan Godot processes. Always `ps aux | grep godot` before re-running headless when the editor is open.

When the editor is closed, `--check-only --quit` is the right tool. When in doubt or under time pressure, spot-read any `.gd` script that's about to be loaded by a scene the user is about to F5 — fastest manual verification.

---

### 7. Adversarial producer/consumer review before committing cross-module wiring

**When this applies**

About to commit a Godot scene/wiring task where the changed code **consumes values produced by another module** — an animation controller reading gameplay state (aim angle, facing, velocity), a UI node binding to sibling nodes, one system driving another via a shared convention. Especially when the contract is implicit: units, sign, coordinate handedness (screen-Y-down vs world), angle wrapping / ±π branch cuts, facing-relative vs world-space.

**Preferred behavior**

After your own headless/automated verification passes, but BEFORE the per-task commit, dispatch a **read-only** review subagent (general-purpose) with an explicit producer/consumer-trace lens: for every gameplay value the changed code consumes, trace it back to its producer and verify the consumer's assumption matches the producer's actual contract. Reconcile the findings, fix, THEN commit. Skip for pure headless-TDD helper tasks that are already test-covered (no cross-module consumption).

**Why**

Solo authoring + self-consistent verification is self-confirming: the author's own check asserts against the author's own (possibly wrong) assumption, so a producer/consumer convention mismatch passes the check and ships. These bugs live OUTSIDE the changed diff — in the contract *between* modules — which is exactly the blind spot an adversarial cross-module review covers. Empirically, one such task shipped three convention-mismatch bugs (a raw screen-space angle fed to a facing-canonical cone; inverted elevation; a linear chase sweeping the long way across the ±π branch cut when facing left) that the author's headless check missed because it asserted against the same wrong assumption.

**How to apply**

Dispatch the subagent read-only over: the changed consumer script(s) + the producer scripts it reads + the scene that wires them. Prompt it specifically to check units / sign / screen-Y-down / angle-wrapping / facing-relative-vs-world for each consumed value — not a generic "review this." Reconcile, fix, commit. Complements the F5-batching discipline (preference #2): F5 catches "does it look right," this catches "is the contract right" before the visual check even runs.

---

### 8. Solo-vs-fan-out: gate on plan specificity, not implementation-vs-exploration

**When this applies**

Deciding whether to keep a piece of work on the main thread (solo, surgical) or fan it out to subagents — at the start of any work unit, before dispatching.

**Preferred behavior**

- **Fan out subagents for exploration, research, and codebase reconnaissance** — always, to keep main context light. Understanding-shaped work is fan-out-by-default.
- **Stay solo and surgical while a plan is still fluid or being discovered.** When requirements are being worked out as the code is written, keep changes on the main thread so the user sees and steers each step and retains full understanding/control.
- **Once a plan is fully specified, subagent-driven execution is fine.** A fully-specified plan means exact code / field tables plus verification commands per task — enough that a controller can curate exact per-task context and dispatch implementers without losing the user's grip on the design.

The discriminator is **plan specificity, not implementation-vs-exploration.** "Implementation stays solo" is the wrong cut: a fully-specified implementation plan is a fine subagent-driven target; a fluid, being-discovered design stays solo even when it's nominally "just implementation."

**Why**

The naive rule "fan out for understanding, stay solo for changing" mis-gates: it forces solo execution even on a fully-specified plan where subagent-driven execution runs cleanly. The real risk being managed is loss of the user's steering and understanding while the design is still fluid — which is a function of how specified the plan is, not whether the work is labeled implementation or exploration.

**How to apply**

Before dispatching, ask: *is the plan fully specified?* If it's exploration/research/recon, fan out. If it's a fluid or being-discovered design, stay solo on the main thread. If it's a fully-specified plan (exact code/field tables + verification commands), subagent-driven execution is appropriate — dispatch one implementer at a time (single-writer-safe for MCP) with the per-task review. This is the gating question that preference #2 (F5 batching) presumes already answered: that preference only kicks in *once* you're in subagent-driven plan execution.

_Confirmed by the circle-combat-prototype project-working-style memory: split confirmed 2026-05-31, discriminator refined 2026-06-02._

---

## Adding new preferences

When a new workflow preference is established (user corrects approach, or user confirms an unusual approach worked):

1. **First — save to per-project memory** as `feedback_<slug>.md` in `~/.claude/projects/<slug>/memory/`. This is the per-project layer, where it accumulates first.
2. **Later — propagate via `sync-godot-skills`** (pair 7: feedback memories ↔ this skill). The sync run handles translation from project-specific to generalized form.

If the preference is clearly generalizable from the start, you can write it here directly — but the curation discipline of "memory first, sync to skill" mirrors the gotcha pattern and is less error-prone.

Section format: title + "When this applies" + "Preferred behavior" + "Why" + "How to apply." Match the existing four entries' structure.

## Boundaries

- **User overrides preferences.** If a user instruction conflicts with a preference here, follow the user. Then surface the conflict — we may need to revise the preference.
- **Project-specific feedback does NOT belong here.** Things tied to a specific repo, a specific contributor, or a specific session belong in per-project memory only. This skill is for workflow rules that apply across all Godot projects.
- **This skill is per-machine.** Other machines and other contributors don't have it. For preferences that should travel with the project, put them in the project's `CLAUDE.md` (which may be gitignored per preference #4, but that's a separate concern).
