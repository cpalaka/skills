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

**And run it EARLY — `--worktree`, as soon as you have written GDScript, not only at commit.** The
name says pre-commit and every project DoD cites it as a commit gate, so it habitually runs after
the work is done. That is too late for the checks that matter most: several fire at **ERROR**
severity on defects the TEST SUITE CANNOT SEE — a `%e`/`%g` format spec (#60) throws at runtime and
leaves the assertion passing, a `:=` Variant inference (#44) is invisible to `--check-only`.
Measured 2026-08-02 (space-miner-game task-167): a `%.2e` printed a broken message through several
GREEN runs and cost a debugging cycle; `--worktree` flags it the moment the line is written.

```bash
<this-skill>/scripts/precommit-scan.sh              # staged files (default)
<this-skill>/scripts/precommit-scan.sh --worktree   # unstaged changes
<this-skill>/scripts/precommit-scan.sh --all        # whole tree (slower; diagnostic)
```

It runs **25 mechanized checks** — the entries whose **Detect proactively** section is expressible
as a grep / filesystem / git test — and reports `file:line → #entry → fix`, then a `VERDICT:` line
and a count of checks run versus skipped for lack of matching files. Read the **VERDICT line, not
`$?`** (#27 — exit codes lie). Vendored trees (`addons/`, `.godot/`, `build/`) are excluded unless
`--include-vendor`.

**Never quote a count from this paragraph — derive it.** `scripts/lint-index.sh` prints the live row
count; `grep -cE '^check [0-9]|^check_[0-9]+\(\)' scripts/precommit-scan.sh` prints the live check
count. Three different figures (23 / 26 / "only 12 cite an entry") sat in this section at once on
2026-08-08 and all three were wrong; the correction was wrong too. A number you can re-derive in one
command should never be maintained by hand in the hot path.

Six checks (#2, #12, #17, #20, #32, #81) cover entries whose **bodies now live in
`gotchas/ARCHIVE/`** — their index rows were cut because the failure announces itself in a clear
error message, but a free static check that prevents the mistake is still worth keeping. A check
does not need an index row.

That run/skipped count is the point: it separates *checked and clean* from *never checked*, which
prose alone can never do. **Silence is not a pass — zero findings with every check skipped means
nothing was scanned.** Before trusting any clean reading, calibrate: `--selftest` plants a known
defect for every check, fails if any one doesn't fire, then confirms a clean tree still reads CLEAN.

**Then hand-scan the residue.** Most entries are runtime-only, render-only or MCP-behavioural and
have no static signature — read the diff against the index for the ones relevant to what changed,
guided by the **Symptom families** list under the table. Highest-yield unmechanizable checks: MCP
struct writes that report success (#15, #100), anything touching an open scene while the editor is
running (#55, #102), and export-config changes (#66, #76, #107).

## Tooling: which MCP to use

Many entries below are godot-mcp write quirks — the meta-fix is **use the right tool for the job**:
- **godot-ai = WRITER** — all scene/node/script/property writes, `input_map_manage`, `project_run`, `editor_screenshot`, `logs_read`. Writes every struct type correctly.
- **godot-mcp = READ/TEST** — `godot_runtime_state` (hz-sampled pos/vel/rot **time-series**, the one thing nothing else has), `godot_docs` (class-reference **prose**), `godot_input` (ms-timed action injection), `godot_editor get_stack_trace` (crashes). **Never write through godot-mcp** (silently no-ops `Rect2` — see #15).
  - **`godot_input` is NOT unique** (corrected 2026-08-07). godot-ai `game_manage op="input_sequence"` injects **frame-timed NAMED-action** timelines — and frames are the *better* basis: upstream says explicitly they are "what reproduces identically across runs", where `godot_input`'s `start_ms`/`duration_ms` are wall-clock and drift under load. Prefer godot-ai for anything whose timing must reproduce. godot-mcp keeps the edge on *raw keys, joypad/axis, and relative mouse-look*, which action-state injection structurally cannot reach.
  - **`godot_docs` is only PARTLY exclusive.** godot-ai `api_manage(op="get_class")` returns version-correct ClassDB **metadata** (properties/methods/signals/enums/constants/inheritors) from the live editor. `godot_docs` still wins for the **prose descriptions** ClassDB does not carry. Note the caller-facing op is `get_class`; the GDScript handler is named `get_class_info` — writing the latter into a call gets it rejected.
  - **`source="editor"` on `godot_editor get_log_messages` IS A PHANTOM ARGUMENT — it has never existed**, on either fleet version. Re-measured 2026-08-08 against **4.1.0** (`dist/tools/editor.js`): still no `source` key. The schema is a non-strict `z.object`, so the key is **silently stripped** on every call — it succeeds and returns *unfiltered* messages, which is why it read as working for months (#104). For parse errors use godot-ai `logs_read source="editor"`, where the parameter is real (`handlers/editor_handler.gd:72` — valid sources `plugin|game|editor|all`).
  - **4.1.0 added two real filters this catalog never documented:** `severity` (`all|error|warning` — `error` is the "did anything actually break?" read) and `since` (a cursor; every response returns the current one, so you can read only what is new instead of re-reading the buffer). Use these instead of the phantom. On 3.6.1 the schema really is only `{action, clear?, limit?}`.
  - **Check which godot-mcp you are talking to before trusting any version-pinned entry here.** The fleet is split: `space-miner-game` runs **4.1.0**, the other seven Godot projects run **3.6.1** (`tools/mcp/node_modules/@satelliteoflove/godot-mcp/package.json`). godot-ai is **3.1.3** everywhere. A single global catalog cannot state one truth for a fragmented fleet — where an entry pins a version, read the pin, don't assume it matches the project you are in.
- **minimal-godot = local diagnostics** — `get_diagnostics` (line:col; misses cross-script Variant inference — cross-check `get_log_messages source="editor"`). **A clean read is worth nothing until calibrated:** measured 2026-07-27 (space-miner-game, Godot 4.7) returning `[]` for a file containing an unclosed paren, a string-to-int assignment AND a call to an undefined symbol — probed twice, on a newly-created file and on an already-indexed one mutated in place. A dead LSP connection and a clean file return the identical shape, so the tool cannot distinguish "no errors" from "not looking". Before quoting it as evidence: append a deliberate syntax error, re-probe, confirm it reds, revert. If the probe comes back `[]`, it is dead for that session — fall back to a preload-smoke test or `--check-only --script` (#86). (#06 and #13 explain two specific things it misses; this is the third and worst case — it can miss everything.)

One writer per editor instance (both drive the same `EditorInterface`; a second editor instance — e.g. on a worktree — is a second independent writer).

## Gotcha index

| # | Symptom | Cause |
|---|---|---|
| 1 | `window_set_mode(...)` / `get_window().mode = ...` silently no-ops — mode reads back unchanged, no error | game is embedded in the editor Game tab |
| 5 | Output spams `Type mismatch float and bool` + `playback_new.is_null()` every frame on one scene, even with `active = false` | editor dock holds a stale AnimationTree preview cache |
| 6 | Parse error `Cannot infer the type of "x" variable` on `var s := _other.is_steering()` | source script lacks `class_name`, so members are Variant |
| 7 | A `.svg`/`.png`/`.glb` dropped into a docs folder gets an `.import` sibling and shows up as a packageable resource | Godot scans the whole project root for importables |
| 8 | A StateMachine transition with `advance_condition`/`advance_expression` never auto-fires though the condition flips true | `advance_mode` defaults to travel-only; needs `AUTO = 2` |
| 9 | Inside a `func(...)` lambda, reassigning a captured outer `bool`/`int`/`float`/`String` silently does nothing | GDScript closures capture outer scalars by value |
| 13 | Headless fails `Could not find type "X"` for an on-disk `class_name X`; `get_diagnostics` reports it clean | stale `global_script_class_cache.cfg` after external write |
| 14 | AnimationTree stuck on Idle while clearly moving; a nested sub-SM stays on Start; the top-level SM oscillates; no errors | a one-branch `advance_condition` latches stale-true |
| 15 | godot-mcp `node.update` silently no-ops `Rect2`/`region_rect` writes in every format (v3.6.1) | bridge can't serialize `Rect2`; editor copy is stale too |
| 16 | An `AnimatableBody2D` won't carry a pinned rider, and script `position` writes to it are silently swallowed (`rotation` applies) | `sync_to_physics` drives it from the physics frame |
| 18 | Assigning an array LITERAL to a typed `Array[T]` PROPERTY throws at runtime; parses clean so static checks miss it | `[...]` is an untyped `Array`; no coercion on assignment |
| 19 | godot-ai writes a script `[ext_resource]` with no `uid=` after `script_attach`+`scene_save` on a brand-new script | the `.uid` sidecar doesn't exist yet at save time |
| 21 | `--check-only` is blind to `.gdshader`, and so is a headless `preload()` — but BINDING it to a `ShaderMaterial` DOES type-check it | nothing compiles a shader until it is bound to a material |
| 23 | godot-ai cannot create `Skeleton3D` bones — `bones/0/name` → `PROPERTY_NOT_ON_CLASS`, and `batch_execute` can't call `add_bone` | bones aren't nodes/properties; no method-call verb |
| 25 | godot-ai cannot author an AnimationTree graph — `animation_manage` covers AnimationPlayer ops only | no BlendTree/StateMachine/transform-track verbs |
| 26 | Headless `SceneTree` test: `_ready()` does NOT fire synchronously after `add_child(node)` inside `_initialize()` | `_initialize` runs before ready notifications |
| 27 | A headless `--script` test exits 0 — green to `$?` — even on a PARSE failure or a mid-run RUNTIME abort | runtime errors don't propagate; a parse failure sets no code |
| 28 | A test pinning "this base is abstract" via `not script.can_instantiate()` is INVERTED — it passes on a non-abstract script | reports COMPILED, not instantiable; true for `@abstract` |
| 29 | Need to move `.gd`/`.tscn` into new dirs — godot-ai has NO move op, and an out-of-editor `mv` orphans every reference | dependency-safe moves are an editor-dock-only operation |
| 30 | Copying a `.gdextension` addon into `addons/` with the editor open kills it instantly — no dialog, no crash report | server-level extensions can't hot-load |
| 31 | A `--headless` run on macOS prints the banner then sits at 0% CPU forever — the exit code never arrives | fatal setup errors run a modal `NSAlert` even headless |
| 34 | After a godot-ai `reimport` the editor log shows fatal-looking `Identifier not found: <Autoload>` — while tests pass | transient EditorFileSystem races; the log never retracts |
| 35 | `--headless --check-only --script <f.gd>` fails `Identifier not found: <Autoload>` though it runs fine at F5 | no SceneTree, so `[autoload]` singletons never register |
| 37 | godot-ai dock "exited before the WebSocket handshake" + `Building cryptography` on **arm64**; a native `uv` alone doesn't fix it | an x86_64 Python pulls x86_64 wheels; none exist |
| 39 | `assert_eq(some_dict, Vector2i(3,4))` PASSES even when the value is a raw un-coerced `Dictionary` — a false green | `Dictionary` vs struct `==` errors non-fatally to `false` |
| 41 | A held `godot_input` injection plus a SAME-batch screenshot captures the AFTER-state, never the during-hold visual | the injection holds the main thread for `duration_ms` |
| 42 | `godot_runtime_state digest` `entity_count` reads SMALLER than the real group — looks like shrinkage or no growth | it's the returned node count, capped by `max_nodes` (40) |
| 43 | godot-ai `source="game"` screenshot / `logs_read` / `game_manage` fails `capture within 20s`; `game_capture_ready` stuck false | the embedded Game tab never completes the handshake |
| 44 | `Cannot infer the type of "x"` as a RUNTIME parse error at `preload`, indexing an array literal `["a","b"][i]` | indexing an untyped literal yields Variant; compiles at load |
| 46 | godot-ai `bind_event event_type="key"` writes a LOGICAL `keycode`, not the `physical_keycode` the editor UI records | bind_event has no `physical_keycode` parameter |
| 47 | `godot --headless` segfaults `signal 11` in MoltenVK at rendering-device init inside the Claude Code sandbox | the sandbox blocks the GPU/Metal access MoltenVK needs |
| 49 | A full-rect `Control` / `SubViewportContainer` under a `Node2D` stays `size=(0,0)` despite the Full Rect preset | a plain `Node2D` supplies no parent rect to anchor against |
| 51 | Headless `_initialize`: `get_tree()` is null so tests abort, `add_to_group` silently fails, and `global_transform` reads identity | the root Window is not in the tree yet |
| 53 | `Trying to assign invalid previously freed instance` on a line that only READS into a typed local, despite a validity guard | typed assignment validates source before the guard runs |
| 54 | A Godot F-key binding (`KEY_F9`/`F10`) never fires on macOS — but injected keycodes DO, so it tests green under MCP | the macOS top row emits media events unless Fn is held |
| 55 | A hand-edit to an OPEN `.tscn`/`.tres`/`project.godot` is correct on disk, then silently REVERTS later | editor writes its stale in-memory copy back on save |
| 56 | After enabling `physics_interpolation`, things moving OUTSIDE the physics tick judder — `_process` writers, Tweens, spawn-teleports | off-tick transform sources render against a stale snapshot |
| 57 | `ResourceSaver.save` of the SAME resource twice yields byte-different files — only the ExtResource id suffix differs | each save assigns a random 5-char id suffix |
| 58 | Prepending a `# GENERATED …` marker before `[gd_resource …]` in a `.tres` breaks loading (`Parse Error: Expected '['`) | `[gd_resource` must be first; `;` is the comment leader |
| 60 | `%g`/`%e` in a format string throws `unsupported format character` at RUNTIME and prints the specifier literally | GDScript `%` supports only `s c d o x X f v` |
| 61 | Zeroing an exported frequency/divisor knob makes the spring-driven node FREEZE or VANISH — no error anywhere | silent IEEE float div-by-zero NaN-poisons the transform |
| 63 | `Input.MOUSE_MODE_HIDDEN` blanks the cursor across the WHOLE desktop on macOS while the game runs | `mouse_mode` is process-global, not clipped to the window |
| 64 | A screen-space CanvasLayer draws BELOW a same-`layer` CanvasLayer elsewhere when nested under a plain Node | same-`layer` order stops following tree DFS once nested |
| 65 | Setting `.value` on an out-of-tree `HSlider`/`SpinBox` never emits `value_changed`; `Button.pressed` is NOT gated | `Range` routes its signal through a tree-dependent pipeline |
| 66 | A non-dev export that merely EXCLUDES `addons/` boots spamming `Failed to instantiate an autoload` | MCP plugins re-add their autoloads mid-`--export` |
| 68 | Wheel-button scroll code works in wasm and with a mouse, but macOS two-finger trackpad scrolling does nothing | macOS trackpad sends `InputEventPanGesture`, not wheel |
| 69 | A script committed by explicit path boots locally, but a fresh clone mints a DIFFERENT `uid://` and breaks refs | its `.uid` sidecar twin was never staged |
| 72 | Custom CLI flags invisible to the game (`get_cmdline_user_args()` `[]`), or `--quit-after`/`--headless` ignored so a run is never bounded | `--` splits engine from user args; wrong side is dropped |
| 74 | Headless: `ImageTexture.get_image()` returns CREATION-time pixels forever — a later `update(img)` changes nothing | the dummy RenderingServer never uploads the new data |
| 75 | An "is the mouse over UI?" gate via `gui_get_hovered_control() != null` reads TRUE everywhere, so the UI branch always wins | the full-screen `SubViewportContainer` is always hovered |
| 76 | `--headless --import` in a checkout MISSING an enabled plugin's addon dir silently rewrites `project.godot` | Godot prunes unloadable plugins and writes the list back |
| 77 | `--check-only --quit` exits CLEAN on `const X := PackedFloat32Array([...])`; it then dies at LOAD in the CONSUMER | check-only skips constant folding; that is a ctor call |
| 78 | A refactor to mathematically-IDENTICAL vector math shifts ~every result by ~1e-7; `is_equal_approx` tests stay green | vector components are float32; GDScript `float` is f64 |
| 79 | Identical `godot` launches capture screenshots at different sizes AND aspect ratios; `--windowed`/`--resolution` don't pin it | project fullscreen mode beats the CLI size flags |
| 80 | Visual verification silently degrades to "ask the user to F5"; `mcp__godot-ai__*` is absent from the tool list, no error anywhere | editor wasn't open at session start; MCP connects once |
| 82 | A colour committed via `add_surface_from_arrays` never reads back bitwise-equal — 0 of 2178 match; exact-identity tests red on good code | `ARRAY_COLOR` is stored as RGBA8 — 1/255 quantisation |
| 83 | Headless prints NO GDScript warnings — neither `--script` nor `--check-only`; `grep -i warning` reads 0 for known-bad code too | headless has no warning sink; only the editor prints |
| 84 | Widening a shared group/registry query to a 2nd node type: every `(x as T).m()` consumer starts calling a method on null, at a distance | `as T` yields null, not a type error; check-only blind |
| 86 | `--check-only --quit` WITHOUT `--script` exits clean on a syntax error in any script the main scene doesn't load — a no-op flag | without `--script` it only boots `run/main_scene` |
| 88 | A throwaway probe project SIGSEGVs after `Could not create directory: 'user://logs'`, and its `class_name` never resolves | sandbox denies `user://`; no import scan ⇒ no class cache |
| 89 | After `set_script()`, every use of the node errors `Nonexistent function 'x' in base 'Node2D'` — at the CALL SITE, not at the script | assigned script failed to compile; node kept its base class |
| 90 | `Array.sort()` on `StringName` keys gives neither alphabetical nor insertion order, and two builds disagree | `StringName <` compares the interned POINTER, not the text |
| 91 | A `call_deferred` transform probe reads the SAME value after a fix as before it, while the game looks right on screen | deferred callables flush BEFORE the last transform flush |
| 92 | `RenderingServer.frame_pre_draw` probe emits ZERO lines headless; `connect()` succeeded, no error | dummy renderer never draws, so the signal never fires |
| 94 | A grep enumerating a group/signal/action name returns a confidently WRONG count — often zero — while the code works fine | `"x"` and `&"x"` are one name to Godot, two strings to grep |
| 95 | `game_eval` returns pre-change values, screenshots say `stale_frame`, and injected HELD keys silently drop while taps work | unfocused window stalls the loop and clears held keys |
| 96 | A test preloading a script/scene chain runs GREEN with a syntax error one hop down — `preload` is not a parse gate; errors only on stderr | broken script still loads as a resource; no cascade |
| 97 | A `Transform3D` copied digit-for-digit from a `.tscn` into a constructor comes out TRANSPOSED — a light shines the wrong way | `.tscn` writes basis ROWS; the constructor takes COLUMNS |
| 99 | Moving a script property-write into the editor leaves NO line in the `.tscn` and the invariant is silently gone | Godot omits properties equal to their class default on save |
| 100 | `add_property_track` with an `{x,y,z,w}` value drives NOTHING, yet the scene saves and `validate` reports every track valid | JSON has no Quaternion; the value lands as a `Dictionary` |
| 102 | At merge time the `.tscn` is modified and you didn't touch it: transforms appear, `visible = false` vanishes | editor re-saved animation-preview state as authored data |
| 104 | An MCP argument that never existed is silently STRIPPED, not rejected — the recipe "works" for months | non-strict schemas drop unknown keys; the call succeeds |
| 105 | An injected action edge fires most times but vanishes ~1 in 5, only where read in `_process`; `_physics_process` never misses | `just_pressed` compares frame stamps; idle one goes stale |
| 106 | Re-vendoring an addon or switching a branch across its version → `Identifier "X" not declared` for symbols you can grep | stale gitignored `.godot/` class cache; `--import` fixes it |
| 107 | A file you never committed is inside the shipped pack, and the pre-ship "tree clean" check passed | the exporter walks the filesystem; git state is not an input |

On an index-row match, read the entry's body file `gotchas/NN-<slug>.md` (NN = the row number zero-padded to 2 digits, e.g. row 13 -> `gotchas/13-classname-cache-reimport.md`) for the full entry — Symptom / Cause / Fix detail, proactive detection, commit hashes — before acting on the fix. The index alone is for routing, not for fixes.

**Symptom families.** When a row is *close* but not exact, check its family — these entries share a
root cause and get mistaken for each other, so the near-match is often a neighbour:

- **Type inference / Variant** — 6 (missing `class_name`), 18 (literal → typed property), 44 (indexing a literal), 53 (typed read of a freed ref), 77 (non-const `const`), 84 (`as T` → null at a distance)
- **Headless harness lies** — 21 (shader), 26 (`_ready` deferred), 27 (exit codes), 28 (`can_instantiate`), 31 (modal hang), 35 (autoloads), 39 (struct compare), 51 (null `get_tree()`, identity transforms), 65 (`Range` signals), 74 (texture readback), 77, 83 (no warnings printed), 86 (`--check-only` is a no-op without `--script`), 88 (the probe project itself won't boot), 92 (`frame_pre_draw` never fires), 96 (`preload` is not a parse gate)
- **godot-ai / godot-mcp bridge** — 15, 19, 23, 25, 29, 34, 43, 46, 80 (channel absent, not failing), 100 (typed keys land as Dictionaries; `validate` is a path check), 104 (unknown args silently stripped)
- **Editor vs disk** — 13 (class cache), 15, 34 (reimport races), 55 (clobbered edits), 76 (plugin strip), 99 (default-valued property unauthorable), 102 (preview pose re-saved as authored data, after your last verified commit), 106 (addon swap staleness)
- **2D viewport / Control layout** — 49 (0×0 under Node2D), 64 (CanvasLayer order), 75 (always-hovered)
- **macOS platform** — 31, 37, 47, 54 (F-keys), 63 (cursor), 68 (trackpad), 79 (fullscreen size)
- **Screenshots / visual capture** — 41 (held-input timing), 43 (embedded Game tab), 79 (varying size), 1 (`window_set_mode` no-op), 95 (stale frames from an unfocused window)
- **Probes that measure the wrong MOMENT** — 91 (`call_deferred` lands pre-flush), 92 (the hook never fires), 51 (transforms read identity out of tree), 41 (held-input timing), 26 (`_ready` deferred)
- **Silent numerics** — 57 (nondeterministic ids), 61 (NaN poisoning), 78 (float32 vectors), 82 (RGBA8 vertex colours), 90 (`StringName` sort order), 97 (`.tscn` basis copied transposed)
- **A value copied out of another file, wrongly** — 97 (`.tscn` basis rows vs constructor columns), 94 (the grep that found the value was blind to `&"x"`)
- **`StringName` is not a `String`** (invisible until it bites) — 90 (`sort()` compares the interned pointer, not the text), 94 (`"x"` and `&"x"` are one name to the engine, two strings to grep)
- **Input injection** — 95 (unfocused window: stalls, and drops held keys), 105 (idle `just_pressed` misses edges), 46 (logical vs physical keycode), 54 (macOS F-keys)
- **Ships something you didn't intend** — 66 (MCP autoloads in exports), 69 (`.uid` sidecar unstaged), 76 (plugin strip rewrites `project.godot`), 107 (untracked files walk into the pack)
- **UID / staging** — 13, 19, 69

**Retired / superseded — do NOT re-file these.** 2, 3, 4, 10, 11, 12, 17, 20, 22, 24, 32, 33, 36, 38,
40, 45, 48, 50, 52, 59, 62, 67, 70, 71, 73, 81→16, 85, 87, 93→51, 98→60, 101, 103→95. Bodies are in
[`gotchas/ARCHIVE/`](gotchas/ARCHIVE/); reasons and un-retire conditions in
[`gotchas/RETIRED.md`](gotchas/RETIRED.md). Numbers are never reused.

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
