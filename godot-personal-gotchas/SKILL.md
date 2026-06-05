---
name: godot-personal-gotchas
description: Personal index of Godot 4.x editor and engine gotchas — looks up symptoms (silent failures, settings that don't take effect, mode setters that no-op, panels showing stale state) to a known cause and fix. Use when working on a Godot project (.gd, .tscn, .tres files, project.godot, godot-mcp tools) AND a Godot operation behaves unexpectedly, especially when calls succeed silently but produce no visible effect.
---

# Godot Personal Gotchas

A growing index of non-obvious Godot 4.x failures observed first-hand. **Consult by symptom, not by component** — most entries here look like "I set X, no error was thrown, but nothing changed."

## How to use

When something in Godot behaves unexpectedly, scan the index table by symptom **before** debugging from scratch. The point of this skill is that some of these failures have no error signal at all — you can't grep for them, you have to recognize them.

If your symptom matches an entry, apply the fix. If it doesn't match, debug normally — then add the new gotcha here when you find the cause (see "Adding new gotchas" at the bottom).

## Tooling: which MCP to use

Many entries below are godot-mcp write quirks — the meta-fix is **use the right tool for the job**:
- **godot-ai = WRITER** — all scene/node/script/property writes, `input_map_manage`, `project_run`, `editor_screenshot`, `logs_read`. Writes every struct type correctly.
- **godot-mcp = READ/TEST** — `godot_input` (inject timed actions, UNIQUE), `godot_runtime_state` (numerical pos/vel/rot), `godot_docs` (version-correct class docs, EXCLUSIVE), `godot_editor get_log_messages source="editor"` (parse errors — `get_errors`/`get_debug_output` were removed in v3.6.1), `godot_editor get_stack_trace` (crashes). **Never write through godot-mcp** (silently no-ops `Rect2` — see #15).
- **minimal-godot = local diagnostics** — `get_diagnostics` (line:col; misses cross-script Variant inference — cross-check `get_log_messages source="editor"`).

One writer at a time (both drive the same `EditorInterface`).

## Gotcha index

| # | Symptom | Cause |
|---|---|---|
| 1 | `DisplayServer.window_set_mode(...)` or `get_window().mode = ...` silently no-ops — mode reads back unchanged, no error | Game is running embedded in the editor's Game tab |
| 2 | GDScript parse error "The variable type is being inferred from a Variant value" on a line like `var x := clamp(a, 0.0, 1.0)` | `clamp`/`min`/`max`/`abs`/`sign`/`floor`/`ceil`/`round` are Variant-returning globals; `:=` infers Variant; warnings-as-errors rejects it |
| 3 | After live Inspector tuning, `.tscn` contains `property = null` lines; on fresh load, typed `@export` floats become 0.0 silently | Inspector "clear override" writes `property = null` instead of removing the line; null coerces to 0.0 for typed numeric exports on scene load |
| 4 | AnimationTree dock: "double-click a node to enter sub-editor", "right-click → Rename", "Set as Start" all silently no-op in Godot 4.6.2 | UI reworked in 4.6.x — use the **Open Editor** button in the node header, edit the inline name field, and connect `Start → <target>` via the Connect tool |
| 5 | After incremental AnimationTree build, Output panel spams `Type mismatch float and bool` + `playback_new.is_null()` every frame while the scene is open; silent on other scenes; fires even with `active = false` | Editor's AnimationTree dock holds a stale preview cache against the newer sub-resource tree. Close the scene tab and reopen — rebuilds the cache. No `.tscn` edit needed |
| 6 | GDScript parse error `Cannot infer the type of "x" variable because the value doesn't have a set type` on lines like `var steering := _other.is_steering()` or `var slow := speed < _other.idle_threshold` | The source script (e.g. `player.gd`) has no `class_name`, so script-defined symbols on a typed Node reference resolve to Variant at engine parse time. `mcp__godot__get_diagnostics` does NOT catch it — only `mcp__godot-mcp__godot_editor get_log_messages source="editor"` does. Fix: annotate the consumer (`var x: bool = ...`) or add `class_name` to the source. Also fires on an untyped param's member (`var s := p.speed`) — a HARD error there regardless of warnings; use `=` or annotate |
| 7 | Dropping a non-code file (e.g. `.svg`, `.png`, `.glb`) into a docs folder makes Godot generate a sibling `.import` file and surface the file in the FileSystem dock as a packageable game resource | Godot scans the whole project root for importable files — no special-casing for docs/notes folders. Fix: add an empty file named **`.gdignore`** (NOT `.godotignore`) inside the folder. Godot then skips imports, hides the folder, and refuses `load()`/`preload()` from it. File must be empty — no `.gitignore`-style patterns supported |
| 8 | AnimationTree StateMachine transition with `advance_condition`/`advance_expression` never auto-fires even when the condition parameter genuinely flips to `true`; `playback.get_current_node()` stays on the source state | `AnimationNodeStateMachineTransition.advance_mode` defaults to `ENABLED = 1`, which only fires via `travel()`. Condition-driven auto-fire requires `advance_mode = AUTO = 2`. Misleading enum name. Editor dock authors transitions with the wrong default |
| 9 | Inside a `func(...)` lambda, reassigning a captured local `bool`/`int`/`float`/`String` from the enclosing scope silently does nothing — no parse error, no warning, lambda runs but outer scalar never updates | GDScript 4 closures capture outer scalars **by value**. The lambda mutates a private copy. `self.*` members and Dictionary entries are fine (reference semantics). Fix: wrap in `Array[T]` of length 1, access via `[0]` |
| 10 | A semi-implicit Euler spring driving a node's `scale` (squash-stretch, hit feedback) blows up within ~10 frames of first impulse — rig becomes invisible (scale past ±10), physics still works, no error in console | At 60fps with `freq > ~6-7 Hz`, the damping bound `2·zeta·omega·dt < 1` is violated *before* the freq bound `omega·dt < 2`; amplitudes grow each cycle. Fix: cap `freq` at ~6 Hz OR replace explicit Euler with sub-stepping / analytical critically-damped form / exponential decay |
| 11 | Walkthrough says "set `bone_index` AND `bone2d_node` separately on a Skeleton2D modification"; in 4.6.2 Inspector, picking the Bone2D from `bone2d_node` auto-populates `bone_index` — looks like 2 fields but it's 1 | Skeleton2D modification UI computes `bone_index` from the picked NodePath. Both fields serialize, but the integer is UI-derived, not user-input. Stale walkthroughs / older docs frame them as independent |
| 12 | GDScript parse error `Identifier "expf"/"sqrtf"/"sinf"/"powf"/"logf" not declared in the current scope` — not a return-type warning, the identifier simply does not exist | Godot 4 ships typed `*f`/`*i` variants ONLY for `clamp`/`min`/`max`/`abs`/`sign`/`floor`/`ceil`/`round`. Transcendentals/trig (`exp`, `log`, `sqrt`, `sin`, `cos`, `tan`, `pow`, `lerp`, `smoothstep`, `move_toward`, ...) are Variant-only. Sibling-but-inverse to #2. Annotate the receiver (`var k: float = exp(...)`) instead of inventing a typed variant |
| 13 | Headless Godot (GUT, `--check-only`, CLI) fails `Could not find type "X"` for a `class_name X` script that demonstrably exists on disk; `mcp__godot__get_diagnostics` reports the file AND its consumer clean | `.godot/global_script_class_cache.cfg` doesn't refresh when a new `class_name` file is created externally (Write tool, `cat`, Finder). Editor LSP parses on demand and gives false-positive green; headless Godot reads the stale cache file. Fix: `mcp__godot-ai__filesystem_manage op=reimport` (preferred — works headless/agent, no window focus, also generates `.uid`) OR focus the editor window to trigger a rescan; verify with `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` > 0. Traps: self-references fail too; targeted reimport doesn't prune deleted-file entries; reimport silently no-ops (falsely reports success) in a brand-new unscanned dir — use `write_text` to force a scan |
| 14 | AnimationTree character stuck on Idle while clearly moving; a nested sub-StateMachine's `playback.get_current_node()` stays on Start/Idle; standing still, the top-level SM oscillates between two states (e.g. `Grounded` ↔ `Fall`) every few frames; no errors/warnings | A boolean `advance_condition`/`advance_expression` is set in only ONE state's branch, so it latches stale-true when that branch stops running. The top-level SM keeps firing the spurious transition every frame; each re-entry re-initialises the nested sub-SM to its Start node, so it never advances. `advance_mode` was already correct — this is about condition *freshness*, not advance_mode (cf. #8). Fix: clear every condition boolean on every frame (add an `else` branch) |
| 15 | godot-mcp `node.update` silently no-ops `Rect2`/`region_rect` writes in every format (v3.6.1; `Transform2D` origin + `NodePath` were fixed in 3.6.1) — the `Rect2` value must be hand-edited into the `.tscn`, after which the open editor's stale in-memory copy makes `get_properties` lie and an editor save clobbers the hand-edit | The bridge's property-set path doesn't serialize `Rect2`; and the editor doesn't reload an externally-modified open scene without a close+reopen. Fix: hand-edit, then close+reopen+save resync before further `node.*`/saves; verify against the on-disk `.tscn`, not `get_properties` |
| 16 | A `RigidBody2D` pinned/jointed (via `PinJoint2D`) to an `AnimatableBody2D` anchor that is a child of a `move_and_slide()` `CharacterBody2D` stays frozen at spawn — the anchor (and the pinned body) won't ride the moving parent; also holds spawn Y on the initial gravity settle; no error/warning | `sync_to_physics = true` makes the `AnimatableBody2D` read its transform authoritatively from the physics frame (designed for code/`AnimationPlayer`/`RemoteTransform2D`-driven motion), so it ignores the parent's scene-tree transform update. Same conflict class the docs flag for `move_and_collide()`. Fix: `sync_to_physics = false` so scene-tree inheritance drives it |
| 17 | A `Node3D` faces/moves backward — code computes "forward" as `+Z`, uses `transform.basis.z` directly, or `atan2(horizontal.x, horizontal.z)` for a heading | Godot's convention is **local -Z is forward** (`look_at` and `-transform.basis.z` both assume it); `+Z`-forward code fights the engine. Fix: use `-transform.basis.z` and the negated `atan2` form; grep changed `.gd` for `basis.z` without a leading `-` |
| 18 | Assigning an array LITERAL to a typed `Array[T]` PROPERTY throws at runtime `Invalid assignment of property 'x' with value of type 'Array'` — even when elements match `T`; parses clean so `--check-only`/`get_diagnostics` miss it | An array literal `[...]` is an untyped `Array`; Godot 4 won't coerce it into a typed `Array[T]` property on assignment (empty `[]` and untyped function params are fine — only typed-property assignment fails). Fix: `prop.assign([...])` or a typed local `var a: Array[T] = [...]; prop = a` |
| 19 | godot-ai writes a script `[ext_resource]` line WITHOUT `uid=` (resolves by `path=` but inconsistent with siblings; breaks on later rename/move) after `node_create`+`script_attach`+`scene_save` on a brand-new script | The `.uid` sidecar doesn't exist yet at save time, so godot-ai has no UID to serialize. Fix: `filesystem_manage op=reimport` the `.gd` (generates `.uid`), then `scene_save` again — clean one-line `uid=` diff. Same reimport trick materializes a `.uid` for committing (the `--script` test runner doesn't generate one for a preload-by-path) |
| 20 | GDScript parse error `Cannot find member "TEXTURE_FILTER_INHERIT" in base "CanvasItem"` when setting `texture_filter` from script — a LOAD-time error (F5/boot) that a green GUT run and a `[x]` docs-confirm checkbox both miss; cascades through any `preload`er | Godot 4.6's `CanvasItem.TextureFilter` has **no** `_INHERIT` member; the inherit/default value is `TEXTURE_FILTER_PARENT_NODE` (= 0). `_INHERIT` gets written by analogy with the word "inherit". Fix: use `TEXTURE_FILTER_PARENT_NODE` for the default branch (`TEXTURE_FILTER_NEAREST` is correct as-is); re-verify version-sensitive enum names against live `godot_docs` even when a plan claims they were checked |
| 21 | Can't compile-check a standalone `.gdshader` headless — `godot --headless --check-only` (and any headless run) never surfaces shader syntax/type errors | Headless uses the **dummy RenderingServer**, which never compiles shaders; a `.gdshader` only compiles when a real RenderingServer loads it into a *used* material (a bare import/scan just registers the file). Editor-open technique: godot-ai `material_manage op=create type=shader shader_path=…` then `op=get` (the returned `shader_parameters` enumerate the uniforms = proof it PARSED) + `logs_read source="editor"` (no `SHADER ERROR` = clean); delete the throwaway `.tres`. Authoritative GPU compile still only at F5 |
| 22 | godot-ai `resource_manage op=create`/`op=get_info` with `type="<YourClassName>"` (a `class_name X extends Resource`) fails `VALUE_OUT_OF_RANGE: Unknown resource type: X`; built-in types (`Curve`, `Environment`, …) work | godot-ai resolves type names against the engine's built-in ClassDB only, not the script `class_name` cache. Fix: hand-write the custom-resource `.tres` inline (Write tool) off an editor-saved instance as the format template (`[ext_resource type="Script" uid=… path=…]`, `[sub_resource type="Resource"]` blocks with `script = ExtResource(…)`, typed arrays as `Array[ExtResource("id")]([…])`), then verify via `resource_manage op=load` + a `project_run` boot-check |
| 23 | godot-ai cannot create `Skeleton3D` bones — `node_set_property bones/0/name` → `PROPERTY_NOT_ON_CLASS`; `batch_execute` can't call `add_bone` either | Bones are neither child nodes nor settable properties (dynamic `bones/N/*` don't exist until the bone does, and there's no bone-count setter), and godot-ai has no method-call verb. Fix: hand-write the bone array into the `[node type="Skeleton3D"]` block (7 lines/bone incl. the pose triple; `Transform3D` is row-major), then a **USER must "Scene → Reload Saved Scene"** (tab-switch/`write_text` do NOT reload); verify a `BoneAttachment3D.bone_idx` resolves 0..n; only after the reload is `scene_save` safe (it bakes the BA transforms). Sibling to #25 |
| 24 | godot-ai `node_set_property` of a `Vector2i` (e.g. `SubViewport.size`) sets it to the **container length**, not the values — dict `{"x":256,"y":256}` and array `[256,256]` both → `Vector2i(2,2)`; string `"Vector2i(256,256)"` no-ops | godot-ai's `Vector2i` value-coercion reads the container length instead of `x`/`y`. `Vector3` is unaffected (sets correctly from a dict). Fix: hand-edit the `Vector2i` line in the `.tscn` (`size = Vector2i(256, 256)`); if the scene is open, close+reopen before `scene_save` so you don't clobber the hand-edit. Sibling to the godot-mcp `Rect2` no-op (#15) — different server, same struct-coercion gap |
| 25 | godot-ai cannot author an AnimationTree graph — `animation_manage` only does AnimationPlayer ops (no BlendTree/StateMachine/BlendSpace verbs), and `add_property_track` is value-track-only (bone clips need `rotation_3d`/`position_3d` transform tracks) | Hand-write the `tree_root` sub-resources + the AnimationPlayer bone-track clips into the `.tscn` (clips as `[sub_resource type="Animation"]` with `tracks/N/type="rotation_3d"`, `keys = PackedFloat32Array(...)`; tree as nested `AnimationNodeAnimation`→`BlendSpace1D`→`StateMachine`→`BlendTree` sub-resources; `Blend2` filter serializes as `filter_enabled=true` + `filters=["Skeleton3D:bone", …]` plain strings). Adding an AnimationTree introduces no new Transform3D → **skip `scene_save`** (editor tab goes stale); validate with a headless `load().instantiate()` that asserts `tree_root != null` and the `parameters/<sm>/playback` param paths RESOLVE. Sibling to #23 |
| 26 | Headless GDScript test (`SceneTree`+`_initialize`+`--script`): a node's `_ready()` does NOT fire synchronously after `add_child(node)` inside `_initialize()`; full-lifecycle assertions silently run against a not-yet-ready node | `_initialize` runs before the tree processes ready notifications |
| 27 | A headless `extends SceneTree` + `_initialize` + `--script` test exits 0 (green to `$?`) even on a PARSE failure or a mid-run RUNTIME abort | A `--script` parse/load failure doesn't set a nonzero exit (nothing ran, `quit(1)` skipped); a runtime error inside `_run()` aborts only that func, caller `_initialize` resumes, prints a truncated-green summary, `quit(0)`. GDScript runtime errors don't propagate up the call stack |
| 28 | A test pinning "this base is abstract / not instantiable" via `not script.can_instantiate()` is inverted — passes against a NON-abstract script, fails against the genuinely-abstract one; no error/warning | `Script.can_instantiate()` reports whether the script is COMPILED/valid, not whether `.new()` is permitted (Godot 4.6.2); it returns `true` for an `@abstract` script. `@abstract` (4.5+) is enforced only at `.new()` time. The queryable signal is `Script.is_abstract()` (4.5+) |
| 29 | Need to move/reorganize `.gd`/`.tscn`/`.tres` into new directories — godot-ai `filesystem_manage` has NO move op (only read/write/reimport/search), and an out-of-editor `mv`/Write-to-new-path orphans every reference | Dependency-safe moves are an editor FileSystem-dock operation. Have the USER drag in the dock: it auto-rewrites all uid-keyed `ext_resource` `path=` entries across `.tscn`+`.tres` (uids byte-identical), carries `.uid` sidecars, and re-points the `class_name` cache via the editor's own scan (no #13 new-dir trap — the editor creates the dirs). It does NOT rewrite bare `preload("res://…")` strings — grep and hand-fix those. Benign: a touched `.tres` may re-serialize and drop optional `load_steps` hints |

## Gotchas

### 1. Embedded game tab blocks window mode changes

**Symptom**
- Call `DisplayServer.window_set_mode(WINDOW_MODE_FULLSCREEN)` or `get_window().mode = Window.MODE_FULLSCREEN` from a `_unhandled_input` (or anywhere else).
- Read the mode back immediately — it's still `0` (WINDOWED).
- Same result for `MAXIMIZED`, so it's not a macOS-fullscreen-animation quirk.
- No errors, no warnings, no return value to check.
- Handler is firing correctly (verify with a print) — just the mode setter that's a no-op.

**Cause**
Godot 4.6 embeds the running game inside the editor's Game tab by default. Embedded views are not real OS windows, so window-mode setters silently do nothing.

**Fix (editor-side, not project-side)**
- **Permanent:** `Editor Settings` (Cmd+,) → search "embed game" → uncheck `Run / Window Placement / Embed Game on Next Play` (exact label varies by 4.6.x patch).
- **Per-run:** while the game is running, click the **"Make Floating"** button on the Game tab's toolbar to detach it.

**Confirmed by**
First hit during the `3d-prototype-1` window-config bootstrap on 2026-05-23. F11/O toggle script fired but the window stayed windowed until the Game tab was detached. Applies to F5 launches and `godot-mcp editor run` equally — it's an editor preference, not an MCP issue.

### 2. `clamp`/`min`/`max`/`abs`/`sign` return Variant — break `:=` inference under warnings-as-errors

**Symptom**
- GDScript line like `var magnitude := clamp(distance / walk_threshold, 0.0, 1.0)` fails to parse.
- Error message: `Parser Error: The variable type is being inferred from a Variant value, so it will be typed as Variant. (Warning treated as error.)`
- The arguments are all floats — looks like it should infer `float`.

**Cause**
Godot 4's global `clamp`, `min`, `max`, `abs`, `sign`, `floor`, `ceil`, `round` are *overloaded* across numeric types — they accept Variant and return Variant. With `gdscript/warnings/untyped_declaration` enabled and `treat_warnings_as_errors` on (defaults in many projects), `:=` inferring Variant becomes a hard error.

**Fix**
Use the explicitly-typed variants. They return `float` or `int` directly so `:=` resolves cleanly.

| Variant return | Float variant | Int variant |
|---|---|---|
| `clamp(x, a, b)` | `clampf(x, a, b)` | `clampi(x, a, b)` |
| `min(a, b)` | `minf(a, b)` | `mini(a, b)` |
| `max(a, b)` | `maxf(a, b)` | `maxi(a, b)` |
| `abs(x)` | `absf(x)` | `absi(x)` |
| `sign(x)` | `signf(x)` | `signi(x)` |
| `floor(x)` | `floorf(x)` | `floori(x)` |
| `ceil(x)` | `ceilf(x)` | `ceili(x)` |
| `round(x)` | `roundf(x)` | `roundi(x)` |

Alternative (worse): annotate explicitly — `var x: float = clamp(...)`. Works, but more verbose than swapping the function name.

**Confirmed by**
Hit during the `3d-prototype-1` movement-depth implementation on 2026-05-24, line 36 of `scripts/player.gd`: `var magnitude := clamp(distance / walk_threshold, 0.0, 1.0)` → fixed by swapping to `clampf`.

### 3. `.tscn` `null` overrides silently zero typed exports

**Symptom**
- After a play session involving live Inspector tuning of `@export` properties, the affected `.tscn` contains lines like:
  ```
  [node name="Player" ...]
  script = ExtResource("...")
  max_speed = null
  turn_rate_deg = null
  ```
- Current session works (Inspector still has live values). Fresh load (fresh checkout, different developer, or just restarting the editor) loads `0.0` for those properties, freezing whatever depended on them.

**Cause**
When the Inspector "clears" an override on an exported property (right-click → Reset, or manual deletion of the override entry), Godot may write back `property = null` instead of removing the line. The apparent intent is "fall back to script default," but the on-disk representation is a destructive `null` override. On scene load, the override is applied — null coerces to `0.0` for typed numeric exports, overriding the script's default.

**Fix**
Hand-edit the `.tscn` to remove the `= null` lines entirely. The script's default then applies on load. (Alternative: set the property to its intended value rather than leaving null.)

**Detect proactively**
After any live-Inspector-tuning session, grep affected `.tscn` files:

```bash
grep ' = null' scenes/*.tscn
```

Any hit is suspicious — investigate whether it's a stale clear-override or intentional.

**Confirmed by**
Hit during the `3d-prototype-1` movement-depth implementation on 2026-05-24. After a feel-tuning session on the Player, `scenes/player.tscn` had `max_speed = null` and `turn_rate_deg = null` overrides. Caught by the final cross-task code reviewer; would have broken the player on next fresh F5.

### 4. AnimationTree dock UI shifted in Godot 4.6.2

**Symptom**
- Following an AnimationTree dock walkthrough (from training data, tutorials, older docs, or LLM-generated instructions) and the described UI affordance doesn't exist:
  - "Double-click `StateMachine` / `BlendTree` / `BlendSpace2D` to enter its sub-editor" — double-clicking does nothing.
  - "Right-click a node → Rename" — no Rename entry in the menu.
  - "Right-click a state → Set as Start / Set Start Node" — no such entry, no toolbar icon either.
- No error message; the user just can't find the control. Easy to spend minutes hunting before realizing the affordance moved.

**Cause**
The AnimationTree dock UI was reworked in Godot 4.6.x. As of 4.6.2:
- **Entering a sub-editor** (StateMachine, SubStateMachine, BlendTree, BlendSpace1D, BlendSpace2D): each container node has an **Open Editor** button inside its node header. Click that.
- **Renaming a node**: the name is an editable inline field on the node — click into it and type. No menu, no F2 shortcut needed.
- **Setting the Start state of a StateMachine**: there is no "Set as Start" affordance. Use the default **Connect Nodes** tool and drag from the green `Start` node to the desired state. Godot serializes this as `transitions = ["Start", "<TargetState>", SubResource(...)]` with default `advance_mode = 2` (Enabled) and no condition — fires unconditionally on entry, functionally equivalent to "this is the Start state."

**Fix**
Use the 4.6.2 idioms above. When writing AnimationTree dock instructions, do not say "double-click", "right-click → Rename", or "Set as Start" — say "Open Editor button", "edit the name field", "drag from Start to <state>".

**Detect proactively**
If you find yourself following or writing a walkthrough that uses the old affordances, translate before clicking (or before instructing a user to click). For LLM-generated walkthroughs: training data skews to older Godot UI conventions — assume the dock UI advice is stale unless explicitly verified against the current Godot version.

**Confirmed by**
Hit during the `3d-prototype-1` Step 5 AnimationTree build on 2026-05-26, Task 4. Agent's walkthrough said "double-click Top to enter its editor", "right-click → Rename", and "Set as Start"; user reported all three were absent in Godot 4.6.2. Resolved by clicking the **Open Editor** button on the Top node header, editing the inline name field, and dragging from `Start → Locomotion`. Serialization verified equivalent: `transitions = ["Start", "Locomotion", SubResource(...)]` with `advance_mode = 2`.

### 5. AnimationTree dock spams stale-preview errors after incremental build

**Symptom**
- While a scene containing a freshly-built `AnimationTree` is open in the editor, the Output panel spams two errors every frame (hundreds per second):
  - `Type mismatch between initial and final value: float and bool` (and `bool and float`) — `animation.cpp:5723` (`validate_type_match`).
  - `Condition "playback_new.is_null()" is true. Returning: AnimationNode::NodeTimeInfo()` — `animation_node_state_machine.cpp:1640` (`_process`).
- Errors fire even when `AnimationTree.active = false`.
- Errors fire even when the `AnimationTree` node isn't selected (so it's not a dock-preview-while-selected thing).
- Errors fire as long as the affected scene is open. Switching to another scene silences them; returning resumes them.
- The on-disk `.tscn` is unchanged — `git status` clean.

**Cause**
During a session of incrementally building an AnimationTree topology — adding `StateMachine`, `SubStateMachine`, `BlendSpace2D`, `OneShot`, etc., one at a time, with saves in between — the editor's AnimationTree dock holds a preview/evaluation cache that can fall out of sync with the actual sub-resource tree. The dock's continuous preview tries to evaluate the stale cache against the newer tree, hitting type mismatches and missing sub-state playbacks. Not a real type mismatch in the imported `.glb` clips, not a `.tscn` corruption.

**Fix**
Close the scene tab (`Cmd+W` or right-click the tab → Close) and reopen it from the FileSystem dock. Forces the editor to rebuild its preview cache from the on-disk `.tscn`. Errors stop immediately. Fastest fix; no edits needed.

**Detect proactively**
After a session of incremental AnimationTree dock work, if the Output panel is noisy with these two specific errors, try a scene close+reopen *before* diving into clip type inspection. Real `.glb`-clip type mismatches exist but require a different repro (re-import after Blender changes, missing animations, etc. — see Godot forum thread linked below).

**Confirmed by**
Hit during the `3d-prototype-1` Step 5 AnimationTree build on 2026-05-26, after 10 incremental tasks on `scenes/player.tscn`. Output panel spamming both error types continuously. Animation track inspection via `mcp__godot-mcp__godot_animation get_details` confirmed clean Skeleton3D `position_3d`/`rotation_3d` tracks across all 12 clips — no value/bool/float tracks. Closing+reopening the player scene tab silenced the errors entirely; `git status` showed `.tscn` clean. Related (but distinct repro) Godot Forum thread: https://forum.godotengine.org/t/type-mismatch-between-initial-and-final-value/123942

### 6. Cross-script `:=` inference fails without `class_name`

**Symptom**
- GDScript line like `var steering := _player.is_steering()` or `var slow := speed < _player.idle_threshold` fails to parse.
- Error message: `Parse Error: Cannot infer the type of "steering" variable because the value doesn't have a set type.`
- `_player` is statically typed (e.g. `CharacterBody3D`), and `is_steering()` / `idle_threshold` are defined on the script attached to that node.
- Other `:=` lines in the same script that use built-in members (`_player.velocity.length()`, etc.) parse fine — only the script-defined symbol accesses fail.
- **Also fires on a member of a *fully untyped* base** — e.g. an untyped function parameter: `func drive(p, ...): var s := p.speed`. `p` is Variant and `p.speed` has no inferable type. Unlike the typed-but-classless case, this is a **HARD compile error independent of `treat_warnings_as_errors`**.

**Cause**
With `_player: CharacterBody3D`, the static parser only knows about `CharacterBody3D`'s built-in members. Script-defined symbols (custom exports, methods, signals) aren't visible to the parser unless the source script declares `class_name Foo`, making `Foo` a globally-known type. Without `class_name`, `_player.script_member` resolves to Variant; `:=` inference fails the same warnings-as-errors gate as the `clamp` family in Gotcha #2. When the base itself is untyped (Variant) — e.g. an untyped param `p` accessed as `p.speed` — there's no type to infer at all and `:=` hard-errors regardless of the warnings config.

**Fix**
Two options, in order of preference:

1. **Add `class_name` to the source script** — e.g. `class_name Player extends CharacterBody3D` at the top of `player.gd`. Members become statically visible everywhere. Side effect: `Player` becomes a global identifier; conflicts with any other declaration of the same name.
2. **Annotate the consumer explicitly** — `var steering: bool = _player.is_steering()`. Minimal surgical fix; doesn't touch the source script. Pick this when adding `class_name` would cause naming friction.

For the **untyped-base** variant (`var s := p.speed` on an untyped param): use plain `=` (`var s = p.speed`, `s` becomes Variant — legal) or annotate the receiver (`var s: float = p.speed`). Never `:=` on a member access of an untyped/Variant base.

**`mcp__godot__get_diagnostics` does NOT catch this.** The per-file LSP has no cross-script context — it reports the file clean. The failure surfaces only when Godot's engine parser tries to load the script at scene-load time. **Always cross-check `mcp__godot-mcp__godot_editor get_log_messages source="editor"` after writing GDScript that touches another script's exports / methods / signals.** Don't treat `get_diagnostics` clean as "all good" — necessary but not sufficient.

**Detect proactively**
When writing GDScript that touches `other_node.some_member` where `some_member` is declared on `other_node`'s attached script, prefer typed annotations on the consumer side or add `class_name` to the source. After writing such code, run `mcp__godot-mcp__godot_editor get_log_messages source="editor"` proactively — don't wait to be asked.

**Confirmed by**
Hit during the `3d-prototype-1` animation Step 6 on 2026-05-26 — `scripts/player_anim.gd` had `var steering := _player.is_steering()` and `var slow := speed < _player.idle_threshold` where `player.gd` had no `class_name`. The parse failure was invisible to `mcp__godot__get_diagnostics` (reported clean) and only surfaced via `mcp__godot-mcp__godot_editor get_log_messages source="editor"` after the user F5'd and reported "scene doesn't load". Fixed by annotating the two locals (`var steering: bool = ...`, `var slow: bool = ...`).

2026-06-02 — `circle-combat-prototype` player-SM Phase B Task B.3 (`scripts/locomotion/grounded.gd`): the plan's verbatim `var s := p.speed` with untyped coordinator param `p` hard-errored headless; fixed to `var s = p.speed`. Reproduced in isolation: `func f(p): var s := p.speed` → exact `Parse Error: Cannot infer the type of "s" variable because the value doesn't have a set type.` (a HARD error here, not the warnings-gated case above).

### 7. `docs/` folder auto-imports non-code files as game resources

**Symptom**
- Drop an `.svg`, `.png`, `.glb`, or other importable file into a documentation folder (e.g. `docs/architecture.svg`).
- Godot generates a sibling `architecture.svg.import` file the next time the editor scans.
- The file appears in the FileSystem dock as if it were a game asset.
- The file would get packaged into game exports.

**Cause**
Godot scans the entire project root (everything under `res://`) for importable files. There is no special-casing for `docs/`, `notes/`, `README/`, etc. — any folder is fair game.

**Fix**
Drop an **empty** file named **`.gdignore`** (note: **not** `.godotignore` — that's a common wrong guess, and Godot silently ignores files with the wrong name) into the folder. Godot then:
- Skips imports for that folder entirely
- Hides the folder from the FileSystem dock
- Refuses `load()`/`preload()` of paths under it
- Speeds up project scanning

After adding `.gdignore`, delete any already-generated `.import` siblings — they won't be regenerated.

**Important constraints**
- File must be **completely empty**. `.gdignore` does NOT support `.gitignore`-style patterns or comments.
- To ignore selectively, organize so the ignored content lives under its own subfolder.
- On Windows, create the file with trailing dot (`.gdignore.`) — Explorer removes it on confirm.

**Detect proactively**
When adding any non-code file to a docs/notes folder, drop `.gdignore` in that folder up front. Especially relevant for: mermaid renders, design mockups, captured screenshots, exported `.glb` references in docs.

**Confirmed by**
2026-05-26 — `docs/architecture.svg` (rendered from `architecture.mmd`) caused Godot to generate `docs/architecture.svg.import` and `docs/architecture.png.import` on next editor scan. User intuited `.godotignore` was the answer; the actual filename is `.gdignore` per https://docs.godotengine.org/en/stable/tutorials/best_practices/project_organization.html.

### 8. `AnimationNodeStateMachineTransition` conditions never fire unless `advance_mode = 2`

**Symptom**
- StateMachine transition wired with `advance_condition = &"my_flag"` or `advance_expression = "..."` in the AnimationTree dock.
- At runtime, the underlying parameter `parameters/<sm_path>/conditions/<flag>` genuinely flips to `true` (verified via `print($AnimationTree.get(...))` in `_physics_process`).
- But the transition never fires; `playback.get_current_node()` stays on the source state, frame after frame.
- Visually: character looks "stuck on one clip" (often Idle, since Start→Idle uses an auto transition that does work).

**Cause**
`AnimationNodeStateMachineTransition.advance_mode` defaults to `ADVANCE_MODE_ENABLED = 1`. The enum naming is misleading — per the Godot docs:

| Mode | Value | Meaning |
|---|---|---|
| `ADVANCE_MODE_DISABLED` | 0 | Don't use this transition. |
| `ADVANCE_MODE_ENABLED` | 1 | **Only use during `AnimationNodeStateMachinePlayback.travel()`.** Does NOT auto-fire on condition. |
| `ADVANCE_MODE_AUTO` | 2 | Automatically use this transition if `advance_condition` / `advance_expression` are `true`. |

So `ENABLED` is the trap: it sounds like "enabled" should mean the transition works, but it only enables `travel()`-based requests. The AnimationTree dock's default when authoring a transition is `Enabled`, which silently breaks the common "set advance_condition and let it fire" pattern.

**Fix**
- In the AnimationTree dock: click the transition → Inspector → **Advance Mode** → **Auto**.
- In `.tscn` hand-edit: add `advance_mode = 2` to the transition subresource.

```
[sub_resource type="AnimationNodeStateMachineTransition" id="..."]
xfade_time = 0.1
advance_mode = 2          # ← required for advance_condition to auto-fire
advance_condition = &"is_steering"
```

**Detect proactively**
Whenever you set `advance_condition` or `advance_expression` on a transition, set `advance_mode = 2` in the same change. After saving any StateMachine, audit the `.tscn`:

```
grep -B1 -A4 'AnimationNodeStateMachineTransition' YourScene.tscn
```

Every transition with an `advance_condition` or `advance_expression` line should have `advance_mode = 2` nearby — otherwise it's dead, only usable via `travel()`.

If intuition disagrees with this, confirm against the docs: `mcp__godot-mcp__godot_docs fetch_class AnimationNodeStateMachineTransition`.

**Confirmed by**
2026-05-26 — `3d-prototype-1` Step 6 animation verification. Character stuck on Idle in F5 despite RMB-hold correctly flipping `is_steering` to `true`. Debug prints showed `param=true cached=true is_steering_raw=true` while `Loc=Idle` frame after frame. Diagnosis surfaced by reading the Godot 4 docs for `AdvanceMode` enum. Fixed by adding `advance_mode = 2` to 6 transitions in `scenes/player.tscn` (Idle→Move, Move→Drift, Drift→Move, Drift→Idle, Move→Pivot, Locomotion→Hit). The 4 transitions that already worked all had `advance_mode = 2` set explicitly (Start→Locomotion, Start→Idle, Pivot→Move, Hit→Locomotion), confirming the diagnosis.

### 9. GDScript 4 lambdas silently no-op on captured local scalar reassignment

**Symptom**
- Inside an inline `func(...)` lambda, assigning to a captured local `bool` / `int` / `float` / `String` from the enclosing scope silently does nothing.
- The lambda parses and runs without error, but the outer-scope variable is never updated.
- Asserts that check the outer value fail. Most painful in GUT unit tests written in the obvious style — the lambda body looks correct but the test fails because the captured flag never flips.

**Cause**
GDScript 4 lambda closures capture outer scalars **by value**, not by reference. Reassignments inside the lambda mutate a captured copy; the outer binding is never updated. The compiler emits no warning. Mutating `self.*` members through a lambda works fine (those go through `self`). Mutating Dictionary entries also works because Dictionaries are reference types. Only captured **local scalars** are affected.

**Fix**
Wrap the captured value in a reference-type container — an `Array[T]` of length 1 is the canonical workaround. Read/write via `arr[0]`.

```gdscript
var fired: Array[bool] = [false]
some_callable(func(_ctx): fired[0] = true)
assert_true(fired[0])
```

Same pattern for `Array[int]`, `Array[float]`, etc. A `Dictionary` like `{value = false}` works equivalently.

**Detect proactively**
Detection is purely empirical — the compiler does NOT warn and `mcp__godot__get_diagnostics` does NOT flag it. The bug only surfaces at runtime when an assertion or behaviour check on the outer variable fails. If a lambda "doesn't seem to do anything," first check whether its body reassigns a captured local scalar. Heuristic grep: `grep -nE 'func\([^)]*\):.*=[^=]' scripts/ test/`.

**Confirmed by**
2026-05-26 — `2d-movement-prototype`, `test/unit/test_player_state_machine.gd` (`test_first_matching_rule_wins`, `test_on_fire_runs_with_ctx`). Commit `ddbdf07` adopted the `Array[T]` wrapper. The bug was invisible until the assertions in those two tests failed.

### 10. Explicit Euler spring instability above ~6 Hz at 60fps

**Symptom**
- A semi-implicit Euler spring driving a node's `scale` (squash-stretch on a Skeleton2D, hit feedback on a sprite, etc.) blows up within ~10 frames of the first impulse.
- Scale oscillates with widening swing, then crosses zero and flips negative, then grows past ±10 within ~20 frames.
- Affected node is **invisible** but physics still works — player can still move via input, collisions still register.
- No error in console. No visible crash.

**Cause**
Semi-implicit (symplectic) Euler integration of a damped harmonic oscillator has two stability bounds:
- `omega · dt < 2` (oscillation frequency vs step size)
- `2 · zeta · omega · dt < 1` (damping vs step size)

The damping bound is tighter — it's violated *before* the freq bound. At 60fps (`dt ≈ 0.0167s`), `freq > ~6-7 Hz` typically pushes `2·zeta·omega·dt` past 1, making amplitudes **grow** each cycle. Skeleton2D scale is a single multiplier on the whole rig, so even small instability becomes catastrophic.

**Fix**
- **Quick**: cap `freq` at ~6 Hz for any spring whose output drives `scale`. Damping helps but isn't the right lever.
- **Robust**: replace explicit Euler with one of: (a) sub-stepping (`tick(delta/N)` × N), (b) analytical critically-damped spring closed form, (c) exponential decay (`current = lerp(current, rest, 1.0 - exp(-rate * dt))`).

**Detect proactively**
Before bumping any spring `freq` value, mentally check `omega · dt` (omega = freq · TAU) and `2·zeta·omega·dt` against the bounds. For scale-driving springs at 60fps, treat `~6-7 Hz` as the effective ceiling unless the integrator is sub-stepped or analytical. If a node's scale "becomes invisible after a few frames" and physics still works, prime suspect is unstable spring.

**Confirmed by**
2026-05-27 — `2d-movement-prototype` Task 17 F5 of `tuning_room.tscn`. `scripts/overlays/squash_stretch.gd` driving `PlayerRig.scale` with `freq=12.0`, `damp=0.55`. On floor land, `apply_impulse(-0.2, 0.4)` set `scale.y = 1.4`, semi-implicit Euler oscillated divergently to `-0.86, 2.48, ...`, rig invisible by frame ~10. Fixed by lowering `squash_spring_freq` from `12.0` to `6.0` (commit `35cdb02`).

### 11. Skeleton2D modification `bone_index` auto-derives from `bone2d_node` in 4.6.2

**Symptom**
- Walkthroughs (training data, tutorials, LLM-generated instructions) for `SkeletonModification2DLookAt` / `SkeletonModification2DTwoBoneIK` describe setting `bone_index` to a specific integer AND setting `bone2d_node` to a NodePath as two independent steps.
- In Godot 4.6.2's Inspector, picking a Bone2D from the `bone2d_node` dropdown **auto-populates `bone_index`** to that bone's position in the Skeleton2D's bone array. The integer field appears manually editable but is computed.

**Cause**
The Skeleton2D modification UI in 4.6.x resolves the picked Bone2D's bone index and writes it to `bone_index`. The integer ends up in the serialized `.tscn`, but is populated by the UI from the NodePath selection — not entered separately by the user.

**Fix**
- When writing or following Skeleton2D modification walkthroughs, instruct: "Set `bone2d_node` to the Bone2D path. `bone_index` will auto-populate."
- Hand-writing `.tscn`: both fields ARE in the serialized form (`bone_index = 9`, `bone2d_node = NodePath("Hip/Torso/Head")`), so both still need to be written. Just keep them consistent — the index is derivable from the path, not arbitrary.

**Detect proactively**
When reviewing AI-generated or older-docs walkthroughs that describe `bone_index` as a manual step, flag as stale.

**Confirmed by**
2026-05-27 — `2d-movement-prototype` Task 15 Step 1. Instructions told user "set bone index to <Head>, set bone2d_node to ../Head"; user observed `bone_index` auto-set when picking the `Head` Bone2D via the `bone2d_node` dropdown. Verified in saved `scenes/player/player_rig.tscn`: both fields present, index matches the Bone2D's array position.

### 12. Godot 4 ships typed `*f`/`*i` variants only for a narrow whitelist — don't write `expf` by analogy

**Symptom**
- GDScript fails to parse with `Identifier "expf" not declared in the current scope.` (or `sqrtf`, `sinf`, `cosf`, `powf`, `logf`, ...).
- Not a "wrong return type" warning — the identifier simply does not exist.
- Especially insidious when the failing script is not covered by GUT — the parse error only surfaces at F5 (or via `mcp__godot-mcp__godot_editor get_log_messages source="editor"`). See Gotcha #6 for the cross-script analog of this hidden-until-F5 class.
- Common motivator: writing typed math by analogy with `clampf` / `minf` / `maxf` (which DO exist — see Gotcha #2) and assuming the pattern extends.

**Cause**
Godot 4 provides typed `*f` / `*i` variants only for a small comparison/rounding family. Most numeric globals — including all transcendentals and most trig — exist **only** as Variant-returning globals.

| Has typed variants | Variant-only — no `*f` |
|---|---|
| `clamp`, `min`, `max`, `abs`, `sign`, `floor`, `ceil`, `round` | `exp`, `log`, `sqrt`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `pow`, `lerp`, `inverse_lerp`, `remap`, `smoothstep`, `move_toward`, `ease`, `snapped`, `posmod`, `fposmod`, ... |

Rare exception: `wrap` is Variant, `wrapf` exists. Don't blanket-assume the lack of typed variants either.

**Fix**
- Use the bare global: `exp(x)`, `sqrt(x)`, `sin(x)`, `pow(x, y)`, `lerp(a, b, t)`.
- If you need a typed float result, annotate the receiver: `var k: float = exp(-rate * dt)`. The Variant return coerces.
- Do NOT invent `expf`, `sqrtf`, `sinf`, `cosf`, `powf`, `logf`, `lerpf`, etc. — none exist.

**Detect proactively**
Before writing any `<math>f(` form, mentally check the whitelist. Grep heuristic for review: `grep -nE '\b(expf|sqrtf|sinf|cosf|tanf|powf|logf|asinf|acosf|atanf|atan2f|lerpf|smoothstepf|move_towardf|easef)\(' scripts/` — any hit is a parse error waiting at F5. Sibling-but-inverse to Gotcha #2.

**Confirmed by**
2026-05-27 — `2d-movement-prototype`. Original line in `scripts/player/player_camera.gd`: `expf(-rate * dt)`. Script was not GUT-covered, parse error surfaced only at F5 when `tuning_room.tscn` instantiated `player_camera.tscn`. One-line fix: `expf` → `exp`. Commit `bb20121`.

### 13. `class_name` cache stale when new script is created outside the editor

**Symptom**
- Headless Godot invocations (`godot --headless ... -s addons/gut/gut_cmdln.gd`, `godot --check-only --quit`, custom CLI scripts) fail with `SCRIPT ERROR: Parse Error: Could not find type "X" in the current scope.`
- The `class_name X` script demonstrably exists — file is on disk, editor is open with the project loaded, `mcp__godot__get_diagnostics` returns clean for both the new file and any file referencing the type.
- GUT reports `Failed to load script ... with error "Parse error"` followed by `WARNING: Ignoring script ... because it does not extend GutTest`.
- The error message points at the *consumer* of the new type, not the missing cache entry — diagnosis is indirect.

**Cause**
When a new `.gd` file declaring `class_name X` is created **externally to the editor** (Claude's Write tool, `cat > file.gd`, copy via Finder, scaffolding scripts, MCP file-creation patterns), the on-disk `.godot/global_script_class_cache.cfg` is NOT updated immediately. The editor's LSP can parse files on demand (so per-file diagnostics succeed and give a false-positive green), but the cache file — which **separate headless Godot processes consult to resolve `class_name` references** — only refreshes when the editor's FileSystem dock actually rescans. Rescan triggers: editor-window focus, FileSystem dock interaction, scene save.

Files created via the editor's "New Script…" dialog do NOT hit this (the dialog writes the cache as part of its action). Edits to existing `class_name` files do NOT hit this either.

**Fix**
- **Preferred when the editor is open + godot-ai MCP is connected** (e.g. an agent session where you can't reliably focus the editor window): `mcp__godot-ai__filesystem_manage` with `op=reimport`, `params={"paths": ["res://scripts/your_new_class.gd", ...]}`. Runs `EditorFileSystem.update_file` — registers the `class_name` in the cache AND generates the `.uid` sidecar, no window focus needed. Works from a subagent too (`ToolSearch` `select:mcp__godot-ai__filesystem_manage` first). **Caveat — NO-OP for a script in a BRAND-NEW directory** the editor's `EditorFileSystem` hasn't scanned (e.g. created via Write tool / `cat` / Finder): `update_file` updates an *already-recognized* file, so reimport **falsely reports success** (`reimported_count:1`) while registering NO class and generating NO `.uid`, leaving it unresolvable headless. Use `write_text` to force a scan instead — see trap (3).
- Otherwise: focus the editor window (or click anywhere in the FileSystem dock) to trigger a scan. This rewrites `.godot/global_script_class_cache.cfg` with the new `class_name` entries.
- Verify before retrying: `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` must return `> 0`.
- Then re-run the headless command.

**Three traps**
- **Self-references fail too.** A script that uses its OWN `class_name` internally (`X.new()`, `-> X`, `Array[X]`) — not just a cross-file consumer — fails with `Identifier not found: X` until that file is reimported. Every new `class_name` script needs the reimport, even standalone ones.
- **Targeted reimport / `write_text` do NOT prune deletions.** They only update the named paths; a cache entry for a DELETED `class_name` file lingers (`class_name X -> deleted_path`) and collides if you later add a real `X` at a different path. To supersede it, create the real file with the same `class_name` and reimport THAT (`update_file` replaces the entry's path — verified the stale entry then resolves to the real file). Only a full editor rescan prunes vanished files wholesale.
- **Reimport silently no-ops in a brand-new directory.** When the `class_name` script lives in a dir the editor never scanned, `reimport` returns success but registers nothing (see Fix caveat). Trigger a SCAN instead: godot-ai `filesystem_manage op=write_text` ("Triggers an editor filesystem scan") on the file (or a sibling) indexes the new dir, registering the class AND generating `.uid`. (Focusing the editor window also scans.) Never trust the `reimport` return for a new dir — verify `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` (> 0).

**Detect proactively**
- Any time a new `class_name`-declaring script is created via tooling (not the editor's New Script dialog), assume the cache is stale until proven otherwise.
- Before any headless GUT / `--check-only` / CLI invocation that exercises a freshly-added `class_name`, grep the cache: `grep -c "<NewClassName>" .godot/global_script_class_cache.cfg`. Zero hits → focus the editor first.
- Do NOT trust `mcp__godot__get_diagnostics` clean output as evidence the headless run will pass — the LSP parses on demand and does not consult the cache.

**Confirmed by**
2026-05-27 — `2d-movement-prototype` F-C1+D1 architectural fix. Created `scripts/player/player_tick_context.gd` (declaring `class_name PlayerTickContext`) via Write tool while editor was running. LSP diagnostics on both the new file and `scripts/player/player.gd` (consumer) came back clean. `godot --headless --path . -s addons/gut/gut_cmdln.gd -gtest=res://test/unit/test_player_state_machine.gd -gexit` produced 5× `Parse Error: Could not find type "PlayerTickContext"`. `grep -c "PlayerTickContext" .godot/global_script_class_cache.cfg` returned `0`. After focusing the editor window, the same grep returned `1` and the GUT run passed 6/6. Commit `a15e3fe`.

2026-06-01 — `circle-combat-prototype` player-SM Phase A. Confirmed the `mcp__godot-ai__filesystem_manage op=reimport` fix (registers the class + generates `.uid`, no window focus — reliable even from a subagent), and both traps: a script self-referencing its own `class_name` (`Intent.new()` inside `intent.gd`) failed `Identifier not found: Intent` headless until reimported; and a stale `class_name ActionSM -> deleted_path` entry was NOT pruned by reimporting the deleted path or by a `write_text` scan — only superseded by creating the real `scripts/action_sm.gd` with the same `class_name` and reimporting it (the entry's path then resolved to the real file; verified by grep + a green headless run).

2026-06-02 — `circle-combat-prototype` player-SM Phase B. New trap (3): `reimport` is a no-op in a **brand-new directory** (`scripts/locomotion/`, Write-tool-created). Reproduced in isolation — a probe `class_name` script in a fresh dir had cache count 0 / no `.uid` after `reimport`-alone (which still returned `reimported_count:1`) and stayed unresolvable headless; a `write_text` on the same file then yielded cache 1 + `.uid` + headless resolution. The fix is `write_text` (forces a scan).

### 14. Stale advance-condition boolean flickers the parent StateMachine and resets a nested sub-StateMachine to Start every frame

**Symptom**
- AnimationTree character appears stuck on Idle — animations never progress past idle even when the player is clearly moving and gameplay conditions are correct.
- A nested sub-StateMachine's `playback.get_current_node()` keeps reading Start/Idle.
- While standing still, the *top-level* StateMachine visibly oscillates between two states every few frames (e.g. `Grounded` ↔ `Fall`).
- No errors, no warnings.
- If the Idle clip has no tracks for some bones (e.g. legs), those bones look frozen during movement — masking that the StateMachine, not the expressions, is the bug.

**Cause**
A boolean `advance_condition` (or a boolean an `advance_expression` references) is written in only ONE branch of the per-frame update — e.g. `is_falling` set only inside `if state == AIRBORNE`. When that branch stops running (player lands → grounded), the boolean is never cleared, so it **latches stale-true**. The top-level SM evaluates that condition EVERY frame in the neighbouring state, so `Grounded→Fall` (stale `is_falling`) keeps firing, paired with `Fall→Grounded` (on `is_grounded`) → perpetual parent flicker. Each time the top-level SM **re-enters** a state containing a nested sub-StateMachine, that sub-SM is **re-initialised to its Start node** — so the nested locomotion SM never advances past Idle, regardless of speed/expressions.

Sibling to Gotcha #8 (`advance_mode = 2` / AUTO), but about condition *freshness*, not advance_mode — here advance_mode was already correct; the stale boolean was the bug.

**Fix**
Maintain advance conditions on EVERY frame of EVERY state, not only in the state that sets them. Add an `else` branch that clears them:

```gdscript
if st == PlayerState.AIRBORNE:
    is_falling = velocity.y > 0.0
    # ... set is_jumping / is_fastfalling ...
else:
    is_jumping = false
    is_falling = false
    is_fastfalling = false
```

Rule: any boolean a StateMachine reads as an advance condition/expression must have a defined value on every frame of every state, or it latches and causes spurious transitions.

**Detect proactively**
- If an AnimationTree character is "stuck on idle," log the top-level `playback.get_current_node()` for a few seconds while idle. If it oscillates between two states, suspect a stale advance condition BEFORE suspecting the nested SM's expressions.
- Audit every condition boolean: is it assigned on every code path each frame, or only inside one state's branch?

**Confirmed by**
2026-05-29 — `2d-movement-prototype`, `scripts/player/player_anim.gd`. `is_falling` was set only in the `if st == PlayerState.AIRBORNE` branch; after the player spawned slightly above ground, fell, and landed, `is_falling` stayed `true` forever. Top-level AnimationTree SM flickered `Grounded` ↔ `Fall` every frame (verified via throttled `print()` of both playbacks), resetting the nested `Grounded` sub-SM to `Idle` each frame; legs (Idle clip has no rotation tracks) appeared frozen during movement. Fixed by adding an `else` branch clearing `is_jumping`/`is_falling`/`is_fastfalling` when not airborne.

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

**Confirmed by**
2026-05-29 — `2d-movement-prototype` IK re-introduction (Tasks 3–5, 7). Setting new `Bone2D.rest = Transform2D(1,0,0,1,0,6)` (`node.update` left origin `(0,0)`; one path gave a det==0 zero-matrix) and four `Sprite2D.region_rect` values (all formats no-op'd) had to be hand-edited into `scenes/player/player_rig.tscn`; `node.get_properties` confirmed the editor's in-memory rests were stale/degenerate while disk was correct, and an editor save would have clobbered disk. Resolved each time by a user close+reopen+save resync, verified by re-reading the on-disk `.tscn`.

### 16. `AnimatableBody2D` with `sync_to_physics = true` ignores a `move_and_slide` parent — pinned bodies don't track

**Symptom**
A `RigidBody2D` is pinned (via `PinJoint2D`) to an `AnimatableBody2D` anchor that is a child of a `CharacterBody2D`. The anchor is meant to ride the player so the pinned body follows. When the player moves via `move_and_slide()`, the anchor — and the pinned body — stays frozen at spawn; the pinned body visibly detaches. No error, no warning. Also shows on the initial gravity settle: the anchor holds the spawn Y while the player falls.

**Cause**
`AnimatableBody2D` with `sync_to_physics = true` reads its position authoritatively from the physics frame — it's designed to be moved *manually* by code / `AnimationPlayer` / `RemoteTransform2D`. A parent's `move_and_slide()` updates the child's scene-tree global transform, but `sync_to_physics = true` makes the body ignore that and hold its physics-frame position (where nothing moved it). Docs warn: do NOT use `sync_to_physics` with `move_and_collide()`; a `move_and_slide()` parent is the same conflict class.

**Fix**
Set `sync_to_physics = false`. Scene-tree parent inheritance then drives the physics transform and the anchor (plus the pinned body) tracks the parent. Inverts the common assumption that `true` is the "safe default" for a parent-ridden anchor — for a *parent-driven* (not code-driven) anchor, `true` is the BROKEN setting.

**Detect proactively**
Pinned/jointed body "won't follow" a node moved by `move_and_slide`/`move_and_collide` and the anchor is an `AnimatableBody2D` → check `sync_to_physics` first. Numeric diagnose: parent x advances, anchor x slope 0 ⇒ not tracking.

**Confirmed by**
2026-05-30 — `arm-control` prototype, build step 5 (shoulder rig for the physics sword-arm). Live via godot-mcp input-injection + `runtime_state watch`: with `sync_to_physics = true`, player x went 0→320 while the anchor x stayed 12 (slope 0); with `false`, the anchor x tracked 12→332 and the pinned arm followed at ~0.03px drift.

### 17. Forward axis is canonical -Z

**Symptom**
A `Node3D` faces or moves the wrong way — code computes "forward" as `+Z` (uses `transform.basis.z` directly, or `atan2(horizontal.x, horizontal.z)` for a heading) and the result points backward relative to the engine's own helpers.

**Cause**
Godot's convention is **local -Z is forward** — the `-Z` axis points out the "front" of a `Node3D`, and both `Node3D.look_at` and `-transform.basis.z` assume it. Code that treats `+Z` as forward fights `look_at` and every engine system that follows the convention.

**Fix**
Use `-transform.basis.z` for the forward vector, and the negated `atan2` form when deriving a heading from a horizontal direction. Audit code that assumes `+Z forward`, uses `transform.basis.z` (vs `-transform.basis.z`), or `atan2(horizontal.x, horizontal.z)` (vs the negated form).

**Detect proactively**
Grep changed `.gd` for `basis.z` without a leading `-`, and `atan2(` in heading math.

**Confirmed by**
Godot's documented `Node3D` convention — `look_at` and `-basis.z` both assume local `-Z` forward.

### 18. Typed `Array[T]` property rejects an untyped array-literal assignment (Godot 4.6, runtime-only)

**Symptom**
- Assigning an array literal to a typed-array PROPERTY throws at runtime: `SCRIPT ERROR: Invalid assignment of property or key 'edges' with value of type 'Array' on a base object of type 'Resource (MoveDef)'.`
- e.g. `move_def.edges = [make_edge()]` where `edges` is `@export var edges: Array[MoveEdge]`. Throws even when every element is the correct type, and even when the element comes from a function typed `-> MoveEdge`.
- The script PARSES clean — fires only at runtime — so `--check-only` and `mcp__godot__get_diagnostics` miss it; only an actual run catches it.

**Cause**
An array literal `[...]` is an untyped `Array`. Godot 4 refuses to assign an untyped `Array` to a typed `Array[T]` property (no implicit element-wise coercion on property set). Asymmetry: an EMPTY literal `[]` → typed array is fine, and passing an untyped array to an untyped function PARAMETER (e.g. `load_graph(moves: Array, ...)`) is fine. The failure is specifically untyped-literal → typed-`Array[T]` PROPERTY assignment.

**Fix**
Use `Array.assign()` (copies + element-type-checks): `move_def.edges.assign([make_edge(), make_edge()])`. Or build a typed local first: `var arr: Array[MoveEdge] = [make_edge()]; move_def.edges = arr`. Both verified.

**Detect proactively**
Watch test / factory / `.tres`-builder code that populates a typed-array resource field (`MoveDef.edges`, `MoveLibrary.moves`/`entry_edges`, `Array[StringName]` fields, ...). Grep: `grep -nE '\.(edges|moves|entry_edges)[ ]*=[ ]*\[' scripts/ tests/`. Runtime-only, so a unit-test run (not `--check-only`) is what catches it.

**Confirmed by**
2026-06-01 — `circle-combat-prototype` player-SM Phase A. The plan's test code authored `MoveDef.edges = [...]`, `MoveLibrary.moves = [...]`, `entry_edges = [...]`; all threw `Invalid assignment of property` at runtime and were fixed to `.assign([...])`. Verified `.assign()` and the typed-local-var form both work; empty-literal and untyped-param paths confirmed unaffected.

### 19. godot-ai omits `uid=` on a script ext_resource when the `.uid` sidecar doesn't exist yet at save time

**Symptom**
godot-ai adds a brand-new script node to a scene (`node_create` + `script_attach` + `scene_save`) and the saved `[ext_resource type="Script" ...]` line is written WITHOUT its `uid=` attribute — even though sibling script ext_resources have `uid="uid://..."`. It still resolves by `path=` (works at runtime) but is inconsistent and breaks if the script is later renamed/moved outside the editor.

**Cause**
godot-ai serializes the ext_resource with whatever it knows at save time. The UID isn't available until the editor imports the freshly-written `.gd` and generates its `.uid` sidecar — which hasn't happened yet at the save.

**Fix**
Do NOT hand-edit the `.tscn`. Instead: (1) `mcp__godot-ai__filesystem_manage` `op=reimport` `params={"paths": ["res://scripts/your_script.gd"]}` generates the `.uid`; (2) `mcp__godot-ai__scene_save` again — godot-ai now writes `uid=` cleanly (verified: a one-line `+uid="uid://..."` diff, zero `unique_id` churn). The same reimport trick materializes a `.uid` so a new script can be committed (a project may track `.uid` files); the headless `--script` test runner does NOT generate a `.uid` for a script it only `preload`s by path.

**Detect proactively**
After any godot-ai scene edit that attaches a newly-created script, grep the saved `.tscn` for the new script's ext_resource line — if it has `path=` but no `uid=` while siblings do, reimport + re-save before committing, and `git add` the new `.uid`.

**Confirmed by**
2026-05-31 — adding `DebugMotionOverlay` (`res://scripts/debug_motion_overlay.gd`) to `scenes/main.tscn`. See memory `gotcha-godot-ai-uid-omission.md`.

### 20. `CanvasItem.texture_filter` "inherit" member is `TEXTURE_FILTER_PARENT_NODE`, not `TEXTURE_FILTER_INHERIT` (Godot 4.6)

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

### 21. Can't compile-check a `.gdshader` headless — the dummy RenderingServer never compiles shaders

**Symptom**
You want a per-task compile-check of a hand-authored `.gdshader` without an F5 and without wiring it into a used material. `godot --headless --check-only --quit` (and any headless run) reports clean even when the shader has syntax/type errors.

**Cause**
A `.gdshader` only compiles when a **real** RenderingServer loads it into a *used* material. Headless runs use the **dummy RenderingServer**, which never compiles shaders; a bare filesystem import/scan doesn't compile it either (`.gdshader` has no import system — the scan just registers the file).

**Fix (editor OPEN = real RenderingServer)**
1. `godot-ai material_manage op=create params={path:"res://shaders/_tmp.tres", type:"shader", shader_path:"res://shaders/foo.gdshader", overwrite:true}` — throwaway ShaderMaterial.
2. `godot-ai material_manage op=get params={path:"res://shaders/_tmp.tres"}` — the returned `shader_parameters` **enumerate the shader's uniforms**, which only succeeds if the shader PARSED (also a cheap cross-check that the uniform surface matches what the GDScript consumer will `set_shader_parameter()`).
3. `godot-ai logs_read source="editor"` — no `SHADER ERROR` line = clean.
4. Delete the throwaway `.tres`/`.uid`/`.import`. (zsh: a glob with no match aborts the whole `rm` line — split it out.)

Authoritative GPU compile still only happens at F5; this is the cheap per-task gate.

**Detect proactively**
When a plan's per-task gate is "compile-check this script," remember it does NOT cover a `.gdshader` — `--check-only` is blind to shaders. Use the editor-open `material_manage create/get` technique, or treat the F5 gate as the real shader exercise. (Ties to preference #6: GUT/`--check-only` green ≠ everything compiles.)

**Confirmed by**
2026-06-03 — `circle-combat-prototype`, scope-1 stylization Task 2 (`shaders/stylize_post.gdshader`); `get` enumerated all 8 uniforms with exact types+defaults, editor log `total_count:0`. See memory `gotcha-shader-compile-check-no-headless.md`.

### 22. godot-ai `resource_manage` can't author script-`class_name` resources — only built-in engine types

**Symptom**
godot-ai `resource_manage` `op=create`/`op=get_info` with `type="<YourScriptClass>"` (e.g. `class_name MoveDef extends Resource`) fails `VALUE_OUT_OF_RANGE: Unknown resource type: MoveDef`. Built-in types (`Curve`, `Environment`, `Gradient`, physics shapes, …) work fine.

**Cause**
godot-ai's `resource_manage` resolves type names against the engine's built-in ClassDB only; it doesn't consult the script-registered global-class (`class_name`) cache. So a custom Resource type is "unknown" even though the editor/GDScript resolve it.

**Fix**
Hand-write the custom-resource `.tres` inline (Write tool) off an existing editor-saved instance as the format template: reference the script via `[ext_resource type="Script" uid="uid://…" path="…"]` (uid from the `.gd.uid` sidecar), declare data as `[sub_resource type="Resource" id="…"]` blocks with `script = ExtResource("…")`, typed arrays as `Array[ExtResource("def_id")]([SubResource("…"), …])`, `StringName` → `&"…"`. Verify via `resource_manage op=load` (parses + lists props) + a `project_run` boot-check reading `logs_read` for load-time `push_error`. Built-in resources still go through godot-ai (e.g. Curve `op=create type="Curve"` then `op=curve_set_points` with `{offset, value}` dicts — NOT `[x,y]` arrays).

**Detect proactively**
Before reaching for godot-ai `resource_manage` on a `.tres`, check whether the `type` is a `class_name` (your script → hand-write inline) or a built-in engine class (→ godot-ai is fine). A `resource_manage` call returning `Unknown resource type:` is this gotcha. Related: #19 (uid omission), #13 (`class_name` cache).

**Confirmed by**
2026-06-02 — `circle-combat-prototype` player-SM Phase E.1 (`8e8d231`), godot-ai v2.5.13 / Godot 4.6.2; the 13-`MoveDef` `library.tres` was hand-written inline. See memory `gotcha-godot-ai-custom-resource-create.md`.

### 23. godot-ai cannot author `Skeleton3D` bones — hand-write the bones block, then a USER reload is required

**Symptom**
`node_set_property bones/0/name` → `PROPERTY_NOT_ON_CLASS` ("not found on Skeleton3D"). The dynamic `bones/N/*` properties don't exist until the bone exists, and there's no bone-count setter to bootstrap one. `batch_execute` has create-node/set-property/delete/attach-script commands but NO method-call command, so it can't call `add_bone`/`set_bone_parent`/`set_bone_rest` either.

**Cause**
godot-ai exposes nodes + properties + a few batch verbs, with no `Skeleton3D` bone-authoring API and no general method-call path; the bone array is engine-internal state reached only through methods godot-ai can't invoke.

**Fix**
Hand-write the bone array into the `[node ... type="Skeleton3D"]` block, 7 lines/bone: `bones/N/name`, `/parent` (int, lower index), `/rest` (`Transform3D`), `/enabled = true`, `/position` (`Vector3` = rest origin), `/rotation` (`Quaternion`, identity `(0,0,0,1)` for translation-only), `/scale = Vector3(1,1,1)`. **Include the pose triple** — omitting it collapses the rig to pose=identity. `Transform3D` is **row-major** (`Transform3D(m00,m01,m02, m10,m11,m12, m20,m21,m22, ox,oy,oz)`); template-extract a rotated basis by setting a node's Euler `rotation` via godot-ai and reading the serialized `transform=`. The editor will NOT pick up the hand-edit on an open scene, and you must NOT `scene_save` (it writes the bone-LESS in-memory copy over your disk bones); tab-switch and `write_text` do NOT reload — a **USER must "Scene → Reload Saved Scene."** Verify the reload: a `BoneAttachment3D.bone_idx` resolves 0..n (write both `bone_name` and `bone_idx`); validate the disk file independently via headless `load().instantiate()` + `get_bone_count()`. After the user reload, `scene_save` is safe and bakes the BA global transforms.

**Detect proactively**
Any task needing `Skeleton3D` bones (or `BoneAttachment3D` rigs) with godot-ai as writer: plan the hand-write + one user reload up front. The `bones/N/name` `PROPERTY_NOT_ON_CLASS` error is the tell. Sibling to #25 (AnimationTree authoring) and the open-scene resync of #15.

**Confirmed by**
2026-06-02 — `circle-combat-prototype` animation slice Task 3 (`scenes/character_puppet.tscn`, `cf77418`), godot-ai 2.5.13 / Godot 4.6.2. See memory `gotcha-godot-ai-skeleton-bones.md`.

### 24. godot-ai `node_set_property` sets a `Vector2i` to the container's LENGTH, not its values

**Symptom**
Setting a `Vector2i` property via godot-ai (e.g. `SubViewport.size`) silently produces the wrong value: dict `{"x":256,"y":256}` → `Vector2i(2,2)` (key count), array `[256,256]` → `Vector2i(2,2)` (length), string `"Vector2i(256, 256)"` → no-op. Any 2-element container → `(2,2)` regardless of values.

**Cause**
godot-ai's `Vector2i` value-coercion reads the container length instead of the `x`/`y` components. **`Vector3` is unaffected** (a dict sets `Camera3D.position` correctly the same session), so it's specific to the `Vector2i` path.

**Fix**
Hand-edit the `Vector2i` line in the `.tscn` (`size = Vector2i(256, 256)`). If the scene is open, the editor holds a stale copy — close+reopen+save resync (don't `scene_save` over the hand-edit first).

**Detect proactively**
When a godot-ai `node_set_property` targets a `Vector2i`-typed property (`SubViewport.size`, `size_2d_override`, TileMap cell coords, …), assume it'll be mangled — set it by hand and read back the `.tscn`. Sibling to the godot-mcp `Rect2` no-op (#15): both struct-coercion gaps, different MCP server.

**Confirmed by**
2026-06-02 — `circle-combat-prototype` animation slice Task 3, `SubViewport.size` on `scenes/character_puppet.tscn`, godot-ai 2.5.13 / Godot 4.6.2. See memory `gotcha-godot-ai-vector2i-length.md`.

### 25. godot-ai has no AnimationTree-graph verbs — hand-write `tree_root` + bone-track clips into the `.tscn`

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

### 26. Headless test harness: `_ready` not synchronous in `_initialize`

**Symptom**
- Running a headless GDScript test that `extends SceneTree`, adds a node in `_initialize()`, and immediately asserts against its initialized state — the assertions see uninitialized/default values, as if `_ready()` never ran.
- No error, no warning: `add_child(node)` succeeds, but the node's `_ready()` has not fired yet.

**Cause**
In `SceneTree._initialize()`, a node's `_ready()` is NOT fired synchronously after `add_child(node)`. `_initialize` runs before the tree processes ready notifications, so full-lifecycle assertions placed right after `add_child` run against a not-yet-ready node.

**Fix**
- Call `node._ready()` explicitly after `add_child(node)`, OR do the assertions in the first `_process(delta)` (which runs after the tree has processed ready notifications).
- To test input handlers without a real mouse, construct InputEvents directly — `InputEventMouseMotion.new()` with `.relative`, `InputEventMouseButton.new()` with `.button_index` / `.pressed` — and feed them to `node._unhandled_input(ev)` (godot-mcp `godot_input` cannot inject mouse motion/buttons).

**How to run**
The harness is `--headless --path . --script res://tests/foo.gd`, where `foo.gd` `extends SceneTree` with `func _initialize()` as the entry point and `quit(code)` for exit status — confirmed working in Godot 4.6.2, including with the editor open on the same project. Invoke with your Godot binary path (Godot is often not on `PATH`).

**Confirmed by**
2026-06-04 — `circle-combat-prototype`. Harness flagged as "unproven" in the uppercut plan; worked on first try. The `_ready`-not-synchronous quirk cost a debug cycle in an integration test. See memory `godot-headless-test-harness.md`.

### 27. Headless `--script` harness exit codes lie — exits 0 on parse failure and mid-run abort

**Symptom**
The headless test harness from #26 — `extends SceneTree` + `_initialize()` calling `_run()` then printing a summary and `quit(1 if _failures > 0 else 0)`, run as `godot --headless --path . --script res://tests/<file>.gd` — exits **0** (green to `$?`/CI) in BOTH failure modes that bypass the assert counters:
- **(a) PARSE failure** (the test file references a const/method not yet defined on a `preload`'d script — the normal TDD RED): Godot prints `SCRIPT ERROR: Parse Error: ...` + `ERROR: Failed to load script "res://tests/..." with error "Parse error".` and exits **0** — `quit(1)` never ran because nothing ran.
- **(b) RUNTIME error inside `_run()`** (nonexistent method on a Variant, wrong arg count, …): aborts ONLY `_run`; the caller `_initialize` continues, prints a truncated-green summary counting only the asserts reached before the abort (`0/0 checks passed, 0 failures`, or worse a real-looking `4/4 checks passed`), and calls `quit(0)`. Exit 0, output looks like a pass.

**Cause**
GDScript runtime errors do NOT propagate up the call stack — the erroring function aborts and returns `null`, and the caller resumes at its next statement. And a `--script` load/parse failure does NOT set a nonzero process exit code. So the harness's quit-code contract holds only when every test line actually executes; any abort that skips `quit(1)` (or runs it after a truncated count) leaves `$?` == 0.

**Fix — never trust the exit code from this harness**
1. **Assert on OUTPUT, not `$?`:** grep for the `N/N checks passed, 0 failures` line AND the ABSENCE of `SCRIPT ERROR`, and **pin the EXPECTED total N** — a truncated green summary has a too-small N, the only tell for mode (b) when the reached asserts all passed.
2. **Wrap every run in a timeout** (macOS has no GNU `timeout`): `perl -e 'alarm 30; exec @ARGV' <godot> --headless --path . --script res://tests/<f>.gd` — an abort in `_initialize` ITSELF (before `quit()`) hangs forever.
3. **As TDD RED evidence, read the `SCRIPT ERROR` lines as the RED signal, NEVER the exit code.**

The structural fix is generalizable: a shared base test that enforces an `EXPECTED_CHECKS` pin (a visible counted check) turns mode (b) + silent truncation into a real counted failure and a genuine nonzero exit, and a runner that derives its verdict from output (never `$?`) per process. Mode (a) stays in-process-undetectable — ad-hoc `--script` runs outside such a runner still need the manual output-reading discipline.

**Confirmed by**
2026-06-04 — `circle-combat-prototype`, architecture-refactor deep-dive #5/#6 RED runs (Godot 4.6.2). Mode (b): a runtime `Nonexistent function` aborted `_run` before any assert and printed `0/0 checks passed, 0 failures`, exit 0; a mid-file abort after 4 passing asserts printed `4/4 checks passed`, exit 0 (most deceptive). Mode (a): `Failed to load script ... Parse error`, exit 0. Structural fix landed in deep-dive #6 (shared base with the `EXPECTED_CHECKS` pin + an output-not-`$?` runner). See memory `gotcha-headless-script-exit-code-lies.md`. Sibling to #13 (a new `class_name` is unresolvable headless → a mode-(a) parse failure that also exits 0).

### 28. `Script.can_instantiate()` is true for an `@abstract` GDScript — use `is_abstract()`

**Symptom**
A test pinning "this base is abstract / not instantiable" via `not script.can_instantiate()` is the exact inverse of intent — it passes against a NON-abstract script and fails against the genuinely-abstract one. No error, no warning.

**Cause**
`Script.can_instantiate()` does NOT consult GDScript `@abstract`-ness (Godot 4.6.2). It returns `true` for an `@abstract class_name X` script because it reports whether the script is **compiled / valid**, not whether `.new()` is *permitted*. Abstractness (the 4.5+ `@abstract` annotation) is enforced at `.new()` time only. The truthful queryable signal is `Script.is_abstract()` (also 4.5+).

**Fix**
`assert_true(script.is_abstract())` for the abstract base; `assert_false(leaf.is_abstract())` for concrete subclasses. Never `not script.can_instantiate()`.

**Detect proactively**
`grep -nE 'can_instantiate\(\)' tests/` — any assertion treating it as a proxy for "is abstract" is inverted.

**Confirmed by**
2026-06-04 — `circle-combat-prototype`, architecture deep-dive #3 (typed locomotion `drive(p)` seam), `tests/test_locomotion_seam.gd`'s `@abstract` pin. The `can_instantiate()` assertion failed against the genuinely-abstract base (`@abstract class_name LocomotionState`, where `can_instantiate() == true`, `is_abstract() == true`); the concrete leaf `grounded.gd` → `is_abstract() == false`. Switched to `is_abstract()` and it went green. First use of `@abstract` in this codebase, Godot 4.6.2. See memory `gotcha-script-abstract-can-instantiate.md`.

### 29. Directory reorgs: godot-ai has no file-move op — USER dock-drag rewrites `ext_resource` paths but NOT bare `preload()` strings

**Symptom**
A scripts/scenes reorganization needs files moved into new directories. godot-ai `filesystem_manage` exposes no move/rename op (only `read`/`write`/`reimport`/`search`), and moving files outside the editor (`mv`, Finder, Write-to-new-path + delete) leaves every `ext_resource` path, `.uid` sidecar, and `preload()` string pointing at the old location.

**Cause**
Dependency-safe moves are an editor FileSystem-dock operation — the dock's drag is what triggers the engine's dependency-rewrite pass. godot-ai simply has no verb for it, and out-of-editor moves bypass the rewrite entirely.

**Fix**
- Have the **USER drag the files in the editor FileSystem dock**. The drag auto-rewrites all uid-keyed `ext_resource` `path=` entries across `.tscn` + `.tres` (uids stay byte-identical), carries the `.uid` sidecars along, and re-points the `class_name` cache via the editor's own scan (no #13 brand-new-dir reimport trap — the editor creates the dirs itself).
- It does **NOT** rewrite bare `preload("res://…")` string paths — afterwards run `grep -rn 'preload(' scripts/ tests/` and hand-fix any stale paths.
- Benign side effect: the editor may re-serialize a touched `.tres` and drop optional `load_steps` hints — not corruption.

**Detect proactively**
Any task that says "move/reorganize files": plan a USER dock-drag step plus a post-move `preload(` grep up front; never reach for `mv` or Write-to-new-path on referenced files.

**Confirmed by**
2026-06-04 — `circle-combat-prototype` scripts/ reorg into system-map-mirrored subfolders (merge `7e857ae`, ADR-0019). The dock-drag rewrote all 14 uid-keyed `ext_resource` paths (main.tscn + library.tres, uids byte-identical); 26 bare `preload()` strings across 2 scripts + 10 test files needed hand-fixing; editor re-serialization dropped library.tres's optional `load_steps` hint. See memory `scripts-reorg-layout.md`.

## Adding new gotchas

1. Append a row to the **Gotcha index** table with a one-line symptom and a one-line cause.
2. Add a `### N. <Short title>` section below with **Symptom / Cause / Fix / Confirmed by** subsections (mirror the format above).
3. Keep entries symptom-first — what you'd type into a search box at 11pm.
4. If this file grows past ~200 lines, move each gotcha into `gotchas/<slug>.md` and link from the index.
