### 27. Headless `--script` harness exit codes lie — exits 0 on parse failure and mid-run abort

**Symptom**
The headless test harness from #26 — `extends SceneTree` + `_initialize()` calling `_run()` then printing a summary and `quit(1 if _failures > 0 else 0)`, run as `godot --headless --path . --script res://tests/<file>.gd` — exits **0** (green to `$?`/CI) in BOTH failure modes that bypass the assert counters:
- **(a) PARSE failure** (the test file references a const/method not yet defined on a `preload`'d script — the normal TDD RED): Godot prints `SCRIPT ERROR: Parse Error: ...` + `ERROR: Failed to load script "res://tests/..." with error "Parse error".` and exits **0** — `quit(1)` never ran because nothing ran.
- **(b) RUNTIME error inside `_run()`** (nonexistent method on a Variant, wrong arg count, …): aborts ONLY `_run`; the caller `_initialize` continues, prints a truncated-green summary counting only the asserts reached before the abort (`0/0 checks passed, 0 failures`, or worse a real-looking `4/4 checks passed`), and calls `quit(0)`. Exit 0, output looks like a pass.

**Cause**
GDScript runtime errors do NOT propagate up the call stack — the erroring function aborts and returns `null`, and the caller resumes at its next statement. And a `--script` load/parse failure does NOT set a nonzero process exit code. So the harness's quit-code contract holds only when every test line actually executes; any abort that skips `quit(1)` (or runs it after a truncated count) leaves `$?` == 0.

**Fix — never trust the exit code from this harness**
1. **Assert on OUTPUT, not `$?`:** grep for the `N/N checks passed, 0 failures` line AND the ABSENCE of `SCRIPT ERROR`, and **pin the EXPECTED total N** — a truncated green summary has a too-small N, the only tell for mode (b) when the reached asserts all passed.
2. **Wrap every run in a timeout** (macOS has no GNU `timeout`): `perl -e 'alarm 30; exec @ARGV' <godot> --headless --path . --script res://tests/<f>.gd` — an abort in `_initialize` ITSELF (before `quit()`) hangs forever.
3. **As TDD RED evidence, read the `SCRIPT ERROR` lines as the RED signal, NEVER the exit code.**

The structural fix is generalizable: a shared base test that enforces an `EXPECTED_CHECKS` pin (a visible counted check) turns mode (b) + silent truncation into a real counted failure and a genuine nonzero exit, and a runner that derives its verdict from output (never `$?`) per process. Mode (a) stays in-process-undetectable — ad-hoc `--script` runs outside such a runner still need the manual output-reading discipline.

**Detect proactively**
Audit any `--script` test runner — `grep -rn 'quit(' tests/` and inspect where the pass/fail verdict comes from: confirm it reads the printed `N/N checks passed, 0 failures` line (with the EXPECTED total N pinned) AND the ABSENCE of `SCRIPT ERROR`, never `$?`. Any runner that branches on the exit code alone is blind to both failure modes; any run without a `perl -e 'alarm 30; exec @ARGV'`-style timeout can hang forever on an `_initialize`-level abort. Sibling to #13 (a new `class_name` unresolvable headless → a mode-(a) parse failure that also exits 0).

**Confirmed by**
2026-06-04 — `circle-combat-prototype`, architecture-refactor deep-dive #5/#6 RED runs (Godot 4.6.2). Mode (b): a runtime `Nonexistent function` aborted `_run` before any assert and printed `0/0 checks passed, 0 failures`, exit 0; a mid-file abort after 4 passing asserts printed `4/4 checks passed`, exit 0 (most deceptive). Mode (a): `Failed to load script ... Parse error`, exit 0. Structural fix landed in deep-dive #6 (shared base with the `EXPECTED_CHECKS` pin + an output-not-`$?` runner). Full history in the circle-combat repo's `docs/godot-gotchas.md` § "Headless `--script` test-harness exit codes lie". Sibling to #13 (a new `class_name` is unresolvable headless → a mode-(a) parse failure that also exits 0).
