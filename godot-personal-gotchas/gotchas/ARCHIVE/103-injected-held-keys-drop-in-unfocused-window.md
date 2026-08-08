# 103 — `Input.parse_input_event` HELD keys silently drop in an unfocused game window (taps survive)

## Symptom

You drive a running game through the MCP eval channel, synthesise a key press, wait some frames, and
read the result. **Tap-shaped input works and hold-shaped input does not**, in the same session:

```gdscript
var down := InputEventKey.new(); down.keycode = KEY_SPACE; down.pressed = true
Input.parse_input_event(down)
for i in 90: await get_tree().process_frame       # "hold" the thrust key
# → ship never accelerated; speed decayed at exactly the drag rate, as if nothing was pressed
```

while a single-frame tap of another key in the *same* eval spends its charge correctly. Every state
flag that depends on the hold reads false (`turn_authority_active`, `is_burning`), so it looks like a
logic bug in the feature you just wrote — the flag, the multiplier, the gate — and you go and read
that code instead.

The tell that it is not your code: the decay is *too* clean. A speed falling by exactly
`v·e^(−drag·t)` means **zero** acceleration was applied on any frame, not "less than expected". A
real gate bug usually leaks something.

## Cause

The window is not frontmost, and Godot releases held keys on focus-out — so the physical key state
`Input.is_key_pressed()` reads is cleared out from under your synthetic press within a frame or two.
`parse_input_event` genuinely does update that state (which is why the *edge* on the frame you inject
is seen), but nothing keeps it set afterwards.

Related to #95 but a **different mechanism, and it can bite when #95 does not**: #95 is the main loop
not advancing at all. Here the loop advances fine — frames draw, positions integrate, drag applies —
only the *held* input state is being wiped. So the "assert `Engine.get_frames_drawn()` is
increasing" heartbeat from #95 passes and tells you nothing.

Stale state in the other direction also happens: after the sequence above, `Input.is_key_pressed()`
can still report a key held once the eval ends, so the *next* probe runs against a phantom press. A
height that walks on its own, or a ship burning with no key down, is this.

## Fix

> **A SECOND, DIFFERENT-MECHANISM ROUTE EXISTS as of godot-ai 3.1.3 — try it first for anything
> action-based.** This entry's failure is specific to `Input.parse_input_event` + a *physical* key,
> which the engine clears on focus-out. `game_manage op="input_sequence"` delivers through
> `Input.action_press(action, strength)` instead (`runtime/game_helper.gd:665-677`, reply tagged
> `"delivery": "action_state"`) — a different engine path that never touches physical key state, and
> it holds the action across frames game-side without re-injection.
> **Measured 2026-08-07** (space-miner-game, godot-ai 3.1.3 / Godot 4.7-stable, `lab.tscn`): a
> 20-frame `input_sequence` hold delivered **exactly 20** `is_action_pressed` ticks in
> `_physics_process` — no decay, no re-injection, no per-frame babysitting.
> **UNVERIFIED and the whole question here: whether Godot's focus-out `release_pressed_events()`
> also clears *action* state.** The measurement above ran with the game window progressing (its
> `await` loop advanced), so it does not settle the unfocused case. **Probe before relying on it:**
> background the game window, fire `input_sequence` with a 60-frame hold, then read
> `actions_pressed_at_end` plus a held-tick counter. If the hold survives, `input_sequence` is this
> entry's missing remedy; if it does not, #103 generalises to the action path and this note should
> say so.
> Note the route is **not** universal: `input_sequence` cannot reach anything read off
> `_input(event)` or `Input.is_key_pressed()` — for those (e.g. a dev scene polling keys directly)
> `input_key` / `parse_input_event` remains the only door and the rules below are still the whole
> contract.

- **Re-inject the press every frame** for anything held: put `Input.parse_input_event(down)` *inside*
  the await loop, not before it. Measured working — 0 → 1172 u/s over ~1 s of re-injected thrust,
  with the authority flag true throughout.
- **Assert the complement** so the reading is not just "a number went up": release, coast the same
  number of frames, and require the value to fall. That distinguishes "the burn worked" from "the
  value grows on its own".
- **Clear the key state explicitly** at the end (inject the matching `pressed = false` event) and
  re-read `Input.is_key_pressed()` to confirm, before the next probe. Do not assume your release
  landed.
- Where the harness registers **no input-map actions** (a dev scene polling `Input` directly), the
  action-based injection tools cannot reach it at all — `parse_input_event` through the eval channel
  is the only door, so these rules are the whole contract.

## Detect proactively

- Any `game_eval` that presses a key, awaits frames, and reads a consequence of the key being *held*.
- A measured decay that matches the drag/friction law to several digits — that is "no input applied",
  not "input applied weakly".
- Before trusting a hold-driven read, assert the hold itself: sample `Input.is_key_pressed(K)` inside
  the loop and require it true on most frames, rather than assuming the press stuck.
- Family: **the instrument never ran** — #92, #95, #80.

## Confirmed by

space-miner-game, 2026-08-03 (task-166), Godot 4.7.stable — verifying the onecam tracer's momentum
thruster through `godot-ai editor_manage(op="game_eval")` against an unfocused game window. The first
run reported `authority: false` after 90 awaited frames of "held" SPACE and a speed fall of
692 → 243 u/s, which is `692·e^(−0.7·1.5)` to three digits; re-injecting the press each frame
produced 0 → 1172 u/s with the flag true.
