### 44. Indexing an array literal yields `Variant`, so `:=` can't infer — a runtime-compile error blind to BOTH `--check-only` and the LSP

**Symptom**
- A line like `var act_name := ["P1","P2","P3"][_act]` fails with `Cannot infer the type of "act_name" variable because the value doesn't have a set type`.
- The failure surfaces as a **runtime "Parser Error" in the stack trace** — at `preload` / `load` / scene instantiation — NOT at edit time. The script "looks fine" in the editor.
- Worse, both static checkers stay silent (verified empirically on the buggy file): `godot --headless --path . --check-only --quit` reports nothing, and the minimal-godot LSP `get_diagnostics` / `scan_workspace_diagnostics` return `[]`.
- A treacherous failure mode pairs with this: `editor_state.is_playing:true` after `project_run` looks like "the scene works", but if the root script failed this compile, `_ready` never ran — the scene tree loaded but the scene is non-functional.

**Cause**
An array literal `[...]` is an untyped `Array`, so an **indexed element** `[...][i]` has static type `Variant`. `:=` (inferred declaration) cannot infer a concrete type from `Variant`, so the compiler rejects it. This is a runtime-COMPILE error: GDScript only compiles a script when it is actually loaded (`preload`/`load`/instantiation), which is why neither `--check-only` (a separate parse pass) nor the LSP flags it. Same Variant-inference family as #2 (`clamp` → Variant), #6 (cross-script symbol without `class_name` → Variant), #12 (typed-math whitelist); distinct from #18, which is the array-literal *assignment* direction (untyped literal → typed `Array[T]` property, a runtime *assignment* error).

**Fix**
Annotate the type explicitly instead of inferring: `var act_name: String = ["P1","P2","P3"][_act]`. (Or hoist the literal into a typed local first: `var names: Array[String] = ["P1","P2","P3"]; var act_name := names[_act]` — a typed `Array[T]` element infers cleanly.)

**Detect proactively**
- Grep for inferred declarations indexing a literal: `grep -nE ':= *\[[^]]*\]\[' scripts/ tests/`.
- Because both static checkers are blind, the only reliable catch is an actual compile: a **preload-smoke test** that `preload`s (or `load(...).instantiate()`s) the script forces a real compile and FAILS on the bug; or F6 / `project_run` and read `logs_read` / godot-mcp `get_stack_trace`. Every new GDScript with no behavioral test should get a preload-smoke test so the headless suite actually compiles it — see preference #6 (`gut-green-not-compile-clean`). When the runtime catch-paths are down (e.g. game capture broken — gotcha #43), treat the script as UNVERIFIED; do not substitute static checks + `is_playing:true`.

**Confirmed by**
2026-06-23, `space-miner-prototype` — `lut_lab.gd` shipped `var act_name := ["P1","P2","P3"][_act]`; `--check-only` and LSP `get_diagnostics`/`scan_workspace_diagnostics` both passed clean, and it was caught only at user F6 (runtime Parser Error). A preload-smoke test (`test_lut_lab_smoke.gd`) added afterward reproduced the failure and passed on the explicit-type fix.
