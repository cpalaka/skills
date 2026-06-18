### 38. godot-ai script `ext_resource` `uid=` won't materialize on the FIRST save of a BRAND-NEW Write-tool script — on v2.7.5/4.7 a plain `reimport` then fixes it (no window focus); on the older v2.7.2/4.6.2 reimport no-op'd and the macOS escalation was `osascript`-activate the window FIRST

**Symptom**
After creating a brand-new `.gd` (via the Write tool — NOT godot-ai's own `create_script`/`write_text`), attaching it to a node, and `scene_save` via godot-ai, the saved `.tscn` `[ext_resource type="Script" ...]` line has NO `uid=` (path-only, inconsistent with sibling scripts, fragile on later rename/move). On the FIRST save the `uid=` is always absent — the `.gd.uid` sidecar doesn't exist yet. What differs by version is whether a plain `reimport` then repairs it:
- **godot-ai v2.7.5 / Godot 4.7 (current):** `mcp__godot-ai__filesystem_manage op=reimport` on the script **generates the `.uid` sidecar with NO window activation**, and the next `scene_save` writes a clean `uid=`. Resolved in 2 saves.
- **godot-ai v2.7.2 / Godot 4.6.2 (historical):** `reimport` — even repeated — did NOT fix it: the `.uid` / `uid_cache.bin` stayed unpopulated (the reimport reported success), and a second `scene_save` still emitted the `ext_resource` without `uid=`.

**Cause**
For a brand-new script file the editor's filesystem watcher hasn't yet scanned it into `EditorFileSystem`, so the single-file `update_file` that both `reimport` and godot-ai's `write_text` call (`filesystem_handler.gd:60-66`, `:78-112`) operates on an entry the FS layer may not have registered. Whether that `update_file` materializes the UID for such a file turned out to be engine/version-dependent: on **4.6.2 + v2.7.2** it silently no-op'd the UID materialization while reporting success (the concrete root of #19's "`.uid` doesn't exist yet at save time", and an instance of #13's brand-new-directory `reimport` no-op trap, trap 3); on **4.7 + v2.7.5** the same `update_file` path now successfully generates the `.uid` for a Write-tool file with no prior window focus. (godot-ai's own `create_script` separately defers on `ResourceLoader.exists()` per godot-ai #261 — that only helps scripts godot-ai itself writes, not Write-tool ones; the change here is the engine/`update_file` behavior, not that deferral.)

**Fix**
- **Current (v2.7.5 / 4.7):** `mcp__godot-ai__filesystem_manage op=reimport` the `.gd`, then `mcp__godot-ai__scene_save`. The reimport generates the `.uid` with no window focus; the save serializes a clean one-line `uid=`. This is exactly #19's fix — on current versions #38 collapses back into #19, and the `osascript` step below is **obsolete**.
- **Historical fallback (v2.7.2 / 4.6.2 — or if reimport-alone ever regresses):** wake the FS watcher first. On macOS, activating the editor window triggers the rescan:
  1. `osascript -e 'tell application "Godot" to activate'` — forces the FS watcher to scan the new file.
  2. `mcp__godot-ai__filesystem_manage op=reimport` on the script — now operates on a scanned entry, generates the `.uid` / populates `uid_cache.bin`.
  3. `mcp__godot-ai__scene_save` — writes a clean one-line `uid=` on the `ext_resource`.

  On v2.7.2 the `uid=` appeared only on the THIRD save: (1) first save → no uid; (2) reimport + second save → still no uid (unscanned entry, reimport no-op); (3) osascript-activate + reimport + third save → `uid="uid://..."` present. On v2.7.5 it appears on the SECOND save with no `osascript` at all.

**Detect proactively**
After any godot-ai scene edit that attaches a freshly-Written script, grep the saved `.tscn` for that script's `ext_resource` line — if it has `path=` but no `uid=` while siblings do, `reimport` + re-save and re-grep to confirm `uid=`. Verify the on-disk `.gd.uid` sidecar actually exists rather than trusting the `reimport` success report. If (on an older version) reimport-alone leaves it absent, escalate to the `osascript`-activate step. See #19 (uid-omission) and #13 (class_name cache, trap 3); also `docs/godot-mcp-guide.md` for the godot-ai writer surface.

**Confirmed by**
- **v2.7.2 / Godot 4.6.2-stable / macOS** — space-miner-prototype Task 2, commit `f37e370`: `uid=` materialized only on the THIRD save (osascript-activate → reimport → scene_save); repeated reimport alone insufficient.
- **2026-06-18 — v2.7.5 / Godot 4.7-stable / macOS — re-verified live** (space-miner-prototype): a Write-tool `res://scratch_uid_probe.gd` attached + saved emitted a `uid=`-less `ext_resource` on the first save; `filesystem_manage op=reimport` ALONE then generated the `.gd.uid` sidecar (`uid://ydj7awf8auq5`) with **no `osascript`/window activation**, and the next `scene_save` wrote the clean `uid=` (matching the sidecar). Resolved in 2 saves; the `osascript` step is **OBSOLETE** on this version. **OPEN flag (2026-06-18) RESOLVED.**
