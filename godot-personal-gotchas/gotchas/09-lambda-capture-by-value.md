### 9. GDScript 4 lambdas silently no-op on captured local scalar reassignment

**Symptom**
- Inside an inline `func(...)` lambda, assigning to a captured local `bool` / `int` / `float` / `String` from the enclosing scope silently does nothing.
- The lambda parses and runs without error, but the outer-scope variable is never updated.
- Asserts that check the outer value fail. Most painful in GUT unit tests written in the obvious style — the lambda body looks correct but the test fails because the captured flag never flips.

**Cause**
GDScript 4 lambda closures capture outer scalars **by value**, not by reference. Reassignments inside the lambda mutate a captured copy; the outer binding is never updated. The compiler emits no warning. Mutating `self.*` members through a lambda works fine (those go through `self`). Mutating Dictionary entries also works because Dictionaries are reference types. Only captured **local scalars** are affected.

**Fix**
Wrap the captured value in a reference-type container — an `Array[T]` of length 1 is the canonical workaround. Read/write via `arr[0]`.

```gdscript
var fired: Array[bool] = [false]
some_callable(func(_ctx): fired[0] = true)
assert_true(fired[0])
```

Same pattern for `Array[int]`, `Array[float]`, etc. A `Dictionary` like `{value = false}` works equivalently.

**Detect proactively**
Detection is purely empirical — the compiler does NOT warn and `mcp__godot__get_diagnostics` does NOT flag it. The bug only surfaces at runtime when an assertion or behaviour check on the outer variable fails. If a lambda "doesn't seem to do anything," first check whether its body reassigns a captured local scalar. Heuristic grep: `grep -nE 'func\([^)]*\):.*=[^=]' scripts/ test/`.

**Confirmed by**
2026-05-26 — `2d-movement-prototype`, `test/unit/test_player_state_machine.gd` (`test_first_matching_rule_wins`, `test_on_fire_runs_with_ctx`). Commit `ddbdf07` adopted the `Array[T]` wrapper. The bug was invisible until the assertions in those two tests failed.
