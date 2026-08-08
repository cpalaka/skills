# 98 — Godot's String `%` has no `%e`/`%g`: an unsupported specifier fails at RUNTIME

## Symptom

A formatted string prints its own format specifier literally instead of a value, and the
output carries:

```
ERROR: String formatting error: unsupported format character.
   at: validated_evaluate (core/variant/variant_op.h:770)
```

Measured 2026-08-02 (Godot 4.7-stable, space-miner-game task-167), with a tiny delta that
`%f` would render as `0.000000`:

```gdscript
"off by %.2e" % [1.4e-8]     # -> "off by %.2e"   + the ERROR above
"v=%.6f"      % [0.001]      # -> "v=0.001000"    (fine)
"a=%s" % ["X"] + " b=%s" % ["Y"]   # -> "a=X b=Y"  (precedence is NORMAL — see below)
```

Two things make this bite harder than an ordinary typo:

1. **It is a RUNTIME failure, not a parse error — but only sometimes, and the rule is not
   the one you would guess.** Whether you get a loud parse error or a silent runtime one
   depends on whether the WHOLE expression is constant-foldable, **not** on whether the
   format string is a literal:

   | Expression | Caught when |
   |---|---|
   | `"x %e" % 1.0` — constant string, constant operand | **PARSE** — `SCRIPT ERROR: Parse Error: unsupported format character in operator %`, plus `Failed to load script` |
   | `"x %e" % [some_var]` — constant string, NON-constant operand | **RUNTIME** — the folder cannot evaluate it, so the check defers |
   | `var f := "x %" + "e"; f % 1.0` — string built at runtime | **RUNTIME** |

   So a literal `%.2e` in the format string buys you nothing if the arguments are
   variables, which is the normal case for a diagnostic message. `--check-only`, the LSP
   and the preload-smoke sweep all pass on rows 2 and 3.
2. **The expression still returns a String** — the unsubstituted template — so nothing
   downstream breaks and no assertion changes verdict. A test whose *message* is broken
   still passes, and on a runner that echoes per-file output only on FAILURE (the common
   shape) the error is invisible until something else reds. In the measured case a parity
   test printed a broken message through several green runs and was only caught by the
   deliberate known-bad calibration run.

## Cause

Godot's `String.%` operator implements its own printf-like subset. It supports
`%s %c %d %o %x %X %f %v %%` plus width/precision/`+`/`-` modifiers. **It does not
implement `%e` or `%g`** (scientific notation), nor `%i`, `%u`, `%p`. C's `printf` does,
which is exactly why the specifier looks right to anyone writing it.

**Not the cause, though it looks like one:** operator precedence. `%` binds at normal
multiplicative precedence, *tighter* than `+`, so `a % arr1 + b % arr2` parses as
`(a % arr1) + (b % arr2)` — verified above. The reason a concatenated message shows its
first half substituted and its second half raw is simply that the *second* format call is
the one carrying the bad specifier. Do not "fix" a working concatenation while chasing
this.

## Fix

Use `%s` and let Godot's float→String conversion pick the representation — it already
renders small magnitudes in exponent form (`1e-08`):

```gdscript
"off by %s" % [delta]          # -> "off by 1.4e-08"
```

Or force a fixed-point precision wide enough for the magnitude you expect:

```gdscript
"off by %.9f" % [delta]        # -> "off by 0.000000014"
```

## Detect proactively

- **`precommit-scan.sh` ALREADY CATCHES THIS — as `check 60`, at ERROR severity. Do not
  add another check; run the existing one EARLIER.** Verified 2026-08-02 by staging the
  exact historical line and running the real script:
  `ERROR …:3 -> #60 GDScript String % has no %g/%e — runtime throw on every execution`.
  The 2026-08-02 re-discovery cost a debugging cycle purely because the scan was run at
  commit time, by which point the line had already been found and fixed the hard way. Run
  `precommit-scan.sh --worktree` as soon as you have written the GDScript.
- **Read a passing test's captured output at least once.** This class of defect is
  invisible in a green summary line by construction. Runners that write a per-file `.out`
  file regardless of verdict (space-miner's `run_tests.sh` does, to `/tmp`) make this
  cheap: `cat` it after a green run rather than trusting the PASS row. Sibling of #96 —
  both are "the gate ran and told you nothing".

## Confirmed by

space-miner-game 2026-08-02 (task-167, `tests/test_onecam_lighting_parity.gd`), Godot
4.7-stable. The `%.2e` was written to print a direction-vector delta of ~1e-8; the message
printed `off by %.2e` for several green runs before the SunFill known-bad calibration made
the file fail and echoed its output.

**Filed late, and the reason is worth more than the entry.** The fact was measured earlier
— space-miner-game 2026-07-28, task-148 — and written into that project's
`docs/godot-gotchas.md`, labelled *"Universal Godot, not project-local"* and then never
promoted here. It was re-discovered from scratch four days later.

But the promotion gap is **not** what cost the time, and the first write-up of this entry
got that wrong. `precommit-scan.sh check 60` already detected it, at ERROR severity, and
was confirmed to fire on the exact historical line. **Two independent mechanisms were in
place and neither was consulted until after the defect had been found the hard way** — the
project doc was never searched, and the scan is named "pre-commit" everywhere, so it ran at
commit time. A detector that exists and fires correctly buys nothing if the convention
around it schedules it after the work. That is why SKILL.md now says to run `--worktree`
early, and why this section leads with "the check already exists".

The 2026-08-02 pass did add genuinely new content: the constant-foldability table above,
which the original entry did not have.
