### 43. godot-ai game capture times out (`game_capture_ready` stuck false) when the game runs embedded in the editor Game tab

> **Re-verified on godot-ai 3.1.3 (2026-08-07) — mechanism INTACT, but the literal "20s" is GONE.**
> `debugger/mcp_debugger_plugin.gd:432 is_game_capture_ready()` and its deadline waits (`:785`,
> `:1006`, `:1326`) still exist, and `editor_state` still surfaces `game_capture_ready`
> (`handlers/editor_handler.gd:47`). The wait is now `EVAL_READY_WAIT_SEC`
> (`utils/error_codes.gd:45`) plus a per-call `timeout_sec`, so quote the *symptom* (capture never
> becomes ready), not the number — the error string below will not match verbatim.

**Symptom**
- godot-ai `editor_screenshot source="game"`, `logs_read source="game"`, and every `game_manage` runtime op (`get_scene_tree`, `input_key`, `get_node_info`, …) fail with `INTERNAL_ERROR: Game-side autoload never registered its debugger capture within 20s. … Check Project Settings → Autoload for _mcp_game_helper.`
- This happens **even though** all of these hold: the game IS running (`editor_state.is_playing:true`); the `_mcp_game_helper` autoload IS registered (the `project.godot` `[autoload]` line resolves, `addons/godot_ai/runtime/game_helper.gd` exists); and godot-ai authoring + editor-side reads (`scene_*`/`node_*`/`material_*`/`logs_read source="editor"`) all work perfectly.
- The diagnostic tell: `editor_state.game_capture_ready` stays **false** for the whole run.

**Cause**
The game is running **embedded in the editor's Game tab** (Godot 4.x embedded-game viewport). The embedded viewport never completes the `_mcp_game_helper` debugger-capture handshake, so the capture never arms — and godot-ai's screenshot, game-log, and input-injection paths all depend on it. It is NOT a broken server, NOT a missing/misconfigured autoload, NOT a stale `/mcp` connection (all red herrings: re-running, checking the symlinked helper file, restarting the run, reconnecting `/mcp` — none fix it).

**Fix** (editor-side, not project-side)
Disable embedded-game-on-play so the game runs in a **separate OS window**:
- **Permanent:** Editor Settings (Cmd+,) → search **"embed game"** → set **`Game Embed Mode`** to **`Disabled`**.
- **Per-run:** the running-game view's **top-right** toolbar has a "make floating" / embed-vs-detached toggle that overrides the editor setting — detach for a real OS window.

The instant embed is off, `editor_state.game_capture_ready` goes **true**, `editor_screenshot source="game"` returns frames, and `game_manage input_key` injection works — enabling full automated visual verification (inject a key → screenshot → repeat).

**Detect proactively**
Before relying on any `source="game"` capture / `game_manage` op, check `editor_state.game_capture_ready`. If it is `false` while `is_playing:true`, suspect embedded-game mode FIRST — don't chase the autoload or the server. When capture is down you **cannot** visually verify a running scene: treat the scene as UNVERIFIED, and never substitute `is_playing:true` for "the scene works" (`is_playing` only means the SceneTree loaded — see the compile/preload-smoke gotcha #44 and preference #6). Sibling to #01 (same embedded-≠-real-OS-window root cause, but #01 is the `window_set_mode`/`get_window().mode` no-op symptom; this is the godot-ai capture-handshake symptom) and to #41/#42 (the cursor-aimed-verification capture/runtime-state workflow).

**Confirmed by**
2026-06-23, `space-miner-prototype` (godot-ai v2.7.6 / Godot 4.7). `source="game"` screenshot + `logs_read source="game"` + `game_manage` all timed out with `game_capture_ready:false` while the game ran embedded; disabling embed (separate window) armed capture immediately and restored screenshot + key-injection.
