# 95 — A backgrounded (or `no_focus`) game window STALLS its main loop, so `game_eval` reads unsettled state

## Symptom

You launch the game, change something through the MCP eval channel, and read the result back — and the
value is the one from *before* your change, or a node your change should have created is missing. Query
it again and it is still stale. Two ways this presents:

- `editor_screenshot source="game"` returns the frame from before your change. This one is **honest**:
  the response carries `stale_frame: true` and a note saying the window looks backgrounded.
- `editor_manage(op="game_eval")` returns a value that is simply *old*, with **no flag of any kind**. A
  respawn you triggered has not happened, `Engine.get_frames_drawn()` does not advance between calls,
  and `RenderingServer.force_draw()` does not move it either.

Reads that are pure functions of state you just wrote look correct, which is what makes this so
convincing: half your probes are right and half are silently stale, in the same eval.

## Cause

macOS (and any compositor that throttles background apps) stops delivering draw to a window that is not
frontmost, and Godot's main loop is driven by that. No `_process`, no `_physics_process`, no deferred
queue flush. Nothing errors — the process is alive and answers evals, it just is not *advancing*.

The trap is worse when you *asked* for it: setting `display/window/size/no_focus=true` (e.g. to stop a
capture stealing focus) guarantees the window is never frontmost, so the loop is stalled from the moment
it boots. You have optimised away the very thing that makes your probe valid.

Same family as #92 and #80 — an instrument that never ran and an instrument that measured clean are
indistinguishable — but with a sharp extra edge: **one channel warns you and the other does not**, so
trusting "the screenshot tool would have told me" is not a defence.

## Fix

Anything that needs frames to take effect (a respawn, a `queue_free`, a deferred call, a transform
flush, a render) must be measured with the window **frontmost**, or not measured live at all.

- Prefer a **boot-time** pin over a live mutation: relaunch with the value already set (a CLI flag your
  project parses in `_ready`) so no frames are needed to reach the state you want to observe.
- If you must mutate live, call `DisplayServer.window_move_to_foreground()` first and accept the focus
  steal, or drop `no_focus`.
- Values written through a **synchronous** path (a setter that emits its signal inline, so the consumer
  re-pulls during your own call) ARE safe to read from a stalled loop — that is why the results look
  mixed. Know which of your reads are synchronous before you trust any of them.

## Detect proactively

- Any `no_focus`, borderless, off-screen or deliberately-unfocused window used as a measurement target.
- Any `game_eval` that writes something requiring frames (spawn/despawn/deferred/physics) and reads the
  consequence back **in the same or the next call**.
- **Assert the loop is advancing before believing any live read**: sample `Engine.get_frames_drawn()`
  twice and require it to increase. A stalled loop is then a loud, derived verdict instead of a silent
  wrong number — the heartbeat rule from #92 applied to the clock rather than the probe.

## Confirmed by

space-miner-game, 2026-07-29 (task-153), Godot 4.7.stable — a temporary `override.cfg` with
`display/window/size/no_focus=true` (added to stop `--shot` captures stealing the mouse) left the run's
window permanently backgrounded. `editor_screenshot source="game"` reported `stale_frame: true` with
`frames_drawn: 2303`; a following `game_eval` returned `frames: 2303` again after `force_draw()`, and a
`LOOK_MEGA_SCALE` override whose respawn needs frames left the scene tree unchanged — a tree walk for the
respawned body returned empty, which reads exactly like "the body does not exist".
