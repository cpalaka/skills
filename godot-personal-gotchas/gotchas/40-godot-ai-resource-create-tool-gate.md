### 40. (POST-#583) godot-ai `resource_manage op=create` (and inline `{"__class__":"X"}`) needs `@tool` on the script to instantiate a custom `class_name` Resource

**Symptom**
With PR #583 applied (godot-ai 2.7.5, branch `feat/instantiate-custom-resources` @ `61b72bf`, Godot 4.7), `resource_manage op=create type="MyThing"` — or a nested `{"__class__": "MyThing", ...}` value — on a project script `class_name MyThing extends Resource` returns:

```
WRONG_TYPE: MyThing cannot be instantiated in the editor (abstract, or a non-@tool script — add @tool to instantiate it here)
```

…even though `MyThing` IS registered in `.godot/global_script_class_cache.cfg` and resolvable. This is the **POST-#583 successor** of #22 ("godot-ai `resource_manage` can't author script-`class_name` resources"): pre-#583 the identical call returned `VALUE_OUT_OF_RANGE: Unknown resource type: MyThing` (custom classes entirely unreachable). PR #583 makes them reachable; this is the one remaining gate. **Version boundary:** pre-#583 → `Unknown resource type`; #583+ → `WRONG_TYPE … add @tool`.

**Cause**
`resource_handler._instantiate_resource()` (`resource_handler.gd:223-244`) resolves the project class via `ProjectSettings.get_global_class_list()`, then gates instantiation on `Script.can_instantiate()` (line 238). Godot returns `can_instantiate() == false` for a NON-`@tool` script when called inside the editor process — the editor only instantiates `@tool` scripts. Correct Godot behavior, NOT a godot-ai defect; the `WRONG_TYPE` message is PR #583's honest error-split — distinct from `INTERNAL_ERROR` (script-load failure, line 237) and `VALUE_OUT_OF_RANGE`/"Unknown resource type" (line 244, now fires ONLY when the class is genuinely unregistered). Same `can_instantiate()` semantics as #28 (there it reports compiled-validity, here editor-time-instantiability, which excludes non-`@tool` scripts).

**Fix**
Add `@tool` as the first line of the custom Resource script, `filesystem_manage op=reimport` it, then retry the create — it succeeds and writes a valid `.tres` (`[gd_resource type="Resource" script_class="MyThing" ...]`). `@tool` only enables editor-time instantiation (which `resource_manage` needs); it does NOT change the resource's runtime data behavior.

**Parallel-reload race (sibling note):** overwriting a `class_name` script AND a dependent that references it via TWO PARALLEL `script_create` calls can throw a transient `GDScript reload failed (error code 43)` at the `@export` line — a concurrent-reload race, not a real parse error. Reimport in dependency order (child/referenced class BEFORE the parent). Same EditorFileSystem-timing family as #34 (reimport races).

**Detect proactively**
Before `resource_manage op=create type="<YourClass>"` (or an inline `{"__class__": "<YourClass>"}` value), confirm the script's first line is `@tool` — otherwise expect `WRONG_TYPE … add @tool` even though the class is cache-registered. A `WRONG_TYPE` mentioning `@tool` is this gotcha; a `VALUE_OUT_OF_RANGE: Unknown resource type` means the class isn't registered (the pre-#583 / cache-stale path — see #22, #13). When overwriting interdependent `class_name` scripts in one batch, reimport child-before-parent rather than firing parallel `script_create`s.

**Confirmed by**
Live dogfood verification 2026-06-20, godot-ai 2.7.5 / Godot 4.7, on branch `feat/instantiate-custom-resources` @ `61b72bf` (the open upstream PR #583). Handler source: `addons/godot_ai/handlers/resource_handler.gd:223-244`. See project `docs/godot-gotchas.md`.
