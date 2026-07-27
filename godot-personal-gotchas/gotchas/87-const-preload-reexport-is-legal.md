### 87. `const X := preload("….gd").CONST` **is** legal — you do not have to repoint readers at a generated script

**Symptom**
- Not a failure — a **capability wrongly assumed absent**, which costs a much bigger refactor than the thing it avoids. The shape people talk themselves out of:

  ```gdscript
  class_name ShapeClassProbe
  extends RefCounted
  const TABLE := preload("res://gen_table.gd").TABLE   # legal as a const initializer
  ```

- Believing it illegal, you either duplicate the generated data into the hand-authored script (and it goes stale), or repoint **every** internal call site and external reader at the generated file, turning a one-line re-export into a codebase-wide rename.

**Cause**
`preload()` resolves at parse time, so a `const` initializer may index into another script's `const`. Nothing about `class_name`, `static func`, or being read from outside changes that. The belief that it fails usually comes from generalising a *runtime* `load()` restriction, or from a JSON-backed pipeline where the real problem was the data format, not the const.

**Fix / what is actually guaranteed** — measured on 4.7, all three properties a generate-into-its-own-file pipeline needs:

1. **Legal as a const initializer** — in a bare `SceneTree` script *and* in a `class_name` + `static func` script.
2. **The re-exported const reads from OUTSIDE** — `SC.TABLE.size()` works through a plain `preload()` of the *re-exporting* script, so existing external readers need no edit.
3. **Ints survive** — `octaves` and `lobes[0]` both come back `typeof == TYPE_INT`. The const path is a `.gd` literal, **not** JSON. (JSON remains int-lossy: `JSON.parse_string('{"octaves": 3}')` → `3.0` — if a generator emits JSON, the type layer is yours to rebuild.)

So the generated const can live in `<thing>_table.gd`, the hand-authored script re-exports it in one line, and neither the internal call sites nor the external readers move.

**Detect proactively**
Any design note that says a generated table "must be read directly by every consumer", or that a hand-authored script "can't re-export" one — check the assumption before it drives a rename. Same reflex when a pipeline reaches for JSON to hand data between generator and consumer: JSON costs you integer types (and needs a hand-written type layer), a generated `.gd` const does not.

**Confirmed by**
2026-07-27, Godot v4.7.stable.official (`5b4e0cb0f`) — isolated throwaway project (bare `project.godot` + two scripts), all three properties above exercised explicitly. Sibling #88 covers the two traps hit while building that probe. Filed from `space-miner-game` memory `gdscript-const-preload-reexport` via `/audit-godot-parity`; consumed there by spec draft-010 C7b / task-147.
