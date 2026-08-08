### 10. Explicit Euler spring instability above ~6 Hz at 60fps

**Symptom**
- A semi-implicit Euler spring driving a node's `scale` (squash-stretch on a Skeleton2D, hit feedback on a sprite, etc.) blows up within ~10 frames of the first impulse.
- Scale oscillates with widening swing, then crosses zero and flips negative, then grows past ±10 within ~20 frames.
- Affected node is **invisible** but physics still works — player can still move via input, collisions still register.
- No error in console. No visible crash.

**Cause**
Semi-implicit (symplectic) Euler integration of a damped harmonic oscillator has two stability bounds:
- `omega · dt < 2` (oscillation frequency vs step size)
- `2 · zeta · omega · dt < 1` (damping vs step size)

The damping bound is tighter — it's violated *before* the freq bound. At 60fps (`dt ≈ 0.0167s`), `freq > ~6-7 Hz` typically pushes `2·zeta·omega·dt` past 1, making amplitudes **grow** each cycle. Skeleton2D scale is a single multiplier on the whole rig, so even small instability becomes catastrophic.

**Fix**
- **Quick**: cap `freq` at ~6 Hz for any spring whose output drives `scale`. Damping helps but isn't the right lever.
- **Robust**: replace explicit Euler with one of: (a) sub-stepping (`tick(delta/N)` × N), (b) analytical critically-damped spring closed form, (c) exponential decay (`current = lerp(current, rest, 1.0 - exp(-rate * dt))`).

**Detect proactively**
Before bumping any spring `freq` value, mentally check `omega · dt` (omega = freq · TAU) and `2·zeta·omega·dt` against the bounds. For scale-driving springs at 60fps, treat `~6-7 Hz` as the effective ceiling unless the integrator is sub-stepped or analytical. If a node's scale "becomes invisible after a few frames" and physics still works, prime suspect is unstable spring.

**Confirmed by**
2026-05-27 — `2d-movement-prototype` Task 17 F5 of `tuning_room.tscn`. `scripts/overlays/squash_stretch.gd` driving `PlayerRig.scale` with `freq=12.0`, `damp=0.55`. On floor land, `apply_impulse(-0.2, 0.4)` set `scale.y = 1.4`, semi-implicit Euler oscillated divergently to `-0.86, 2.48, ...`, rig invisible by frame ~10. Fixed by lowering `squash_spring_freq` from `12.0` to `6.0` (commit `35cdb02`).
