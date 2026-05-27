# Godot 4.x Gotchas

Project-level catalog of Godot engine, editor, and tooling quirks that bit us during development. Add entries here as new gotchas surface so any developer (human or LLM) cloning this project benefits.

Each entry: **symptom → cause → fix**. Optional: how to detect proactively.

---

## Embedded game tab blocks `window_set_mode` (Godot 4.6)

**Symptom:** Calling `DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)` or `WINDOWED` from a running game produces no visible change — no error, no log entry, just nothing happens.

**Cause:** Godot 4.6's editor embeds the running game inside the editor's "Game" tab by default. The embedded child viewport is not a real OS window, so window-mode operations no-op silently.

**Fix:**
- One-shot: click "Make Floating" on the Game tab during play to detach it into a real OS window.
- Persistent: Editor Settings → Run → Embed Game On Next Play → uncheck.

**Detect proactively:** If a window-mode toggle binding "doesn't work" in the editor but the bound action fires correctly (verify via `print` in the input handler), check whether the game is embedded.

---

## GDScript `:=` inference fails on `clamp`/`min`/`max`/etc. with warnings-as-errors

**Symptom:** GDScript parse error on lines like `var x := clamp(a, 0.0, 1.0)`:

> Parser Error: The variable type is being inferred from a Variant value, so it will be typed as Variant.

**Cause:** Godot 4's global `clamp`, `min`, `max`, `abs`, `sign`, `floor`, `ceil`, `round` are *overloaded* across numeric types — they accept Variant arguments and return Variant. With `gdscript/warnings/untyped_declaration` enabled and `treat_warnings_as_errors` on (defaults in many configs), `:=` inference on a Variant return becomes a hard error.

**Fix:** Use the explicitly-typed variants. They return `float` or `int` directly so `:=` resolves cleanly.

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

**Detect proactively:** When writing new GDScript, default to the typed variants. Grep existing GDScript for `clamp\(|min\(|max\(|abs\(|sign\(` inside `var ... :=` expressions.

---

## GDScript `:=` inference fails on cross-script member access without `class_name`

**Symptom:** GDScript parse error on lines accessing another node's script-defined symbol:

> Parse Error: Cannot infer the type of "x" variable because the value doesn't have a set type.

Typically on lines like `var steering := _player.is_steering()` or `var slow := speed < _player.idle_threshold`, where `_player` is typed (e.g. `CharacterBody3D`) but the accessed symbol is defined on its attached script (not the base class).

**Cause:** With `_player: CharacterBody3D`, the static parser only knows about `CharacterBody3D`'s built-in members. Script-defined symbols (custom exports, methods, signals) aren't visible to the parser unless the source script declares `class_name Foo` — making `Foo` a globally-known type. Without `class_name`, `_player.script_member` resolves to Variant; `:=` inference fails the same warnings-as-errors gate as the `clamp` family above.

**Fix:** Two options, in order of preference:

1. **Add `class_name` to the source script** — e.g. `class_name Player extends CharacterBody3D` at the top of `player.gd`. Makes its members statically visible everywhere. Side effect: `Player` becomes a global identifier.
2. **Annotate the consumer explicitly** — `var steering: bool = _player.is_steering()`. Minimal surgical fix; doesn't touch the source script. Use when adding `class_name` would cause naming friction.

**`mcp__godot__get_diagnostics` does NOT catch this** — the per-file LSP has no cross-script context and reports the file clean. The engine parser at script-load time is what fails. Always cross-check `mcp__godot-mcp__editor get_errors` after writing cross-script access. (See `docs/godot-mcp-guide.md` → "Reading errors when the scene fails to load".)

**Detect proactively:** When writing GDScript that touches `other_node.some_member` where `some_member` is declared on `other_node`'s attached script, prefer typed annotations on the consumer side or add `class_name` to the source.

---

## `.tscn` null overrides silently zero typed exports

**Symptom:** After a play session involving live Inspector tuning, the affected `.tscn` file contains lines like:

```
[node name="Player" ...]
script = ExtResource("...")
max_speed = null
turn_rate_deg = null
```

Current session works fine because the Inspector still holds live values. But on a fresh checkout / fresh editor session / fresh F5 by a different developer, the player's `max_speed` and `turn_rate_deg` load as `0.0`, freezing it.

**Cause:** When the Inspector "clears" an override on an exported property (right-click → Reset, or manual deletion of the override entry), Godot may write back `property = null` instead of removing the line. The apparent intent is "fall back to script default," but the on-disk representation is a destructive `null` override. On scene load, Godot applies the override and silently coerces `null` to `0.0` for typed numeric exports — overriding the script default.

