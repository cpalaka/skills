### 45. godot-ai `input_map_manage op=list` omits the project's `project.godot` `[input]` actions — it reads the editor's live InputMap, not ProjectSettings

**Status:** retired 2026-08-08 — fixed upstream in godot-ai 3.1.3 (upstream #213); measured
`count: 11` where the pre-fix behaviour was `count: 0`. Body kept for a pre-3.1.3 pin.
**Un-retire if** a project pins godot-ai < 3.1.3.

> **FIXED upstream — godot-ai ≥ 3.1.3. `list` is now the correct project inventory; do NOT
> follow the Fix section below on a current install.**
> `handlers/input_handler.gd:10-52` (`_read_user_authored_actions`, citing upstream #213) reads
> `project.godot`'s `[input]` block via `ConfigFile` and merges it with the live `InputMap`,
> tagging each row `is_builtin` and `loaded_in_input_map`. Default `include_builtin=false` now
> returns exactly the user's project actions.
> **Measured 2026-08-07** (space-miner-game, godot-ai 3.1.3 / Godot 4.7-stable): a bare
> `input_map_manage op=list` returned `count: 11` — every project action (`thrust`, `verb`,
> `burst_up/left/down/right`, `fire`, `pause`, `dock_interact`, `map_toggle`, `command_click`),
> all `is_builtin:false`, `loaded_in_input_map:false`. The pre-fix behaviour was `count: 0`.
> **The old advice is now actively harmful**: it trains an agent to disbelieve a correct reading
> and to route every check through `settings_get input/<name>`, a per-key lookup that *cannot
> enumerate* — so a collision check before `add_action` would have to guess names. That is the
> shape that mints a duplicate action.
> Everything below is pre-fix history, kept for projects pinned to godot-ai ≤ 2.8.x.

**Symptom**
- `input_map_manage op=list` (default `include_builtin=false`) returns `{"actions":[],"count":0}` on a project that demonstrably has user input actions in `project.godot` `[input]` (e.g. `thrust_up/down/left/right`, `main_engine`, `vacuum`) and uses them at runtime.
- After you `add_action` something this session, `list` returns ONLY that session-added action — still not the project's own actions.
- Even `list include_builtin=true` (~89 entries) shows only the editor's `ui_*` / `spatial_editor/*` builtins plus session-added actions — the project's game actions never appear.
- Yet `project_manage op=settings_get key="input/main_engine"` returns the full action dict, and the `[input]` block is plainly in `project.godot`. The game runs with those actions fine.

**Cause**
`list` enumerates the **editor process's** live `InputMap` singleton via `InputMap.get_actions()`. In the editor that singleton holds (a) Godot's editor-runtime builtins (`ui_*`, `spatial_editor/*`) and (b) any actions registered this session via `add_action`. It does **not** contain the project's `[input]` actions — those live in `ProjectSettings` and are only loaded into an `InputMap` when the **game** runs (a separate process). So a project's own game-actions are structurally invisible to `list`. Writes are unaffected: `add_action` / `bind_event` correctly persist to `project.godot` on disk (and don't clobber existing actions, because `ProjectSettings.save()` preserves them) — only the `list` READ is misleading.

**Fix**
To read or verify a project input action, use the authoritative ProjectSettings path, not `list`:
- `project_manage op=settings_get key="input/<name>"` — returns the action's `{deadzone, events}` dict if it exists.
- Or read `project.godot`'s `[input]` section directly.
Never conclude "the InputMap is empty" or "action X is missing" from a `list` result. (And don't fear that `add_action` will wipe the existing actions just because `list` looks empty — verify with `settings_get` first; the on-disk `[input]` block survives.)

**Detect proactively**
- Any time you need the current set of project input actions (to check for collisions, confirm a binding, decide whether to add one), reach for `settings_get input/<name>` or read `project.godot` — treat `input_map_manage op=list` as "editor + session actions only," not a project inventory.

**Confirmed by**
2026-06-25, `space-miner-prototype` (Godot 4.7-stable, godot-ai v2.7.5) — adding a `light_toggle` action: `list` returned `count:0` while `project.godot` held 6 actions and `settings_get input/main_engine` returned them; after `add_action`, `list` returned only `light_toggle`, and `list include_builtin=true` (89 entries) still omitted all 6 project actions. Sibling to #46 (same `input_map_manage` tool, the write-side keycode quirk).
