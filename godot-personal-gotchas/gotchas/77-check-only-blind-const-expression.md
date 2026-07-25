# 77 — `--check-only` is BLIND to a non-constant `const` initializer

## Symptom

`godot --headless --path . --check-only --quit` — the whole-project parse gate — exits clean with
**zero output** for a script containing a `const` whose initializer is not a constant expression,
e.g.:

```gdscript
const OWNER_DEPTHS := PackedFloat32Array([0.9, 0.75, 0.55, 0.3])
```

The typecheck reports nothing. The script then fails at **load** time, and the failure cascades:

```
SCRIPT ERROR: Parse Error: Assigned value for constant "OWNER_DEPTHS" isn't a constant expression.
SCRIPT ERROR: Compile Error: Failed to compile depended scripts.
ERROR: Failed to load script "res://tests/test_body_mesh_3d.gd" with error "Compilation failed".
```

So a "clean typecheck" is followed by every consumer of that script dying — the test file, the
scene, the preloader. Because the consumer is what visibly explodes, the error reads as a problem
in the consumer rather than in the `const` line that actually caused it.

Crucially this is **not** the "unvisited file" case: it reproduces when the offending script IS
referenced by another script in the project (verified below), so "check-only only sees reachable
scripts" does not explain it.

## Cause

`--check-only` runs the *parser* pass, not the full compile/constant-folding pass. Whether an
initializer qualifies as a constant expression is decided during constant folding, which
`--check-only` never reaches — so the diagnostic simply isn't produced. Only an actual
`GDScript::reload()` (a real load: running the script, loading a scene that references it,
importing) evaluates it.

The trap is that `Packed*Array(...)` *looks* like a literal. GDScript accepts `Array` and
`Dictionary` **literals** as constants (`const A := [1, 2]` is fine), but a `PackedFloat32Array(…)`
/ `PackedVector3Array(…)` / `PackedInt32Array(…)` is a *constructor call*, and a call is never a
constant expression. Same for `Vector3(...).normalized()`, `sqrt(2.0)`, and any other call.

## Fix

Use a plain Array literal for the constant and convert at the use site (or at first use into a
cached local/`static var`):

```gdscript
const OWNER_DEPTHS := [0.9, 0.75, 0.55, 0.3]   # constant-expression-safe
```

Pre-computed scalars are fine as literals (`const PHI := 1.618033988749895`, not
`const PHI := (1.0 + sqrt(5.0)) / 2.0`).

**Do not trust `--check-only` alone as the parse gate for new scripts.** Follow it with something
that actually LOADS the code — the headless test suite, a `--script` run, or an editor filesystem
scan. In a project whose verify gate is typecheck → test, the test step is what catches this; if a
new module has no test yet, load it deliberately once before committing.

## Detect proactively

Grep new/changed scripts for a `const` assigned anything that is a **call**:

```sh
git diff -U0 | grep -nE '^\+\s*const\s+\w+\s*:?=\s*\w+\('
```

Any hit that is not an `Array`/`Dictionary` literal (`[...]` / `{...}`) is a candidate —
`Packed*Array(`, `Vector2(`/`Vector3(` chained with a method, `sqrt(`, `pow(`. Highest-risk moment
is authoring a brand-new pure module whose first consumer (its test) is written afterwards: the
typecheck between the two steps reads green and buys false confidence.

Siblings: #35 (`--check-only --script` blind to autoloads), #44 (parse error that only fires at
load), #21/#74 (headless blindness on the render side), #60 (`%g` — invalid only at runtime). The
family rule: **`--check-only` green is a weaker claim than it looks.**

## Confirmed by

space-miner-game (2026-07-24, Godot 4.7.stable) — task-128 WS2 phase B. A new pure-geometry module
carried `const OWNER_DEPTHS := PackedFloat32Array([...])`; project-wide `--check-only --quit`
printed nothing, then `tests/run_tests.sh` died with the Parse Error above plus a
`Failed to compile depended scripts` cascade into the test file. Re-probed deliberately afterwards
by reintroducing the bad const into the same (now test-referenced) module: `--check-only` silent
again, actual load reported it — confirming the blindness is the parser/folding split, not
reachability.
