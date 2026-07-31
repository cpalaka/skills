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

## Confirmed by

space-miner-game 2026-07-31, task-161.03 P1 verification (branch
feat/task-161.03-voxel-playground, tests/test_voxel_grid.gd `_parse_gate()`): scene-form
and transitive-script-form both green over a planted syntax error; typed-var
`can_instantiate()` gate reds correctly in both directions.
