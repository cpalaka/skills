### 17. Forward axis is canonical -Z

**Symptom**
A `Node3D` faces or moves the wrong way — code computes "forward" as `+Z` (uses `transform.basis.z` directly, or `atan2(horizontal.x, horizontal.z)` for a heading) and the result points backward relative to the engine's own helpers.

**Cause**
Godot's convention is **local -Z is forward** — the `-Z` axis points out the "front" of a `Node3D`, and both `Node3D.look_at` and `-transform.basis.z` assume it. Code that treats `+Z` as forward fights `look_at` and every engine system that follows the convention.

**Fix**
Use `-transform.basis.z` for the forward vector, and the negated `atan2` form when deriving a heading from a horizontal direction. Audit code that assumes `+Z forward`, uses `transform.basis.z` (vs `-transform.basis.z`), or `atan2(horizontal.x, horizontal.z)` (vs the negated form).

**Detect proactively**
Grep changed `.gd` for `basis.z` without a leading `-`, and `atan2(` in heading math.

**Confirmed by**
Godot's documented `Node3D` convention — `look_at` and `-basis.z` both assume local `-Z` forward.
