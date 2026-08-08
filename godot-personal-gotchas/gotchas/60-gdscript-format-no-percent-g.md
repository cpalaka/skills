### 60. GDScript's `%` operator has no `%g` conversion — runtime "unsupported format character", invisible to parse checks

**Symptom**
- A format string using `%g` (C-style shortest-float form) — e.g. `"%s=%.4g" % [name, value]` — throws at RUNTIME: `unsupported format character` (once per execution of the line, e.g. every frame in a HUD updater).
- `--check-only`, the headless test suite, and a preload-smoke `load()` are ALL blind to it: the format string is data, not syntax — the error only fires when the `%` line actually executes.

**Cause**
GDScript's `String % args` supports only `s c d o x X f v` (plus flags/width/precision). `%g`/`%e`/`%G` from C/Python printf don't exist. Training-data drift assumes the full printf set.

**Fix**
- Shortest-form float → `%s` (GDScript's `str(float)` already prints compact forms: `2.5`, not `2.500000`).
- Fixed precision → `%.Nf`.
- Scientific → `String.num_scientific(x)`.

**Detect proactively**
Grep any diff that formats floats: `grep -nE '%[-+ 0-9.]*[geG]' *.gd` — any hit is a latent runtime throw. The class-level lesson: format strings are only verified by EXECUTING the line — a timed boot-smoke of the scene (`--headless --quit-after N`) is the cheapest net for HUD/debug-overlay code that tests never drive.

**Confirmed by**
2026-07-11 — `space-miner-game` GD-02b (task-101) movement-lab HUD. `"%s=%.4g"` threw every frame in the lab boot-smoke; parse check and the 18-file suite were green throughout. Fixed to `%s`.

**Also `%e` (absorbed from #98, 2026-08-08).** Same fact, same failure — `%.2e` and `%g` both throw.
Two tells worth recognising: the string **prints its own format specifier literally** (`"off by %.2e"`
comes out as `off by %.2e`), and the engine error names its source location:

```
ERROR: String formatting error: unsupported format character.
   at: validated_evaluate (core/variant/variant_op.h:770)
```

`"v=%.6f" % [0.001]` is fine, so a nearby working format line is not evidence the file is clean.
*Also confirmed by* 2026-08-02, `space-miner-game` task-167.
