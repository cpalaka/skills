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
