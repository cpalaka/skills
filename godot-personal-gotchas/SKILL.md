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

## Adding new gotchas

1. Append a row to the **Gotcha index** table with a one-line symptom and a one-line cause.
2. Add a `### N. <Short title>` section below with **Symptom / Cause / Fix / Confirmed by** subsections (mirror the format above).
3. Keep entries symptom-first — what you'd type into a search box at 11pm.
4. If this file grows past ~200 lines, move each gotcha into `gotchas/<slug>.md` and link from the index.
