### 57. `ResourceSaver.save` output is byte-NON-deterministic — random ExtResource-id suffix per save

**Symptom**
- Saving the *same* in-memory resource twice via `ResourceSaver.save(res, a)` / `ResourceSaver.save(res, b)` produces files that differ — same byte length, but `diff` shows only the ext-resource id: `[ext_resource … id="1_yd20u"]` vs `id="1_58qyq"`, and the matching `script = ExtResource("1_yd20u")` vs `ExtResource("1_w1mi4")`.
- Breaks any "generate `.tres` then byte-diff / regenerate-and-compare" workflow: a staleness guard that regenerates and compares to committed output fails spuriously every run; a generated-content pipeline shows phantom git diffs on every regen.

**Cause**
`ResourceSaver` assigns each ExtResource a random 5-char suffix on the numeric id (`1_xxxxx`, `2_yyyyy`, …) every save (the Godot 4.4+ stable-id scheme — meant to survive renames/merges). The numeric *prefix* is deterministic (assignment order); only the `_suffix` is random. Everything else IS stable: dict keys are **canonicalised (alphabetically sorted)** on save — insertion order does not matter — and floats/typed-arrays format identically. No `uid=`/`load_steps` lines are emitted when saving to a fresh path, so there is no uid non-determinism. The suffix is the *sole* source of save non-determinism.

**Fix**
Post-process the saved text to strip the suffix from numeric-prefix ext ids, then the two saves are byte-identical and the stripped file **still loads** (verified). Two regexes:
```gdscript
static func normalize_tres(text: String) -> String:
    var decl := RegEx.create_from_string('(?m)^(\\[ext_resource\\b[^\\]]*\\bid=")(\\d+)_[0-9a-z]+(")')
    text = decl.sub(text, "${1}${2}${3}", true)                 # id="1_xxx" -> id="1"
    var ref := RegEx.create_from_string('ExtResource\\("(\\d+)_[0-9a-z]+"\\)')
    text = ref.sub(text, 'ExtResource("$1")', true)             # ExtResource("1_xxx") -> ExtResource("1")
    return text
```
Numeric-prefix ext ids cover both script refs (`id="1_x"`) and cross-file `.tres` refs (`id="2_y"`). Sub-resource ids (`Type_xxxxx`, e.g. `AssaySet_ab12`) are out of scope until a saved resource carries an inline sub-resource — they need per-type collision-safe handling, not a blanket strip.

**Detect proactively**
Any workflow that calls `ResourceSaver.save` and then byte-compares or regenerates the output: a data-pipeline generator, a `.tres` staleness/regen-diff test, a "no phantom git diff on regenerate" guarantee. If two saves of the same resource must be byte-identical, you need this normalisation. Because dict keys are already sorted and floats stable, this suffix is the *only* thing to normalise.

**Confirmed by**
2026-07-07 — `space-miner-game` GD-03 (task-022) balance pipeline (`tools/balance/generate.gd`). Step-0 de-risk probe: three record shapes (LedgerSheet with nested Array/Dictionary/Vector2, RecipeDef with `Array[Dictionary]`, OreDef with enum) each saved twice differed only in the ext-id suffix; after `normalize_tres` all three were byte-identical AND re-loaded with values/typed-arrays intact. The whole D8 "regenerate-to-temp-and-byte-diff" staleness test (`tests/test_balance_staleness.gd`) rests on this.
