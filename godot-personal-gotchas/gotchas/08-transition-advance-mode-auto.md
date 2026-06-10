### 8. `AnimationNodeStateMachineTransition` conditions never fire unless `advance_mode = 2`

**Symptom**
- StateMachine transition wired with `advance_condition = &"my_flag"` or `advance_expression = "..."` in the AnimationTree dock.
- At runtime, the underlying parameter `parameters/<sm_path>/conditions/<flag>` genuinely flips to `true` (verified via `print($AnimationTree.get(...))` in `_physics_process`).
- But the transition never fires; `playback.get_current_node()` stays on the source state, frame after frame.
- Visually: character looks "stuck on one clip" (often Idle, since Start→Idle uses an auto transition that does work).

**Cause**
`AnimationNodeStateMachineTransition.advance_mode` defaults to `ADVANCE_MODE_ENABLED = 1`. The enum naming is misleading — per the Godot docs:

| Mode | Value | Meaning |
|---|---|---|
| `ADVANCE_MODE_DISABLED` | 0 | Don't use this transition. |
| `ADVANCE_MODE_ENABLED` | 1 | **Only use during `AnimationNodeStateMachinePlayback.travel()`.** Does NOT auto-fire on condition. |
| `ADVANCE_MODE_AUTO` | 2 | Automatically use this transition if `advance_condition` / `advance_expression` are `true`. |

So `ENABLED` is the trap: it sounds like "enabled" should mean the transition works, but it only enables `travel()`-based requests. The AnimationTree dock's default when authoring a transition is `Enabled`, which silently breaks the common "set advance_condition and let it fire" pattern.

**Fix**
- In the AnimationTree dock: click the transition → Inspector → **Advance Mode** → **Auto**.
- In `.tscn` hand-edit: add `advance_mode = 2` to the transition subresource.

```
[sub_resource type="AnimationNodeStateMachineTransition" id="..."]
xfade_time = 0.1
advance_mode = 2          # ← required for advance_condition to auto-fire
advance_condition = &"is_steering"
```

**Detect proactively**
Whenever you set `advance_condition` or `advance_expression` on a transition, set `advance_mode = 2` in the same change. After saving any StateMachine, audit the `.tscn`:

```
grep -B1 -A4 'AnimationNodeStateMachineTransition' YourScene.tscn
```

Every transition with an `advance_condition` or `advance_expression` line should have `advance_mode = 2` nearby — otherwise it's dead, only usable via `travel()`.

If intuition disagrees with this, confirm against the docs: `mcp__godot-mcp__godot_docs fetch_class AnimationNodeStateMachineTransition`.

**Confirmed by**
2026-05-26 — `3d-prototype-1` Step 6 animation verification. Character stuck on Idle in F5 despite RMB-hold correctly flipping `is_steering` to `true`. Debug prints showed `param=true cached=true is_steering_raw=true` while `Loc=Idle` frame after frame. Diagnosis surfaced by reading the Godot 4 docs for `AdvanceMode` enum. Fixed by adding `advance_mode = 2` to 6 transitions in `scenes/player.tscn` (Idle→Move, Move→Drift, Drift→Move, Drift→Idle, Move→Pivot, Locomotion→Hit). The 4 transitions that already worked all had `advance_mode = 2` set explicitly (Start→Locomotion, Start→Idle, Pivot→Move, Hit→Locomotion), confirming the diagnosis.
