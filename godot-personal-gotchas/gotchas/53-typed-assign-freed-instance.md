# 53 — Typed assignment of a previously-freed instance faults on the READ, before any is_instance_valid guard

## Symptom

`SCRIPT ERROR: Trying to assign invalid previously freed instance` fires on a line that
merely **reads** a stored Object reference into a **typed** local or property:

```gdscript
var t: Object = _prev_intent["target"]          # <-- faults here
if is_instance_valid(t) and t is Node2D:        # the guard never gets a chance to run
    ...
```

The reference was valid when stored (in a Dictionary, array, or member `var`) but the object
has since been freed (`free()` / `queue_free()` completed). The `is_instance_valid()` guard on
the *next* line looks like it should protect the access — but the fault is on the typed
assignment itself, one line earlier. Parses clean, so `--headless --check-only` and the LSP
(`get_diagnostics`) both report nothing — it is a runtime/load-time fault only.

Also fires on `var n: Node2D = some_member`, `var c: MyClass = dict[k]`, function calls passing a
freed instance into a typed parameter, and typed `@export`/property assignment — anywhere a freed
instance is bound to a *statically typed* slot.

## Cause

Assigning to a **typed** variable/property in Godot 4.x validates the source Variant against the
declared type (`Object`, `Node2D`, a `class_name`, …). Validating a *previously-freed* instance
faults — the freed-instance check happens **during the typed read**, so a guard placed *after* the
read is too late. `Object` (the root type) is enough to trigger it; it is not specific to narrow
types.

An **untyped** read — `var t = ...` or the explicit `var t: Variant = ...` — copies the Variant
verbatim with **no** validation. `is_instance_valid(t)` then safely returns `false` for the freed
instance, and an `and`-chain (`is_instance_valid(t) and t is Node2D and ...`) short-circuits before
any `is` / property / `is_queued_for_deletion()` access touches the freed node.

## Fix

Read possibly-freed stored references **untyped** first, then guard:

```gdscript
var t: Variant = _prev_intent["target"]   # untyped copy — no validation
if is_instance_valid(t) and t is Node2D and not (t as Node2D).is_queued_for_deletion():
    var n := t as Node2D                  # NOW it's safe to bind typed
    ...
```

`is_instance_valid` FIRST in the `and` chain is load-bearing: it short-circuits the `is` and
method calls, which would themselves fault on a freed instance.

## Detect proactively

Grep changed `.gd` for a **typed** local/property assignment whose right-hand side is a stored
Object reference that can outlive its target — a Dictionary/array index or a member holding a node
ref — especially when an `is_instance_valid(...)` guard sits on the *following* line (the guard is
too late if the read is typed). Any long-lived "committed target / last-seen / cached node" ref
freed elsewhere in its lifecycle is the classic setup.

## Confirmed by

space-miner-prototype, 2026-07-02 — a committed mining target (an asteroid) is mined to death and
freed; the next frame a typed read of `..._intent["target"]` faulted with the exact message. Exposed
once the WORK loop ran to completion (task-009 closed the mine→collect→return→deposit loop). The
original code even commented "is_instance_valid FIRST" — the author knew the guard was needed but not
that the *typed read* faults before it.

**It was a MULTI-SITE bug — the same freed reference is read at every point in its lifecycle.**
The first fix touched only `buddy.gd:109` (`_sense_cheap`); the crash immediately recurred one frame
later at `buddy_brain.gd:28` (`step`, `var target: Object = prev["target"]`) — and would have hit a
THIRD site, the typed **parameter** `_intent_for(target: Object, …)`, which the §8 dead-target COLLECT
path feeds the freed ref into (a typed parameter binding is a typed assignment too). Lesson: on the
first hit, **grep the whole codebase for the pattern and fix every site in one pass** — every place
that stores, reads, or receives the ref must go untyped, not just the line that happened to crash.
Fixes: `var …: Variant`, param `target: Variant`. Regression guards: `tests/test_buddy_sense.gd`
(controller `_sense_cheap` seam) and `tests/test_buddy_brain.gd` I1 (pure `step()` seam) — both build
`prev` while the target is alive, then free it, then step (red → green).
