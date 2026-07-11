### 56. Enabling physics_interpolation project-wide judders EVERY non-physics-tick transform source

**Symptom**

You flip `physics/common/physics_interpolation=true` in `project.godot` (the Godot 4.3+ 2D/3D
interpolation setting), expecting smoother motion on a high-refresh display. Nodes that move in
`_physics_process` (a `CharacterBody2D` via `move_and_slide`) DO get smoother. But anything that
moves a node **outside the physics tick** starts to judder / streak instead. No error, the headless
suite is blind (dummy renderer never interpolates → 100% green regardless), and it's easy to miss in
an F5 aimed at a different surface than the affected movers. Four distinct categories all trip it:

1. **`_process` transform-writer** — a `Node2D` doing `rotation += spin * delta; position += drift * delta`
   (a spinning asteroid, self-propelled debris) lags one physics frame.
2. **Idle-mode `Tween`** — `create_tween()` defaults to `TWEEN_PROCESS_IDLE`, so a tween animating
   `global_position` / `scale` (an eject fly-out, a consume shrink) runs on render frames → stutters.
3. **Same-frame spawn-teleport** — `add_child(n)` then `n.global_position = somewhere` places the node
   at its parent's origin for the interpolation "previous" snapshot, so its first rendered frame
   **streaks from the origin** to the target (chips/debris/dust spawned at a contact point; a pooled
   node re-positioned on reuse; a Buddy `_activate` teleport of an already-in-tree node).
4. **Cross-layer `_draw` desync** — a full-res overlay (or any `_draw`/`_process` reader) that draws
   using another node's raw `global_position` (a mining beam / vacuum cone drawn from the physics-tick
   tool position) desyncs from that node's INTERPOLATED render by up to one tick of its motion.

**Cause**

Interpolation renders each node by **lerping between its transform at the previous and current
physics ticks**. Anything sourced off the physics tick (idle `_process`, idle Tween, a same-frame
teleport with no reset, a `_draw` reading a live `global_position`) is shown against a STALE snapshot
instead of directly. `physics_interpolation_mode = INHERIT` (the default) resolves to ON under the
project setting, so the blast radius is **every non-physics-tick transform source in the tree** —
including pre-existing movers you weren't thinking about. **Enumerating only `func _process` bodies is
the classic incomplete carve-out**: it is blind to categories 2–4, which the Godot manual
("Using physics interpolation": tweens must run on the physics tick; teleports need a reset) names
explicitly.

**Fix**

Per category (there is no single lever):

- **(a) `_process` writer** → `physics_interpolation_mode = Node.PHYSICS_INTERPOLATION_MODE_OFF` on the
  node in `_ready` (INHERIT cascades OFF to a subtree of render-only children), OR move the integration
  into `_physics_process` (then interpolation smooths it — the intended path for gameplay movers).
- **(b) idle Tween** → `tween.set_process_mode(Tween.TWEEN_PROCESS_PHYSICS)` so it lands on the physics
  tick. **Do NOT blanket `_OFF`-carve a node whose OTHER motion is `_physics_process`** (e.g. a
  vacuumable whose reel spring runs in `_physics_process` and WANTS interpolation) — that trades the
  tween judder for reel judder. Fix the tween's process mode, not the node's interpolation mode.
- **(c) spawn-teleport** → call `reset_physics_interpolation()` AFTER setting the transform
  (`add_child` → set `global_position` → `reset_physics_interpolation()`). (Godot 4.4+ requests a
  DEFERRED enter-tree auto-reset that covers many `add_child`→set-position cases at end-of-frame, so
  the streak is version-sensitive and sometimes absent — but an **already-in-tree** teleport, e.g. a
  pooled/kept-inert node moved on reuse, is NOT an enter-tree event and always needs the explicit
  reset. When in doubt, add the reset; it is idempotent-cheap.)
- **(d) overlay `_draw` desync** → no mechanical fix. It is a design call: carve out the whole tracked
  subtree so it renders raw (matching the overlay), make the draw interpolation-aware, or ship the flag
  `false`.

**Detect proactively**

When a diff flips `physics_interpolation` on (or adds `[physics] common/physics_interpolation=true`),
DON'T grep only `_process`. Grep for all four sources: `_process` transform writes; `create_tween` /
`Tween` (idle-mode movers); `add_child` paired with a following `global_position`/`position` set
(spawn-teleports); and `_draw` bodies reading another node's `global_position`. The
`reset_physics_interpolation` count should be **> 0** after the change — zero is the tell that the
spawn/teleport audit was skipped. The headless suite is structurally blind here — verify with an F5
aimed at the affected movers specifically (see `godot-personal-preferences` #9, smoke-to-blast-radius).
Weigh the whole blast radius against the benefit: if the flag's only clean beneficiaries are a couple
of `_physics_process` movers, "degrade to `false`" is often the honest call.

**Confirmed by**

space-miner-prototype 2026-07-07. First surfaced in the task-022 MotionState-seam review (finding F2
HIGH): enabling the flag would have juddered the `_process`-driven asteroid (`asteroid.gd` spin+drift)
and loose chunk (`rock_chunk.gd` drift). Deferred to task-023 with an AC to "carve out every `_process`
transform-writer." The **task-023 FULL review then proved the `_process`-only scope was itself
incomplete**: a 19-agent Opus review confirmed the newly-enabled flag ALSO hit idle-mode Tweens
(`square.gd` eject/consume on ore chips + debris — category 2), un-reset spawn-teleports (chips, dust
bursts, Buddy activate — category 3), and a beam/cone overlay desync (`accent_overlay.gd` — category 4),
none of which a `grep _process` sees. Six regressions from one `project.godot` line whose only clean
beneficiaries were two `_physics_process` movers. Resolved by degrading the flag to `false` (the plan
had sanctioned this) and deferring the COMPLETE interpolation treatment to a dedicated task — the
`_process`-only carve-out is exactly the trap this entry now warns against.
