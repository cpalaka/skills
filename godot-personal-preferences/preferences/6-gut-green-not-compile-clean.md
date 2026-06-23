### 6. GUT green does NOT mean "all scripts compile"

**When this applies**

About to claim "all scripts compile" or "compile clean" from a green GUT run in a Godot project.

**Preferred behavior**

Don't. GUT only compiles scripts that its tests (or their tested scenes/targets) directly reference. Untested support scripts — camera controllers, overlays, helpers, debug-only autoloads — can carry parse errors invisible to GUT and surface only when F5 instantiates a scene that loads them.

The strongest verification chain pre-F5:

1. **GUT** — unit-tested logic
2. **`godot --headless --path . --check-only --quit`** — broad parse coverage; works when the editor is closed. **Not exhaustive, though** — it misses *runtime-compile* errors that fire only when a script is actually loaded (e.g. indexing an array literal: `var x := ["a","b"][i]` → `Variant` → `:=` can't infer; personal-gotchas #44). The LSP (`get_diagnostics`/`scan_workspace_diagnostics`) is blind to these too.
3. **F5 with `mcp__godot-mcp__godot_editor get_log_messages source="editor"`** (or godot-ai `logs_read` after `project_run`) — runtime errors AND parse errors when scenes load scripts

Because both static layers have blind spots, the real backstop is making the **suite itself compile every script**: a behavioral test for logic modules, or a **preload-smoke test** (`const X := preload("res://…")` + `X.new()`/`free()`, or `load(scene).instantiate()`) for scene controllers / support scripts with no other coverage — a real `preload`/`load` forces a real compile and FAILS on a runtime-compile error. Layers (1)/(2) overlap with (3) but catch failures earlier and cheaper. Skipping (2) on the basis of (1) is the trap; treating (2) as sufficient for "compiles clean" is the deeper trap.

**Why**

This is a strict superset of the warnings-as-errors gates that GUT covers. The failure mode: a script authored in an earlier session, never exercised by tests, carries `expf(-rate)` or cross-script-without-`class_name` (personal-gotchas #6 and #12) — invisible until F5 instantiates a scene that loads it. The cost of saying "compile clean" when it isn't is a fresh-session F5 that explodes immediately. A nastier variant slips past `--check-only` AND the LSP entirely — a *runtime-compile* error like the array-literal-index `:=` above (gotcha #44) — and `is_playing:true` after `project_run` is NOT proof the script compiled: it only means the SceneTree loaded; if the root script failed to compile, `_ready` never ran and the scene is non-functional.

**How to apply**

When the editor is open, prefer `mcp__godot-mcp__godot_editor get_log_messages source="editor"` over `--check-only --quit` — the headless command tries to bind the godot-mcp WebSocket port (6550) and hangs if the editor's already on it, leaving orphan Godot processes. Always `ps aux | grep godot` before re-running headless when the editor is open.

When the editor is closed, `--check-only --quit` is the right tool. When in doubt or under time pressure, spot-read any `.gd` script that's about to be loaded by a scene the user is about to F5 — fastest manual verification.

Every new GDScript that no behavioral test exercises gets a **preload-smoke test** added to the headless suite (part of the test-roster discipline) so the suite actually compiles it — this is the only catch for runtime-compile errors that `--check-only` and the LSP both miss. When you CANNOT run a scene (game capture down — gotcha #43), treat its controller as UNVERIFIED; never substitute static checks + `is_playing:true`.
