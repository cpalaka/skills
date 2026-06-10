### 18. Typed `Array[T]` property rejects an untyped array-literal assignment (Godot 4.6, runtime-only)

**Symptom**
- Assigning an array literal to a typed-array PROPERTY throws at runtime: `SCRIPT ERROR: Invalid assignment of property or key 'edges' with value of type 'Array' on a base object of type 'Resource (MoveDef)'.`
- e.g. `move_def.edges = [make_edge()]` where `edges` is `@export var edges: Array[MoveEdge]`. Throws even when every element is the correct type, and even when the element comes from a function typed `-> MoveEdge`.
- The script PARSES clean — fires only at runtime — so `--check-only` and `mcp__godot__get_diagnostics` miss it; only an actual run catches it.

**Cause**
An array literal `[...]` is an untyped `Array`. Godot 4 refuses to assign an untyped `Array` to a typed `Array[T]` property (no implicit element-wise coercion on property set). Asymmetry: an EMPTY literal `[]` → typed array is fine, and passing an untyped array to an untyped function PARAMETER (e.g. `load_graph(moves: Array, ...)`) is fine. The failure is specifically untyped-literal → typed-`Array[T]` PROPERTY assignment.

**Fix**
Use `Array.assign()` (copies + element-type-checks): `move_def.edges.assign([make_edge(), make_edge()])`. Or build a typed local first: `var arr: Array[MoveEdge] = [make_edge()]; move_def.edges = arr`. Both verified.

**Detect proactively**
Watch test / factory / `.tres`-builder code that populates a typed-array resource field (`MoveDef.edges`, `MoveLibrary.moves`/`entry_edges`, `Array[StringName]` fields, ...). Grep: `grep -nE '\.(edges|moves|entry_edges)[ ]*=[ ]*\[' scripts/ tests/`. Runtime-only, so a unit-test run (not `--check-only`) is what catches it.

**Confirmed by**
2026-06-01 — `circle-combat-prototype` player-SM Phase A. The plan's test code authored `MoveDef.edges = [...]`, `MoveLibrary.moves = [...]`, `entry_edges = [...]`; all threw `Invalid assignment of property` at runtime and were fixed to `.assign([...])`. Verified `.assign()` and the typed-local-var form both work; empty-literal and untyped-param paths confirmed unaffected.
