# 73 — Replacing a rendered canvas-light texture emits `Parameter "t" is null` per replacement

## Symptom

Every reassignment of a `PointLight2D` (canvas light) `texture` that has already been rendered
emits:

```
ERROR: Parameter "t" is null.
   at: texture_remove_from_decal_atlas (...)
```

once per replacement. The light keeps working — the new texture renders fine — but a
knob-driven texture rebuild (one per `set_override`, one per slider tick) spams one error line
per change. The **first** assignment (nil → texture, e.g. in `_ready`) is silent, so boot never
shows it; only replacements do. Render-only: headless runs and the test suite never surface it
(#21 family), so it appears only in windowed/F5 logs.

## Cause

Replacing an already-ATLASED canvas-light texture removes the outgoing texture from the 2D-light
decal atlas, and that removal path trips the engine's null-parameter check (Godot 4.7). The
atlas bookkeeping is the trigger; the assignment itself succeeds.

## Fix

Don't replace the texture — keep the RID stable and write the new pixels into the **existing**
`ImageTexture` in place:

```gdscript
if _light.texture == null:
    _light.texture = ImageTexture.create_from_image(img)   # first build: silent
else:
    (_light.texture as ImageTexture).update(img)           # same size/format: RID + atlas slot stable
```

`update()` requires the same dimensions and format as the original image. Pair with a
change-gate so unchanged knobs don't even regenerate the image (wasted work).

## Detect proactively

- Any `light.texture = <freshly built texture>` inside a hot path (a `balance_reloaded`
  handler, a `_process`, a knob-pull) → replace with the create-once / `update()` pattern.
- The error count scales with replacement count — N knob changes → N lines — which
  distinguishes it from a one-shot boot error.

## Confirmed by

space-miner-game 2026-07-23 (task-123, `src/ship/player.gd` flashlight wedge): baseline = one
error per `set_override`; gating alone (rebuild only on knob change) still emitted one per
LEGITIMATE change; `ImageTexture.update()` in place → zero across multi-override windowed
sessions.
