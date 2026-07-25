### 26. Headless test harness: `_ready` not synchronous in `_initialize`

**Symptom**
- Running a headless GDScript test that `extends SceneTree`, adds a node in `_initialize()`, and immediately asserts against its initialized state — the assertions see uninitialized/default values, as if `_ready()` never ran.
- No error, no warning: `add_child(node)` succeeds, but the node's `_ready()` has not fired yet.

**Cause**
In `SceneTree._initialize()`, a node's `_ready()` is NOT fired synchronously after `add_child(node)`. `_initialize` runs before the tree processes ready notifications, so full-lifecycle assertions placed right after `add_child` run against a not-yet-ready node.

**Fix**
- Call `node._ready()` explicitly after `add_child(node)`, OR do the assertions in the first `_process(delta)` (which runs after the tree has processed ready notifications).
- To test input handlers without a real mouse, construct InputEvents directly — `InputEventMouseMotion.new()` with `.relative`, `InputEventMouseButton.new()` with `.button_index` / `.pressed` — and feed them to `node._unhandled_input(ev)` (godot-mcp `godot_input` cannot inject mouse motion/buttons).

**How to run**
The harness is `--headless --path . --script res://tests/foo.gd`, where `foo.gd` `extends SceneTree` with `func _initialize()` as the entry point and `quit(code)` for exit status — confirmed working in Godot 4.6.2, including with the editor open on the same project. Invoke with your Godot binary path (Godot is often not on `PATH`).

**Detect proactively**
In any headless `SceneTree` test, grep for lifecycle assertions placed in `_initialize()` right after an `add_child` — `grep -nA4 'add_child' tests/*.gd` — and check whether the following lines assert against `_ready()`-initialized state; move those into the first `_process(delta)` (tree live) or call `node._ready()` explicitly. Sibling to #51 — the stronger `get_tree()`-is-null variant of the same `_initialize`-tree-not-live root cause.

**Confirmed by**
2026-06-04 — `circle-combat-prototype`. Harness flagged as "unproven" in the uppercut plan; worked on first try. The `_ready`-not-synchronous quirk cost a debug cycle in an integration test. See memory `godot-headless-test-harness.md`.

2026-07-25 — **re-verified live on Godot 4.7.stable**: a `SceneTree._initialize` that calls `root.add_child(probe)` reads `ready_fired = false` immediately after, and `true` after a single `await process_frame`. Unchanged from 4.6.2.
