---
name: godot-personal-gotchas
description: Godot 4.x gotcha lookup — matches symptoms (silent failures, settings that don't take effect, mode setters that no-op, panels showing stale state) to a known cause and fix, plus a proactive pre-commit scan. Use on any Godot project (.gd, .tscn, .tres, project.godot, godot-mcp/godot-ai tools) when an operation behaves unexpectedly; BEFORE a risky operation — hand-editing a .tscn/.tres, changing window/display mode from script, `:=` with clamp/min/max/abs/sign, headless --script testing, exporting builds, mutating scenes via MCP; and before committing any Godot change (the pre-commit scan).
---

# Godot Personal Gotchas

A growing index of non-obvious Godot 4.x failures observed first-hand. **Consult by symptom, not by component** — most entries here look like "I set X, no error was thrown, but nothing changed."

## How to use

When something in Godot behaves unexpectedly, scan the index table by symptom **before** debugging from scratch. The point of this skill is that some of these failures have no error signal at all — you can't grep for them, you have to recognize them.

When no entry matches and you later find the cause, add the new gotcha here (see "Adding new gotchas" at the bottom).

> **Migration note:** a project's `docs/godot-gotchas.md` that still mirrors this index predates
> the single-source rule (see "Adding new gotchas") — offer to run `/audit-godot-parity`, which
> shrinks the project doc (removing verified duplicates) under parity-table approval.

## Proactive pre-commit scan

**Run the script first — it is not optional and not a summary of the hand-scan.**

```bash
<this-skill>/scripts/precommit-scan.sh              # staged files (default)
<this-skill>/scripts/precommit-scan.sh --worktree   # unstaged changes
<this-skill>/scripts/precommit-scan.sh --all        # whole tree (slower; diagnostic)
```

It runs 21 mechanized checks — the entries whose **Detect proactively** section is expressible as
a grep / filesystem / git test — and reports `file:line → #entry → fix`, then a `VERDICT:` line and
a count of how many checks ran versus were skipped for lack of matching files. Read the **VERDICT
line, not `$?`** (gotcha #27 — exit codes lie; the code is a convenience only). Vendored trees
(`addons/`, `.godot/`, `build/`) are excluded unless `--include-vendor`.

That count is the point: it separates *checked and clean* from *never checked*, which prose alone
can never do. **Silence is not a pass — a zero-findings run with 21 checks skipped means nothing
was scanned.**

Before trusting any clean reading, calibrate the instrument: `precommit-scan.sh --selftest` plants
a known defect for every check and fails if any one of them doesn't fire, then confirms a clean
tree still reads CLEAN. An instrument that cannot reproduce the defect cannot certify its absence.

**Then hand-scan the residue.** The script covers 21 of 78 entries. The rest are runtime-only,
render-only, or MCP-behavioral and have no static signature — read the diff against the index for
the ones relevant to what changed, guided by the **Symptom families** list under the table. The
highest-yield unmechanizable checks: MCP struct writes that report success (#15/#24/#52), anything
touching an open scene while the editor is running (#55), and export-config changes (#66/#76).

## Tooling: which MCP to use

Many entries below are godot-mcp write quirks — the meta-fix is **use the right tool for the job**:
- **godot-ai = WRITER** — all scene/node/script/property writes, `input_map_manage`, `project_run`, `editor_screenshot`, `logs_read`. Writes every struct type correctly.
- **godot-mcp = READ/TEST** — `godot_input` (inject timed actions, UNIQUE), `godot_runtime_state` (numerical pos/vel/rot), `godot_docs` (version-correct class docs, EXCLUSIVE), `godot_editor get_log_messages source="editor"` (parse errors — `get_errors`/`get_debug_output` were removed in v3.6.1), `godot_editor get_stack_trace` (crashes). **Never write through godot-mcp** (silently no-ops `Rect2` — see #15).
- **minimal-godot = local diagnostics** — `get_diagnostics` (line:col; misses cross-script Variant inference — cross-check `get_log_messages source="editor"`).

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
| 22 | _(superseded by #40)_ — godot-ai `resource_manage op=create` on a script `class_name` failed `VALUE_OUT_OF_RANGE: Unknown resource type` **pre-2.8.1**; 2.8.1+ fails differently, see #40 | body kept at `gotchas/22-*.md` |
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
| 36 | _(retired 2026-07-25)_ — godot-ai Intel/x86 macOS `cryptography` build failure; this machine is arm64 and `/usr/local/Homebrew` is gone. arm64 sibling #37 stays live | see `gotchas/RETIRED.md` |
| 37 | godot-ai dock "exited before the WebSocket handshake" + `Building cryptography` on **arm64**; a native `uv` alone doesn't fix it | an x86_64 Python pulls x86_64 wheels; none exist |
| 38 | _(superseded by #19)_ — godot-ai `uid=` omission on a brand-new Write-tool script; on 4.7/v2.7.5 the reimport fix is exactly #19's, so this collapses into it. Body retains the v2.7.2/4.6.2 `osascript` escalation | body kept at `gotchas/38-*.md` |
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
| 70 | A "swallow hotkeys while a text field has focus" gate kills EVERY hotkey permanently once the user Escs out | Esc exits edit mode but KEEPS focus — gate on `is_editing()` |
| 71 | Web build: `AudioEffectCapture` captures pure SILENCE and playback position freezes after one mix block | web defaults to sample playback, bypassing the bus graph |
| 72 | Custom CLI flags are SILENTLY invisible to the game — `OS.get_cmdline_user_args()` returns `[]`, no warning | user args only begin after a `--` separator |
| 73 | Reassigning an already-RENDERED canvas-light `texture` spams `Parameter "t" is null` once per replacement | decal-atlas removal trips a null check; keep the RID stable |
| 74 | Headless: `ImageTexture.get_image()` returns CREATION-time pixels forever — a later `update(img)` changes nothing | the dummy RenderingServer never uploads the new data |
| 75 | An "is the mouse over UI?" gate via `gui_get_hovered_control() != null` reads TRUE everywhere, so the UI branch always wins | the full-screen `SubViewportContainer` is always hovered |
| 76 | `--headless --import` in a checkout MISSING an enabled plugin's addon dir silently rewrites `project.godot` | Godot prunes unloadable plugins and writes the list back |
| 77 | `--check-only --quit` exits CLEAN on `const X := PackedFloat32Array([...])`; it then dies at LOAD in the CONSUMER | check-only skips constant folding; that is a ctor call |
| 78 | A refactor to mathematically-IDENTICAL vector math shifts ~every result by ~1e-7; `is_equal_approx` tests stay green | vector components are float32; GDScript `float` is f64 |

On an index-row match, read the entry's body file `gotchas/NN-<slug>.md` (NN = the row number zero-padded to 2 digits, e.g. row 13 -> `gotchas/13-classname-cache-reimport.md`) for the full entry — Symptom / Cause / Fix detail, proactive detection, commit hashes — before acting on the fix. The index alone is for routing, not for fixes.

**Symptom families.** When a row is *close* but not exact, check its family — these entries share a
root cause and get mistaken for each other, so the near-match is often a neighbour:

- **Type inference / Variant** — 2 (math globals), 6 (missing `class_name`), 12 (no `*f` form), 18 (literal → typed property), 44 (indexing a literal), 53 (typed read of a freed ref), 77 (non-const `const`)
- **Headless harness lies** — 21 (shader), 26 (`_ready` deferred), 27 (exit codes), 28 (`can_instantiate`), 31 (modal hang), 35 (autoloads), 39 (struct compare), 51 (null `get_tree()`), 59 (Metal timers), 65 (`Range` signals), 74 (texture readback), 77
- **godot-ai / godot-mcp bridge** — 15, 19, 22→40, 23, 24, 25, 29, 32, 34, 38→19, 40, 43, 45, 46, 52
- **Editor vs disk** — 13 (class cache), 15, 34 (reimport races), 55 (clobbered edits), 62 (4.7 re-save), 76 (plugin strip)
- **2D viewport / Control layout** — 49 (0×0 under Node2D), 50 (shrink zooms), 64 (CanvasLayer order), 75 (always-hovered)
- **macOS platform** — 31, 37, 47, 54 (F-keys), 59, 63 (cursor), 68 (trackpad)
- **Silent numerics** — 10 (spring blow-up), 57 (nondeterministic ids), 61 (NaN poisoning), 78 (float32 vectors)
- **UID / staging** — 13, 19, 38→19, 62, 69

## Adding new gotchas

**This skill is the SINGLE SOURCE for universal gotchas** — do not copy them into any project's
`docs/godot-gotchas.md`. Classify first:

- **Universal** — reproduces on any Godot project here given the same engine / tooling / addon
  (Godot, godot-ai, godot-mcp, GDScript, the headless harness, the dev machine, a third-party
  addon). **File it here** (steps below).
- **Project-local** — bound to one project's own code, scenes, assets, or param-tuning. File it in
  *that project's* `docs/godot-gotchas.md`, not here.
- A *convention* (axis-flip, naming, a design rule) is not a gotcha — record it as a `docs/adr/`
  entry, in neither catalog.

To file a universal gotcha here:

1. Append a row to the **Gotcha index** table, within the row budget below.
2. Create `gotchas/NN-<slug>.md` (NN = the new row number, zero-padded to 2 digits; slug = short
   kebab-case from the title) with **Symptom / Cause / Fix / Detect proactively / Confirmed by**
   subsections (same format as existing body files). A gotcha first hit in a specific project keeps
   its `Confirmed by: <project> <date>` anchor here — provenance lives in the skill.
3. Keep entries symptom-first — what you'd type into a search box at 11pm.
4. Do NOT renumber existing entries — the row number is the stable pointer from index to body file.
5. If the **Detect proactively** section can be expressed as a grep / filesystem / git test, add it
   to `scripts/precommit-scan.sh` AND plant a matching defect in `scripts/selftest.sh`. A check with
   no fixture is a check nobody has ever seen fire.
6. Add it to the right **Symptom families** grouping, or start a new one.

### Row budget (load-bearing — the index is a hot path)

**Symptom ≤ 140 chars, cause ≤ 60 chars.** The index is loaded on every invocation of this skill;
the bodies are not. A row exists to answer "is my failure in here?" — the full cause sentence, the
version anchors, and the fix all live in the body, which is read only on a match.

This budget is not cosmetic. The index grew from 8 rows to 78 in two months, and rows grew in
*length* as well as count until one was 768 characters — a paragraph inside a table cell. Without a
written budget that recurs.

- Lead with the error text or the exact call that fails. That is what gets searched.
- Cause is a *fragment*, not a sentence: "Variant-returning math globals", not an explanation.
- Cut version anchors, sibling refs, and measured figures from the row — the body keeps them, and
  siblings belong in **Symptom families**.

### When the index outgrows this shape

**At 120 rows, split the two largest tool-conditional clusters** — the godot-ai/godot-mcp bridge
entries and the headless-harness entries — into `gotchas/mcp-bridge.md` and `gotchas/headless.md`,
each fronted by a one-line index stub naming when to open it.

Deliberately *not* done at 78 rows: those clusters are ~39 entries, worth ~1k tokens compressed,
and both are load-bearing in most Godot sessions here — a session driving godot-ai or running the
headless suite would pay an extra read almost every time to save a fraction of what the compression
already recovered. The trade flips once the index is large enough that most of it is irrelevant to
any given session.

### Retiring an entry

An entry whose environment has gone away is dead weight in the hot path, and "never renumber" means
it stays there forever unless something removes it. See **[`gotchas/RETIRED.md`](gotchas/RETIRED.md)**
for the `**Status:**` field, the collapse procedure, and the standing rule that bodies and numbers
are never deleted. Absent Status means live — do not stamp the live entries.
