### 22. godot-ai `resource_manage` can't author script-`class_name` resources — only built-in engine types

**Symptom**
godot-ai `resource_manage` `op=create`/`op=get_info` with `type="<YourScriptClass>"` (e.g. `class_name MoveDef extends Resource`) fails `VALUE_OUT_OF_RANGE: Unknown resource type: MoveDef`. Built-in types (`Curve`, `Environment`, `Gradient`, physics shapes, …) work fine.

**Cause**
godot-ai's `resource_manage` resolves type names against the engine's built-in ClassDB only; it doesn't consult the script-registered global-class (`class_name`) cache. So a custom Resource type is "unknown" even though the editor/GDScript resolve it.

**Fix**
Hand-write the custom-resource `.tres` inline (Write tool) off an existing editor-saved instance as the format template: reference the script via `[ext_resource type="Script" uid="uid://…" path="…"]` (uid from the `.gd.uid` sidecar), declare data as `[sub_resource type="Resource" id="…"]` blocks with `script = ExtResource("…")`, typed arrays as `Array[ExtResource("def_id")]([SubResource("…"), …])`, `StringName` → `&"…"`. Verify via `resource_manage op=load` (parses + lists props) + a `project_run` boot-check reading `logs_read` for load-time `push_error`. Built-in resources still go through godot-ai (e.g. Curve `op=create type="Curve"` then `op=curve_set_points` with `{offset, value}` dicts — NOT `[x,y]` arrays).

**Detect proactively**
Before reaching for godot-ai `resource_manage` on a `.tres`, check whether the `type` is a `class_name` (your script → hand-write inline) or a built-in engine class (→ godot-ai is fine). A `resource_manage` call returning `Unknown resource type:` is this gotcha. Related: #19 (uid omission), #13 (`class_name` cache).

**Confirmed by**
2026-06-02 — `circle-combat-prototype` player-SM Phase E.1 (`8e8d231`), godot-ai v2.5.13 / Godot 4.6.2; the 13-`MoveDef` `library.tres` was hand-written inline. See memory `gotcha-godot-ai-custom-resource-create.md`.

2026-06-12 — UNCHANGED, re-validated against the godot-ai v2.7.2 source: type resolution still ClassDB-only (`resource_handler.gd:207-209` rejects via `ClassDB.class_exists` → `Unknown resource type`; `ClassDB.instantiate` at `:185`; the global script-class list is consulted only by read-only `api_handler.gd`, and only to emit a WRONG_TYPE error).

2026-06-18 — UNCHANGED, re-anchored to godot-ai **v2.7.5** on Godot **4.7**: the create-path gate is still ClassDB-only — `_validate_resource_class` (`resource_handler.gd:207`) → `ClassDB.class_exists` → `VALUE_OUT_OF_RANGE: Unknown resource type` (`:208-209`), instantiate via `ClassDB.instantiate` (`:185`). No 4.7 change touches ClassDB / `class_name` resolution.

**Version boundary (POST-#583):** the above is the PRE-#583 / upstream behavior — the create path is ClassDB-only, so a custom `class_name` Resource is entirely unreachable (`Unknown resource type`). On the open **PR #583** branch (`feat/instantiate-custom-resources`, godot-ai 2.7.5) the create path resolves the project class via `ProjectSettings.get_global_class_list()` and instead gates on `Script.can_instantiate()` — a NON-`@tool` script then fails `WRONG_TYPE … add @tool` rather than `Unknown resource type`. See **#40** for the successor entry (the `@tool` gate + fix).
