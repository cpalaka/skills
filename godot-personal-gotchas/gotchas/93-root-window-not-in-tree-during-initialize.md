# 93 — Under `godot --script`, the root Window is NOT inside the tree during `_initialize`

## Symptom

A headless `SceneTree` test does `get_root().add_child(node)` and then reads `global_transform` /
`global_position`. Every read errors and returns identity:

```
ERROR: Condition "!is_inside_tree()" is true. Returning: Transform3D()
   at: get_global_transform (scene/3d/node_3d.cpp:649)
```

`add_child()` itself succeeds — `get_parent()` returns the Window — so the node looks attached.
`_enter_tree()` never runs, so anything armed there (group membership, `set_notify_transform`,
signal wiring) is silently absent, and an assertion on it fails for a reason that has nothing to do
with what is being tested.

## Cause

`_initialize()` is `MainLoop`'s entry point and runs **before** the root Window is set into the tree.
So `get_root().is_inside_tree()` is `false`, and by transitivity so is every descendant. Probed
directly:

```
root=root:<Window#...> root_in_tree=false
body in_tree=false  notify=false  parent=root:<Window#...>
plain Node3D in_tree=false
```

2D tests get away with this for a long time because a parentless `Node2D`'s global transform equals
its local one, so the wrong answer is usually the right number. 3D code that reads
`global_transform.basis` does not.

## Fix

Express the law under test in a frame that does not require tree membership:

- **Prefer the node's own / its parent's frame.** `transform.basis`, `position`, `transform.basis *
  child.position`. Often this is not a concession — if the quantity was quoted in the parent's space
  to begin with, the local expression is the *more* correct one, and being tree-independent is a
  bonus.
- Do not add the node to `get_root()` at all if you are not relying on tree behaviour; a bare `.new()`
  plus `.free()` is clearer than a node that looks attached and is not.
- Anything that must be armed for every instance (a `set_notify_transform`, a flag) belongs in
  `_init()`, not `_enter_tree()` — then it holds in tests and in production alike, and no instance can
  exist in the un-armed state.
- Delivering a notification by hand for a test is legitimate — `node.notification(Node3D.NOTIFICATION_TRANSFORM_CHANGED)`
  — but it makes every downstream check blind to whether the engine would ever *send* it. Pin the
  subscription separately (`is_transform_notification_enabled()`), or removing
  `set_notify_transform(true)` leaves the suite green.

## Detect proactively

- `get_root().add_child(...)` in any `tests/test_*.gd` followed by a `global_*` read.
- `is_inside_tree()`-guarded engine errors in test output — these are printed but do **not** fail the
  run, so a test can be "green" while every 3D read in it returned identity.
- Family: **headless harness lies** — #26 (`_ready` deferred), #35 (autoloads), #51 (null `get_tree()`),
  #91, #92.

## Confirmed by

space-miner-game, 2026-07-28 (task-097), Godot 4.7.stable — `tests/scene_tree_test.gd`-based suite via
`godot --headless --script`.
