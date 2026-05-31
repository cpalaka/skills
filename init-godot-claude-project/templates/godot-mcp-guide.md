# Godot MCP Reference

For agents working in Godot projects with `@satelliteoflove/godot-mcp` + `@ryanmazzolini/minimal-godot-mcp` MCP servers and the `godot_mcp` addon (`addons/godot_mcp/`).

## The MCP servers

- **godot-mcp** (v3.6.1) — drives the editor via WebSocket bridge (port 6550). Tools (all prefixed `mcp__godot-mcp__godot_*`): `godot_scene`, `godot_node`, `godot_scene3d`, `godot_editor`, `godot_resource`, `godot_project`, `godot_input`, `godot_runtime_state`, `godot_docs`, plus `godot_tilemap`, `godot_gridmap`, `godot_animation`, `godot_profiler`. **READ/TEST role only — never its write ops** (see the matrix below).
- **minimal-godot-mcp** — filesystem-based. Tools: GDScript diagnostics, runtime console output capture.
- **godot-ai** (`hi-godot/godot-ai` v2.5.10, vendored at `addons/godot_ai/`; added 2026-05-30) — construction-grade editor MCP over HTTP `http://127.0.0.1:8000/mcp` (its Python server is also a WS *server* on :9500; the editor plugin dials out). ~39 tools / 120+ ops: `scene_*`/`node_*`/`script_*`, `signal_manage`, `material`/`particle`/`camera`/`animation`/`ui_manage`, `project_run`, `editor_screenshot`, `logs_read`. Enabled as a project plugin; the dock auto-starts the uv server. Upgrades *construction* over godot-mcp's run/edit baseline — but the two heavily overlap (scene/node/script), so **prefer one writer at a time** across them.

## Which tool to use (writer / reader split)

Three editor MCPs run side by side — use them by role, not interchangeably. godot-ai writes, godot-mcp reads/tests.

| Need | Tool | Notes |
|---|---|---|
| **Write** anything — scene/node/script/property, input map, run, screenshot, logs | **godot-ai** (WRITER) | `scene_*`/`node_*`/`script_*`, `input_map_manage`, `script_patch`, `project_run`, `editor_screenshot`, `logs_read`. Writes all struct types correctly. Quirk: stamps a non-standard `unique_id=` on every `[node]` (loads fine in 4.6.2; matters for cross-tool/hand-edit). |
| **Inject input** (timed named actions — headless self-test of input mechanics) | **godot-mcp** `godot_input` | UNIQUE — godot-ai cannot inject input. |
| **Numerical runtime state** (exact pos/vel/rot time-series + event detection) | **godot-mcp** `godot_runtime_state` | digest/watch — verifies physics MATH where a screenshot can't. |
| **Version-correct class docs** | **godot-mcp** `godot_docs` | EXCLUSIVE — only godot-mcp has it. |
| **Parse errors / scene won't load** | **godot-mcp** `godot_editor get_log_messages source="editor"` | `get_errors` + `get_debug_output` do NOT exist in v3.6.1 — this replaces them. |
| **Crash stack trace** | **godot-mcp** `godot_editor get_stack_trace` | most recent debugger crash with frames. |
| **Local type/parse diagnostics** (line:col, no editor needed) | **minimal-godot** `get_diagnostics` | misses cross-script Variant inference — cross-check with `get_log_messages source="editor"`. |
| **Capture `print()`** | **minimal-godot** `get_console_output category="stdout"` | for MCP-launched sessions showing "No active debug session", use godot-ai `logs_read` or relaunch with F5. |

**Never write through godot-mcp** — its node/scene write path still silently no-ops `Rect2`/`region_rect` (all formats; returns "Updated node", disk unchanged). Use godot-ai for all writes. **One writer per step** (both drive the same `EditorInterface`). Ports are disjoint (godot-mcp WS 6550; godot-ai HTTP 8000 + WS 9500); `godot-mcp-clean` does NOT reap godot-ai's server.

## Critical gotchas

