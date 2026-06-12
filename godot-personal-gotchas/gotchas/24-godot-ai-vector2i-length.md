### 24. godot-ai `node_set_property` can't write a `Vector2i` — v2.5.x sets the container's LENGTH; v2.7.2 silently no-ops

**Symptom**
Setting a `Vector2i` property via godot-ai (e.g. `SubViewport.size`) silently produces the wrong result. **v2.5.x:** dict `{"x":256,"y":256}` → `Vector2i(2,2)` (key count), array `[256,256]` → `Vector2i(2,2)` (length), string `"Vector2i(256, 256)"` → no-op; any 2-element container → `(2,2)` regardless of values. **v2.7.2:** the length mangling is gone — every form should silently no-op (property keeps its old value) while the tool reports success; the response echoes the live property value (`node_handler.gd:280`), which is the one tell.

**Cause**
godot-ai's value coercion doesn't handle `Vector2i`. v2.5.x coerced to the container length. v2.7.2 (verified in source) has NO `Vector2i`/`Vector3i`/`Vector4i` branch in `_coerce_value` (`node_handler.gd:657-762`) and `_check_coerced`'s wildcard waves integer-vector targets through (`:546-572`), so the raw JSON container reaches the engine un-coerced and the assignment is rejected (engine-side rejection inferred from source, not yet reproduced live). Element-wise `Vector2i` coercion exists only on the UI `build_layout` path (`ui_handler.gd:484-491`). **`Vector3` is unaffected** (a dict sets `Camera3D.position` correctly the same session), so it's specific to the integer-vector path.

**Fix**
Hand-edit the `Vector2i` line in the `.tscn` (`size = Vector2i(256, 256)`). If the scene is open, the editor holds a stale copy — close+reopen+save resync (don't `scene_save` over the hand-edit first).

**Detect proactively**
When a godot-ai `node_set_property` targets a `Vector2i`-typed property (`SubViewport.size`, `size_2d_override`, TileMap cell coords, …), assume it won't land — set it by hand and read back the `.tscn`. Sibling to the godot-mcp `Rect2` no-op (#15): both struct-coercion gaps, different MCP server.

**Confirmed by**
2026-06-02 — `circle-combat-prototype` animation slice Task 3, `SubViewport.size` on `scenes/character_puppet.tscn`, godot-ai 2.5.13 / Godot 4.6.2. See memory `gotcha-godot-ai-vector2i-length.md`.

2026-06-12 — CHANGED, re-verified against the godot-ai v2.7.2 source: the v2.5.x length-coercion path no longer exists (zero integer-vector hits in `node_handler.gd`); v2.7.2 behavior is a silent no-op instead of `(2,2)`. Fix unchanged. Not yet reproduced live on v2.7.2.
