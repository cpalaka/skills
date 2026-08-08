### 16. `AnimatableBody2D` with `sync_to_physics = true` ignores a `move_and_slide` parent — pinned bodies don't track

**Symptom**
A `RigidBody2D` is pinned (via `PinJoint2D`) to an `AnimatableBody2D` anchor that is a child of a `CharacterBody2D`. The anchor is meant to ride the player so the pinned body follows. When the player moves via `move_and_slide()`, the anchor — and the pinned body — stays frozen at spawn; the pinned body visibly detaches. No error, no warning. Also shows on the initial gravity settle: the anchor holds the spawn Y while the player falls.

**Cause**
`AnimatableBody2D` with `sync_to_physics = true` reads its position authoritatively from the physics frame — it's designed to be moved *manually* by code / `AnimationPlayer` / `RemoteTransform2D`. A parent's `move_and_slide()` updates the child's scene-tree global transform, but `sync_to_physics = true` makes the body ignore that and hold its physics-frame position (where nothing moved it). Docs warn: do NOT use `sync_to_physics` with `move_and_collide()`; a `move_and_slide()` parent is the same conflict class.

**Fix**
Set `sync_to_physics = false`. Scene-tree parent inheritance then drives the physics transform and the anchor (plus the pinned body) tracks the parent. Inverts the common assumption that `true` is the "safe default" for a parent-ridden anchor — for a *parent-driven* (not code-driven) anchor, `true` is the BROKEN setting.

**Detect proactively**
Pinned/jointed body "won't follow" a node moved by `move_and_slide`/`move_and_collide` and the anchor is an `AnimatableBody2D` → check `sync_to_physics` first. Numeric diagnose: parent x advances, anchor x slope 0 ⇒ not tracking.

**Confirmed by**
2026-05-30 — `arm-control` prototype, build step 5 (shoulder rig for the physics sword-arm). Live via godot-mcp input-injection + `runtime_state watch`: with `sync_to_physics = true`, player x went 0→320 while the anchor x stayed 12 (slope 0); with `false`, the anchor x tracked 12→332 and the pinned arm followed at ~0.03px drift.

---

## Second symptom, same cause (absorbed from #81, 2026-08-08)

Script-driving an `AnimatableBody2D` with `sync_to_physics = true` — a moving platform, kinematic
rock or carrier — by writing `position`/`global_position` every frame: **the node stays at the
origin.** No error, no warning, no push. The tell is that `rotation` *does* apply, so the object
reports a correct orientation from the wrong place, which reads as "physics is broken" rather than
"the setter no-oped".

Same root cause: with `sync_to_physics` on, the server drives the transform from the physics frame
and suppresses the position setter. Move it with `move_and_collide`/velocity, or turn
`sync_to_physics` off and accept the one-frame lag for riders.

*Confirmed by* 2026-07-26, `space-miner-game` task-130 (plane-slice colliders), Godot 4.7 macOS.
