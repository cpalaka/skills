# 63 — MOUSE_MODE_HIDDEN blanks the OS cursor across the whole desktop (macOS)

## Symptom

A game that sets `Input.mouse_mode = Input.MOUSE_MODE_HIDDEN` (custom cursor widget, drawn
pointer) makes the OS cursor invisible **everywhere** while it runs — moving the mouse off the
game window onto other apps/monitors leaves you mousing blind. Painful during debugging: the
game window open = no usable desktop cursor. No error, and on first look it seems like the
docs' "hides the cursor when over the window" should have clipped it.

## Cause

`Input.mouse_mode` is process-global state, and on macOS the hidden state is not reliably
clipped to the window boundary — the hide follows the app, not the window rect. Setting it
once in `_ready` and clearing only in `_exit_tree` means the entire session runs hidden.

## Fix

Gate the hide on the OS cursor actually being over a focused game window, via the Window
signals (all four exist in 4.7, docs-verified): `mouse_entered` / `mouse_exited` (fire
regardless of focus) and `focus_entered` / `focus_exited` (cmd-tab with the cursor still
inside). One `_apply_mouse_mode()` recomputes `hidden = inside and focused`. Derive the
initial state in `_ready` (`Rect2(Vector2.ZERO, Vector2(win.size)).has_point(win.get_mouse_position())`)
— the signals only fire on the next crossing. Also early-return the custom-cursor `_draw`
while the mouse is outside, or a ghost pointer parks at the window edge. Keep the
`_exit_tree` restore to `MOUSE_MODE_VISIBLE` as the teardown backstop.

## Detect proactively

Any diff that writes `Input.mouse_mode = Input.MOUSE_MODE_HIDDEN` (or `CAPTURED`) without a
`mouse_entered`/`mouse_exited` (or focus) gate in the same file.

## Confirmed by

space-miner-game task-102 (GD-02c cursor widget), 2026-07-13 — reported by Chai as
"cursor completely hidden even when moved away from the game window".
