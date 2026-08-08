# 96 — `preload` is not a parse gate: a broken script one hop down stays green

## Symptom

A headless test (or any script) `preload`s a script/scene chain as a deliberate "parse
gate" for files outside the preload-smoke sweep — and stays GREEN with a syntax error
planted in a dependency. The parse errors DO print, but on stderr, which a runner that
echoes per-file output only on failure never surfaces. Measured 2026-07-31 (Godot
4.7-stable, space-miner-game), planting `syntax error here` at line 1 of a dependency:

| Form | Broken dependency | Result |
|---|---|---|
| `const A := preload("scene.tscn")` (scene whose script is broken) | script | **GREEN** — scene loads with a broken script ref |
| `const A := preload("a.gd")` where a.gd preloads broken b.gd | transitive script | **GREEN** — a.gd still loads as a resource |
| `const A := preload("broken.gd")` (direct, `:=` inferred) | direct | reds — but only via type inference ("Cannot infer the type"), a side effect, not a gate |

## Cause

A GDScript with parse errors still **loads as a resource** — `load`/`preload` return a
GDScript object (compile errors attached, printed to stderr) rather than failing. The
failure does not cascade to the preloading file, so the parent compiles and runs. The
direct-`:=` form reds only because type inference happens to need the broken script's
type — one hop of indirection (a scene wrapper, an intermediate script) and the gate is
a rubber stamp.

## Fix

Assert the property you actually mean — compiled-ness — at runtime:

```gdscript
const VoxelMesher := preload("res://.../voxel_mesher.gd")

func _parse_gate() -> void:
    # Typed as Script: on the bare const the analyzer dispatches against the CLASS and
    # refuses can_instantiate() as a non-static call.
    var mesher: Script = VoxelMesher
    _assert(mesher.can_instantiate(), "voxel_mesher.gd parses")
```

`can_instantiate()` reports **COMPILED, not instantiable** (#28) — inverted for an
is-abstract assertion, but exactly right for a parse gate. One gate line per file you
want covered; transitive coverage through a dependency's own preloads is NOT reliable.

## Detect proactively

Not greppable (the pattern is an *intent* — a preload believed to be a gate). Discipline
instead: any "this line guards against parse errors" claim gets the known-bad
calibration — plant a syntax error in the guarded file, confirm the suite REDS, restore.
Both wrong forms above were green on first calibration; that is the only way this was
caught.

## Extension — the same rubber stamp inside a *null-checking* sweep (2026-08-02)

The rows above cover `preload` used as a gate. The identical failure reaches any sweep that
walks a tree and null-checks `load()`, which is the shape a project-wide "everything parses"
test naturally takes:

```gdscript
for path in scripts:
    if load(path) == null:          # NEVER fires on a parse error
        script_failures += 1
```

MEASURED (space-miner-game 2026-08-02, task-165): with `func broken( -> void:` planted in a
file under `res://src`, `tests/test_preload_smoke.gd` — the project's *designated* project-wide
parse coverage, named as such in its `CLAUDE.md` typecheck knob — reported **"all 78 src
scripts load/compile clean", 4/4 checks passed, 0 failures**, while the engine printed `Failed
to load script … Parse error` to stderr. The file redded only because `run_tests.sh` scans
output for `SCRIPT ERROR`. Run that test through any other harness and a broken tree certifies
clean.

Fix is the same predicate, applied per file:

```gdscript
var script: Script = load(path) as Script
if script == null or not script.can_instantiate():   # can_instantiate == COMPILED (#28)
    script_failures += 1
```

Calibrated both directions after the change: planted defect → the assert fails and names the
file; clean tree → green.

**The general lesson, wider than parse gates:** when a verdict is produced by BOTH an assert
and a harness-level output scan, the output scan can be carrying the whole thing while the
assert reads as the instrument. Calibrate the assert *in isolation from the harness* before
citing it as coverage.

## Confirmed by

space-miner-game 2026-08-02 (task-165, branch feat/task-165): the null-checking sweep extension
above — planted parse error, whole suite's parse gate green, fixed and re-calibrated.

space-miner-game 2026-07-31, task-161.03 P1 verification (branch
feat/task-161.03-voxel-playground, tests/test_voxel_grid.gd `_parse_gate()`): scene-form
and transitive-script-form both green over a planted syntax error; typed-var
`can_instantiate()` gate reds correctly in both directions.
