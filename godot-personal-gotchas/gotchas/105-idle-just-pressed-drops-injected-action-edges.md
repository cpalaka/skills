# 105 — `is_action_just_pressed` drops ~20% of INJECTED action edges when read from `_process`

## Symptom

You drive a running game with `game_manage op="input_sequence"` (or bare `Input.action_press`), and a
gameplay edge fires *most* of the time. A jump, a dash, a burst goes missing every fifth or sixth
attempt, with no error and no pattern you can pin down. Re-running the identical sequence gives a
different answer, so it reads as flakiness in the feature, or as network jitter in the MCP call.

The discriminator: the miss only happens where the edge is read on the **idle** clock. Move the same
read into `_physics_process` and it stops missing entirely.

Measured (space-miner-game, 2026-08-07, godot-ai 3.1.3 / Godot 4.7-stable, `lab.tscn` at 60 idle /
60 physics fps, 1:1), one counter Node reading both clocks in the same run:

| hold (frames) | reps | `_physics_process` | `_process` (idle) |
|---|---|---|---|
| 20 | 1 | 1/1 | **0/1** |
| 1 | 5 | 5/5 | 5/5 |
| 0 (press+release same `at_frame`) | 5 | 5/5 | **4/5** |
| 20 | 3 | 3/3 | **2/3** |

**Physics 14/14. Idle 11/14.** Calibrated both directions first: a null control ran 60 physics ticks
with **0** edges (so the counter is not counting spuriously), and a 20-frame hold delivered exactly
**1** edge and exactly **20** held ticks.

## Cause

`just_pressed` is a frame-stamp comparison, not a latch. `Input.action_press()` stamps the action
with the current idle and physics frame counters; `is_action_just_pressed()` returns true only while
the stamp equals the *current* counter for whichever clock is asking. Injection happens at whatever
point in the frame the debugger message is serviced, which is not aligned to the idle callback — so
the idle stamp can already be one frame stale by the time `_process` asks. The next physics tick
compares against a counter that still matches, which is why the physics side never misses.

Two corollaries fall out of the same mechanic, both measured above:

- A **zero-frame** press (press and release on the same `at_frame`) still produces a physics edge —
  `just_pressed` is not gated on the action being *currently* held. So the minimum reliable hold for
  an edge-driven feature is **0 frames**.
- That same zero-frame press is **never** observable through `is_action_pressed` (level state) —
  `held` ticks were 0. Anything level-polled (a thrust burn, a held verb) needs **≥ 1 frame**.

Distinct from #103, which is about *held physical key* state being cleared on focus-out. This one
needs no focus change, involves no key events at all, and hits the *edge* rather than the hold.

## Fix

- **Read injected edges in `_physics_process`.** That is the reliable clock; it cost nothing here
  because the feature already lived there.
- **If the consumer must run on the idle clock, do not use `is_action_just_pressed` at all** — derive
  the edge from level state you sample yourself (`held and not prev_held`, storing `prev_held` each
  tick). Level reads do not have the hole. This is what `src/core/dev/onecam/onecam_ship.gd` does,
  deliberately; the hand-rolled detector is the *more* reliable instrument there, not legacy debt.
- **Then hold ≥ 1 frame**, because a level-sampled detector cannot see a zero-frame press by
  construction. Pin that constraint in a test rather than leaving it as folklore, and assert the
  *pool/resource* the action spends on both sides — otherwise a "the short press fired nothing" check
  passes just as happily when the resource was simply exhausted.
- Do **not** "fix" this by re-injecting each frame (#103's remedy). Different mechanism; here the
  action state is already correct and it is the *stamp comparison* that misses.

## Detect proactively

- Any `is_action_just_pressed` / `is_action_just_released` read inside a `_process` (not
  `_physics_process`) callback, in a project you intend to drive with `input_sequence` or MCP action
  injection. Not reliably greppable — the call site looks identical either way and only the enclosing
  callback distinguishes them — so no `precommit-scan.sh` check is filed for it.
- A scripted-input regression suite that is *nearly* deterministic. Intermittent-but-reproducible-in-
  aggregate is the signature; a genuine logic bug is usually 0% or 100%.
- Family: **the instrument never ran** — #92, #95, #103, #80.

## Confirmed by

space-miner-game, 2026-08-07 (task-171), Godot 4.7.stable / godot-ai 3.1.3 — measuring
`game_manage op="input_sequence"` against `lab.tscn`, then acting on the result in
`src/core/dev/onecam/onecam_ship.gd`, which reads its burst edges on the idle clock and therefore
keeps a level-sampled `_prev_burst` detector instead of `is_action_just_pressed`.

**Still open, inherited from #103:** whether focus-out clears *action* state as it does physical key
state. Every measurement above ran with the game window frontmost, so it does not settle the
unfocused case. #103's probe recipe still applies.
