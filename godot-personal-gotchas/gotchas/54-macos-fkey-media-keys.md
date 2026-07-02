# 54 — macOS delivers media keys, not F1–F12, so a Godot F-key binding silently never fires

## Symptom

On macOS, a Godot game binding a top-row function key never receives it — no error, no
warning, the handler just never runs:

```gdscript
func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventKey and event.pressed and not event.echo:
        match event.physical_keycode:
            KEY_F9:  _reload_stats()          # never fires on default macOS
            KEY_F10: _debug_draw = not _debug_draw
```

Same for an Input-Map action bound to an F-key. Pressing F9/F10 instead triggers a **system**
action — volume, brightness, Mission Control, screen recording — and the game sees nothing.

The trap that hides it: **injected** keycodes DO fire the handler. godot-ai
`game_manage op=input_key {key:"F10", pressed:true}` delivers the physical keycode straight to
the game, bypassing the OS layer — so the feature tests **green under MCP** (and in any headless
injection harness) while silently failing when a human presses the key at a real keyboard.

## Cause

macOS's default keyboard setting **"Use F1, F2, etc. keys as standard function keys" is OFF**.
With it off, the hardware top row emits **media/hardware events** (brightness, volume, Launchpad,
Mission Control, Do Not Disturb, …) at the OS level; the F1–F12 keycodes reach the focused app
only when **Fn** is held. Standard macOS behavior, not a Godot bug — but a Godot F-key binding
*looks* broken because the event never arrives, and there is no error to grep for.

## Fix

- At the keyboard: hold **Fn + F-key**, or enable System Settings → Keyboard → Keyboard Shortcuts
  → Function Keys → **"Use F1, F2, etc. keys as standard function keys"** (global or per-app).
- **Prefer non-top-row keys for dev instrumentation.** Letters/digits (the lab-scene pattern —
  `KEY_1`..`KEY_6`, `KEY_R`, …) have no media-key conflict and work on every macOS default.
  Reserve F-keys only when a design reason demands them, and ship the Fn caveat in docs/UI.
- To *verify* a raw F-key handler under MCP anyway: godot-ai `game_manage op=input_key` injects the
  physical keycode (bypasses the OS media layer) and `editor_manage op=game_eval` reads the
  resulting state — but treat green there as "the code path works," NOT "a user's keyboard will
  deliver the key." The OS-delivery caveat is invisible to injection.

## Detect proactively

Grep changed GDScript on a macOS dev host for top-row F-key bindings — `physical_keycode == KEY_F1`
.. `KEY_F12` (or `keycode`) in `_unhandled_input`/`_input`, or an Input-Map action whose event is an
F-key. Any hit is a candidate silent-no-op: move it off the top row or ship the Fn caveat. A handler
that passes MCP-injected-key verification but has never been pressed at a real keyboard is exactly
the false-green case.

## Confirmed by

space-miner-prototype task-010 (2026-07-02) — F9 (`buddy_stats.tres` reload) and F10 (buddy debug
draw), the project's first top-row F-key bindings. Surfaced by the task's buddy-review as a LOW
finding; the code paths were verified green via godot-ai `game_manage input_key` (which bypasses the
OS media layer) — precisely why the real-keyboard delivery caveat needed documenting. The underlying
media-key behavior is standard macOS (high confidence); the interception itself was not reproduced
first-hand (injection bypassed it).
