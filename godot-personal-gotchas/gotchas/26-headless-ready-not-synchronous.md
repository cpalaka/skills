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

**Confirmed by**
2026-06-04 — `circle-combat-prototype`. Harness flagged as "unproven" in the uppercut plan; worked on first try. The `_ready`-not-synchronous quirk cost a debug cycle in an integration test. See memory `godot-headless-test-harness.md`.
