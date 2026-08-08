# 72 — The `--` user-args separator: custom flags swallowed BEFORE it, engine flags discarded AFTER it

## Symptom

**Two directions, opposite sides of the same separator. Both silent.**

**(a) Custom flag placed BEFORE `--` → the game never sees it.** Project-defined flags —
`--set NAME=VALUE`, `--look-bench`, `--layers=` — do nothing. `OS.get_cmdline_user_args()`
returns `[]`, the run boots and behaves exactly as if the flags were never given, and there is
**no warning of any kind**. Every downstream check of the form "run with the flag, grep the log
for the effect" reads vacuously clean — including a bug repro that "fails to reproduce" and a fix
that "verifies" against a run where the trigger never fired.

**(b) ENGINE flag placed AFTER `--` → the engine never sees it, and this one produces a FALSE
PASS.** `--quit-after`, `--headless`, `--check-only` past the separator are handed to the
application, which does not recognise them and silently ignores them:

```sh
# WRONG — --quit-after lands in user args and is discarded; the run is NEVER bounded
godot --headless --path . res://lab.tscn -- --layers=scatter --quit-after 240
# RIGHT — engine flags to the LEFT of the separator
godot --headless --path . --quit-after 240 res://lab.tscn -- --layers=scatter
```

A bounded-boot gate written the wrong way "passes" a run that was never bounded — it either
reports a clean run that never happened, or dies to an external alarm with `raw_exit=142` while
the log looks identical to a healthy one. Two measurements make the naive verdict worthless:
`raw_exit` is **0 even with a planted parse error** (2026-07-28: a deliberate syntax error gave 2
`SCRIPT ERROR` + 1 `Failed to load script` and still exited 0 — never put `$?` in the verdict,
#27), and **a clean boot prints almost nothing**, so "3 lines and no errors" is indistinguishable
from "the scene never loaded". Before trusting a clean bounded-boot reading, plant a parse error
in a file that run actually mounts and confirm the log reds (measured: 3 lines → 32 lines);
calibrating in a file the run does not mount proves nothing.

## Cause

Godot splits ENGINE args from USER args at a `--` (or `++`) separator on the command line.
`OS.get_cmdline_user_args()` returns only what comes **after** the separator. Anything before it
that the engine itself doesn't recognize is silently discarded — not passed through, not warned
about.

```sh
godot --path . scene.tscn --set X=1        # --set silently swallowed, user_args = []
godot --path . scene.tscn -- --set X=1     # user_args = ["--set", "X=1"]  ✅
```

Engine args (`--quit-after`, `--headless`, `--path`) must stay BEFORE the separator.

## Fix

Always place project-consumed flags after `--` (or `++`). When scripting a run, put engine
options first, then the separator, then the user flags:

```sh
"$GODOT" --path . --quit-after 240 res://scene.tscn -- --set NAME=VALUE --my-flag
```

## Detect proactively

- Any scripted `godot` invocation carrying a flag the ENGINE doesn't define, with no `--`/`++`
  earlier in the argv → the flag is dead. Grep harness scripts/specs for `tscn --[a-z]` patterns
  lacking a preceding ` -- `.
- A "repro command" that produces zero occurrences of the expected effect should be
  suspected of this FIRST — prove the flag landed (print `OS.get_cmdline_user_args()` or check a
  flag side effect) before concluding "does not reproduce".

## Confirmed by

Direction (a) — space-miner-game 2026-07-23 (task-123): both the orchestrator's spec repro command
and the delegate's lab runs omitted the separator, so `--set` overrides never fired — producing a
vacuous "zero errors pre-fix" that mislabeled a reproducible defect as render-only-unobservable.
Prior art that had it right: `docs/lab-tuning-surfaces.md` golden-shot invocations.

Direction (b) — space-miner-game 2026-07-28 (task-155): the orchestrator's own execution spec
carried `--quit-after` to the right of the separator, so the bounded lab boot bounded nothing. The
implementer caught it, and the main-loop re-verification then had to calibrate the probe against a
planted parse error before the clean reading could be believed. `grep -rn "quit-after"
src/core/dev/lab/` returned NOTHING — i.e. the application never parsed it either, which is what
makes the discard total and silent. Promoted here 2026-08-02: direction (b) had been sitting in
that project's `docs/godot-gotchas.md` as P12 while this entry mentioned it only as a single line
inside *Cause*, so the symptom-first index row could never match someone whose `--quit-after` had
silently done nothing.
