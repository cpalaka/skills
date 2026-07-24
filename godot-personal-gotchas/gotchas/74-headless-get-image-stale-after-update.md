# 74 — Headless `ImageTexture.get_image()` never reflects a later `update()`/`set_image()`

## Symptom

In a headless `--script` test, reading back a texture's pixels after changing them returns the
ORIGINAL pixels:

```gdscript
var t := ImageTexture.create_from_image(img_a)
t.update(img_b)          # or t.set_image(img_b)
t.get_image()            # still img_a's pixels — forever
```

No error, no warning. Any before/after pixel-diff assertion on an updated texture is vacuous —
it can false-FAIL a correct update-in-place implementation (bytes "never changed") or
false-PASS a broken one, depending on which way the assertion points.

## Cause

Under the headless dummy RenderingServer the new data is never uploaded, and `get_image()`
readback serves the image captured at `create_from_image` time. Sibling of the headless
render-side blindness family (#21 shader compiles, #59 GPU timers, #73's atlas error being
render-only).

## Fix

Assert at the level that IS observable headless:

- compare the **source `Image`s** (generator-level parity / knob-sensitivity checks on the
  images you would upload), and/or
- an instrumented **build counter** on the producer (how many times the regeneration ran),
- plus instance identity (`texture == previous`) for RID-stability claims.

Leave texture-CONTENT truth to a windowed run (preference #10's engine-side A/B shots).

## Detect proactively

Any headless test calling `texture.get_image()` on a texture that was `update()`d/`set_image()`d
after creation → the readback is stale; restructure the assertion before trusting a green or a
red from it.

## Confirmed by

space-miner-game 2026-07-23 (task-123): probe showed `update()` AND `set_image()` both invisible
to `get_image()` readback headless (alpha stayed at creation-time value); the wedge test asserts
via `_wedge_builds` counter + `_make_wedge_image` parity instead.
