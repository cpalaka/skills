### 85. A `CanvasModulate` crushes composited sprites, and `light_mask = 0` does NOT exempt them

**Symptom**
- A sprite that mirrors a rendered pass into the 2D canvas (a SubViewport composite band, a mirror `Sprite2D`, any full-frame blit) renders **far darker than authored** — measured ~×0.4 — while ordinary 2D art beside it reads correctly.
- No error, no warning. Setting `light_mask = 0` on the sprite to "take it out of the lighting system" changes nothing.
- Reads as "my material/albedo write didn't land" or "the composite layer is broken", so the debugging goes to the wrong subsystem.

**Cause**
`CanvasModulate` is a **canvas-wide multiply**: it tints *every* `CanvasItem` in the canvas, composited sprites included. It is **not a light**, so `light_mask` has no bearing on it — `light_mask = 0` exempts a CanvasItem from `Light2D` **lamps** only.

That is what makes the disparity asymmetric: the surrounding 2D art gets the ambient multiply *and* recovers brightness from the lamps it is masked into (~×0.65 effective in the measured scene), while the composited band gets the ambient crush with none of the lamp recovery (~×0.4 flat).

**Fix**
- Cancel the ambient on the mirror sprite: `sprite.self_modulate = Color(1.0 / ac.r, 1.0 / ac.g, 1.0 / ac.b)` where `ac` is the `CanvasModulate.color`, guarding each channel with `maxf(ch, 0.05)` against a divide-by-zero blowout.
- Author in-band 3D materials `SHADING_MODE_UNSHADED` at colours **measured from the 2D art under its actual lighting**, so the band lands in the same post-processing (LUT/palette) family as the 2D read rather than in a different one.
- Measure pixels before touching lights. A composited band that is uniformly dark is an ambient/modulate problem; a band that is dark *unevenly* is a lighting problem.

**Detect proactively**
Any new composite/mirror-sprite consumer added to a scene that carries a `CanvasModulate` (grep the scene tree for the node type), and any "the 3D band looks washed out / dark next to its 2D neighbours" report. Also suspect it whenever `light_mask` was the attempted fix and did nothing.

**Confirmed by**
2026-07-24, `space-miner-game` task-126.06 (Godot 4.7), debris render band — root-caused by pixel measurement: a sampled fragment read (102, 80, 29) = authored albedo × the scene's `Ambient` `CanvasModulate` (0.4, 0.4, 0.45), with no lamp term. Universal core promoted from that project's `docs/godot-gotchas.md` P8 via `/audit-godot-parity` 2026-07-27; the project keeps its own entry for the scene-specific anchors.
