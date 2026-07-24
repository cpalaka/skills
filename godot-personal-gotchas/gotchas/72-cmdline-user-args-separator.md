# 72 — Custom CLI flags silently swallowed without the `--` user-args separator

## Symptom

Custom flags passed to a `godot` run — `--set NAME=VALUE`, `--look-bench`, any project-defined
flag — do nothing. `OS.get_cmdline_user_args()` returns `[]`, the run boots and behaves exactly
as if the flags were never given, and there is **no warning of any kind**. Every downstream
check of the form "run with the flag, grep the log for the effect" reads vacuously clean —
including a bug repro that "fails to reproduce" and a fix that "verifies" against a run where
the trigger never fired.

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

space-miner-game 2026-07-23 (task-123): both the orchestrator's spec repro command and the
delegate's lab runs omitted the separator, so `--set` overrides never fired — producing a
vacuous "zero errors pre-fix" that mislabeled a reproducible defect as render-only-unobservable.
Prior art that had it right: `docs/lab-tuning-surfaces.md` golden-shot invocations.
