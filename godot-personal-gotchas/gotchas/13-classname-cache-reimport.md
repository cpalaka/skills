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
- **Preferred when the editor is open + godot-ai MCP is connected** (e.g. an agent session where you can't reliably focus the editor window): `mcp__godot-ai__filesystem_manage` with `op=reimport`, `params={"paths": ["res://scripts/your_new_class.gd", ...]}`. Runs `EditorFileSystem.update_file` — registers the `class_name` in the cache AND generates the `.uid` sidecar, no window focus needed. Works from a subagent too (`ToolSearch` `select:mcp__godot-ai__filesystem_manage` first). **Caveat — NO-OP for a script in a BRAND-NEW directory** the editor's `EditorFileSystem` hasn't scanned (e.g. created via Write tool / `cat` / Finder): `update_file` updates an *already-recognized* file, so reimport **falsely reports success** (`reimported_count:1`) while registering NO class and generating NO `.uid`, leaving it unresolvable headless. Use `write_text` to force a scan instead — see trap (3).
- Otherwise: focus the editor window (or click anywhere in the FileSystem dock) to trigger a scan. This rewrites `.godot/global_script_class_cache.cfg` with the new `class_name` entries.
- Verify before retrying: `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` must return `> 0`.
- Then re-run the headless command.

**Three traps**
- **Self-references fail too.** A script that uses its OWN `class_name` internally (`X.new()`, `-> X`, `Array[X]`) — not just a cross-file consumer — fails with `Identifier not found: X` until that file is reimported. Every new `class_name` script needs the reimport, even standalone ones.
- **Targeted reimport / `write_text` do NOT prune deletions.** They only update the named paths; a cache entry for a DELETED `class_name` file lingers (`class_name X -> deleted_path`) and collides if you later add a real `X` at a different path. To supersede it, create the real file with the same `class_name` and reimport THAT (`update_file` replaces the entry's path — verified the stale entry then resolves to the real file). Only a full editor rescan prunes vanished files wholesale.
- **Reimport silently no-ops in a brand-new directory.** When the `class_name` script lives in a dir the editor never scanned, `reimport` returns success but registers nothing (see Fix caveat). Trigger a SCAN instead: godot-ai `filesystem_manage op=write_text` ("Triggers an editor filesystem scan") on the file (or a sibling) indexes the new dir, registering the class AND generating `.uid`. (Focusing the editor window also scans.) Never trust the `reimport` return for a new dir — verify `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` (> 0).

**Detect proactively**
- Any time a new `class_name`-declaring script is created via tooling (not the editor's New Script dialog), assume the cache is stale until proven otherwise.
- Before any headless GUT / `--check-only` / CLI invocation that exercises a freshly-added `class_name`, grep the cache: `grep -c "<NewClassName>" .godot/global_script_class_cache.cfg`. Zero hits → focus the editor first.
- Do NOT trust `mcp__godot__get_diagnostics` clean output as evidence the headless run will pass — the LSP parses on demand and does not consult the cache.

**Confirmed by**
2026-05-27 — `2d-movement-prototype` F-C1+D1 architectural fix. Created `scripts/player/player_tick_context.gd` (declaring `class_name PlayerTickContext`) via Write tool while editor was running. LSP diagnostics on both the new file and `scripts/player/player.gd` (consumer) came back clean. `godot --headless --path . -s addons/gut/gut_cmdln.gd -gtest=res://test/unit/test_player_state_machine.gd -gexit` produced 5× `Parse Error: Could not find type "PlayerTickContext"`. `grep -c "PlayerTickContext" .godot/global_script_class_cache.cfg` returned `0`. After focusing the editor window, the same grep returned `1` and the GUT run passed 6/6. Commit `a15e3fe`.

2026-06-01 — `circle-combat-prototype` player-SM Phase A. Confirmed the `mcp__godot-ai__filesystem_manage op=reimport` fix (registers the class + generates `.uid`, no window focus — reliable even from a subagent), and both traps: a script self-referencing its own `class_name` (`Intent.new()` inside `intent.gd`) failed `Identifier not found: Intent` headless until reimported; and a stale `class_name ActionSM -> deleted_path` entry was NOT pruned by reimporting the deleted path or by a `write_text` scan — only superseded by creating the real `scripts/action_sm.gd` with the same `class_name` and reimporting it (the entry's path then resolved to the real file; verified by grep + a green headless run).

2026-06-02 — `circle-combat-prototype` player-SM Phase B. New trap (3): `reimport` is a no-op in a **brand-new directory** (`scripts/locomotion/`, Write-tool-created). Reproduced in isolation — a probe `class_name` script in a fresh dir had cache count 0 / no `.uid` after `reimport`-alone (which still returned `reimported_count:1`) and stayed unresolvable headless; a `write_text` on the same file then yielded cache 1 + `.uid` + headless resolution. The fix is `write_text` (forces a scan).