**Fix:** Hand-edit the `.tscn` to remove the `= null` lines entirely. The script's default then applies on load. (Alternative: set the property to its intended value rather than leaving it null.)

**Detect proactively:** After any live-Inspector-tuning session, grep affected `.tscn` files:

```bash
grep ' = null' scenes/*.tscn
```

Hits are suspicious — investigate whether they're stale clear-overrides.

---

## AnimationTree dock UI shifted in Godot 4.6.2

**Symptom:** Old AnimationTree dock walkthroughs (training data, tutorials, older docs) reference UI affordances that no longer exist in Godot 4.6.2:
- "Double-click a `StateMachine` / `BlendTree` / `BlendSpace2D` node to enter its sub-editor" — double-click no longer does anything.
- "Right-click a state → Set as Start / Set Start Node" — that menu entry is gone.
- "Right-click a node → Rename" — that menu entry is gone too.

Following stale instructions produces no error — the user just can't find the control, then improvises (or gets stuck).

**Cause:** The AnimationTree dock UI was reworked in Godot 4.6.x. Specific 4.6.2 affordances:
- **Enter a sub-editor**: each container node (`StateMachine`, `SubStateMachine`, `BlendTree`, `BlendSpace2D`, `BlendSpace1D`) has an **Open Editor** button inside its node header. Click that.
- **Rename a node**: the node's name is an editable inline field — click into the field and type. No right-click menu, no F2.
- **Set Start state of a StateMachine**: there is no "Set as Start" affordance. Instead, use the **Connect Nodes** tool (default cursor) and drag from the green `Start` node to the desired state. Godot serializes this as a transition `["Start", "<TargetState>", SubResource(...)]` with default `advance_mode = 2` (Enabled) and no condition — fires unconditionally on entry, functionally equivalent to "this is the Start state."

**Fix:** When writing or following AnimationTree dock walkthroughs, use the 4.6.2 idioms above.

**Detect proactively:** If a walkthrough says "double-click X to enter" or "right-click to rename/Set Start," and you're on Godot 4.6.x, translate to the new affordances before clicking.

---

## AnimationTree dock spams stale-preview errors during incremental build (Godot 4.6.2)

**Symptom:** While a scene containing a freshly-built `AnimationTree` is open in the editor, the Output panel spams two errors continuously (every frame, hundreds per second):

- `Type mismatch between initial and final value: float and bool` (and `bool and float`) — fires in `animation.cpp:5723` (`validate_type_match`).
- `Condition "playback_new.is_null()" is true. Returning: AnimationNode::NodeTimeInfo()` — fires in `animation_node_state_machine.cpp:1640` (`_process`).

The errors fire even when `AnimationTree.active = false`. They fire even when the `AnimationTree` node isn't selected. They fire as long as the scene is open. Switching to a different scene silences them; coming back resumes them.

**Cause:** During a session where you incrementally build an AnimationTree topology — adding `StateMachine`, `SubStateMachine`, `BlendSpace2D`, `OneShot`, etc., one at a time, with saves in between — the editor's AnimationTree dock holds a preview/evaluation cache that can fall out of sync with the actual sub-resource tree. The dock's continuous preview tries to evaluate the stale cache against the newer tree, hitting type mismatches and missing sub-state playbacks.

**Fix:** Close the scene tab (`Cmd+W` or right-click the tab → Close) and reopen it from the FileSystem dock. Forces the editor to rebuild its preview cache from the on-disk `.tscn`. Errors stop immediately. No `.tscn` change required — `git status` confirms the file is untouched.

**Detect proactively:** After a session of incremental AnimationTree dock work, if the Output panel is noisy, try closing+reopening the affected scene tab *before* hunting for a real type mismatch in the animation clips. (Real type mismatches in imported `.glb` clips do exist — see related forum threads — but a fresh first-import with clean Skeleton3D `position_3d`/`rotation_3d` tracks is unlikely to produce them.)

Related forum thread (different repro, same symptom): https://forum.godotengine.org/t/type-mismatch-between-initial-and-final-value/123942 — discusses stale animation references after `.glb` re-import; the fix there (delete-anim-from-tree before re-import) is heavier than the scene-reload fix above.

---

## Docs/assets folders get auto-imported as game resources unless `.gdignore`'d

