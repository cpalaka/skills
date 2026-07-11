### 1. Embedded game tab blocks window mode changes

**Symptom**
- Call `DisplayServer.window_set_mode(WINDOW_MODE_FULLSCREEN)` or `get_window().mode = Window.MODE_FULLSCREEN` from a `_unhandled_input` (or anywhere else).
- Read the mode back immediately — it's still `0` (WINDOWED).
- Same result for `MAXIMIZED`, so it's not a macOS-fullscreen-animation quirk.
- No errors, no warnings, no return value to check.
- Handler is firing correctly (verify with a print) — just the mode setter that's a no-op.

**Cause**
Godot 4.6 embeds the running game inside the editor's Game tab **by default**; embedded views are not real OS windows, so window-mode setters silently do nothing **while embedded**. (Godot 4.7 reworked the embed control and its default — see Fix + the 2026-06-18 note; the no-op only bites when the game is actually embedded.)

**Fix (editor-side, not project-side)**
- **Permanent (Godot 4.7):** `Editor Settings` (Cmd+,) → search **"embed game"** → set **`Game Embed Mode`** to **`Disabled`**. It's now an enum (default **`User Per-Project Configuration`**, i.e. it defers to a per-project setting), not the old boolean. *(Godot 4.6.x: it was a checkbox `Run / Window Placement / Embed Game on Next Play` — uncheck it; exact label varied by patch.)*
- **Per-run:** the running-game view's **top-right** toolbar has controls to embed vs. **make floating** on the next run (these override the editor setting) — detach for a real OS window.

**Detect proactively**
Grep changed `.gd` for window-mode writes:

```bash
grep -nE 'window_set_mode|get_window\(\)\.mode\s*=' **/*.gd
```

If any are present, confirm the run target is a detached OS window (Editor Settings → `Game Embed Mode` = `Disabled`, or the running view's per-run **make floating** toggle) rather than the embedded Game tab before trusting the change. At runtime, read the mode back immediately after setting it and assert it changed — a silent no-op with the handler provably firing (verify with a `print`) is this gotcha.

**Confirmed by**
First hit during the `3d-prototype-1` window-config bootstrap on 2026-05-23. F11/O toggle script fired but the window stayed windowed until the Game tab was detached. Applies to F5 launches and `godot-mcp editor run` equally — it's an editor preference, not an MCP issue.

2026-06-18 — Godot 4.7 UI rework confirmed (live, `maw-prototype` on `4.7.stable.official`): the editor setting is now **`Game Embed Mode`** (enum; default **`User Per-Project Configuration`**), replacing the 4.6 boolean checkbox, plus **top-right per-run toggles** for embed-vs-floating that override it. With it set to `Disabled` the game runs as a separate OS window (so `window_set_mode` should work). NOT re-tested on 4.7: whether the setter still no-ops *while actually embedded* — the mechanism (embedded view ≠ real OS window) almost certainly still holds, but it wasn't reproduced this pass.
