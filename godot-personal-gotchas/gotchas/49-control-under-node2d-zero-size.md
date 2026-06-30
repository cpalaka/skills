# 49 — A `Control` (e.g. `SubViewportContainer`) parented under a `Node2D` collapses to size 0

**Symptom** — A full-rect Control (the "Full Rect" anchors preset → `anchor_right=1`, `anchor_bottom=1`,
offsets 0) parented directly under a `Node2D` (e.g. the scene root) renders nothing / stays zero-size.
For a `SubViewportContainer` with `stretch=true` the failure is severe and silent: `stretch` sizes the
child `SubViewport` to the container, so a 0-size container leaves the SubViewport at its serialized
default `Vector2i(2,2)`, which nearest-upscales to a **single flat colour filling the whole screen**
(commonly the `CanvasModulate` tint over an effectively empty render). No error, no warning. The tell:
`node_get_properties` on the container shows `size = (0,0)` even though `anchors_preset = 15`, while a
sibling `CanvasLayer` HUD renders perfectly (which misdirects you away from the real cause).

**Cause** — A Control resolves its anchors against its parent's area (`get_parent_area_size()`). That
area is supplied only by a parent **Control**, **CanvasLayer**, **Window**, or the **root viewport** —
a plain `Node2D` (or `Node`) has no rect, so the full-rect anchors resolve to a 0×0 rect and the Control
never fills the viewport. (A `CanvasLayer`-hosted HUD works precisely because the CanvasLayer supplies
the viewport rect to its Control children — which is why the HUD looks fine while the SubViewportContainer
sitting under the `Node2D` scene root is blank.)

**Fix** — Parent the Control under a **CanvasLayer** (or another Control, or make it the scene root). A
CanvasLayer gives its Control children the viewport rect, so the full-rect anchors fill the screen and
`stretch` then sizes the SubViewport correctly. (Forcing `custom_minimum_size`/explicit `size` "works"
but does not follow window resizes — the CanvasLayer host is the robust fix.)

**Detect proactively** — Grep `.tscn` for a `SubViewportContainer` (or any full-rect Control you expect
to fill the screen) whose `parent=` is a `Node2D`/`Node` rather than a `CanvasLayer`/Control. Confirm at
edit-time with `node_get_properties` → `size` must be the window size, not `(0,0)`. A whole-screen
blank / uniform-colour render *with a working HUD* is the symptom signature.

**Confirmed by** — space-miner-prototype pixel-filter slice (TASK-002), 2026-06-29. A `SubViewportContainer`
wrapping the world for a `stretch_shrink` pixel filter was created directly under the `Main` Node2D root →
`size=(0,0)` → SubViewport rendered ~2×2 → the screen filled with the flat `Ambient` CanvasModulate colour
while the `DebugHUD` (a `CanvasLayer`) rendered fine. Fixed by hosting the container under a new `WorldLayer`
CanvasLayer, after which edit-time `size` read `(1920,1080)` and the world rendered. See ADR-0005.
