### 50. `SubViewportContainer.stretch_shrink` zooms the inner Camera2D's view

**Symptom**

You wrap a 2D scene in a `SubViewportContainer` (`stretch=true`) and raise
`stretch_shrink` to pixelate it (render at 1/N resolution, nearest-upscaled). The pixels get
chunkier as intended — but the **camera also zooms IN**: at `stretch_shrink=4` you see far less of
the world than at `1`, and changing the shrink to compare pixel sizes keeps re-framing the shot. No
error; it just looks like the camera moved or the zoom changed on its own.

**Cause**

`stretch_shrink = N` divides the SubViewport's pixel dimensions by N (a 1920×1080
container → a 480×270 SubViewport at N=4). A `Camera2D` inside a viewport shows
`viewport_size / camera.zoom` **world units**, so shrinking the viewport's pixel count shrinks the
visible world extent, and that smaller slice is then upscaled to fill the screen → apparent zoom-in.
Pixel density (the shrink) and framing (the visible world) are **coupled** through the one number:
the SubViewport's pixel count.

**Fix**

Compensate the camera zoom by the same factor: `camera.zoom = base_zoom / stretch_shrink`
(with `base_zoom = 1.0` reproducing the un-pixelated framing). Then visible world =
`(window / shrink) / (base_zoom / shrink) = window / base_zoom`, independent of `shrink` — raising
the shrink changes only pixel chunkiness, and 1 world unit maps to `base_zoom` screen pixels. Apply
it wherever `stretch_shrink` is set/serialized — e.g. a small controller script on the
`SubViewportContainer`, in `_ready` (deferred one frame so the inner `Camera2D` has entered the tree
and become current, or fetch it via `SubViewport.get_camera_2d()`).

**Detect proactively**

Any `SubViewportContainer` with `stretch_shrink > 1` wrapping a `Camera2D`
scene: confirm there is a `camera.zoom = …/stretch_shrink` compensation, otherwise the view will
zoom whenever the shrink is tuned. Grep changed scenes/scripts for `stretch_shrink` set without a
matching `zoom` adjustment.

**Confirmed by**

space-miner-prototype pixel-filter slice (TASK-002), 2026-06-29. A whole-world
SubViewport pixel filter at `stretch_shrink=4` zoomed the view in ~4× until `scripts/pixel_viewport.gd`
set `camera.zoom = base_zoom / stretch_shrink`, decoupling pixel density from framing. Sibling to #49
(the other SubViewport-pixelation trap from the same slice). See ADR-0005.
