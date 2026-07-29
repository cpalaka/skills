### 89. `set_script()` silently no-ops when the script failed to compile — the error then names the BASE class, at the call site

**Symptom**
- Code does `node.set_script(SomeScript)` (where `SomeScript` is a `preload(...)` const), and every later use of that node fails with errors naming the **base** class, not the script:
  ```
  SCRIPT ERROR: Invalid assignment of property 'world_seed' with value of type 'int' on a base object of type 'Node2D'.
  SCRIPT ERROR: Invalid call. Nonexistent function 'live_bodies' in base 'Node2D'.
  ```
- Those errors point at the **consumer** — the line that set the property or called the method — so the natural reading is "I got the API wrong" or "the node type is wrong", and the debugging goes to entirely the wrong file.
- The real cause is earlier in the same output, easy to scroll past, and names a *different* file:
  ```
  SCRIPT ERROR: Parse Error: Cannot infer the type of "polygon" variable because the value doesn't have a set type.
            at: GDScript::reload (res://src/world/field_runtime/region_materializer.gd:110)
  SCRIPT ERROR: Compile Error: Failed to compile depended scripts.
            at: GDScript::reload (res://tests/test_region_materialize.gd:0)
  ```
- Especially confusing in a headless test: the harness keeps running (the errors are not fatal), so you get a long tail of identical `Nonexistent function` lines once per frame, and no obvious first failure.

**Cause**
A `preload()` of a script that does not compile yields a script object that is not usable, and
`set_script()` does not raise on it — the node simply keeps its base class. There is no return
value to check and no error at the assignment site. Every downstream access then resolves against
the base class, which is why the reported type is `Node2D` (or whatever the node was constructed
as) rather than the script you thought you attached.

The upstream parse error can be anything; in the confirmed case it was a plain type-inference
failure (`var x := some_untyped_call()`), which `--check-only` without `--script` cannot see at all
(#86), so a broken script reaches `set_script` with every gate green.

**Fix**
- Read the **head** of the output, not the tail. The first `Parse Error … at: GDScript::reload
  (res://<file>)` line names the script that actually broke; fix that and the cascade disappears.
- Before trusting a `set_script` path, parse-check the script explicitly:
  `godot --headless --path . --check-only --script res://path/to/script.gd` (a real per-file parse
  check — but see #35, it false-fails on autoload references).
- Where practical, prefer an authored scene with the script already attached over runtime
  `set_script`, so the editor surfaces the parse failure at author time.

**Detect proactively**
After any `set_script()`, if the very next property write or method call reports **"on a base
object of type X"** or **"Nonexistent function … in base X"** where X is the node's *constructor*
class, do not debug the call site — grep the run's output for `Parse Error` and for
`Failed to compile depended scripts`. The same reflex applies when a headless test emits the
identical error once per frame: that shape is a no-op'd script, not a logic bug.

Sibling to #77 (same `Failed to compile depended scripts` cascade, but there the consumer fails to
*load* outright — here it loads and runs with the wrong class), #86 (why a broken script reaches
`set_script` with a green typecheck), #27 (the run exits 0 regardless, so the verdict must come
from the output), #13 (a different way a script silently fails to resolve).

**Confirmed by**
2026-07-27, Godot v4.7.stable.official (`5b4e0cb0f`), macOS — `space-miner-game` task-097
(GD-05 field gen). A headless test built nodes with `Node2D.new()` + `set_script(...)`; a
type-inference parse error at `region_materializer.gd:110` made every `set_script` a no-op, and the
visible failure was ~40 repetitions of `Nonexistent function 'live_bodies' in base 'Node2D'` at the
test's own `_process` line. Fixing the one inference error on the *other* file cleared all of them.
