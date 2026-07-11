### 15. godot-mcp silently no-ops `Rect2`/`region_rect` writes (v3.6.1) — the hand-edit goes stale in the open editor

**Symptom**
- Setting `Rect2`/`region_rect` via godot-mcp `node.update` silently fails, no error (the call returns "success"):
  - `Rect2` (e.g. `Sprite2D.region_rect`): **every** format no-ops — string `"Rect2(0,0,6,6)"`, dict `{"position":..,"size":..}`, array `[0,0,6,6]`. Stays at default `Rect2(0,0,0,0)`. **Still broken in v3.6.1.**
  - `Transform2D` (e.g. `Bone2D.rest`) + `NodePath` — **RESOLVED in v3.6.1**: formerly only the basis landed and the origin was dropped (a freshly-created bone could end up a degenerate all-zeros `Transform2D`, det == 0); v3.6.1 now writes both correctly. (`Transform3D`/`Basis` unverified post-fix.)
- So the `Rect2` value must be **hand-edited into the `.tscn`** — but then the open editor keeps its **stale in-memory copy**: `node.get_properties` reports the stale value (can't be trusted as confirmation), and a later editor save (Cmd+S or MCP `scene.save`) **clobbers** the hand-edit. Re-opening an already-open scene does NOT force a disk re-read.

**Cause**
The godot-mcp bridge's property-set path doesn't serialize `Rect2` — that format isn't implemented (v3.6.1 fixed the earlier `Transform2D`-origin and `NodePath` gaps). Separately, the editor doesn't reload an externally-modified open scene without an explicit close+reopen (cf. #5, the AnimationTree stale-preview close+reopen fix — same "editor holds a stale copy" family).

**Fix**
Hand-edit the struct property into the `.tscn`, then force a **close-tab → reopen-scene → save** resync before any further MCP `node.*` calls or editor saves. Ordering when other props also changed: `scene.save` the MCP-settable props to disk FIRST, THEN hand-edit the struct props, THEN resync — so the resync preserves everything. Verify against the on-disk `.tscn` (grep/read), never `node.get_properties`, until after the resync.

**Detect proactively**
- After any godot-mcp `node.update` that writes a `Rect2`/`region_rect` (or any struct property), confirm it landed by grepping the on-disk `.tscn` — `grep -n 'region_rect' scenes/.../your_scene.tscn` — NOT `node.get_properties`, which reports the editor's stale in-memory copy. A still-default `Rect2(0, 0, 0, 0)` on disk means the write silently no-op'd despite the "success" return.
- Diff the on-disk `.tscn` before/after any struct-property write through the bridge; an unchanged file is the tell that the format isn't serialized.
- After hand-editing a struct prop, re-grep the `.tscn` once more AFTER the close+reopen+save resync — an editor save that happens before the resync clobbers the hand-edit back to the stale value.

**Confirmed by**
2026-05-29 — `2d-movement-prototype` IK re-introduction (Tasks 3–5, 7). Setting new `Bone2D.rest = Transform2D(1,0,0,1,0,6)` (`node.update` left origin `(0,0)`; one path gave a det==0 zero-matrix) and four `Sprite2D.region_rect` values (all formats no-op'd) had to be hand-edited into `scenes/player/player_rig.tscn`; `node.get_properties` confirmed the editor's in-memory rests were stale/degenerate while disk was correct, and an editor save would have clobbered disk. Resolved each time by a user close+reopen+save resync, verified by re-reading the on-disk `.tscn`.
