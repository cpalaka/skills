---
name: godot-personal-gotchas
description: Personal index of Godot 4.x editor and engine gotchas — looks up symptoms (silent failures, settings that don't take effect, mode setters that no-op, panels showing stale state) to a known cause and fix. Use when working on a Godot project (.gd, .tscn, .tres files, project.godot, godot-mcp tools) AND a Godot operation behaves unexpectedly, especially when calls succeed silently but produce no visible effect.
---

# Godot Personal Gotchas

A growing index of non-obvious Godot 4.x failures observed first-hand. **Consult by symptom, not by component** — most entries here look like "I set X, no error was thrown, but nothing changed."

## How to use

When something in Godot behaves unexpectedly, scan the index table by symptom **before** debugging from scratch. The point of this skill is that some of these failures have no error signal at all — you can't grep for them, you have to recognize them.

If your symptom matches an entry, apply the fix. If it doesn't match, debug normally — then add the new gotcha here when you find the cause (see "Adding new gotchas" at the bottom).

## Gotcha index

| # | Symptom | Cause |
|---|---|---|
| 1 | `DisplayServer.window_set_mode(...)` or `get_window().mode = ...` silently no-ops — mode reads back unchanged, no error | Game is running embedded in the editor's Game tab |
| 2 | GDScript parse error "The variable type is being inferred from a Variant value" on a line like `var x := clamp(a, 0.0, 1.0)` | `clamp`/`min`/`max`/`abs`/`sign`/`floor`/`ceil`/`round` are Variant-returning globals; `:=` infers Variant; warnings-as-errors rejects it |
| 3 | After live Inspector tuning, `.tscn` contains `property = null` lines; on fresh load, typed `@export` floats become 0.0 silently | Inspector "clear override" writes `property = null` instead of removing the line; null coerces to 0.0 for typed numeric exports on scene load |
| 4 | AnimationTree dock: "double-click a node to enter sub-editor", "right-click → Rename", "Set as Start" all silently no-op in Godot 4.6.2 | UI reworked in 4.6.x — use the **Open Editor** button in the node header, edit the inline name field, and connect `Start → <target>` via the Connect tool |
| 5 | After incremental AnimationTree build, Output panel spams `Type mismatch float and bool` + `playback_new.is_null()` every frame while the scene is open; silent on other scenes; fires even with `active = false` | Editor's AnimationTree dock holds a stale preview cache against the newer sub-resource tree. Close the scene tab and reopen — rebuilds the cache. No `.tscn` edit needed |
| 6 | GDScript parse error `Cannot infer the type of "x" variable because the value doesn't have a set type` on lines like `var steering := _other.is_steering()` or `var slow := speed < _other.idle_threshold` | The source script (e.g. `player.gd`) has no `class_name`, so script-defined symbols on a typed Node reference resolve to Variant at engine parse time. `mcp__godot__get_diagnostics` does NOT catch it — only `mcp__godot-mcp__editor get_errors` does. Fix: annotate the consumer (`var x: bool = ...`) or add `class_name` to the source |
| 7 | Dropping a non-code file (e.g. `.svg`, `.png`, `.glb`) into a docs folder makes Godot generate a sibling `.import` file and surface the file in the FileSystem dock as a packageable game resource | Godot scans the whole project root for importable files — no special-casing for docs/notes folders. Fix: add an empty file named **`.gdignore`** (NOT `.godotignore`) inside the folder. Godot then skips imports, hides the folder, and refuses `load()`/`preload()` from it. File must be empty — no `.gitignore`-style patterns supported |
| 8 | AnimationTree StateMachine transition with `advance_condition`/`advance_expression` never auto-fires even when the condition parameter genuinely flips to `true`; `playback.get_current_node()` stays on the source state | `AnimationNodeStateMachineTransition.advance_mode` defaults to `ENABLED = 1`, which only fires via `travel()`. Condition-driven auto-fire requires `advance_mode = AUTO = 2`. Misleading enum name. Editor dock authors transitions with the wrong default |
| 9 | Inside a `func(...)` lambda, reassigning a captured local `bool`/`int`/`float`/`String` from the enclosing scope silently does nothing — no parse error, no warning, lambda runs but outer scalar never updates | GDScript 4 closures capture outer scalars **by value**. The lambda mutates a private copy. `self.*` members and Dictionary entries are fine (reference semantics). Fix: wrap in `Array[T]` of length 1, access via `[0]` |
| 10 | A semi-implicit Euler spring driving a node's `scale` (squash-stretch, hit feedback) blows up within ~10 frames of first impulse — rig becomes invisible (scale past ±10), physics still works, no error in console | At 60fps with `freq > ~6-7 Hz`, the damping bound `2·zeta·omega·dt < 1` is violated *before* the freq bound `omega·dt < 2`; amplitudes grow each cycle. Fix: cap `freq` at ~6 Hz OR replace explicit Euler with sub-stepping / analytical critically-damped form / exponential decay |
| 11 | Walkthrough says "set `bone_index` AND `bone2d_node` separately on a Skeleton2D modification"; in 4.6.2 Inspector, picking the Bone2D from `bone2d_node` auto-populates `bone_index` — looks like 2 fields but it's 1 | Skeleton2D modification UI computes `bone_index` from the picked NodePath. Both fields serialize, but the integer is UI-derived, not user-input. Stale walkthroughs / older docs frame them as independent |
| 12 | GDScript parse error `Identifier "expf"/"sqrtf"/"sinf"/"powf"/"logf" not declared in the current scope` — not a return-type warning, the identifier simply does not exist | Godot 4 ships typed `*f`/`*i` variants ONLY for `clamp`/`min`/`max`/`abs`/`sign`/`floor`/`ceil`/`round`. Transcendentals/trig (`exp`, `log`, `sqrt`, `sin`, `cos`, `tan`, `pow`, `lerp`, `smoothstep`, `move_toward`, ...) are Variant-only. Sibling-but-inverse to #2. Annotate the receiver (`var k: float = exp(...)`) instead of inventing a typed variant |
| 13 | Headless Godot (GUT, `--check-only`, CLI) fails `Could not find type "X"` for a `class_name X` script that demonstrably exists on disk; `mcp__godot__get_diagnostics` reports the file AND its consumer clean | `.godot/global_script_class_cache.cfg` doesn't refresh when a new `class_name` file is created externally (Write tool, `cat`, Finder). Editor LSP parses on demand and gives false-positive green; headless Godot reads the stale cache file. Fix: focus the editor window to trigger a FileSystem rescan; verify with `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` returning > 0 |
| 14 | AnimationTree character stuck on Idle while clearly moving; a nested sub-StateMachine's `playback.get_current_node()` stays on Start/Idle; standing still, the top-level SM oscillates between two states (e.g. `Grounded` ↔ `Fall`) every few frames; no errors/warnings | A boolean `advance_condition`/`advance_expression` is set in only ONE state's branch, so it latches stale-true when that branch stops running. The top-level SM keeps firing the spurious transition every frame; each re-entry re-initialises the nested sub-SM to its Start node, so it never advances. `advance_mode` was already correct — this is about condition *freshness*, not advance_mode (cf. #8). Fix: clear every condition boolean on every frame (add an `else` branch) |
| 15 | godot-mcp `node.update` silently fails to write `Transform2D`/`Rect2` struct props (drops the `Transform2D` origin; no-ops `Rect2` in every format) — value must be hand-edited into the `.tscn`, after which the open editor's stale in-memory copy makes `get_properties` lie and an editor save clobbers the hand-edit | The bridge's property-set path doesn't serialize compound struct types; and the editor doesn't reload an externally-modified open scene without a close+reopen. Fix: hand-edit, then close+reopen+save resync before further `node.*`/saves; verify against the on-disk `.tscn`, not `get_properties` |

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
Hit during the `3d-prototype-1` Step 5 AnimationTree build on 2026-05-26, after 10 incremental tasks on `scenes/player.tscn`. Output panel spamming both error types continuously. Animation track inspection via `mcp__godot-mcp__animation get_details` confirmed clean Skeleton3D `position_3d`/`rotation_3d` tracks across all 12 clips — no value/bool/float tracks. Closing+reopening the player scene tab silenced the errors entirely; `git status` showed `.tscn` clean. Related (but distinct repro) Godot Forum thread: https://forum.godotengine.org/t/type-mismatch-between-initial-and-final-value/123942

### 6. Cross-script `:=` inference fails without `class_name`

**Symptom**
- GDScript line like `var steering := _player.is_steering()` or `var slow := speed < _player.idle_threshold` fails to parse.
- Error message: `Parse Error: Cannot infer the type of "steering" variable because the value doesn't have a set type.`
- `_player` is statically typed (e.g. `CharacterBody3D`), and `is_steering()` / `idle_threshold` are defined on the script attached to that node.
- Other `:=` lines in the same script that use built-in members (`_player.velocity.length()`, etc.) parse fine — only the script-defined symbol accesses fail.

**Cause**
With `_player: CharacterBody3D`, the static parser only knows about `CharacterBody3D`'s built-in members. Script-defined symbols (custom exports, methods, signals) aren't visible to the parser unless the source script declares `class_name Foo`, making `Foo` a globally-known type. Without `class_name`, `_player.script_member` resolves to Variant; `:=` inference fails the same warnings-as-errors gate as the `clamp` family in Gotcha #2.

**Fix**
Two options, in order of preference:

1. **Add `class_name` to the source script** — e.g. `class_name Player extends CharacterBody3D` at the top of `player.gd`. Members become statically visible everywhere. Side effect: `Player` becomes a global identifier; conflicts with any other declaration of the same name.
2. **Annotate the consumer explicitly** — `var steering: bool = _player.is_steering()`. Minimal surgical fix; doesn't touch the source script. Pick this when adding `class_name` would cause naming friction.

**`mcp__godot__get_diagnostics` does NOT catch this.** The per-file LSP has no cross-script context — it reports the file clean. The failure surfaces only when Godot's engine parser tries to load the script at scene-load time. **Always cross-check `mcp__godot-mcp__editor get_errors` after writing GDScript that touches another script's exports / methods / signals.** Don't treat `get_diagnostics` clean as "all good" — necessary but not sufficient.

**Detect proactively**
When writing GDScript that touches `other_node.some_member` where `some_member` is declared on `other_node`'s attached script, prefer typed annotations on the consumer side or add `class_name` to the source. After writing such code, run `mcp__godot-mcp__editor get_errors` proactively — don't wait to be asked.

**Confirmed by**
Hit during the `3d-prototype-1` animation Step 6 on 2026-05-26 — `scripts/player_anim.gd` had `var steering := _player.is_steering()` and `var slow := speed < _player.idle_threshold` where `player.gd` had no `class_name`. The parse failure was invisible to `mcp__godot__get_diagnostics` (reported clean) and only surfaced via `mcp__godot-mcp__editor get_errors` after the user F5'd and reported "scene doesn't load". Fixed by annotating the two locals (`var steering: bool = ...`, `var slow: bool = ...`).

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
- Especially insidious when the failing script is not covered by GUT — the parse error only surfaces at F5 (or via `mcp__godot-mcp__editor get_log_messages`). See Gotcha #6 for the cross-script analog of this hidden-until-F5 class.
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
- Focus the editor window (or click anywhere in the FileSystem dock) to trigger a scan. This rewrites `.godot/global_script_class_cache.cfg` with the new `class_name` entries.
- Verify before retrying: `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` must return `> 0`.
- Then re-run the headless command.

**Detect proactively**
- Any time a new `class_name`-declaring script is created via tooling (not the editor's New Script dialog), assume the cache is stale until proven otherwise.
- Before any headless GUT / `--check-only` / CLI invocation that exercises a freshly-added `class_name`, grep the cache: `grep -c "<NewClassName>" .godot/global_script_class_cache.cfg`. Zero hits → focus the editor first.
- Do NOT trust `mcp__godot__get_diagnostics` clean output as evidence the headless run will pass — the LSP parses on demand and does not consult the cache.

**Confirmed by**
2026-05-27 — `2d-movement-prototype` F-C1+D1 architectural fix. Created `scripts/player/player_tick_context.gd` (declaring `class_name PlayerTickContext`) via Write tool while editor was running. LSP diagnostics on both the new file and `scripts/player/player.gd` (consumer) came back clean. `godot --headless --path . -s addons/gut/gut_cmdln.gd -gtest=res://test/unit/test_player_state_machine.gd -gexit` produced 5× `Parse Error: Could not find type "PlayerTickContext"`. `grep -c "PlayerTickContext" .godot/global_script_class_cache.cfg` returned `0`. After focusing the editor window, the same grep returned `1` and the GUT run passed 6/6. Commit `a15e3fe`.

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

### 15. godot-mcp can't write `Transform2D` / `Rect2` struct props — the hand-edit goes stale in the open editor

**Symptom**
- Setting a struct-valued property via godot-mcp `node.update` silently fails, no error (the call returns "success"):
  - `Transform2D` (e.g. `Bone2D.rest`): only the basis columns land; the **origin is dropped** (the dict `origin` key is ignored). A freshly-created bone can end up with a degenerate all-zeros `Transform2D` (det == 0).
  - `Rect2` (e.g. `Sprite2D.region_rect`): **every** format no-ops — string `"Rect2(0,0,6,6)"`, dict `{"position":..,"size":..}`, array `[0,0,6,6]`. Stays at default `Rect2(0,0,0,0)`.
- So the value must be **hand-edited into the `.tscn`** — but then the open editor keeps its **stale in-memory copy**: `node.get_properties` reports the stale value (can't be trusted as confirmation), and a later editor save (Cmd+S or MCP `scene.save`) **clobbers** the hand-edit. Re-opening an already-open scene does NOT force a disk re-read.

**Cause**
The godot-mcp bridge's property-set path doesn't serialize compound struct types (`Transform2D` origin, `Rect2`, likely `Transform3D`/`Basis`) — those formats aren't implemented. Separately, the editor doesn't reload an externally-modified open scene without an explicit close+reopen (cf. #5, the AnimationTree stale-preview close+reopen fix — same "editor holds a stale copy" family).

**Fix**
Hand-edit the struct property into the `.tscn`, then force a **close-tab → reopen-scene → save** resync before any further MCP `node.*` calls or editor saves. Ordering when other props also changed: `scene.save` the MCP-settable props to disk FIRST, THEN hand-edit the struct props, THEN resync — so the resync preserves everything. Verify against the on-disk `.tscn` (grep/read), never `node.get_properties`, until after the resync.

**Confirmed by**
2026-05-29 — `2d-movement-prototype` IK re-introduction (Tasks 3–5, 7). Setting new `Bone2D.rest = Transform2D(1,0,0,1,0,6)` (`node.update` left origin `(0,0)`; one path gave a det==0 zero-matrix) and four `Sprite2D.region_rect` values (all formats no-op'd) had to be hand-edited into `scenes/player/player_rig.tscn`; `node.get_properties` confirmed the editor's in-memory rests were stale/degenerate while disk was correct, and an editor save would have clobbered disk. Resolved each time by a user close+reopen+save resync, verified by re-reading the on-disk `.tscn`.

## Adding new gotchas

1. Append a row to the **Gotcha index** table with a one-line symptom and a one-line cause.
2. Add a `### N. <Short title>` section below with **Symptom / Cause / Fix / Confirmed by** subsections (mirror the format above).
3. Keep entries symptom-first — what you'd type into a search box at 11pm.
4. If this file grows past ~200 lines, move each gotcha into `gotchas/<slug>.md` and link from the index.
