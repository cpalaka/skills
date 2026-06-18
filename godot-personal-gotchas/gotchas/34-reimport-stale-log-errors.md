### 34. godot-ai `op=reimport` logs STALE fatal-looking errors (transient races; read the log in deltas)

**Symptom**
- After `mcp__godot-ai__filesystem_manage op=reimport` of a GDScript, `logs_read source="editor"` shows fatal-looking errors that are actually stale/transient:
  - **(a)** Dependent scripts log `Compile Error: Identifier not found: <AutoloadName>` + `Failed to load script ... Compilation failed` when the reimported script IS the autoload they reference (e.g. reimporting the `Feel` autoload makes `fruit.gd`/`tuning_panel.gd` log this).
  - **(b)** A script `preload()`ing binary assets (`.wav`/`.svg`) written moments earlier logs `Parse Error: Preload file "res://..." has no resource loaders (unrecognized file extension)` because the reimport raced the asset's `.import` sidecar generation.
- Meanwhile the headless test suite passes and the game boots clean — the errors do not reflect current state.

**Cause**
Two races in the same family:
- **(a)** Reimporting an autoload script triggers dependent-script recompilation WHILE the autoload's own GDScript is mid-reload, so the global identifier is momentarily unresolvable. The editor logs the failure and never retracts it — the editor log buffer is **append-only** (`run_id` empty, never rotates; same buffer behavior as the `.gdshader` compile-check entry, #21).
- **(b)** `reimport` of a script whose `preload()` targets are brand-new binary assets can run before EditorFileSystem finishes generating those assets' `.import` sidecars — the parse fails on the missing loader, then the assets finish importing and the logged error is stale.

**Fix**
Treat the editor log as APPEND-ONLY and work in deltas: note `total_count` before a reimport batch; read with `offset=<previous total_count>` after. When these errors appear:

1. Verify prerequisites settled: `.import` sidecars exist on disk for every preloaded asset; the autoload is registered.
2. Re-reimport ONLY the failing script once.
3. Read the log delta again — zero NEW entries = clean; the earlier errors were transient.

Ordering that avoids most of it: reimport the autoload script alone first, then dependents in a second call; write binary assets and confirm their `.import` sidecars exist before reimporting scripts that `preload()` them.

**Detect proactively**
Any `op=reimport` batch that touches an autoload script, or a script `preload()`ing assets written in the same session — expect these log lines and apply the delta-read discipline before treating them as real failures. Sibling of #13 (`class_name` cache stale — same EditorFileSystem-timing family: there the reimport is the fix; here the reimport is the trigger). Truth signal when in doubt: the headless test suite + a clean boot, not the cumulative editor log.

**Confirmed by**
2026-06-11 — `godsquish-prototype`, three occurrences (Godot 4.6.2, godot-ai MCP v2.5.13, macOS): `feel.gd` reimport → transient `Identifier not found: Feel` in `fruit.gd`/`tuning_panel.gd` (twice; settled clean on re-reimport with log-delta check); `squelch_03..08.wav` preload race → `no resource loaders` parse errors while `tests/run_tests.sh` passed 15/15 and the subsequent boot was clean.

2026-06-18 — re-validated against godot-ai **v2.7.5** on Godot **4.7** (the 2026-06-11 anchor stays as observed on v2.5.13): same behavior — `reimport` still calls `efs.update_file()` synchronously without awaiting import completion, so the races persist (`filesystem_handler.gd:78-112`); the editor log buffer (`utils/editor_log_buffer.gd`) is still append-only, exposing `total_count()` + `get_range(offset, count)`. No 4.7 change to EditorFileSystem import timing or the log buffer.
