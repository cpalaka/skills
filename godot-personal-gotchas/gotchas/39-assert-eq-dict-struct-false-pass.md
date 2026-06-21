### 39. `assert_eq(<Dictionary>, <struct Variant>)` silently false-passes — an un-coerced dict reads as "equal" to a struct

**Symptom**
A GDScript test like `assert_eq(some_dict, Vector2i(3, 4))` (or `Rect2` / `Vector4` / `Transform2D` / any struct Variant) **PASSES even when `some_dict` is a raw, un-coerced `Dictionary`** that was never converted to the struct — a false green. The test reads as if it verifies coercion/conversion, but it verifies nothing: it stays green whether or not the conversion happened. Seen live as obvious-style `assert_eq(_coerce_value(...), <struct>)` artifact tests that false-passed in the TDD **RED** phase, before any coercion code existed.

**Cause**
GDScript's `==` / `!=` between a `Dictionary` and an incompatible struct type emits a **NON-FATAL** runtime error and evaluates the expression to **`false`** — it does not equate them, it can't compare them and defaults to false:

```
SCRIPT ERROR: Invalid operands 'Dictionary' and 'Vector2i' in operator '!='
SCRIPT ERROR: Invalid operands 'Dictionary' and 'Rect2' in operator '!='
SCRIPT ERROR: Invalid operands 'Dictionary' and 'Transform2D' in operator '!='
```

A typical `assert_eq` helper is `if actual != expected: <record failure>`. So `dict != struct` → `false` → **no failure recorded → the assertion "passes."** The strict checks work: `assert_true(result is Vector2i)` correctly **FAILS** on the same un-coerced dict, and `value as Transform3D` on a dict raises `Invalid cast: could not convert value to 'Transform3D'`. `is`/`as` reject the dict; `==`/`!=` silently swallow it.

**Fix**
Assert the **TYPE strictly BEFORE** comparing the value — the `is <Type>` check catches the raw dict (RED), and once both operands are the same struct type, `assert_eq` is a valid same-type comparison:

```gdscript
var result: Variant = some_coercer(...)
assert_true(result is Vector2i, "should coerce to Vector2i")  # catches an un-coerced dict (RED)
assert_eq(result, Vector2i(3, 4))                             # reliable once both sides are Vector2i
```

This is the concrete reason behind the godot-ai `AGENTS.md` rule "assert on the stored Variant, not on counts … assert `value is Color` / `value is Vector3`."

**Detect proactively**
Grep tests for struct comparisons that skip the type guard: `grep -nE 'assert_eq\([^,]+,[ ]*(Vector[234]i?|Rect2i?|AABB|Plane|Basis|Quaternion|Transform[23]D|Projection|Color)\(' tests/`. Any `assert_eq(x, <struct>(…))` where `x` might be a Dictionary (a coercer/parser/deserializer output) needs an `assert_true(x is <Type>)` line first. Watch the test log for `Invalid operands 'Dictionary' and '<Struct>' in operator '!='` — it is emitted from inside an assertion that nonetheless reported a pass. Applies to any GDScript test comparing a Dictionary (or other non-struct Variant) to a struct (`Vector2/2i/3/3i/4/4i`, `Rect2/2i`, `AABB`, `Plane`, `Basis`, `Quaternion`, `Transform2D/3D`, `Projection`, `Color`) with `assert_eq` / `==` / `!=` — not specific to godot-ai. Sibling to #28 (`can_instantiate()`-vs-`is_abstract()` — both are silently-inverted/false-passing test assertions where a strict check is the truthful signal).

**Confirmed by**
godot-ai struct-write fix (Tier 1, dict→`Vector2i`/`Rect2`/`Transform2D` coercion). The implementation plan's ready-to-drop artifact tests used bare `assert_eq(_coerce_value(...), <struct>)` and FALSE-PASSED in the TDD RED phase (before any coercion existed); strengthening them to `assert_true(result is <Type>)` first made them genuinely fail — which surfaced this. Editor error log showed `Invalid operands 'Dictionary' and 'Vector2i'/'Rect2'/'Transform2D' in operator '!='`. Body source: project `docs/godot-gotchas.md`.
