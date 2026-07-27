### 82. A colour committed through `ArrayMesh.add_surface_from_arrays` never reads back bitwise-equal

**Symptom**
- A test commits a `PackedColorArray` as `ARRAY_COLOR`, reads it back with `surface_get_arrays(0)[Mesh.ARRAY_COLOR]`, and asserts float identity against the source — it **fails on correct code**. Measured: **0 of 2178** vertices come back equal.
- The deltas look like noise but are bounded: worst channel error **0.00373**, against a quantisation step of **1/255 = 0.00392**.
- The obvious over-correction is worse: relaxing the assertion to `col.size() == src.size()` passes against an **all-white** buffer, which is exactly what a dropped per-vertex colour channel produces.

**Cause**
`ARRAY_COLOR` is stored as **RGBA8** — 8 bits per channel. Every committed colour is quantised on the way in, so a `float`-precision round-trip is something the format cannot provide. Whether the engine truncates or rounds is an implementation choice, not a guarantee: the measured worst case sits at ~95% of a full step.

Independently, `add_surface_from_arrays` returns **void**. A missing/wrong format flag commits a **0-surface** mesh with no error and no return value to check.

**Fix**
- Band the comparison in 8-bit steps, and use **2/255, not 1/255**. Two steps costs nothing in detection power: the failures worth catching (a dropped channel, a wrong tint, an off-by-one in a material roster) move a channel by 0.1–1.0, i.e. **25–255 steps**.
- Compare against the value **re-derived from its source** (the material table, the palette row), not against the buffer you just handed in — comparing a buffer to itself is tautological once the tolerance is wide.
- Calibrate the assertion against an **all-white** buffer: it must be REJECTED. A tolerance-only check that accepts all-white cannot see a dropped colour channel, which is the failure it exists to catch.
- Assert `mesh.get_surface_count() == 1` and the format bits separately, since the commit call itself reports nothing.

**Detect proactively**
Any test or tool that reads `surface_get_arrays(...)[Mesh.ARRAY_COLOR]` and compares with `==`, `is_equal_approx`, or a tolerance tighter than `2.0/255.0`. Also any `add_surface_from_arrays` call site whose only success evidence is "it didn't error" — there is no error path; check `get_surface_count()`.

Sibling to #78 (float32 vector components silently shifting every result): same family — the storage format, not the maths, sets the achievable precision.

**Confirmed by**
2026-07-26, `space-miner-game` task-141 AC#5 (`test_body_mesh_3d`, `_mesh_commit`), Godot 4.7 — 2178-vertex chord-polyhedron surface, 0 bitwise matches, worst delta 0.00373. Filed from project memory `arraymesh-color-is-rgba8` via `/audit-godot-parity` 2026-07-27.
