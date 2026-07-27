# 81 — AnimatableBody2D with `sync_to_physics`: the `position` setter is silently swallowed

## Symptom

You script-drive an `AnimatableBody2D` (moving platform, kinematic rock, carrier). You set
`global_position` every frame. The node **stays at the origin** — and so does the physics body. No
error, no warning, no push. If you also set `rotation`, the rotation *does* apply, so the object
reports a correct orientation from the wrong place, which reads as "the physics is broken" rather
than "the setter no-oped".

## Cause

`sync_to_physics = true` puts the node under server-driven transform sync, which suppresses the
`position` / `global_position` setters. Two independent conditions have to be satisfied, and each
one alone silently fails:

1. **Which setter.** `position` and `global_position` are swallowed. `rotation`, `transform` and
   `global_transform` all apply. Measured on 4.7 across `position` / `global_position` / `transform`
   / `PhysicsServer2D.body_set_state`:

   | write | result |
   |---|---|
   | `position = v` | node **(0,0)**, rotation applies |
   | `global_position = v` | node **(0,0)**, rotation applies |
   | `transform = Transform2D(r, v)` | applies |
   | `global_transform = Transform2D(r, v)` | applies (correct under a transformed parent too) |
   | `PhysicsServer2D.body_set_state(...)` | applies |

2. **When.** The write only lands from **inside a physics frame** (`_physics_process`, or a node
   whose `_physics_process` you drive). Outside one, even `global_transform` is swallowed — node
   *and* server both stay at identity. Resuming from `await get_tree().physics_frame` is already too
   late: that signal fires at the *end* of the step.

## Fix

Write the whole transform, from inside a physics frame:

```gdscript
func _physics_process(_delta: float) -> void:
    global_transform = Transform2D(my_rotation, my_position)   # NOT global_position = ...
```

If a test or tool needs to drive it, give it a real `_physics_process` driver node rather than
calling the sync function from `_process` or from a `physics_frame` continuation.

## Detect proactively

- `sync_to_physics` set (in script or `.tscn`) on a body whose script also assigns
  `position` / `global_position`.
- A kinematic body that "doesn't move" but whose *rotation* is visibly correct — that asymmetry is
  close to diagnostic on its own.
- A headless test that drives such a body from `_process` and asserts on its transform: it will
  assert against (0,0) forever.

## Confirmed by

space-miner-game, 2026-07-26 (task-130, plane-slice colliders). Godot 4.7.stable, macOS.
Cost ~4 debugging cycles: the collider reported correct orientations from the world origin, and the
first two hypotheses (wrong frame, stale basis) were both wrong.
