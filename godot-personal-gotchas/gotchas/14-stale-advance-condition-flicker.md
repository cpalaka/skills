### 14. Stale advance-condition boolean flickers the parent StateMachine and resets a nested sub-StateMachine to Start every frame

**Symptom**
- AnimationTree character appears stuck on Idle — animations never progress past idle even when the player is clearly moving and gameplay conditions are correct.
- A nested sub-StateMachine's `playback.get_current_node()` keeps reading Start/Idle.
- While standing still, the *top-level* StateMachine visibly oscillates between two states every few frames (e.g. `Grounded` ↔ `Fall`).
- No errors, no warnings.
- If the Idle clip has no tracks for some bones (e.g. legs), those bones look frozen during movement — masking that the StateMachine, not the expressions, is the bug.

**Cause**
A boolean `advance_condition` (or a boolean an `advance_expression` references) is written in only ONE branch of the per-frame update — e.g. `is_falling` set only inside `if state == AIRBORNE`. When that branch stops running (player lands → grounded), the boolean is never cleared, so it **latches stale-true**. The top-level SM evaluates that condition EVERY frame in the neighbouring state, so `Grounded→Fall` (stale `is_falling`) keeps firing, paired with `Fall→Grounded` (on `is_grounded`) → perpetual parent flicker. Each time the top-level SM **re-enters** a state containing a nested sub-StateMachine, that sub-SM is **re-initialised to its Start node** — so the nested locomotion SM never advances past Idle, regardless of speed/expressions.

Sibling to Gotcha #8 (`advance_mode = 2` / AUTO), but about condition *freshness*, not advance_mode — here advance_mode was already correct; the stale boolean was the bug.

**Fix**
Maintain advance conditions on EVERY frame of EVERY state, not only in the state that sets them. Add an `else` branch that clears them:

```gdscript
if st == PlayerState.AIRBORNE:
    is_falling = velocity.y > 0.0
    # ... set is_jumping / is_fastfalling ...
else:
    is_jumping = false
    is_falling = false
    is_fastfalling = false
```

Rule: any boolean a StateMachine reads as an advance condition/expression must have a defined value on every frame of every state, or it latches and causes spurious transitions.

**Detect proactively**
- If an AnimationTree character is "stuck on idle," log the top-level `playback.get_current_node()` for a few seconds while idle. If it oscillates between two states, suspect a stale advance condition BEFORE suspecting the nested SM's expressions.
- Audit every condition boolean: is it assigned on every code path each frame, or only inside one state's branch?

**Confirmed by**
2026-05-29 — `2d-movement-prototype`, `scripts/player/player_anim.gd`. `is_falling` was set only in the `if st == PlayerState.AIRBORNE` branch; after the player spawned slightly above ground, fell, and landed, `is_falling` stayed `true` forever. Top-level AnimationTree SM flickered `Grounded` ↔ `Fall` every frame (verified via throttled `print()` of both playbacks), resetting the nested `Grounded` sub-SM to `Idle` each frame; legs (Idle clip has no rotation tracks) appeared frozen during movement. Fixed by adding an `else` branch clearing `is_jumping`/`is_falling`/`is_fastfalling` when not airborne.
