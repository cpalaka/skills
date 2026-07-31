---
name: godot-personal-gotchas
description: Godot 4.x gotcha lookup — matches symptoms (silent failures, settings that don't take effect, mode setters that no-op, panels showing stale state) to a known cause and fix, plus a proactive pre-commit scan. Use on any Godot project (.gd, .tscn, .tres, project.godot, godot-mcp/godot-ai tools) when an operation behaves unexpectedly; BEFORE a risky operation — hand-editing a .tscn/.tres, changing window/display mode from script, `:=` with clamp/min/max/abs/sign, headless --script testing, exporting builds, mutating scenes via MCP; and before committing any Godot change (the pre-commit scan).
---

# Godot Personal Gotchas

A growing index of non-obvious Godot 4.x failures observed first-hand. **Consult by symptom, not by component** — most entries here look like "I set X, no error was thrown, but nothing changed."

## How to use

When something in Godot behaves unexpectedly, scan the index table by symptom **before** debugging from scratch. The point of this skill is that some of these failures have no error signal at all — you can't grep for them, you have to recognize them.

When no entry matches and you later find the cause, file the new gotcha — procedure in [`ADDING.md`](ADDING.md).

> **Migration note:** a project's `docs/godot-gotchas.md` that still mirrors this index predates
> the single-source rule (see [`ADDING.md`](ADDING.md)) — offer the `audit-godot-parity` skill
> (`$audit-godot-parity` in Codex, `/audit-godot-parity` in Claude Code), which
> shrinks the project doc (removing verified duplicates) under parity-table approval.

## Proactive pre-commit scan

**Run the script first — it is not optional and not a summary of the hand-scan.**

```bash
<this-skill>/scripts/precommit-scan.sh              # staged files (default)
<this-skill>/scripts/precommit-scan.sh --worktree   # unstaged changes
<this-skill>/scripts/precommit-scan.sh --all        # whole tree (slower; diagnostic)
```

It runs 23 mechanized checks — the entries whose **Detect proactively** section is expressible as
a grep / filesystem / git test — and reports `file:line → #entry → fix`, then a `VERDICT:` line and
a count of how many checks ran versus were skipped for lack of matching files. Read the **VERDICT
line, not `$?`** (gotcha #27 — exit codes lie; the code is a convenience only). Vendored trees
(`addons/`, `.godot/`, `build/`) are excluded unless `--include-vendor`.

That count is the point: it separates *checked and clean* from *never checked*, which prose alone
can never do. **Silence is not a pass — a zero-findings run with 23 checks skipped means nothing
was scanned.**

Before trusting any clean reading, calibrate the instrument: `precommit-scan.sh --selftest` plants
a known defect for every check and fails if any one of them doesn't fire, then confirms a clean
tree still reads CLEAN. An instrument that cannot reproduce the defect cannot certify its absence.

**Then hand-scan the residue.** The script covers 23 of 88 entries. The rest are runtime-only,
render-only, or MCP-behavioral and have no static signature — read the diff against the index for
the ones relevant to what changed, guided by the **Symptom families** list under the table. The
highest-yield unmechanizable checks: MCP struct writes that report success (#15/#24/#52), anything
touching an open scene while the editor is running (#55), and export-config changes (#66/#76).

## Tooling: which MCP to use

Many entries below are godot-mcp write quirks — the meta-fix is **use the right tool for the job**:
- **godot-ai = WRITER** — all scene/node/script/property writes, `input_map_manage`, `project_run`, `editor_screenshot`, `logs_read`. Writes every struct type correctly.
- **godot-mcp = READ/TEST** — `godot_input` (inject timed actions, UNIQUE), `godot_runtime_state` (numerical pos/vel/rot), `godot_docs` (version-correct class docs, EXCLUSIVE), `godot_editor get_log_messages source="editor"` (parse errors — `get_errors`/`get_debug_output` were removed in v3.6.1), `godot_editor get_stack_trace` (crashes). **Never write through godot-mcp** (silently no-ops `Rect2` — see #15).
- **minimal-godot = local diagnostics** — `get_diagnostics` (line:col; misses cross-script Variant inference — cross-check `get_log_messages source="editor"`). **A clean read is worth nothing until calibrated:** measured 2026-07-27 (space-miner-game, Godot 4.7) returning `[]` for a file containing an unclosed paren, a string-to-int assignment AND a call to an undefined symbol — probed twice, on a newly-created file and on an already-indexed one mutated in place. A dead LSP connection and a clean file return the identical shape, so the tool cannot distinguish "no errors" from "not looking". Before quoting it as evidence: append a deliberate syntax error, re-probe, confirm it reds, revert. If the probe comes back `[]`, it is dead for that session — fall back to a preload-smoke test or `--check-only --script` (#86). (#06 and #13 explain two specific things it misses; this is the third and worst case — it can miss everything.)

One writer per editor instance (both drive the same `EditorInterface`; a second editor instance — e.g. on a worktree — is a second independent writer).

## Gotcha index

| # | Symptom | Cause |
|---|---|---|
| 1 | `window_set_mode(...)` / `get_window().mode = ...` silently no-ops — mode reads back unchanged, no error | game is embedded in the editor Game tab |
| 2 | Parse error "variable type is being inferred from a Variant value" on `var x := clamp(a, 0.0, 1.0)` | Variant-returning math globals; `:=` can't infer |
| 3 | After Inspector tuning the `.tscn` gains `property = null` lines; typed `@export` floats then load as `0.0` (4.6.x) | clear-override writes null instead of deleting the line |
| 4 | AnimationTree dock: double-click-to-enter, right-click Rename, Set as Start all silently missing/no-op (4.6.2+) | dock UI reworked in 4.6.x — old affordances gone |
| 5 | Output spams `Type mismatch float and bool` + `playback_new.is_null()` every frame on one scene, even with `active = false` | editor dock holds a stale AnimationTree preview cache |
| 6 | Parse error `Cannot infer the type of "x" variable` on `var s := _other.is_steering()` | source script lacks `class_name`, so members are Variant |
| 7 | A `.svg`/`.png`/`.glb` dropped into a docs folder gets an `.import` sibling and shows up as a packageable resource | Godot scans the whole project root for importables |
| 8 | A StateMachine transition with `advance_condition`/`advance_expression` never auto-fires though the condition flips true | `advance_mode` defaults to travel-only; needs `AUTO = 2` |
| 9 | Inside a `func(...)` lambda, reassigning a captured outer `bool`/`int`/`float`/`String` silently does nothing | GDScript closures capture outer scalars by value |
| 10 | A semi-implicit Euler spring driving `scale` blows up within ~10 frames of first impulse — node invisible, no error | at 60fps the damping bound breaks before the freq bound |
| 11 | Walkthrough says set `bone_index` AND `bone2d_node`; in 4.6.2 picking the Bone2D auto-populates `bone_index` | `bone_index` is UI-derived from the NodePath, not input |
| 12 | Parse error `Identifier "expf"/"sqrtf"/"sinf"/"powf" not declared` — the identifier simply does not exist | only a narrow compare/round whitelist has `*f` forms |
| 13 | Headless fails `Could not find type "X"` for an on-disk `class_name X`; `get_diagnostics` reports it clean | stale `global_script_class_cache.cfg` after external write |
| 14 | AnimationTree stuck on Idle while clearly moving; a nested sub-SM stays on Start; the top-level SM oscillates; no errors | a one-branch `advance_condition` latches stale-true |
| 15 | godot-mcp `node.update` silently no-ops `Rect2`/`region_rect` writes in every format (v3.6.1) | bridge can't serialize `Rect2`; editor copy is stale too |
| 16 | A `RigidBody2D` pinned to an `AnimatableBody2D` under a moving `CharacterBody2D` stays frozen at spawn, won't ride it | `sync_to_physics` reads the transform from the physics frame |
| 17 | A `Node3D` faces or moves backward — code treats `+Z` or bare `transform.basis.z` as forward | Godot's convention is local **-Z** forward |
| 18 | Assigning an array LITERAL to a typed `Array[T]` PROPERTY throws at runtime; parses clean so static checks miss it | `[...]` is an untyped `Array`; no coercion on assignment |
| 19 | godot-ai writes a script `[ext_resource]` with no `uid=` after `script_attach`+`scene_save` on a brand-new script | the `.uid` sidecar doesn't exist yet at save time |
| 20 | Parse error `Cannot find member "TEXTURE_FILTER_INHERIT" in base "CanvasItem"` — a LOAD-time error GUT misses | there is no `_INHERIT`; it is `TEXTURE_FILTER_PARENT_NODE` |
| 21 | `--check-only` is blind to `.gdshader`, and so is a headless `preload()` — but BINDING it to a `ShaderMaterial` DOES type-check it | nothing compiles a shader until it is bound to a material |
| 22 | _(superseded by #40)_ godot-ai `resource_manage op=create` on a script `class_name` → `VALUE_OUT_OF_RANGE` pre-2.8.1 | see #40; body kept |
| 23 | godot-ai cannot create `Skeleton3D` bones — `bones/0/name` → `PROPERTY_NOT_ON_CLASS`, and `batch_execute` can't call `add_bone` | bones aren't nodes/properties; no method-call verb |
| 24 | godot-ai `node_set_property` of a `Vector2i` (e.g. `SubViewport.size`) doesn't land — sets the length, or silently no-ops | no `Vector*i` coercion branch before 2.8.0 |
| 25 | godot-ai cannot author an AnimationTree graph — `animation_manage` covers AnimationPlayer ops only | no BlendTree/StateMachine/transform-track verbs |
| 26 | Headless `SceneTree` test: `_ready()` does NOT fire synchronously after `add_child(node)` inside `_initialize()` | `_initialize` runs before ready notifications |
| 27 | A headless `--script` test exits 0 — green to `$?` — even on a PARSE failure or a mid-run RUNTIME abort | runtime errors don't propagate; a parse failure sets no code |
| 28 | A test pinning "this base is abstract" via `not script.can_instantiate()` is INVERTED — it passes on a non-abstract script | reports COMPILED, not instantiable; true for `@abstract` |
| 29 | Need to move `.gd`/`.tscn` into new dirs — godot-ai has NO move op, and an out-of-editor `mv` orphans every reference | dependency-safe moves are an editor-dock-only operation |
| 30 | Copying a `.gdextension` addon into `addons/` with the editor open kills it instantly — no dialog, no crash report | server-level extensions can't hot-load |
| 31 | A `--headless` run on macOS prints the banner then sits at 0% CPU forever — the exit code never arrives | fatal setup errors run a modal `NSAlert` even headless |
| 32 | godot-ai `input_mouse` reports `sent:true`, but `get_global_mouse_position()` acts at one fixed off-window point | it reads the tracked OS cursor, not the injected position |
| 33 | Rapier `Fluid2D` particles silently vanish through `StaticBody2D` walls (y~4e6); worse at smaller particle radius | SPH boundary coupling is only kernel-radius thick |
| 34 | After a godot-ai `reimport` the editor log shows fatal-looking `Identifier not found: <Autoload>` — while tests pass | transient EditorFileSystem races; the log never retracts |
| 35 | `--headless --check-only --script <f.gd>` fails `Identifier not found: <Autoload>` though it runs fine at F5 | no SceneTree, so `[autoload]` singletons never register |
| 36 | _(retired 2026-07-25)_ godot-ai Intel/x86 macOS `cryptography` build failure — this machine is arm64; sibling #37 stays live | see `RETIRED.md` |
| 37 | godot-ai dock "exited before the WebSocket handshake" + `Building cryptography` on **arm64**; a native `uv` alone doesn't fix it | an x86_64 Python pulls x86_64 wheels; none exist |
| 38 | _(superseded by #19)_ godot-ai `uid=` omission on a brand-new Write-tool script; on 4.7 the fix is #19's | see #19; body kept for 4.6.2 |
| 39 | `assert_eq(some_dict, Vector2i(3,4))` PASSES even when the value is a raw un-coerced `Dictionary` — a false green | `Dictionary` vs struct `==` errors non-fatally to `false` |
| 40 | (godot-ai 2.8.1+) `resource_manage op=create type="MyThing"` → `WRONG_TYPE: … add @tool to instantiate it here` | PR #583 gates create on `Script.can_instantiate()` |
| 41 | A held `godot_input` injection plus a SAME-batch screenshot captures the AFTER-state, never the during-hold visual | the injection holds the main thread for `duration_ms` |
| 42 | `godot_runtime_state digest` `entity_count` reads SMALLER than the real group — looks like shrinkage or no growth | it's the returned node count, capped by `max_nodes` (40) |
| 43 | godot-ai `source="game"` screenshot / `logs_read` / `game_manage` fails `capture within 20s`; `game_capture_ready` stuck false | the embedded Game tab never completes the handshake |
| 44 | `Cannot infer the type of "x"` as a RUNTIME parse error at `preload`, indexing an array literal `["a","b"][i]` | indexing an untyped literal yields Variant; compiles at load |
| 45 | godot-ai `input_map_manage op=list` omits the project's own `project.godot` `[input]` actions | it reads the editor's live `InputMap`, not `project.godot` |
| 46 | godot-ai `bind_event event_type="key"` writes a LOGICAL `keycode`, not the `physical_keycode` the editor UI records | bind_event has no `physical_keycode` parameter |
| 47 | `godot --headless` segfaults `signal 11` in MoltenVK at rendering-device init inside the Claude Code sandbox | the sandbox blocks the GPU/Metal access MoltenVK needs |
| 48 | A `canvas_item` shader on a `QuadMesh` rebuilding `p = (UV - 0.5) * size` silently MIRRORS its output vertically vs CPU geometry | `QuadMesh` maps `UV.y=0` to local `+Y`, so `p.y = -local_y` |
| 49 | A full-rect `Control` / `SubViewportContainer` under a `Node2D` stays `size=(0,0)` despite the Full Rect preset | a plain `Node2D` supplies no parent rect to anchor against |
| 50 | Raising `SubViewportContainer.stretch_shrink` to pixelate also zooms the camera IN — framing tightens as shrink rises | fewer viewport pixels = less world shown at same zoom |
| 51 | Headless `_initialize` test aborts `Cannot call method 'get_nodes_in_group' on a null value`; `add_to_group` silently fails | root Window isn't in the tree yet, so `get_tree()` is null |
| 52 | godot-ai sets a typed `Array[T]` export and reads it back populated, but the saved `.tscn` silently loads EMPTY | bridge writes untyped `[...]`; typed export rejects it |
| 53 | `Trying to assign invalid previously freed instance` on a line that only READS into a typed local, despite a validity guard | typed assignment validates source before the guard runs |
| 54 | A Godot F-key binding (`KEY_F9`/`F10`) never fires on macOS — but injected keycodes DO, so it tests green under MCP | the macOS top row emits media events unless Fn is held |
| 55 | A hand-edit to an OPEN `.tscn`/`.tres`/`project.godot` is correct on disk, then silently REVERTS later | editor writes its stale in-memory copy back on save |
| 56 | After enabling `physics_interpolation`, things moving OUTSIDE the physics tick judder — `_process` writers, Tweens, spawn-teleports | off-tick transform sources render against a stale snapshot |
| 57 | `ResourceSaver.save` of the SAME resource twice yields byte-different files — only the ExtResource id suffix differs | each save assigns a random 5-char id suffix |
| 58 | Prepending a `# GENERATED …` marker before `[gd_resource …]` in a `.tres` breaks loading (`Parse Error: Expected '['`) | `[gd_resource` must be first; `;` is the comment leader |
| 59 | Benching GPU cost on macOS Metal: `measured_render_time_gpu` is always 0.0 and p95 stays pinned at 16.67 ms | no Metal timestamp queries; macOS occlusion throttling |
| 60 | `%g` in a GDScript format string throws `unsupported format character` at RUNTIME, on every execution of the line | GDScript `%` supports only `s c d o x X f v` |
| 61 | Zeroing an exported frequency/divisor knob makes the spring-driven node FREEZE or VANISH — no error anywhere | silent IEEE float div-by-zero NaN-poisons the transform |
| 62 | First 4.7 editor save of an older `.tscn` rewrites the WHOLE file — `uid=`/`unique_id=` appear, property lines VANISH | save-time UID stamping plus pruning of at-default properties |
| 63 | `Input.MOUSE_MODE_HIDDEN` blanks the cursor across the WHOLE desktop on macOS while the game runs | `mouse_mode` is process-global, not clipped to the window |
| 64 | A screen-space CanvasLayer draws BELOW a same-`layer` CanvasLayer elsewhere when nested under a plain Node | same-`layer` order stops following tree DFS once nested |
| 65 | Setting `.value` on an out-of-tree `HSlider`/`SpinBox` never emits `value_changed`; `Button.pressed` is NOT gated | `Range` routes its signal through a tree-dependent pipeline |
| 66 | A non-dev export that merely EXCLUDES `addons/` boots spamming `Failed to instantiate an autoload` | MCP plugins re-add their autoloads mid-`--export` |
| 67 | A previously-loading `.glb` starts failing `Resource file not found: <Stem>_<name>.png` after an asset-dir cleanup | importer-extracted glTF pngs were pruned as strays |
| 68 | Wheel-button scroll code works in wasm and with a mouse, but macOS two-finger trackpad scrolling does nothing | macOS trackpad sends `InputEventPanGesture`, not wheel |
| 69 | A script committed by explicit path boots locally, but a fresh clone mints a DIFFERENT `uid://` and breaks refs | its `.uid` sidecar twin was never staged |
| 70 | A "swallow hotkeys while a text field has focus" gate kills EVERY hotkey permanently once the user Escs out | Esc exits edit mode but keeps focus; use `is_editing()` |
| 71 | Web build: `AudioEffectCapture` captures pure SILENCE and playback position freezes after one mix block | web defaults to sample playback, bypassing the bus graph |
| 72 | Custom CLI flags are SILENTLY invisible to the game — `OS.get_cmdline_user_args()` returns `[]`, no warning | user args only begin after a `--` separator |
| 73 | Reassigning an already-RENDERED canvas-light `texture` spams `Parameter "t" is null` once per replacement | decal-atlas removal trips a null check; keep the RID stable |
| 74 | Headless: `ImageTexture.get_image()` returns CREATION-time pixels forever — a later `update(img)` changes nothing | the dummy RenderingServer never uploads the new data |
| 75 | An "is the mouse over UI?" gate via `gui_get_hovered_control() != null` reads TRUE everywhere, so the UI branch always wins | the full-screen `SubViewportContainer` is always hovered |
| 76 | `--headless --import` in a checkout MISSING an enabled plugin's addon dir silently rewrites `project.godot` | Godot prunes unloadable plugins and writes the list back |
| 77 | `--check-only --quit` exits CLEAN on `const X := PackedFloat32Array([...])`; it then dies at LOAD in the CONSUMER | check-only skips constant folding; that is a ctor call |
| 78 | A refactor to mathematically-IDENTICAL vector math shifts ~every result by ~1e-7; `is_equal_approx` tests stay green | vector components are float32; GDScript `float` is f64 |
| 79 | Identical `godot` launches capture screenshots at different sizes AND aspect ratios; `--windowed`/`--resolution` don't pin it | project fullscreen mode beats the CLI size flags |
| 80 | Visual verification silently degrades to "ask the user to F5"; `mcp__godot-ai__*` is absent from the tool list, no error anywhere | editor wasn't open at session start; MCP connects once |
| 81 | `AnimatableBody2D` + `sync_to_physics` silently ignores `position`/`global_position` writes — stays at origin; `rotation` applies | server-driven sync suppresses the position setter |
| 82 | A colour committed via `add_surface_from_arrays` never reads back bitwise-equal — 0 of 2178 match; exact-identity tests red on good code | `ARRAY_COLOR` is stored as RGBA8 — 1/255 quantisation |
| 83 | Headless prints NO GDScript warnings — neither `--script` nor `--check-only`; `grep -i warning` reads 0 for known-bad code too | headless has no warning sink; only the editor prints |
| 84 | Widening a shared group/registry query to a 2nd node type: every `(x as T).m()` consumer starts calling a method on null, at a distance | `as T` yields null, not a type error; check-only blind |
| 85 | A composited/mirror `Sprite2D` renders ~×0.4 darker than authored while 2D siblings read fine; `light_mask = 0` doesn't exempt it | `CanvasModulate` tints every CanvasItem; not a light |
| 86 | `--check-only --quit` WITHOUT `--script` exits clean on a syntax error in any script the main scene doesn't load — a no-op flag | without `--script` it only boots `run/main_scene` |
| 87 | Believing `const X := preload("other.gd").CONST` is illegal — so a generated table gets duplicated, or every reader repointed | it IS legal; `preload` resolves at parse time |
| 88 | A throwaway probe project SIGSEGVs after `Could not create directory: 'user://logs'`, and its `class_name` never resolves | sandbox denies `user://`; no import scan ⇒ no class cache |
| 89 | After `set_script()`, every use of the node errors `Nonexistent function 'x' in base 'Node2D'` — at the CALL SITE, not at the script | assigned script failed to compile; node kept its base class |
| 90 | `Array.sort()` on `StringName` keys gives neither alphabetical nor insertion order, and two builds disagree | `StringName <` compares the interned POINTER, not the text |
| 91 | A `call_deferred` transform probe reads the SAME value after a fix as before it, while the game looks right on screen | deferred callables flush BEFORE the last transform flush |
| 92 | `RenderingServer.frame_pre_draw` probe emits ZERO lines headless; `connect()` succeeded, no error | dummy renderer never draws, so the signal never fires |
| 93 | `get_root().add_child(n)` in a `--script` test, then `global_transform` errors `!is_inside_tree()` and returns identity | the root Window is not in the tree during `_initialize` |
| 94 | A grep enumerating a group/signal/action name returns a confidently WRONG count — often zero — while the code works fine | `"x"` and `&"x"` are one name to Godot, two strings to grep |
| 95 | `game_eval` keeps returning pre-change values and a triggered respawn never happens; screenshots say `stale_frame` | a backgrounded / `no_focus` window stalls the main loop |
| 96 | A test preloading a script/scene chain runs GREEN with a syntax error one hop down — `preload` is not a parse gate; errors only on stderr | broken script still loads as a resource; no cascade |

On an index-row match, read the entry's body file `gotchas/NN-<slug>.md` (NN = the row number zero-padded to 2 digits, e.g. row 13 -> `gotchas/13-classname-cache-reimport.md`) for the full entry — Symptom / Cause / Fix detail, proactive detection, commit hashes — before acting on the fix. The index alone is for routing, not for fixes.

**Symptom families.** When a row is *close* but not exact, check its family — these entries share a
root cause and get mistaken for each other, so the near-match is often a neighbour:

- **Type inference / Variant** — 2 (math globals), 6 (missing `class_name`), 12 (no `*f` form), 18 (literal → typed property), 44 (indexing a literal), 53 (typed read of a freed ref), 77 (non-const `const`), 84 (`as T` → null at a distance)
- **Headless harness lies** — 21 (shader), 26 (`_ready` deferred), 27 (exit codes), 28 (`can_instantiate`), 31 (modal hang), 35 (autoloads), 39 (struct compare), 51 (null `get_tree()`), 59 (Metal timers), 65 (`Range` signals), 74 (texture readback), 77, 83 (no warnings printed), 86 (`--check-only` is a no-op without `--script`), 88 (the probe project itself won't boot), 92 (`frame_pre_draw` never fires), 93 (root Window not in tree during `_initialize`), 96 (`preload` is not a parse gate)
- **godot-ai / godot-mcp bridge** — 15, 19, 22→40, 23, 24, 25, 29, 32, 34, 38→19, 40, 43, 45, 46, 52, 80 (channel absent, not failing)
- **Editor vs disk** — 13 (class cache), 15, 34 (reimport races), 55 (clobbered edits), 62 (4.7 re-save), 76 (plugin strip)
- **2D viewport / Control layout** — 49 (0×0 under Node2D), 50 (shrink zooms), 64 (CanvasLayer order), 75 (always-hovered), 85 (`CanvasModulate` crushes composites)
- **macOS platform** — 31, 37, 47, 54 (F-keys), 59, 63 (cursor), 68 (trackpad), 79 (fullscreen size)
- **Screenshots / visual capture** — 41 (held-input timing), 43 (embedded Game tab), 79 (varying size), 1 (`window_set_mode` no-op)
- **Probes that measure the wrong MOMENT** — 91 (`call_deferred` lands pre-flush), 92 (the hook never fires), 93 (transforms read identity out of tree), 41 (held-input timing), 26 (`_ready` deferred)
- **Silent numerics** — 10 (spring blow-up), 57 (nondeterministic ids), 61 (NaN poisoning), 78 (float32 vectors), 82 (RGBA8 vertex colours), 90 (`StringName` sort order)
- **`StringName` is not a `String`** (invisible until it bites) — 90 (`sort()` compares the interned pointer, not the text), 94 (`"x"` and `&"x"` are one name to the engine, two strings to grep)
- **UID / staging** — 13, 19, 38→19, 62, 69

## Adding new gotchas

**This skill is the SINGLE SOURCE for universal gotchas** — never copy one into a project's
`docs/godot-gotchas.md`. Classify first: **universal** (reproduces on any Godot project here, given
the same engine / tooling / addon) files here; **project-local** (bound to one project's own code,
scenes, assets or tuning) files in that project's doc; a *convention* (axis-flip, naming, a design
rule) is neither — it's a `docs/adr/` entry.

Filing one, retiring one, or splitting the index once it outgrows this shape: **read
[`ADDING.md`](ADDING.md)** for the full procedure — row budget, the selftest-fixture requirement,
the 120-row split tripwire, and the `**Status:**` retirement protocol. Read it *before* editing the
table; the budget is load-bearing and the index regrows without it.
