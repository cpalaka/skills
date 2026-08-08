### 41. A held `godot_input` injection blocks the editor main thread — a same-batch `source="game"` screenshot lands AFTER the hold, not during it

**Symptom**
You inject a held action with `godot_input` (`sequence`, long `duration_ms`) to exercise a press-and-hold mechanic, and in the SAME tool batch you fire a `source="game"` editor screenshot to capture the during-hold visual. The screenshot comes back showing the AFTER-state — the action already released, the transient effect (cone outline, beam, charge VFX) gone, the relevant `_active`-style flag back to `false`. Nothing you wanted to see is drawn. No error; the screenshot "succeeded," just at the wrong moment.

**Cause**
The injection holds the editor main thread for the full `duration_ms`. Any tool call issued in the same batch — including the screenshot — is serviced only AFTER the hold completes and the action releases, so it captures the post-release frame, never a mid-hold one.

**Fix**

> **ROUTE SUPERSEDED for godot-ai ≥ 3.1.3 — the *claim* still holds for godot-mcp's
> `godot_input`, but there is now a route that does not block the editor at all.**
> godot-ai `game_manage op="input_sequence"` runs the whole timeline **game-side**, frame-stepped
> inside the running game's loop (`runtime/game_helper.gd:821-834`) with a deferred reply — the
> editor main thread is never held for the duration, and the reply's `actions_pressed_at_end`
> reports exactly what is still down. So the "same-batch call is serviced only after the hold"
> constraint does not apply on that route. **The mid-hold capture is still unavailable** (the
> reply lands after the last step), so the guidance below stands for the *screenshot*; it no
> longer stands as a reason to avoid held injection generally. See #45's sibling note and the
> project MCP guide's input row.

Don't try to capture the during-hold visual this way. Accept the after-state screenshot plus a numeric `godot_runtime_state digest` delta (a group-count change, a position/velocity readout) as proof the mechanic fired, and leave the live transient visual (the cone/beam/VFX itself) to a human F5. If you genuinely need a mid-hold frame, drive the held state from a script and screenshot separately rather than relying on a same-batch injection.

**Detect proactively**
Any headless verification of a press-and-hold mechanic via `godot_input` that pairs a held injection with a same-batch `editor_screenshot` / `source="game"` capture and "sees nothing." It is not a broken mechanic — it is the capture timing. Pair with the `godot_runtime_state digest` numeric read (sibling #42) for the actual proof. Part of the "verify a cursor-aimed mechanic without cursor control" workflow in `docs/godot-mcp-guide.md`.

**Confirmed by**
Surfaced verifying a held-action mechanic headlessly (the cursor-aimed-verification workflow): a `source="game"` screenshot issued in the same batch as the held `godot_input` injection consistently showed the released/after state. Body source: project `docs/godot-mcp-guide.md`.
