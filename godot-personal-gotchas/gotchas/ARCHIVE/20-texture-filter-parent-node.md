### 20. `CanvasItem.texture_filter` "inherit" member is `TEXTURE_FILTER_PARENT_NODE`, not `TEXTURE_FILTER_INHERIT` (Godot 4.6–4.7)

**Symptom**
`Parse Error: Cannot find member "TEXTURE_FILTER_INHERIT" in base "CanvasItem".` — a LOAD-time parse error (fires at F5 / game boot / when the script loads), not a `--check-only`-only nicety. If a sibling `preload`s the offending script (e.g. `player.gd`), the failure **cascades** and the whole scene won't boot ("can't start the game"). Surfaces at GDScript `--check-only`, `mcp__godot-mcp__godot_editor get_log_messages source="editor"`, and godot-ai `logs_read source=editor` (`GDScript::reload`). A green GUT run or a `[x]` "docs-confirmed" pre-flight checkbox does NOT catch it.

**Cause**
Godot 4.6's `CanvasItem.TextureFilter` enum has **no** `TEXTURE_FILTER_INHERIT` member. The "inherit from parent node / project default" value is **`TEXTURE_FILTER_PARENT_NODE` (= 0)**. Members: `_PARENT_NODE` (0), `_NEAREST` (1), `_LINEAR` (2), `_NEAREST_WITH_MIPMAPS` (3), `_LINEAR_WITH_MIPMAPS` (4), `_*_ANISOTROPIC` (5, 6), `_MAX` (7). The trap is writing `_INHERIT` by analogy with the word "inherit"; `TEXTURE_FILTER_NEAREST` on the same line is correct, which makes the wrong member look plausible.

**Fix**
Use `CanvasItem.TEXTURE_FILTER_PARENT_NODE` for the "leave at default / inherit" branch (`TEXTURE_FILTER_NEAREST` for the pixelated branch is correct as-is). Confirmed against live `godot_docs fetch_class CanvasItem`: `texture_filter` is type `TextureFilter`, default `0` = PARENT_NODE.

**Detect proactively**
When setting `texture_filter` from script (especially a `NEAREST if pixelated else <default>` conditional), the default branch is `TEXTURE_FILTER_PARENT_NODE`, not `_INHERIT`. More broadly: re-verify version-sensitive enum/property names against live `godot_docs` even when a plan/pre-flight checkbox CLAIMS they were docs-confirmed — a `[x]` is not evidence the check ran. Same hidden-until-load class as #12 (`expf` etc.) and #13 (`class_name`) — only an actual load catches it, not a GUT pass.

**Confirmed by**
2026-06-03 — `circle-combat-prototype`, scope-1 stylization Task 5 F5 gate (`scripts/stylization_controller.gd`, `_apply_pixel`); the game wouldn't start, the parse error cascaded through `player.gd`'s `preload`. One-line fix `756031d`. See memory `gotcha-texture-filter-parent-node.md`.

2026-07-25 — **re-verified live on Godot 4.7.stable** (`--check-only`): `CanvasItem.TEXTURE_FILTER_INHERIT` still `Parse Error: Cannot find member "TEXTURE_FILTER_INHERIT" in base "CanvasItem"`; `TEXTURE_FILTER_PARENT_NODE` parses clean. Unchanged from 4.6.2.
