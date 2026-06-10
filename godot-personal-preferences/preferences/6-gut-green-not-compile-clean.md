### 6. GUT green does NOT mean "all scripts compile"

**When this applies**

About to claim "all scripts compile" or "compile clean" from a green GUT run in a Godot project.

**Preferred behavior**

Don't. GUT only compiles scripts that its tests (or their tested scenes/targets) directly reference. Untested support scripts — camera controllers, overlays, helpers, debug-only autoloads — can carry parse errors invisible to GUT and surface only when F5 instantiates a scene that loads them.

The strongest verification chain pre-F5:

1. **GUT** — unit-tested logic
2. **`godot --headless --path . --check-only --quit`** — exhaustive parse coverage; works when the editor is closed
3. **F5 with `mcp__godot-mcp__godot_editor get_log_messages source="editor"`** (or godot-ai `logs_read` after `project_run`) — runtime errors AND parse errors when scenes load scripts

Layers (1) and (2) overlap with (3) but catch failures earlier and cheaper. Skipping (2) on the basis of (1) is the trap.

**Why**

This is a strict superset of the warnings-as-errors gates that GUT covers. The failure mode: a script authored in an earlier session, never exercised by tests, carries `expf(-rate)` or cross-script-without-`class_name` (personal-gotchas #6 and #12) — invisible until F5 instantiates a scene that loads it. The cost of saying "compile clean" when it isn't is a fresh-session F5 that explodes immediately.

**How to apply**

When the editor is open, prefer `mcp__godot-mcp__godot_editor get_log_messages source="editor"` over `--check-only --quit` — the headless command tries to bind the godot-mcp WebSocket port (6550) and hangs if the editor's already on it, leaving orphan Godot processes. Always `ps aux | grep godot` before re-running headless when the editor is open.

When the editor is closed, `--check-only --quit` is the right tool. When in doubt or under time pressure, spot-read any `.gd` script that's about to be loaded by a scene the user is about to F5 — fastest manual verification.
