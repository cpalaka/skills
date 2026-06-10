### 24. godot-ai `node_set_property` sets a `Vector2i` to the container's LENGTH, not its values

**Symptom**
Setting a `Vector2i` property via godot-ai (e.g. `SubViewport.size`) silently produces the wrong value: dict `{"x":256,"y":256}` → `Vector2i(2,2)` (key count), array `[256,256]` → `Vector2i(2,2)` (length), string `"Vector2i(256, 256)"` → no-op. Any 2-element container → `(2,2)` regardless of values.

**Cause**
godot-ai's `Vector2i` value-coercion reads the container length instead of the `x`/`y` components. **`Vector3` is unaffected** (a dict sets `Camera3D.position` correctly the same session), so it's specific to the `Vector2i` path.

**Fix**
Hand-edit the `Vector2i` line in the `.tscn` (`size = Vector2i(256, 256)`). If the scene is open, the editor holds a stale copy — close+reopen+save resync (don't `scene_save` over the hand-edit first).

**Detect proactively**
When a godot-ai `node_set_property` targets a `Vector2i`-typed property (`SubViewport.size`, `size_2d_override`, TileMap cell coords, …), assume it'll be mangled — set it by hand and read back the `.tscn`. Sibling to the godot-mcp `Rect2` no-op (#15): both struct-coercion gaps, different MCP server.

**Confirmed by**
2026-06-02 — `circle-combat-prototype` animation slice Task 3, `SubViewport.size` on `scenes/character_puppet.tscn`, godot-ai 2.5.13 / Godot 4.6.2. See memory `gotcha-godot-ai-vector2i-length.md`.
