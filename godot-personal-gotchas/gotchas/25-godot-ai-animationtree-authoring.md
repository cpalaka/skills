### 25. godot-ai has no AnimationTree-graph verbs — hand-write `tree_root` + bone-track clips into the `.tscn`

> **Re-verified on godot-ai 3.1.3 (2026-08-07) — STILL TRUE, cite re-anchored.**
> `command grep -rn "AnimationTree\|AnimationNodeStateMachine\|BlendTree\|BlendSpace"` across the
> whole vendored addon returns **0 hits**; the 16 `animation_*` commands (`plugin.gd:421-436`,
> `tool_catalog.gd:44`) are all AnimationPlayer.
> **The dated cites below point at `src/godot_ai/tools/animation.py`, which does NOT exist in the
> vendored GDScript tree** — that path lives only in the uvx-fetched Python server / an upstream
> git clone, so it cannot be checked from a project checkout. Anchor to `plugin.gd:421-436` instead.

**Symptom**
You need an AnimationTree (`tree_root` = `AnimationNodeBlendTree` / nested `AnimationNodeStateMachine` / `BlendSpace1D` / `AnimationNodeAnimation`) and bone-animation clips. godot-ai's `animation_manage` rollup only does **AnimationPlayer** ops (`player_create`, `add_property_track`, presets…) — no BlendTree/StateMachine/BlendSpace verbs — and `add_property_track` is value-track-only (bone clips need `rotation_3d`/`position_3d` transform tracks).

**Cause**
godot-ai's animation surface is AnimationPlayer-only; the AnimationTree graph nodes and 3D transform tracks have no authoring verbs.

**Fix**
Hand-write into the `.tscn` (same as the bones block):
- **Clips** as `[sub_resource type="Animation"]`: `tracks/N/type = "rotation_3d"`, `path = NodePath("Skeleton3D:bone")`, `interp = 0` (stepped), `keys = PackedFloat32Array(time, transition, qx,qy,qz,qw, …)` (6 floats/key for rotation_3d; 5 for position_3d). Bundle in an `[sub_resource type="AnimationLibrary"]` `_data`; AnimationPlayer `libraries = { "": SubResource("…lib") }`. `root_node` defaults `NodePath("..")` so bone paths are `Skeleton3D:bone` (relative to the parent), NOT `../Skeleton3D:bone`.
- **Tree** sub-resources leaf→composite: `AnimationNodeAnimation` → `BlendSpace1D` (`blend_point_N/node`, `/pos`, `min/max_space`) → `StateMachine` (`states/<Name>/node`+`/position`, `transitions = ["Start","<Name>",SubResource(<trans>)]`; Start/End implicit; Start→state transition `advance_mode = 2` AUTO, cf. #8) → `BlendTree` (`nodes/<name>/node`+`/position`, `node_connections`). `Blend2` filter serializes as `filter_enabled = true` + `filters = ["Skeleton3D:bone", …]` (plain quoted strings, NOT `NodePath(...)`); at `blend_amount = 1.0` filtered tracks take input **1**, unfiltered input **0**.
- **AnimationTree node**: `tree_root = SubResource("…BlendTree")`, `anim_player = NodePath("../AnimationPlayer")`, `active = true`, `callback_mode_process = 2` (MANUAL for a stepped clock).

Adding an AnimationTree introduces no new Transform3D → **skip `scene_save`** (the open editor tab goes stale; tab-switch ≠ reload). Validate with a throwaway headless `extends SceneTree`: `load().instantiate()`, assert clips present + `tree_root != null` + `at.get("parameters/<sm>/playback")` and `.../blend_position` **resolve** (proves the runtime param paths match the authored node names).

**Detect proactively**
Any AnimationTree/BlendSpace/StateMachine authoring with godot-ai as writer: plan the `.tscn` hand-write + headless param-path load-check up front. The runtime parameter path follows author-chosen node names (nested-SM-in-BlendTree → `parameters/<smNodeName>/playback`). Sibling to #23 (skeleton bones).

**Confirmed by**
2026-06-02/03 — `circle-combat-prototype` animation slice Tasks 5/7 (`scenes/character_puppet.tscn`, `73845d2`, `3e9300f`), godot-ai 2.5.13 / Godot 4.6.2. See memory `gotcha-godot-ai-animationtree-authoring.md`.

2026-06-12 — UNCHANGED, re-validated against the godot-ai v2.7.2 source: `animation_manage` still AnimationPlayer-only (exactly 15 ops, `src/godot_ai/tools/animation.py:113-129` — no BlendTree/StateMachine/BlendSpace verbs) and `add_property_track` still hardcodes `Animation.TYPE_VALUE` (`animation_handler.gd:295`; no `track_type` parameter server-side).

2026-06-18 — UNCHANGED, re-anchored to godot-ai **v2.7.5** on Godot **4.7**: `animation_manage`'s `ops={…}` block is still AnimationPlayer-only — 15 ops (`player_create`/`delete`/`validate`/`add_property_track`/`add_method_track`/`set_autoplay`/`play`/`stop`/`list`/`get`/`create_simple`/`preset_*`), no BlendTree/StateMachine/BlendSpace verbs — in the Python server `src/godot_ai/tools/animation.py:~113-127` (the `.py` lives in the uvx server / git clone `hi-godot/godot-ai`, NOT the vendored GDScript addon), and `add_property_track` still maps to `Animation.TYPE_VALUE` (`animation_handler.gd:295`). Re-confirmed on Godot 4.7: the only AnimationTree-area change is an additive optional `name` param on `AnimationNodeBlendSpace1D/2D.add_blend_point()` (non-breaking) and `Animation.length` float→double (C#-only); the `.tscn` serialization of BlendTree/StateMachine/BlendSpace1D + `rotation_3d`/`position_3d` tracks is unchanged.
