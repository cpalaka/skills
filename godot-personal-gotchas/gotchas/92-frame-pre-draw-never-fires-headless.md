# 92 — `RenderingServer.frame_pre_draw` never fires under `--headless`

## Symptom

You move a probe onto `RenderingServer.frame_pre_draw` (correctly — it is the one hook guaranteed to
run after every transform notification has landed) and the headless run produces **zero output**. No
error, no warning, no failed `connect()`. `grep`ing for your probe tag returns nothing, which reads
exactly like "the probe ran and found nothing to report".

## Cause

`--headless` uses the dummy rendering driver. It never enters a real draw, so the pre/post-draw
signals are never emitted. The signal exists and `connect()` succeeds — nothing about the API surface
tells you it is inert.

This is the same shape as #80 (a channel absent rather than failing) and #86 (a flag that silently
no-ops): **an instrument that never runs and an instrument that measures clean are indistinguishable
on stdout.**

## Fix

Headless, sample at a frame boundary instead — the top of the next frame's `_process`, before any
writes. See #91 for why `call_deferred` is not a substitute.

If you genuinely need a post-draw hook, run windowed (or with a real driver) rather than assuming the
headless run is representative.

## Detect proactively

- Any `RenderingServer.frame_pre_draw` / `frame_post_draw` connection in code that a headless test or
  a `--headless` measurement run will execute.
- **Standing rule that catches the whole family:** a probe must print at least one line
  unconditionally on its first sample — a heartbeat. Zero lines then means "never ran", not "nothing
  found". A probe with no heartbeat cannot distinguish silence from success.
- Calibrate every instrument against the KNOWN-BAD before believing any reading from it. This one was
  caught in a calibration run, not in the run it would have falsely certified.

## Confirmed by

space-miner-game, 2026-07-28 (task-097), Godot 4.7.stable — `godot --headless --path . <scene.tscn>
--quit-after 1300`, connection made every frame, zero samples emitted.
