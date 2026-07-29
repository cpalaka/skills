### 35. `--check-only --script` falsely fails any autoload-referencing script with `Identifier not found: <AutoloadName>`

**Symptom**
- `godot --headless --check-only --script <file.gd> --quit --path .` fails with `SCRIPT ERROR: Compile Error: Identifier not found: <AutoloadName>` (plus `Failed to compile depended scripts` for its dependents) on a script that references a project autoload (e.g. `Feel.v("key")`).
- The autoload IS correctly registered in `project.godot`'s `[autoload]` section, and the same script compiles and runs flawlessly in a real game boot and at F5.
- A false negative of the check-only harness, not a real defect.

**Cause**
Autoload singletons are registered as compile-time-resolvable globals only when the full game/SceneTree initializes. `--check-only --script` parses/compiles the one script WITHOUT initializing the SceneTree (so it never registers project autoloads), and any autoload identifier fails to resolve in that mode.

**Fix** — correct verification routes for autoload-referencing scripts:
- Bounded full headless boot of a scene that loads the script: `godot --headless --path . res://scenes/main.tscn --quit-after 30 2>&1 | grep -E "SCRIPT ERROR|Failed to load"` — empty output = clean, **but only once calibrated**. A healthy boot of this shape prints almost nothing, so "no matches" and "the scene never loaded" are the same reading; and the process exits **0** even with a planted parse error, so never let `$?` into the verdict (#27). Before believing a clean run, plant a syntax error in a script that scene *actually loads*, confirm the grep reds, revert — calibrating in a file the run never mounts proves nothing. Also check the engine flags are to the LEFT of any `--` separator: past it they are handed to the application and silently discarded (#72), so the run is never bounded at all.
- Or read the open editor's log: `mcp__godot-mcp__godot_editor get_log_messages source="editor"`.
- Keep `--check-only --script` for autoload-FREE scripts only (pure-logic files) — there it remains a fast, reliable parse check.

**Detect proactively**
Before reaching for `--check-only --script` on a file, check it for references to any name in `project.godot`'s `[autoload]` section — any hit means check-only will false-fail; route through the bounded-boot check instead. Don't confuse with #34 (`op=reimport` stale-log): same `Identifier not found: <AutoloadName>` text, but #34 is transient append-only editor-log noise after a reimport, while this is structural to check-only mode and fires on every run.

**Confirmed by**
2026-06-12, `maw-prototype` Stage 1 (Godot 4.6.2) — `scripts/tuning_panel.gd` and `scripts/main.gd` (both reference the `Feel` autoload) failed check-only with `Identifier not found: Feel` while the same commit's 30-frame headless boot and F5 run were clean.

2026-07-25 — **re-verified live on Godot 4.7.stable**, with a proper control. `--headless --check-only --script` on a script referencing an `[autoload]` fails `Compile Error: Identifier not found: MyAuto`; the same project booted through its real `run/main_scene` prints `MyAuto.ping() -> pong`. Note the near-miss: a bare `--script` run (no main scene) ALSO fails, because it builds no SceneTree either — it is not a valid control for this entry. Only a main-scene run is.
