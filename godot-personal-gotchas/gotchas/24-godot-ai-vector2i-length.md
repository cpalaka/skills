### 24. godot-ai `node_set_property` can't write a `Vector2i` — v2.5.x sets the container's LENGTH; v2.7.2+ silently no-ops

**FIXED upstream in godot-ai 2.8.0 (PR #582, merged 2026-06-23).** The merged `_coerce_value` (`node_handler.gd:697`) now has explicit `Vector2i`/`Vector3i`/`Vector4i` branches (`:813`/`:816`) and `_check_coerced` strict-checks them (`:568`–`569`); the response echo is at `:274`. On **2.8.0+** a dict/array writes the integer-vector property correctly. Everything below is the **PRE-2.8.0 behavior (v2.5.x–2.7.6)**, kept for anyone on an older godot-ai. (Cites verified against the merged 2.8.1 source.)

**Symptom**
Setting a `Vector2i` property via godot-ai (e.g. `SubViewport.size`) silently produces the wrong result. **v2.5.x:** dict `{"x":256,"y":256}` → `Vector2i(2,2)` (key count), array `[256,256]` → `Vector2i(2,2)` (length), string `"Vector2i(256, 256)"` → no-op; any 2-element container → `(2,2)` regardless of values. **v2.7.2+:** the length mangling is gone — every form should silently no-op (property keeps its old value) while the tool reports success; the response echoes the live property value (`node_handler.gd:280`), which is the one tell.

**Cause**
godot-ai's value coercion doesn't handle `Vector2i`. v2.5.x coerced to the container length. v2.7.2+ (verified in the v2.7.5 source) has NO `Vector2i`/`Vector3i`/`Vector4i` branch in `_coerce_value` (`node_handler.gd:657-762`) and `_check_coerced`'s wildcard waves integer-vector targets through (`:546-572`), so the raw JSON container reaches the engine un-coerced and the assignment is rejected (engine-side rejection inferred from source, not yet reproduced live). Element-wise `Vector2i` coercion exists only on the UI `build_layout` path (`ui_handler.gd:484-491`). **`Vector3` is unaffected** (a dict sets `Camera3D.position` correctly the same session), so it's specific to the integer-vector path.

**Fix**
Hand-edit the `Vector2i` line in the `.tscn` (`size = Vector2i(256, 256)`). If the scene is open, the editor holds a stale copy — close+reopen+save resync (don't `scene_save` over the hand-edit first).

**Detect proactively**
When a godot-ai `node_set_property` targets a `Vector2i`-typed property (`SubViewport.size`, `size_2d_override`, TileMap cell coords, …), assume it won't land — set it by hand and read back the `.tscn`. Sibling to the godot-mcp `Rect2` no-op (#15): both struct-coercion gaps, different MCP server.

**Confirmed by**
2026-06-02 — `circle-combat-prototype` animation slice Task 3, `SubViewport.size` on `scenes/character_puppet.tscn`, godot-ai 2.5.13 / Godot 4.6.2. See memory `gotcha-godot-ai-vector2i-length.md`.

2026-06-12 — CHANGED, re-verified against the godot-ai v2.7.2 source: the v2.5.x length-coercion path no longer exists (zero integer-vector hits in `node_handler.gd`); v2.7.2 behavior is a silent no-op instead of `(2,2)`. Fix unchanged. Not yet reproduced live on v2.7.2.

2026-06-18 — UNCHANGED from v2.7.2, re-anchored to godot-ai **v2.7.5** on Godot **4.7**: still no `Vector2i`/`Vector3i`/`Vector4i` branch in `_coerce_value` (`node_handler.gd:657-762`); `_check_coerced` wildcard passes integer-vector targets through (`:546-572`). Silent-no-op behavior identical to v2.7.2. Unaffected by Godot 4.7.

2026-06-29 — **FIXED.** PR #582 merged upstream 2026-06-23, shipped in **godot-ai 2.8.0**. Merged `node_handler.gd`: `_coerce_value:697` adds the `Vector2i`/`Vector3i`/`Vector4i` branches (`:813`/`:816`); `_check_coerced` strict-checks them (`TYPE_VECTOR2I`/`TYPE_VECTOR3I` at `:568`/`:569`); echo at `:274`. The silent no-op is now pre-2.8.0 history. Verified against the merged 2.8.1 source.
