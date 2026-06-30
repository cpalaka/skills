# 48 — QuadMesh `canvas_item` shader reconstructing local coords from UV silently flips Y

**Symptom** — A `canvas_item` shader on a `QuadMesh` (hosted by a `MeshInstance2D`) reconstructs
local-space coordinates from UV as `vec2 p = (UV - 0.5) * size;`, then uses `p` for an angle
(`atan(p.y, p.x)`), a direction, or a coordinate. The rendered result is the **vertical mirror** of
any CPU-side geometry meant to share the "same" local frame — e.g. a procedural silhouette that must
agree with a CPU hit-test, or a sprite that must line up with a gameplay ray. No error, no warning;
the shape looks plausible on its own, and the bug only shows when you **overlay** the render against
the CPU geometry (a beam contact that lands on the *mirror* of the visible edge).

**Cause** — Godot's `QuadMesh` UV layout maps **`UV.y = 0` to local `+Y`** (and `UV.y = 1` to local
`-Y`). So `(UV.y - 0.5) * size = -local_y` — the shader's reconstructed `p.y` is the **negation** of
the node-local Y. `atan(p.y, p.x)` then computes `atan(-local_y, local_x) = -theta_local`, so any
angle-indexed function `f(theta)` is evaluated at `-theta` on the GPU while the CPU evaluates
`f(+theta)`. For an asymmetric `f` the two disagree by up to the full shape extent — far beyond any
32-vs-64-bit sub-pixel tolerance you might have budgeted for. `p.x` is unaffected
(`UV.x = 0 ↔ local -X`, so `(UV.x - 0.5) = +local_x`).

**Fix** — Un-flip Y in the reconstruction: `vec2 p = vec2(UV.x - 0.5, 0.5 - UV.y) * size;`. Use this
`p` everywhere (angle, length, and any normal/bump term derived from it) so the whole shader lives in
the node's true local frame. (Negating only the angle — `atan(-p.y, p.x)` — fixes the silhouette but
leaves derived terms like fake-normal lighting mirrored; fix `p` at the source instead.)

**Detect proactively** — In any `canvas_item` shader on a `QuadMesh`/`MeshInstance2D`, grep the
fragment for `(UV - 0.5)` / `(UV.y - 0.5)` feeding `atan(`, a direction, or a coordinate that must
agree with CPU/world geometry. If the shader is a **display mirror of a CPU source of truth**
(hit-test, SDF, ray-test), confirm the Y handedness matches — the render looking fine *in isolation*
proves nothing.

**Why headless misses it** — The dummy RenderingServer never compiles/runs shaders (see #21), so
neither `--check-only` nor a GUT/preload smoke catches it; and a CPU-only unit test that exercises a
**symmetric** fixture (a perfect circle, all harmonic amplitudes 0) passes even with the mirror in
place. Verify the UV→vertex mapping with a mesh-data probe — no GPU needed:
`QuadMesh.get_mesh_arrays()[Mesh.ARRAY_VERTEX]` vs `[Mesh.ARRAY_TEX_UV]`.

**Confirmed by** — space-miner-prototype procedural-asteroids slice, 2026-06-29. The SDF asteroid
shader rendered the vertical mirror of the `asteroid_field.gd` hit-test surface; an adversarial
multi-agent review caught it, confirmed empirically via `get_mesh_arrays` (QuadMesh size (100,100):
vertex (-50,+50) ↔ UV (0,0); shader `p.y == -vert.y` on all four corners). Masked by the F5 (the rock
spins, the mining beam is forgiving, and the mirror preserves the center) and by the unit suite (the
`ray_hit` fixture is a symmetric circle). Fix landed as `vec2 p = vec2(UV.x-0.5, 0.5-UV.y)*quad_px;`.
