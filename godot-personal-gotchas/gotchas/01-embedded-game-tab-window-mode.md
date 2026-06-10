### 1. Embedded game tab blocks window mode changes

**Symptom**
- Call `DisplayServer.window_set_mode(WINDOW_MODE_FULLSCREEN)` or `get_window().mode = Window.MODE_FULLSCREEN` from a `_unhandled_input` (or anywhere else).
- Read the mode back immediately — it's still `0` (WINDOWED).
- Same result for `MAXIMIZED`, so it's not a macOS-fullscreen-animation quirk.
- No errors, no warnings, no return value to check.
- Handler is firing correctly (verify with a print) — just the mode setter that's a no-op.

**Cause**
Godot 4.6 embeds the running game inside the editor's Game tab by default. Embedded views are not real OS windows, so window-mode setters silently do nothing.

**Fix (editor-side, not project-side)**
- **Permanent:** `Editor Settings` (Cmd+,) → search "embed game" → uncheck `Run / Window Placement / Embed Game on Next Play` (exact label varies by 4.6.x patch).
- **Per-run:** while the game is running, click the **"Make Floating"** button on the Game tab's toolbar to detach it.

**Confirmed by**
First hit during the `3d-prototype-1` window-config bootstrap on 2026-05-23. F11/O toggle script fired but the window stayed windowed until the Game tab was detached. Applies to F5 launches and `godot-mcp editor run` equally — it's an editor preference, not an MCP issue.
