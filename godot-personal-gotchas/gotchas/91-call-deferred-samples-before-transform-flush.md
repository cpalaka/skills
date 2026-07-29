# 91 — `call_deferred` samples BEFORE the frame's final transform-notification flush

## Symptom

You verify a transform fix by sampling `call_deferred` — "after every `_process` has run, so this is
the end-of-frame truth". The reading is **identical to the known-bad**, so you conclude the fix did
not work and go rewrite correct code. Meanwhile the game looks right on screen.

Measured (space-miner, task-097): a render offset written from a stale basis leaked 16.59 px into the
gameplay plane. After a fix that provably re-derived the offset on every transform change — the
handler was confirmed running, once per body per frame — the deferred sample still read **16.59 px**,
unchanged to two decimals.

## Cause

`SceneTree::process()` flushes the **message queue** (where `call_deferred` callables live) *before*
its final `flush_transform_notifications()`. So a deferred callable runs while the frame's last batch
of `NOTIFICATION_TRANSFORM_CHANGED` deliveries is still pending. It observes a state that is real for
about a microsecond and that the renderer never draws.

`NOTIFICATION_TRANSFORM_CHANGED` is **not** synchronous. `Node3D::_propagate_transform_changed` only
adds the node to `SceneTree`'s `xform_change_list`; delivery happens at a flush. So "I set
`quaternion`, therefore the handler has run" is false — inside the same frame, and inside a test that
runs no frames at all (see #93).

## Fix

Sample at a point that is unambiguously past the flush:

- **Best, and works headless: the top of the NEXT frame's `_process`**, before anything writes. A
  frame boundary means every notification from the frame you are measuring has landed, and it is
  exactly the state that frame drew.
- `RenderingServer.frame_pre_draw` is the semantically right hook but is a trap headless — see #92.
- Do **not** reach for a double `call_deferred`: `MessageQueue::flush()` drains callables enqueued
  during the flush in the same pass, so the second one can land in the same pre-flush window.

## Detect proactively

- Any probe that samples node transforms via `call_deferred` and reports a value it calls
  "end-of-frame" — the name is the bug.
- **The tell that saved this one:** the post-fix number matched the known-bad *too* exactly, and both
  scaled with `dt` at precisely the frame-time ratio (16.7 ms → 40.09 px vs 6.9 ms → 16.59 px, ratio
  2.42 both ways). A "fix made no difference" reading that tracks frame time perfectly is measuring
  timing, not the property. Cross-check any transform probe by running it at two frame rates.
- Sibling failure, same root: a probe that samples before the system has SETTLED. Assert steady state
  first, and keep probe code byte-identical across compared runs.

## Confirmed by

space-miner-game, 2026-07-28 (task-097), Godot 4.7.stable. Both the false negative and the
frame-boundary instrument that replaced it were reproduced against a calibrated known-bad.
