### 46. godot-ai `input_map_manage op=bind_event event_type="key"` binds the LOGICAL keycode, never `physical_keycode`

**Symptom**
- After `input_map_manage op=bind_event event_type="key" keycode="F"`, the action's `project.godot` event is `Object(InputEventKey, ... "keycode":70,"physical_keycode":0 ...)` — a **logical** binding.
- The project's other key actions (e.g. WASD movement bound through the editor) are the inverse: `"keycode":0,"physical_keycode":87` (physical). So the godot-ai-added binding doesn't match the project convention and isn't layout-independent.
- The `bind_event` tool result echoes `"keycode":"F","physical_keycode":""`, confirming it only set the logical field.

**Cause**
godot-ai `bind_event`'s key path takes a `keycode` **name string** (`"A"`, `"F"`, `"Space"`, …) and writes only the logical `keycode`; it has **no** `physical_keycode` parameter. The editor's own Input Map UI, by contrast, records a **physical** binding by default when you press a key — so the same key bound two ways produces different `project.godot` serializations (tool vs. editor-UI mismatch). `project_manage op=settings_set` can't cleanly fill the gap either: the value is an array of `InputEventKey` *objects*, which doesn't coerce from a plain JSON dict.

**Fix**
To get a physical binding (to match a WASD-style physical convention, or for keyboard-layout independence), either:
- Add the binding through the **editor's Input Map UI** (press the key — it records physical), or
- Surgically edit `project.godot`: swap `"keycode":N,"physical_keycode":0` → `"keycode":0,"physical_keycode":N` on that action's event. `project.godot` is an INI config (NOT a `.tscn`/`.tres`, NOT `.godot/` cache), so a targeted two-integer swap is low-risk — match the exact `Object(InputEventKey, ...)` field layout of a sibling physical action, and verify on disk.

Note: if the editor is open, its in-memory ProjectSettings still holds the logical binding after a disk edit, but the **game reads `project.godot` from disk at F5**, so the running game gets the physical binding. Avoid triggering an editor ProjectSettings save (which would rewrite the logical version) before the game runs; scene saves don't touch `project.godot`.

**Detect proactively**
- After any key `bind_event`, if the project uses physical bindings, read the action back from `project.godot` — godot-ai's `"keycode":N,"physical_keycode":0` won't match the `"keycode":0,"physical_keycode":N` siblings.
- For a binding that only needs to work on your own standard-layout machine and isn't perf/convention-critical, the logical binding is functionally fine — fix only when layout-independence or convention-consistency matters.

**Confirmed by**
2026-06-25, `space-miner-prototype` (Godot 4.7-stable, godot-ai v2.7.5) — binding `light_toggle` to F via `bind_event` wrote `"keycode":70,"physical_keycode":0`; the project's WASD actions use `"keycode":0,"physical_keycode":N`. Reconciled with a one-line `project.godot` swap to `"keycode":0,"physical_keycode":70`. Sibling to #45 (same `input_map_manage` tool, the read-side `list` quirk).