**Symptom:** Putting an `.svg` (or `.png`, `.glb`, etc.) inside `docs/` for documentation purposes makes Godot generate a sibling `.import` file (e.g., `mydoc.svg.import`) and treat the file as a project resource. It shows up in the FileSystem dock and would be packaged into game exports.

**Cause:** Godot scans the entire project root for importable files. There's no special-casing for `docs/`, `README/`, etc. — any folder under `res://` is fair game.

**Fix:** Drop an empty file named **`.gdignore`** (note: **not** `.godotignore` — that's a common wrong guess) into the folder. Godot will then:
- Skip imports for that folder entirely
- Hide the folder from the FileSystem dock
- Refuse `load()`/`preload()` of paths under it
- Speed up initial project scanning

The file must be empty — `.gdignore` does **not** support `.gitignore`-style patterns. To ignore selectively, organize so the ignored content lives under its own subfolder.

After adding `.gdignore`, delete any already-generated `.import` siblings to keep the tree clean; they won't be regenerated.

**Detect proactively:** Any time you add non-code files (images, PDFs, mermaid renders, design notes with embedded media) under a docs/notes folder, drop `.gdignore` in that folder up front. Reference: https://docs.godotengine.org/en/stable/tutorials/best_practices/project_organization.html

---

## `AnimationNodeStateMachineTransition` conditions never fire unless `advance_mode = 2` (Godot 4.6)

**Symptom:** A StateMachine transition with `advance_condition = &"my_flag"` (or `advance_expression = "..."`) is wired correctly in the AnimationTree dock and the underlying boolean parameter genuinely flips to `true` at runtime — but the transition never fires and the state machine stays stuck on the source node.

The check that nails it: `print($AnimationTree.get("parameters/<sm_path>/conditions/<flag>"))` from inside `_physics_process` returns `true`, yet `playback.get_current_node()` doesn't advance.

**Cause:** `AnimationNodeStateMachineTransition.advance_mode` defaults to `ADVANCE_MODE_ENABLED = 1`. The name is misleading — per the Godot docs:

- `ADVANCE_MODE_DISABLED = 0` — Don't use this transition.
- `ADVANCE_MODE_ENABLED = 1` — **Only use during `AnimationNodeStateMachinePlayback.travel()`.**
- `ADVANCE_MODE_AUTO = 2` — Automatically use this transition if the `advance_condition` / `advance_expression` checks are `true`.

ENABLED only allows `travel()`-based requests; it does NOT auto-fire on condition. AUTO is what you want for condition-driven flow. The AnimationTree dock's default when authoring a transition is Enabled, which silently breaks the common "set advance_condition and let it fire" pattern.

**Fix:** In the AnimationTree dock, click the transition, set **Advance Mode** to **Auto**. In `.tscn` hand-edit, add `advance_mode = 2` to the transition subresource:

```
[sub_resource type="AnimationNodeStateMachineTransition" id="..."]
xfade_time = 0.1
advance_mode = 2          # ← required for advance_condition to auto-fire
advance_condition = &"is_steering"
```

**Detect proactively:** Whenever you set `advance_condition` or `advance_expression`, set `advance_mode = 2` in the same edit. After saving any StateMachine, audit the `.tscn`:

```
grep -B1 -A4 'AnimationNodeStateMachineTransition' YourScene.tscn
```

Every transition that has an `advance_condition` or `advance_expression` line should also have `advance_mode = 2` nearby — otherwise it's dead.

---

## (Existing project-level gotchas)

These also exist but live in their own dedicated docs — listed here for discoverability:

- **Godot MCP tool quirks** — see `docs/godot-mcp-guide.md`. Covers: single-client WS bridge, leaked processes, runtime-vs-edit-time state, scene-mutation-on-wrong-scene risk, `get_debug_output` vs `get_console_output`.
- **Blender MCP tool quirks** — see `docs/blender-mcp-guide.md`. Covers: schema inconsistencies, data-API-over-`bpy.ops`, depsgraph staleness, edit-mode bmesh, glTF Material Output AO pattern, Blender 5.x API drift.
- **Asset pipeline shape** — see `docs/asset-pipeline.md`.

---

## Adding new gotchas

When you hit something the engine does that surprised you, add an entry above using the same shape: symptom → cause → fix → (optional) detect-proactively. Keep entries terse — the goal is fast scan-ability, not exhaustive prose. Cross-link to `docs/godot-mcp-guide.md` or `docs/blender-mcp-guide.md` for tool-specific surfaces.
