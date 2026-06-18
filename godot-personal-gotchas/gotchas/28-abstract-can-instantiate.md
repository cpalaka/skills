### 28. `Script.can_instantiate()` is true for an `@abstract` GDScript — use `is_abstract()`

**Symptom**
A test pinning "this base is abstract / not instantiable" via `not script.can_instantiate()` is the exact inverse of intent — it passes against a NON-abstract script and fails against the genuinely-abstract one. No error, no warning.

**Cause**
`Script.can_instantiate()` does NOT consult GDScript `@abstract`-ness (Godot 4.6.2). It returns `true` for an `@abstract class_name X` script because it reports whether the script is **compiled / valid**, not whether `.new()` is *permitted*. Abstractness (the 4.5+ `@abstract` annotation) is enforced at `.new()` time only. The truthful queryable signal is `Script.is_abstract()` (also 4.5+).

**Fix**
`assert_true(script.is_abstract())` for the abstract base; `assert_false(leaf.is_abstract())` for concrete subclasses. Never `not script.can_instantiate()`.

**Detect proactively**
`grep -nE 'can_instantiate\(\)' tests/` — any assertion treating it as a proxy for "is abstract" is inverted.

**Confirmed by**
2026-06-04 — `circle-combat-prototype`, architecture deep-dive #3 (typed locomotion `drive(p)` seam), `tests/test_locomotion_seam.gd`'s `@abstract` pin. The `can_instantiate()` assertion failed against the genuinely-abstract base (`@abstract class_name LocomotionState`, where `can_instantiate() == true`, `is_abstract() == true`); the concrete leaf `grounded.gd` → `is_abstract() == false`. Switched to `is_abstract()` and it went green. First use of `@abstract` in this codebase, Godot 4.6.2. See memory `gotcha-script-abstract-can-instantiate.md`.

2026-06-18 — re-confirmed on **Godot 4.7** (headless probe, `4.7.stable.official`): an `@abstract class_name` script → `can_instantiate() == true`, `is_abstract() == true`; a concrete subclass → `is_abstract() == false`. Identical to 4.6.2 — `is_abstract()` remains the correct signal.
