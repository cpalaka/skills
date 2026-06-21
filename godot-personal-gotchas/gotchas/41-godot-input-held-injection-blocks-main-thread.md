### 41. A held `godot_input` injection blocks the editor main thread — a same-batch `source="game"` screenshot lands AFTER the hold, not during it

**Symptom**
You inject a held action with `godot_input` (`sequence`, long `duration_ms`) to exercise a press-and-hold mechanic, and in the SAME tool batch you fire a `source="game"` editor screenshot to capture the during-hold visual. The screenshot comes back showing the AFTER-state — the action already released, the transient effect (cone outline, beam, charge VFX) gone, the relevant `_active`-style flag back to `false`. Nothing you wanted to see is drawn. No error; the screenshot "succeeded," just at the wrong moment.

**Cause**
The injection holds the editor main thread for the full `duration_ms`. Any tool call issued in the same batch — including the screenshot — is serviced only AFTER the hold completes and the action releases, so it captures the post-release frame, never a mid-hold one.

**Fix**
Don't try to capture the during-hold visual this way. Accept the after-state screenshot plus a numeric `godot_runtime_state digest` delta (a group-count change, a position/velocity readout) as proof the mechanic fired, and leave the live transient visual (the cone/beam/VFX itself) to a human F5. If you genuinely need a mid-hold frame, drive the held state from a script and screenshot separately rather than relying on a same-batch injection.

**Detect proactively**
Any headless verification of a press-and-hold mechanic via `godot_input` that pairs a held injection with a same-batch `editor_screenshot` / `source="game"` capture and "sees nothing." It is not a broken mechanic — it is the capture timing. Pair with the `godot_runtime_state digest` numeric read (sibling #42) for the actual proof. Part of the "verify a cursor-aimed mechanic without cursor control" workflow in `docs/godot-mcp-guide.md`.

**Confirmed by**
Surfaced verifying a held-action mechanic headlessly (the cursor-aimed-verification workflow): a `source="game"` screenshot issued in the same batch as the held `godot_input` injection consistently showed the released/after state. Body source: project `docs/godot-mcp-guide.md`.
