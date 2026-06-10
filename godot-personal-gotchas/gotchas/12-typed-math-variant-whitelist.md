### 12. Godot 4 ships typed `*f`/`*i` variants only for a narrow whitelist — don't write `expf` by analogy

**Symptom**
- GDScript fails to parse with `Identifier "expf" not declared in the current scope.` (or `sqrtf`, `sinf`, `cosf`, `powf`, `logf`, ...).
- Not a "wrong return type" warning — the identifier simply does not exist.
- Especially insidious when the failing script is not covered by GUT — the parse error only surfaces at F5 (or via `mcp__godot-mcp__godot_editor get_log_messages source="editor"`). See Gotcha #6 for the cross-script analog of this hidden-until-F5 class.
- Common motivator: writing typed math by analogy with `clampf` / `minf` / `maxf` (which DO exist — see Gotcha #2) and assuming the pattern extends.

**Cause**
Godot 4 provides typed `*f` / `*i` variants only for a small comparison/rounding family. Most numeric globals — including all transcendentals and most trig — exist **only** as Variant-returning globals.

| Has typed variants | Variant-only — no `*f` |
|---|---|
| `clamp`, `min`, `max`, `abs`, `sign`, `floor`, `ceil`, `round` | `exp`, `log`, `sqrt`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `pow`, `lerp`, `inverse_lerp`, `remap`, `smoothstep`, `move_toward`, `ease`, `snapped`, `posmod`, `fposmod`, ... |

Rare exception: `wrap` is Variant, `wrapf` exists. Don't blanket-assume the lack of typed variants either.

**Fix**
- Use the bare global: `exp(x)`, `sqrt(x)`, `sin(x)`, `pow(x, y)`, `lerp(a, b, t)`.
- If you need a typed float result, annotate the receiver: `var k: float = exp(-rate * dt)`. The Variant return coerces.
- Do NOT invent `expf`, `sqrtf`, `sinf`, `cosf`, `powf`, `logf`, `lerpf`, etc. — none exist.

**Detect proactively**
Before writing any `<math>f(` form, mentally check the whitelist. Grep heuristic for review: `grep -nE '\b(expf|sqrtf|sinf|cosf|tanf|powf|logf|asinf|acosf|atanf|atan2f|lerpf|smoothstepf|move_towardf|easef)\(' scripts/` — any hit is a parse error waiting at F5. Sibling-but-inverse to Gotcha #2.

**Confirmed by**
2026-05-27 — `2d-movement-prototype`. Original line in `scripts/player/player_camera.gd`: `expf(-rate * dt)`. Script was not GUT-covered, parse error surfaced only at F5 when `tuning_room.tscn` instantiated `player_camera.tscn`. One-line fix: `expf` → `exp`. Commit `bb20121`.
