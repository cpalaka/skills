### 19. godot-ai omits `uid=` on a script ext_resource when the `.uid` sidecar doesn't exist yet at save time

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
