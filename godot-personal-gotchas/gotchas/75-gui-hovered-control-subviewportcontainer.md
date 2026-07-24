# 75 — `gui_get_hovered_control()` is never null over the game view (the SubViewportContainer IS a hovered Control)

## Symptom

An "is the mouse over UI?" test via `get_window().gui_get_hovered_control() != null` — used to
swap the cursor, gate input, suppress a tooltip, or decide a click goes to the world vs a panel —
reads TRUE **everywhere**: over the world, over empty space, always. The UI branch permanently
wins; the world never sees "mouse is over me." No error anywhere; the value is simply never null.

## Cause

In a pixel-viewport composition the whole game view is rendered inside a full-screen
`SubViewportContainer`. That container is itself a `Control`, and it must run with
`mouse_filter = STOP` so it can forward mouse input into the inner `SubViewport` — which means it
is **always the deepest hovered control** whenever no real UI panel sits under the cursor. So
`gui_get_hovered_control()` returns the SubViewportContainer instead of `null` over "empty" world
space. (Sibling of #49/#50 — same pixel-viewport `SubViewportContainer` wrapper, different
failure surface.)

## Fix

Define "over UI" as "a hovered control exists AND it is not the compositing container":

```gdscript
var hovered := get_window().gui_get_hovered_control()
var over_ui := hovered != null and not (hovered is SubViewportContainer)
```

Generic — no reference to the specific UI tree, so it survives HUD restructures. (If a project
nests more than one SubViewportContainer, exclude by the specific node/class you use for
compositing rather than the base type.)

## Detect proactively

Any `gui_get_hovered_control()` null-test in a project whose world renders through a
`SubViewportContainer` (the pixel-accent / pixel-filter split, #49/#50 family). The tell is a
UI-vs-world branch that always resolves to the UI side.

## Confirmed by

space-miner-game task-122 (2026-07-23), the cursor-over-Console feature — the over-UI cursor
swap fired everywhere until the SubViewportContainer exclusion was added
(`src/ui/hud/cursor_widget.gd`).
