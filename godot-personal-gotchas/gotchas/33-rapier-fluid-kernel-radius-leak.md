### 33. Rapier Fluid2D particles silently leak/explode through static walls when per-step travel exceeds the SPH kernel radius

**Symptom**
Fluid particles vanish through a `StaticBody2D` container with no error; reading the `Fluid2D` `points` at runtime shows positions at y ~ 4e6 / x ~ ±30k. The pool's level mysteriously stops rising (leak rate = pour rate). Also affects the addon `Faucet2D`'s injected stream. Worse at smaller `physics/rapier/fluid/fluid_particle_radius_2d`.

**Cause**
SPH boundary coupling is only as thick as the kernel radius (= `fluid_smoothing_factor` × `fluid_particle_radius_2d`; defaults 2.0 × 20). A particle moving faster than ~kernel-radius-per-physics-step (e.g. 20 px/frame = 1200 px/s at radius 10) crosses the boundary's sampled region in one step; the resulting pressure spike ejects it ballistically. The addon's `Faucet2D` hardcodes its injection velocity to full gravity speed (980 px/s) in `_ready`, which after any fall distance exceeds the limit. The same spike can eject coupled `RigidBody2D`s.

**Fix**
Keep fluid impact speeds under ~kernel radius per physics step:
- Override `faucet.velocities_new` with a gentle velocity after `add_child` (its `_ready` already ran).
- Shorten drop heights.
- Thicken container walls.
- Raise `fluid_smoothing_factor`.
- For rigid bodies interacting with agitated fluid, set `continuous_cd = RigidBody2D.CCD_MODE_CAST_SHAPE` as a containment backstop.

**Detect proactively**
Before lowering `fluid_particle_radius_2d` or adding a tall faucet drop, compute kernel radius (`smoothing_factor × particle_radius`) and the per-step travel at expected impact speed (speed / physics fps) — travel > kernel radius means leaks. At runtime, sample `Fluid2D.points` extrema: any |coordinate| in the tens of thousands means particles already escaped.

**Confirmed by**
2026-06-10 — `juice-tests` fluid_faucet_test session, godot-rapier2d v0.8.32 at particle radius 10, Godot 4.6.2.
