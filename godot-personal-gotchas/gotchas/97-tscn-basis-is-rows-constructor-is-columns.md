# 97 — A `Transform3D` copied out of a `.tscn` into a constructor is TRANSPOSED

## Symptom

You copy an authored transform from a `.tscn` into GDScript to bake it as a constant — same twelve
numbers, same order, carefully checked — and the node ends up **facing the wrong way**. A
`DirectionalLight3D` shines up instead of down; a camera looks backwards; a rig that "matches" the
authored one lights nothing. Nothing errors, nothing warns, and the constant *reads* correct
against the file it was copied from.

The failure is pure LOOK, which is the worst place for it: the symptom is something a human is
asked to judge rather than to notice, and the natural conclusion is "the lighting design is wrong",
not "the copy is transposed".

## Cause

They are two different orderings of the same twelve floats:

- **`.tscn` text** serialises the basis as **ROWS** —
  `transform = Transform3D(xx, xy, xz, yx, yy, yz, zx, zy, zz, ox, oy, oz)` are `basis[0]`,
  `basis[1]`, `basis[2]`, i.e. the rows of the matrix (Godot's `Basis` stores rows internally).
- **The GDScript constructor** `Transform3D(x_axis, y_axis, z_axis, origin)` takes **COLUMNS** —
  `basis.x`, `basis.y`, `basis.z` are the basis *vectors*, which are the matrix's columns.

So the digits round-trip fine through Godot's own parser (it reads what it wrote), and transpose
the moment a human retypes them into the constructor. For a rotation the transpose is the INVERSE,
so the result is a plausible-looking orientation pointing the opposite way — not garbage, which is
why it survives review.

MEASURED (Godot 4.7-stable, space-miner-game, 2026-08-02). `sun_rig_layer.tscn` carries
`transform = Transform3D(1, 0, 0, 0, 0, 1, 0, -1, 0, 0, 300, 0)`:

| | `basis.x` | `basis.y` | `basis.z` | emit dir (`-basis.z`) |
|---|---|---|---|---|
| authored (loaded from the `.tscn`) | `(1,0,0)` | `(0,0,-1)` | `(0,1,0)` | `(0,-1,0)` — **down** |
| `Transform3D(Vector3(1,0,0), Vector3(0,0,1), Vector3(0,-1,0), …)` | `(1,0,0)` | `(0,0,1)` | `(0,-1,0)` | `(0,1,0)` — **up** |

`is_equal_approx` → `false`. The fill light shone away from the scene for the whole first cut.

## Fix

**Don't copy a basis by hand.** Pin the coupling instead — load the authored scene and assert your
baked constant against it, so a transpose reds a test instead of dimming a picture:

```gdscript
var rig := (load(SUN_RIG_SCENE) as PackedScene).instantiate()
var fill: DirectionalLight3D = rig.get_node("Rig/SunFill")
_assert(fill.transform.is_equal_approx(OneCam.FILL_TRANSFORM), "baked fill == authored fill")
# ...and assert the CONSEQUENCE separately — which way it actually emits. A transform equality
# can be made to pass while nobody has checked the thing the rig exists to do.
_assert((-OneCam.FILL_TRANSFORM.basis.z).y < 0.0, "fill emits downward")
```

If you must transcribe: read the axes off a LOADED instance (`t.basis.x/.y/.z`) and feed those three
vectors to the constructor — never the `.tscn`'s digit order. Or sidestep it entirely and
`preload()` the scene, taking the transform at runtime (#87: `preload().CONST` is legal, and a
loaded node's property is likewise free).

## Detect proactively

Greppable: a `Transform3D(` / `Basis(` constructor call with **nine or twelve numeric literals** in
a `.gd` file is nearly always a hand-copied matrix. Flag it and ask where the numbers came from; if
the answer is a `.tscn`, it is transposed until proven otherwise. (The 3-argument
`Basis(axis, angle)` and `Basis(x, y, z)` vector forms are fine — it is the flat literal spill that
signals a transcription.)

Also: any comment of the form "values copied from `<file>.tscn`" is this gotcha waiting to happen,
whether or not it is a basis — copied values want a test that pins them to the source.

## Confirmed by

space-miner-game 2026-08-02, task-165 (branch `feat/task-165`, `src/core/dev/onecam/onecam.gd`
`FILL_TRANSFORM`): baked from `sun_rig_layer.tscn`'s digit order, transposed, emitted `+Y` away
from the scene; caught in code review, measured headless, fixed, and pinned by
`tests/test_onecam_lighting_parity.gd` — calibrated by restoring the defect (2 checks red) and
re-fixing. The source file carried a header explicitly warning that reading only the `.gd` "would
have silently produced a one-light rig"; the transpose produced one anyway.
