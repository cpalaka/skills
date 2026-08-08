### 19. godot-ai omits `uid=` on a script ext_resource when the `.uid` sidecar doesn't exist yet at save time

> **PROBED 2026-08-07 on godot-ai 3.1.3 — STILL LIVE. Not fixed.**
> Ran the probe below (Godot 4.7-stable): `script_create` into a **brand-new** directory →
> `node_create` → `script_attach` → `scene_save`. The saved `.tscn`:
> ```
> [ext_resource type="Script" path="res://mcp_probe_tmp/probe_script.gd" id="1_2jmjf"]
> ```
> **No `uid=`** — and no `.uid` sidecar on disk either, despite `script_create` reporting
> `import_settled: true, import_pending: false` and listing `probe_script.gd.uid` in its own
> `cleanup.rm`. So the tool *believes* it produced the sidecar; the filesystem disagrees. The
> `update_file()` registration noted below does not close it, because the SAVE path is unchanged.
> Incidental confirmation from the same artifact: `unique_id=` **is** stamped on every `[node]`
> (`[node name="Probe" type="Node" unique_id=921697695]`) — but this scene was written by Godot's
> own `EditorInterface.save_scene()`, so that is the **engine's** 4.7 save format (#62), *not* a
> godot-ai quirk. Any doc attributing `unique_id=` to godot-ai is wrong.
> Everything below stands as written.

> *(Original status note, superseded by the probe above — kept for the reasoning:)*
> **The stated CAUSE has been addressed upstream, but the
> SAVE path has not. Probe before retiring.**
> The script side now registers the new file with the resource pipeline:
> `script_create` calls `EditorInterface.get_resource_filesystem().update_file(path)`
> (`handlers/script_handler.gd:80-88`), `script_patch` does the same (`:321-324`), and
> `McpResourceIO.attach_cleanup_hint` lists `path + ".uid"` as an expected artifact (`:90-92`) —
> which directly attacks "the `.uid` sidecar doesn't exist yet at save time".
> **But the scene side is unchanged:** `save_scene` (`handlers/scene_handler.gd:302`) still calls
> `_save_current_scene()` → a bare `EditorInterface.save_scene()` (`:373-376`) with no uid handling;
> only `create_scene` runs `_pack_and_save_with_uid` (`:149`, `:177-188`).
> **Probe:** `script_create` a fresh `.gd` in a NEW directory → `node_create` → `script_attach` →
> `scene_save` → read the saved `.tscn` and check the new `[ext_resource type="Script"]` line for
> `uid=`. Present ⇒ retire this entry. Absent ⇒ still live, and the fix below still applies.

**Symptom**
godot-ai adds a brand-new script node to a scene (`node_create` + `script_attach` + `scene_save`) and the saved `[ext_resource type="Script" ...]` line is written WITHOUT its `uid=` attribute — even though sibling script ext_resources have `uid="uid://..."`. It still resolves by `path=` (works at runtime) but is inconsistent and breaks if the script is later renamed/moved outside the editor.

**Cause**
godot-ai serializes the ext_resource with whatever it knows at save time. The UID isn't available until the editor imports the freshly-written `.gd` and generates its `.uid` sidecar — which hasn't happened yet at the save.

**Fix**
Do NOT hand-edit the `.tscn`. Instead: (1) `mcp__godot-ai__filesystem_manage` `op=reimport` `params={"paths": ["res://scripts/your_script.gd"]}` generates the `.uid`; (2) `mcp__godot-ai__scene_save` again — godot-ai now writes `uid=` cleanly (verified: a one-line `+uid="uid://..."` diff, zero `unique_id` churn). The same reimport trick materializes a `.uid` so a new script can be committed (a project may track `.uid` files); the headless `--script` test runner does NOT generate a `.uid` for a script it only `preload`s by path.

**Detect proactively**
After any godot-ai scene edit that attaches a newly-created script, grep the saved `.tscn` for the new script's ext_resource line — if it has `path=` but no `uid=` while siblings do, reimport + re-save before committing, and `git add` the new `.uid`.

**Confirmed by**
2026-05-31 — adding `DebugMotionOverlay` (`res://scripts/debug_motion_overlay.gd`) to `scenes/main.tscn`. See memory `gotcha-godot-ai-uid-omission.md`.

2026-06-12 — UNCHANGED, re-validated against the godot-ai v2.7.2 source: `scene_save` is still a bare `EditorInterface.save_scene()` passthrough with no uid handling (`plugin/addons/godot_ai/handlers/scene_handler.gd:244-247`; zero `ResourceUID` references in plugin or server).

2026-06-18 — UNCHANGED, re-anchored to godot-ai **v2.7.5** on Godot **4.7**: `save_scene` (`addons/godot_ai/handlers/scene_handler.gd:173-201`) routes through `_save_current_scene()` (`:244-247`), a bare `EditorInterface.save_scene()` passthrough with no uid handling; zero `ResourceUID` references in the addon. (Path is `addons/godot_ai/…`, not `plugin/addons/…`.) No 4.7 engine change affects this.
