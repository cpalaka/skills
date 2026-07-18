# 68 — macOS trackpad scroll is InputEventPanGesture, not wheel buttons

## Symptom

Input code handling `MOUSE_BUTTON_WHEEL_UP` / `MOUSE_BUTTON_WHEEL_DOWN` (e.g. in
`_unhandled_input`) responds to a physical mouse wheel and works in the web/wasm build,
but two-finger trackpad scrolling in a native macOS run does **nothing** — no event
reaches the handler, no error, no warning. Easy to misdiagnose as a UI Control eating
the wheel, because the failure only shows on the dev machine's trackpad while every
other input path (mouse, browser, injected events) works.

## Cause

`DisplayServerMacOS`'s `scrollWheel:` handler branches on the NSEvent `phase` /
`momentumPhase`: trackpad scrolls (non-None phase) are emitted as
**`InputEventPanGesture`** only; classic mouse wheels (phase None) are emitted as
wheel `InputEventMouseButton`s only. The two are mutually exclusive per physical
event — handling both does NOT double-fire on macOS. The web platform
(`library_godot_input.js`) maps DOM `wheel` events to wheel buttons and never
synthesizes pan gestures, so wasm builds mask the gap (browser does the translation).

## Fix

Handle both in the same input handler:

```gdscript
elif event is InputEventPanGesture:
    var pg := event as InputEventPanGesture
    var exponent := clampf(-pg.delta.y * SENSITIVITY, -0.5, 0.5)  # fingers-up = wheel-up
    if exponent != 0.0:
        _apply_scroll(pow(STEP, exponent))
```

Godot emits pan delta as `(-dx, -dy)`, so `-delta.y` makes fingers-up match
wheel-up. Deltas are small and continuous (many events per swipe) — scale with a
sensitivity constant rather than applying a full wheel-step per event. Momentum
scrolling keeps emitting pan events briefly after finger-lift (feel knob, not a bug).

## Detect proactively

Any diff that adds `MOUSE_BUTTON_WHEEL_UP`/`WHEEL_DOWN` handling without a sibling
`InputEventPanGesture` branch ships trackpad-dead on macOS. Grep:
`grep -l "MOUSE_BUTTON_WHEEL" *.gd | xargs grep -L "InputEventPanGesture"`.

## Confirmed by

kenney-26, 2026-07-18 (task-003 F5 feel round): brush resize worked in the task-002
itch/wasm test but not in native F5 on the trackpad. Mechanism triple-confirmed
against engine source (`godot_content_view.mm` phase branching;
`library_godot_input.js` wheel-only) by independent Opus / Grok 4.5 / GPT 5.6 Sol
review lenses on the fix commit (86df540).