- **Single-client WS bridge.** "Another MCP server connected and replaced this one" = another process holds the slot. Tell user to run `godot-mcp-clean` then `/mcp`.
- **`node.get_properties` returns edit-time state, not runtime.** A script flipping `Camera.current = true` at runtime won't show. Use screenshots + console for runtime verification.
- **`editor.run` ignores recent `project.godot` edits** — the editor caches settings in memory. Pass `scene_path` explicitly to `editor.run`.
- **`editor.run` / `editor.stop` reverts `current_scene` to the project's main scene** (the one in `project.godot`'s `run/main_scene`), even if a different scene was being edited. After a run/stop cycle, re-`scene.open` your working scene before further `node.*` calls — otherwise `parent_path: /root/YourScene` will fail with `NODE_NOT_FOUND`.
- **`scene.open` on a `.glb` silently no-ops.** The tool returns `Opened scene: ...` but `current_scene` and `open_scenes` are unchanged — `.glb`s are read-only PackedScene imports. To inspect their contents, instance the glb as a child of a regular `.tscn` and walk it with `node.find`.
- **Capture `print()` via `mcp__godot__get_console_output`**, not `editor.get_log_messages` (mostly LSP noise). **Gotcha 1:** print() output is captured under `category: "stdout"`, not `category: "console"` — calling with `category: "console"` returns `entries: []` even when `total_buffered > 0`. Omit the category filter or use `"stdout"`. **Gotcha 2:** there's a startup delay before the buffer populates — querying immediately after `editor.run` can return `total_buffered: 0` for ~1–2s even though the game has already printed. **Gotcha 3 (worse failure mode):** when the scene was launched via godot-mcp's `editor.run` (vs. F5 in-editor), `get_console_output` can return `{"entries": [], "total_buffered": 0, "error": "No active debug session..."}` even though `editor.get_state` reports `is_playing: true`. The minimal-godot-mcp session tracker doesn't register MCP-launched sessions. v3.6.1 has **no in-bridge fallback** (the old `get_debug_output` action was removed) — instead capture stdout by launching the game via godot-ai `project_run` and reading godot-ai `logs_read` (which captures game output independently of the minimal-godot session tracker), or relaunch with F5 in-editor so the tracker registers the session.
- **Hand-authored `.tscn` `Transform3D` basis must be exactly orthonormal.** Drift like `(1.00009, 0.99966, 0.99997)` axis lengths can leave the game viewport rendering gray (no scene visible). After hand-authoring a scene, save it once via the editor (or `mcp__godot-mcp__godot_scene save` after a `node.update`) to let Godot normalize the basis and add `unique_id`s.
- **Editor must be running** for any `godot-mcp__*` tool to work. `godot__*` tools are filesystem-only and don't need it.
- **Triggering Godot's FS scan after dropping a new asset.** A fresh `.glb` in `models/` is not picked up by the MCP-connected editor automatically — referencing it via `node.create scene_path=...` fails with `SCENE_NOT_FOUND` until the editor's FS watcher fires. On macOS: `osascript -e 'tell application "Godot" to activate'` from `Bash` wakes the watcher and triggers import in ~1s. Alternatives: reopen the project, or run `EditorInterface.get_resource_filesystem().scan()` from the Script editor (no direct MCP affordance).
- **godot-ai coexists with godot-mcp — verified on macOS (2026-05-30).** Ports are disjoint and were confirmed listening simultaneously: godot-mcp WS **:6550** (editor *is* the single-client server) vs godot-ai HTTP **:8000** + WS **:9500** (godot-ai's Python process is the WS *server*, editor dials out — multi-session by design). The single-client 6550 lock does **not** apply to godot-ai. Residual risk is logical, not transport: two EditorPlugins drive the same `EditorInterface`/active scene → **one writer at a time**.
- **`godot-mcp-clean` does NOT reap godot-ai's server.** It only kills `node ...godot-mcp` processes. godot-ai runs a managed Python/uv server (and possibly `uvx mcp-proxy`); after an unclean exit, find/kill via `lsof -nP -iTCP:8000` / `:9500`. Avoid `editor_manage(op=quit)` to close the editor — teardown can race editor exit (godot-ai issue #401).
- **Adding a server to `.mcp.json` mid-session won't show in `/mcp`.** Claude Code reads `.mcp.json` at startup; the `/mcp` reconnect does **not** enumerate a *newly added* server. Restart with `claude --continue` (resumes the same conversation) so it re-reads `.mcp.json`. Note: a streamable-HTTP MCP endpoint answering **`406`** to a plain `curl` GET is *healthy* (it wants the MCP `Accept` headers), not broken.

## Reading errors when the scene fails to load

`mcp__godot__get_console_output` only sees stdout from a *running* game. If F5 fails or the user reports a parse error / "scene doesn't load", the buffer is just the engine boot banner — the actual cause is in the editor-side error log. Reach for these instead:

- `mcp__godot-mcp__godot_editor get_log_messages source="editor"` — editor-side log with `file` + `line` for parser errors, script load failures, library conflicts, plus engine errors. **Primary tool when the scene won't start.** (`get_errors` and `get_debug_output` were removed in v3.6.1 — this replaces them.)
- `mcp__godot-mcp__godot_editor get_stack_trace` — most recent debugger crash with frames.

These work whether or not anything is running.

**`mcp__godot__get_diagnostics` is not authoritative.** It catches LSP-visible errors in a single file but misses engine-side parse failures that involve cross-script symbol resolution. Example: `_player.is_steering()` where `_player` is typed `CharacterBody3D` and `player.gd` has no `class_name` — `is_steering()` resolves to Variant at engine parse time, breaks `:=` inference, fails to load the script. `get_diagnostics` reports the file clean. **After writing GDScript that touches another script's exports / methods / signals, cross-check `get_log_messages source="editor"` before declaring success.**

Proactively reach for `get_log_messages source="editor"` when the user reports failure — don't wait to be asked.

## Property formats (`node.update properties={...}`)

- Vector3/Vector2: dict `{"x":,"y":,"z":}` / `{"x":,"y":}`
- Color: dict `{"r":,"g":,"b":,"a":}`
- Resource refs (`mesh`, `material_override`, `environment`, ...): plain path string `"res://..."` — auto-loaded
- Enums: integers (Camera3D `projection`: 0=perspective, 1=orthographic)
- `rotation_degrees` as Vector3; default Euler order is YXZ (rotation_order=2)
- **`Rect2`/`region_rect` is NOT serializable through the bridge (as of v3.6.1) — the write silently no-ops** (`Sprite2D.region_rect` ignores string/dict/array forms entirely; the value stays at its default). `Transform2D` origin + `NodePath`, formerly dropped, now write correctly in v3.6.1; `Transform3D`/`Basis` are unverified post-fix — treat with caution. For the remaining `Rect2` gap: hand-edit it into the `.tscn`, then force a close+reopen+save resync before further `node.*` calls — `node.get_properties` reports the stale in-memory copy, and an editor save clobbers the hand-edit. See `godot-gotchas.md` § "godot-mcp silently no-ops `Rect2`/`region_rect` writes".

## Read-only MCP tools (use file Write/Edit instead)

- `resource` (only `get_info`). Create shaders/materials/meshes as `.tres` via `Write`. **Gotcha:** `get_info` on `StandardMaterial3D` (and probably other resources) underreports — it omits texture-channel masks, `emission_energy_multiplier`, `normal_enabled`/`normal_scale`, `metallic_texture`/`roughness_texture` slots, etc. For full introspection, run the scene and dump `mesh.surface_get_material(i)` properties via GDScript `print()`. Treat runtime as authoritative.
- `project` (only `get_info`, `get_settings`, `addon_status`). Edit `project.godot` directly for main_scene, input map, autoloads, plugins.

## Input testing

`mcp__godot-mcp__godot_input` injects **named actions** from the Input Map, not raw keycodes. To support both MCP testing and direct user keypresses, check both `event.is_action_pressed("foo")` AND `event.keycode == KEY_X` in the handler.

## Common `.tres` patterns

```
[gd_resource type="PlaneMesh" format=3]
[resource]
size = Vector2(100, 100)
```

```
[gd_resource type="ShaderMaterial" load_steps=2 format=3]
[ext_resource type="Shader" path="res://shaders/grid.gdshader" id="1"]
[resource]
shader = ExtResource("1")
```

```
[gd_resource type="Environment" load_steps=3 format=3]
[sub_resource type="ProceduralSkyMaterial" id="m"]
[sub_resource type="Sky" id="s"]
sky_material = SubResource("m")
[resource]
background_mode = 2
sky = SubResource("s")
```

## Recommended directory layout

`scenes/` `scripts/` `scripts/shaders/` `materials/` `meshes/` `environments/`

For the Blender → Godot pipeline (where source files live, what crosses, naming discipline): see `asset-pipeline.md`.

## New-project setup checklist

1. `.mcp.json` with all three servers (godot-mcp, minimal-godot, godot-ai). The two npm servers launch from a lockfile-frozen local install in `tools/mcp/` via `node …` (committed `package-lock.json`; `node_modules/` gitignored), **not** `npx -y` — this freezes the transitive dependency tree against supply-chain drift. After a fresh clone, run `npm ci --prefix tools/mcp` before the godot-mcp/minimal tools will load.
2. `addons/godot_mcp/` present; enabled in `[editor_plugins]`
3. `MCPGameBridge` autoload registered
4. This guide copied to `docs/godot-mcp-guide.md`; `CLAUDE.md` references it
5. `docs/blender-mcp-guide.md` copied if the project uses Blender as a DCC source
6. `docs/asset-pipeline.md` copied for Blender → Godot pipeline conventions
7. `godot-gdscript-patterns` skill installed globally; `CLAUDE.md` references it for GDScript context
8. `godot-animation-tree-mastery` skill installed globally; `CLAUDE.md` references it for AnimationTree context
