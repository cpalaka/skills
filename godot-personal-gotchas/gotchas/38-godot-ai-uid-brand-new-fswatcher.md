### 38. godot-ai script `ext_resource` `uid=` won't materialize for a BRAND-NEW script until the editor's FS watcher scans it — `reimport` no-ops; macOS fix = `osascript`-activate the window FIRST

**Symptom**
After creating a brand-new `.gd` (via the Write tool), attaching it to a node, and `scene_save` via godot-ai, the saved `.tscn` `[ext_resource type="Script" ...]` line has NO `uid=` (path-only, inconsistent with sibling scripts, fragile on later rename/move). Calling `mcp__godot-ai__filesystem_manage op=reimport` on the script — even repeatedly — does NOT fix it: the `.uid` sidecar / `uid_cache.bin` stays unpopulated (the reimport reports success), and a second `scene_save` still emits the `ext_resource` without `uid=`.

**Cause**
For a brand-new script file the editor's filesystem watcher hasn't yet scanned it into its `EditorFileSystem`, so `reimport` operates on an unscanned entry and **silently no-ops** the UID materialization while reporting success. It can only generate the `.uid` / populate `uid_cache.bin` once the watcher has registered the file. This is the concrete root of #19 ("`.uid` sidecar doesn't exist yet at save time") and a specific instance of #13's brand-new-directory `reimport` no-op trap (trap 3) — and as of godot-ai v2.7.2+ `write_text` no longer forces a scan either, so the only remedy is to wake the watcher.

**Fix**
On macOS, activating the editor window triggers the rescan. Sequence:
1. `osascript` to activate the Godot app/window (forces the FS watcher to scan the new file).
2. `mcp__godot-ai__filesystem_manage op=reimport` on the script — now operates on a scanned entry, generates the `.uid` / populates `uid_cache.bin`.
3. `mcp__godot-ai__scene_save` — godot-ai now writes a clean one-line `uid=` on the `ext_resource`.

In practice the `uid=` appeared only on the THIRD save: (1) first save → no uid; (2) reimport + second save → still no uid (unscanned entry, reimport no-op); (3) osascript-activate + reimport + third save → `uid="uid://..."` present. The `osascript`-activate → reimport → scene_save ordering is the concrete lever; mere repeated reimport is not enough.

**Detect proactively**
After any godot-ai scene edit that attaches a freshly-Written script, grep the saved `.tscn` for that script's `ext_resource` line — if it has `path=` but no `uid=` while siblings do, the FS watcher hasn't scanned it: `osascript`-activate the window, reimport, re-save, re-grep to confirm `uid=`. Do NOT trust a `reimport` success report on a brand-new script as proof the UID materialized. See #19 (uid-omission) and #13 (class_name cache, trap 3); also `docs/godot-mcp-guide.md` for the godot-ai writer surface.

**Confirmed by**
space-miner-prototype Task 2, commit `f37e370` — godot-ai MCP server v2.7.2, Godot 4.6.2-stable, macOS.

2026-06-18 — re-anchored to godot-ai **v2.7.5** (current installed) on Godot **4.7**. Source check: `write_file` and `reimport` both call a single-file `EditorInterface.get_resource_filesystem().update_file(path)` (no full scan — `filesystem_handler.gd:60-66`, `:78-112`), and godot-ai's *own* `create_script` now defers its response until `ResourceLoader.exists(path)` settles (godot-ai #261) — but that only helps scripts **godot-ai itself writes**, not a script created via the generic Write tool (this gotcha's scenario), which godot-ai never registers at write time. So the brand-new-file `uid=` gap can still occur and the godot-ai remedy (`reimport`, which runs `update_file`) is unchanged. **OPEN — re-verify live on 4.7 + v2.7.5 (pending, 2026-06-18):** whether `reimport` alone now materializes `uid=` for a Write-tool-created script, or the `osascript`-activate step is still required. Until confirmed, treat the osascript step as a v2.7.2-era workaround that may no longer be needed.
