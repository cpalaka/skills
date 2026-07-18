# 64 — Nested CanvasLayer silently loses the same-`layer` draw-order tie

## Symptom

A screen-space CanvasLayer (e.g. a full-rect post-process `ColorRect` — palette LUT, vignette,
overlay) that works when parented at the scene root **silently stops applying** when the same
node is nested inside a plain `Node` subtree (a component/layer wrapper). It draws BELOW another
CanvasLayer with the SAME `layer` value (e.g. an instanced world's `WorldLayer` at `layer=0`),
so the effect simply isn't visible. No error, no warning — and a boot smoke that only checks
"scene runs, exit 0" passes green while the rendered look is wrong.

## Cause

When two CanvasLayers share a `layer` value, their relative order does NOT reliably follow
scene-tree DFS position once one of them is nested deeper under a non-Canvas node. A CanvasLayer
under a plain `Node` child lost to a shallower CanvasLayer inside an earlier sibling's subtree,
even though the nested one came later in DFS order — the naive "tree-later draws on top" model
only holds for root-level (equal-depth) placement.

## Fix

Root-parent compositing CanvasLayers: `get_tree().current_scene.add_child(canvas_layer)` (or the
composition root's `add_child`), NOT inside the component's own subtree. If the component owns
the layer's lifecycle, keep the reference and free it explicitly on teardown (it won't die with
the component's subtree). Alternative: give the overlay a strictly higher `layer` value than
everything it must cover — the tie-break never engages across different `layer` values.

## Detect proactively

In any diff adding a `CanvasLayer` beneath a non-Canvas wrapper node (grep: `CanvasLayer.new()`
followed by `add_child` on something that isn't the scene root), ask where its `layer` ties with
an existing CanvasLayer. Verify visually (screenshot/pixel-diff) — never by "it boots".
A quick empirical probe: parent a solid-red full-rect ColorRect on the layer in question; if the
red doesn't cover the screen, the layer is losing the tie.

## Confirmed by

space-miner-game task-110 (LAB-A lab decomposition), 2026-07-13 — the extracted LUT layer's
CanvasLayer(0), nested under its Layer wrapper Node, drew below the instanced world's
WorldLayer(0): palette snap silently absent, caught only by a monolith-vs-lab pixel diff; the
red-rect probe confirmed nested→hidden, root-parented→covers. Fix shipped in commit `4fca06b`
(lut layer root-parents its CanvasLayer, frees it in `on_unmounted`).
