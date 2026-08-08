### 52. godot-ai `node_set_property` on a typed `Array[T]` export serializes an UNTYPED literal that fails to load — `node_get_properties` lies (shows it populated)

**Status:** retired 2026-08-08 — fixed upstream in godot-ai 3.1.3 (`_coerce_typed_array`, with a
hard error naming the failing element index). Body kept for a pre-3.1.3 pin, but **the Fix section
below is now actively harmful**: it prescribes a `.tscn` hand-edit — this fleet's
highest-risk operation (preference #1, gotcha #102) — to dodge a bug that no longer exists.
**Un-retire if** a project pins godot-ai < 3.1.3.

> **FIXED upstream — godot-ai ≥ 3.1.3. Do NOT follow the Fix section below on a current
> install: it tells you to hand-edit a `.tscn` to work around a bug that no longer exists.**
> `handlers/node_handler.gd:260` now routes typed-Array slots into `_coerce_typed_array`
> (`:929`), which coerces element-by-element into a staging array, bulk-moves it with
> `out.assign(staging)`, and **hard-errors naming the failing element index** if the
> post-assign size differs — the documented backstop against a partial write. Object elements
> are handled too (`_coerce_object_element`), with a twin path for resources at
> `handlers/resource_handler.gd:375-395`. godot-ai now emits the typed form itself.
> **Why the old fix is worse than useless now:** hand-editing a `.tscn` is this project's
> explicitly-calibrated highest-risk operation (preference #1), and gotcha #102 measured an
> open editor silently re-clobbering exactly such an edit — inside a fully-gated, signed-off
> branch. So the instruction below directs an agent to perform the riskiest available
> operation, on an open scene, in exchange for zero benefit.
> Everything below is pre-fix history, kept for projects pinned to godot-ai ≤ 2.8.x.

**Symptom**
- You set a script's typed-array export — e.g. `@export var beam_paths: Array[NodePath] = []` — via godot-ai `node_set_property` with a JSON list (`["../Foo/Bar"]`). The call "succeeds" (`old_value:[]`, `value:["../Foo/Bar"]`), and `node_get_properties` reads it back as a size-1 `Array` with the right contents. Looks correct.
- But the SAVED `.tscn` serializes it as a **plain untyped array literal**: `beam_paths = ["../Foo/Bar"]` — raw string elements, NOT the typed `Array[NodePath]([NodePath("../Foo/Bar")])` form.
- At **load** (F5 / export / `PackedScene.instantiate()`), that untyped literal **fails to assign to the typed export** and the property loads **empty** — silently, no error. Whatever reads it (an `_ready()` that resolves the paths, a `_draw()` that loops the array) does nothing. A feature that "worked in the editor" ships broken.

**Cause**
The bridge coerces the JSON list to an **untyped** `Array` (element type `String` for a `NodePath` slot) and sets it on the node. The in-memory value is accepted (so `node_get_properties` reports it — the read **lies**), but on save Godot serializes the actual untyped array as a bare `[...]` literal. A typed `Array[T]` export **rejects an untyped array literal** at scene-load `Object.set()` time — this is #18 (typed-array assignment) firing in the *scene-load* path — so the export stays at its `[]` default. Confirmed on godot-ai 2.8.1 / Godot 4.7; sibling to #24 (the bridge's `Vector2i` coercion gap) and #18 (the underlying rejection).

**Fix**
Write the **typed** serialization, which loads correctly:
```
beam_paths = Array[NodePath]([NodePath("../Foo/Bar")])   # loads as a typed size-1 Array[NodePath]
```
The bridge won't emit this, so:
- Hand-edit the `.tscn` line to the typed form, then **force the editor to re-read from disk** so its stale in-memory (untyped) copy can't clobber it on the next save — `scene_open` a *different* scene, then `scene_open` back (a plain re-save from the untyped in-memory value re-breaks it). After the re-read the in-memory value is properly typed and future saves preserve it.
- OR set the array in the editor Inspector by hand (the editor writes the typed form).

**Detect proactively**
Any time you set a `class_name`-script's typed `Array[T]` export (`Array[NodePath]`, `Array[Vector2]`, `Array[SomeResource]`, …) through godot-ai, do NOT trust `node_get_properties` — it shows the in-editor value, not what will load. Verify with a **load-probe**: `var n := load("res://…").instantiate(); assert(n.prop.size() == expected)`, or grep the saved `.tscn` for `prop = [` (untyped, BROKEN) vs `prop = Array[T]([` (typed, OK). A bare `Object.set("prop", ["…"])` on the scripted node reproduces the empty-load in one line (typed export → `size()==0`).

**Confirmed by**
2026-07-01, `space-miner-prototype` (godot-ai 2.8.1, Godot 4.7-stable). task-005 set `AccentOverlay.beam_paths`/`vacuum_paths` (`Array[NodePath]`) via `node_set_property`; `node_get_properties` showed size-1 but the saved `main.tscn` had `beam_paths = ["…"]`. A probe (`Object.set` with the untyped array → `size()==0`; a fixture `.tscn` with `Array[NodePath]([NodePath("…")])` → `size()==1`) proved the untyped form loads empty and the typed form loads. Fixed by hand-editing to the typed literal + scene_open-away-and-back re-read.
