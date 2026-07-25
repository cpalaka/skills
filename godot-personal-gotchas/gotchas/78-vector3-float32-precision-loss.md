# 78 — `Vector3`/`Vector2` are FLOAT32, so routing float64 scalar math through them silently loses precision

## Symptom

A refactor that replaces a scalar float expression with a vector-math equivalent — same formula, same
inputs, provably identical algebra — silently changes the result in **every** case, by a small
relative amount (~1e-7). Nothing errors, nothing warns, the typecheck is clean, and the tests stay
green because they were written with `is_equal_approx`.

Measured instance (space-miner-game, task-136): the asteroid radius field's base term went from

```gdscript
return _r * (1.0 + _amp * _noise.get_noise_3dv(d * _r))          # scalar float64
```

to a mathematically-equal ray/ellipsoid solve routed through `Vector3`:

```gdscript
var u := basis * d
u = Vector3(u.x / axes.x, u.y / axes.y, u.z / axes.z)            # <-- float32 from here on
...
return (-uw + sqrt(disc)) / uu
```

For the unit-sphere case the solve returns exactly `R` in exact arithmetic. In practice it disagreed
with the float64 value in **2000 of 2000 sampled directions**, worst relative error **1.26e-7** at
`R = 130.0` and **1.73e-7** at `R = 130.7`. Around float32 epsilon (1.19e-7), as expected.

The dangerous part is what it moves. A radius field feeds a `contains(p)` membership test; a ~1e-7
shift flips boundary decisions, which changes which lattice samples land inside a body, which changes
per-cell volumes — for every previously-saved body, silently.

## Cause

Godot builds `Vector2`/`Vector3`/`Vector4`/`Basis`/`Transform*`/`Quaternion` out of `real_t`, which is
**32-bit `float`** in every standard build. Only a build compiled with `precision=double` makes
`real_t` 64-bit, and nobody is shipping one.

GDScript's bare `float` is a different thing — it is always **64-bit**. So the moment a value passes
through a `Vector3` component it is rounded to float32 and rounded back on the way out, and the
language gives no signal at all: `var x: float = some_vec.x` is a perfectly typed assignment.

Confirm it in one line:

```gdscript
print("%.20f  %.20f" % [130.7, Vector3(130.7, 0, 0).x])
# 130.69999999999998863132   130.69999694824218750000
```

Note that a float32-representable constant (`130.0`, `0.5`, `64.0`) survives the round trip intact —
so a test fixture built on round numbers will show the representation as lossless and hide the issue.
The *arithmetic* still runs at float32 regardless, which is where the 2000/2000 above came from.

## Fix

Keep values that need float64 out of vector types on that path.

1. **Short-circuit the exact case.** Where a common input has a closed-form answer, compute it in
   scalar float64 and never enter the vector math:

   ```gdscript
   # One centred, isotropic, unrotated lobe -> base is the constant r * axes, in float64.
   if _trivial_r >= 0.0:
       return _trivial_r
   ```

2. **Read the raw params, not the converted vectors.** Derive that float64 constant from the source
   numbers (a params `Array`/`Dictionary` holds float64), not from a `Vector3` you already built —
   the conversion has already happened by then.

3. **Keep any BOUND on the same side of the divide as the value it bounds.** This is the subtle one.
   If a function returns float64 but its upper bound is computed from float32 vectors, the bound can
   land a few ULPs *below* the value, and a bound that is supposed to be sound no longer is:

   ```gdscript
   var base_max := _trivial_r if _trivial_r >= 0.0 \
       else reach * pow(float(_lobes.size()), 1.0 / _p)
   ```

4. **Assert with `==`, not `is_equal_approx`.** An approximate compare cannot see a 1e-7 drift — it
   is precisely the size of error that `is_equal_approx` exists to forgive. And pick a fixture value
   float32 **cannot** represent (`130.7`, not `130.0`), or the test can pass by accident.

## Detect proactively

- A diff that replaces scalar float math with `Vector3`/`Basis`/`Transform` math on a path feeding a
  membership test, a boundary comparison, a hash, a save-format value, or any "these two must agree
  bitwise" contract.
- Any comment or commit message claiming a refactor is "bit-identical" / "exactly the same" where the
  new path touches a vector type — treat as unverified until pinned with `==`.
- A compatibility test that compares two NEW code paths against each other rather than against an
  absolute expected value: both paths move together, so it can never catch this class of drift.
- `is_equal_approx` in a test whose stated purpose is backwards compatibility.

## Confirmed by

space-miner-game, 2026-07-25 (task-136 A3D-WS2b). Surfaced by the spec axis of `/code-review`, which
measured it rather than asserting it; the project's own test could not have caught it (it compared
the two new pins against each other). Fixed in `src/beam/carve/radius_field_3d.gd`
(`_trivial_base_radius`) and pinned in `tests/test_shape_class_3d.gd::_sphere_fallback`; rationale in
`docs/adr/0027-lobe-union-shape-base.md`. Red/green verified: disabling the short-circuit fails
exactly that one check (18/19), restoring it passes (19/19).
