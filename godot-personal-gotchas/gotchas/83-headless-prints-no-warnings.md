### 83. Headless prints NO GDScript warnings — so a `grep -i warning` on its output proves nothing

**Symptom**
- A file containing both an unused variable and a bare integer division produces **no warning output at all** under `godot --headless --path . --script res://…` **or** `godot --headless --path . --check-only --quit`.
- A verify gate whose wording is "a run that exits 0 with new warnings is not a pass" therefore cannot be satisfied headlessly: `grep -ic warning` on the suite output returns **0 for known-bad code**, exactly as it does for clean code.
- Nothing errors. The check reports clean over a scope it never inspected.

**Cause**
The headless runtime has no warning sink — GDScript's `gdscript/warnings/*` diagnostics are surfaced by the **editor** (and the LSP), not printed by a headless parse or script run. Only warnings promoted to errors by `treat_warnings_as_errors` appear, and then as errors, not warnings.

**Fix**
- Do not cite a headless grep as warning-cleanliness evidence — it is an empty-scope check, which is worse than no check because it reads as a pass.
- Get warnings from the editor: godot-ai `logs_read source="editor"` with the project open (or godot-mcp `get_log_messages severity="warning"` on 4.1.0 — its `source` arg is a phantom, #104), or `minimal-godot get_diagnostics`.
- Or satisfy the intent **structurally** instead of by grep: adopt an annotation convention (e.g. `@warning_ignore("integer_division")` on every intentional integer division) and check the convention. When unsure whether a construct warns, just add the annotation — cheaper than the verification.

**Detect proactively**
Any script, CI step, or handoff sentence that derives "no new warnings" from headless output. Related instrument failure to watch for in the same family: this skill's own `precommit-scan.sh` prints `VERDICT: CLEAN — 21 checks, 21 skipped (no matching files in scope)` when nothing is staged — **read the scope/skip line, not the verdict line**. Both are the same defect class: a clean reading over an inert scope.

Sibling to #86 (`--check-only` without `--script` parses nothing) and #27 (headless exit codes lie) — three different ways the headless harness reports success it never measured.

**Confirmed by**
2026-07-25, `space-miner-game`, Godot 4.7 — calibrated against known-bad: a script with an unused variable AND a bare integer division emitted zero warning lines under both `--script` and `--check-only --quit`. Filed from project memory `godot-headless-hides-warnings` via `/audit-godot-parity` 2026-07-27.
