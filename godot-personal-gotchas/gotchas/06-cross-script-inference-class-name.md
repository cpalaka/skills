### 6. Cross-script `:=` inference fails without `class_name`

**Symptom**
- GDScript line like `var steering := _player.is_steering()` or `var slow := speed < _player.idle_threshold` fails to parse.
- Error message: `Parse Error: Cannot infer the type of "steering" variable because the value doesn't have a set type.`
- `_player` is statically typed (e.g. `CharacterBody3D`), and `is_steering()` / `idle_threshold` are defined on the script attached to that node.
- Other `:=` lines in the same script that use built-in members (`_player.velocity.length()`, etc.) parse fine — only the script-defined symbol accesses fail.
- **Also fires on a member of a *fully untyped* base** — e.g. an untyped function parameter: `func drive(p, ...): var s := p.speed`. `p` is Variant and `p.speed` has no inferable type. Unlike the typed-but-classless case, this is a **HARD compile error independent of `treat_warnings_as_errors`**.

**Cause**
With `_player: CharacterBody3D`, the static parser only knows about `CharacterBody3D`'s built-in members. Script-defined symbols (custom exports, methods, signals) aren't visible to the parser unless the source script declares `class_name Foo`, making `Foo` a globally-known type. Without `class_name`, `_player.script_member` resolves to Variant; `:=` inference fails the same warnings-as-errors gate as the `clamp` family in Gotcha #2. When the base itself is untyped (Variant) — e.g. an untyped param `p` accessed as `p.speed` — there's no type to infer at all and `:=` hard-errors regardless of the warnings config.

**Fix**
Two options, in order of preference:

1. **Add `class_name` to the source script** — e.g. `class_name Player extends CharacterBody3D` at the top of `player.gd`. Members become statically visible everywhere. Side effect: `Player` becomes a global identifier; conflicts with any other declaration of the same name.
2. **Annotate the consumer explicitly** — `var steering: bool = _player.is_steering()`. Minimal surgical fix; doesn't touch the source script. Pick this when adding `class_name` would cause naming friction.

For the **untyped-base** variant (`var s := p.speed` on an untyped param): use plain `=` (`var s = p.speed`, `s` becomes Variant — legal) or annotate the receiver (`var s: float = p.speed`). Never `:=` on a member access of an untyped/Variant base.

**`mcp__godot__get_diagnostics` does NOT catch this.** The per-file LSP has no cross-script context — it reports the file clean. The failure surfaces only when Godot's engine parser tries to load the script at scene-load time. **Always cross-check `mcp__godot-mcp__godot_editor get_log_messages source="editor"` after writing GDScript that touches another script's exports / methods / signals.** Don't treat `get_diagnostics` clean as "all good" — necessary but not sufficient.

**Detect proactively**
When writing GDScript that touches `other_node.some_member` where `some_member` is declared on `other_node`'s attached script, prefer typed annotations on the consumer side or add `class_name` to the source. After writing such code, run `mcp__godot-mcp__godot_editor get_log_messages source="editor"` proactively — don't wait to be asked.

**Confirmed by**
Hit during the `3d-prototype-1` animation Step 6 on 2026-05-26 — `scripts/player_anim.gd` had `var steering := _player.is_steering()` and `var slow := speed < _player.idle_threshold` where `player.gd` had no `class_name`. The parse failure was invisible to `mcp__godot__get_diagnostics` (reported clean) and only surfaced via `mcp__godot-mcp__godot_editor get_log_messages source="editor"` after the user F5'd and reported "scene doesn't load". Fixed by annotating the two locals (`var steering: bool = ...`, `var slow: bool = ...`).

2026-06-02 — `circle-combat-prototype` player-SM Phase B Task B.3 (`scripts/locomotion/grounded.gd`): the plan's verbatim `var s := p.speed` with untyped coordinator param `p` hard-errored headless; fixed to `var s = p.speed`. Reproduced in isolation: `func f(p): var s := p.speed` → exact `Parse Error: Cannot infer the type of "s" variable because the value doesn't have a set type.` (a HARD error here, not the warnings-gated case above).
