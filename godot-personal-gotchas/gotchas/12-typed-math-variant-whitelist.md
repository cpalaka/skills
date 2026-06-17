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
| `clamp`, `min`, `max`, `abs`, `sign`, `floor`, `ceil`, `round`, `lerp` (→ `lerpf`) | `exp`, `log`, `sqrt`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `pow`, `inverse_lerp`, `remap`, `smoothstep`, `move_toward`, `ease`, `snapped`, `posmod`, `fposmod`, ... |

Rare exceptions: `wrap` is Variant but `wrapf` exists, and `lerp` has a typed `lerpf` (left column above). Don't blanket-assume the lack of typed variants either. Both confirmed against Godot 4.6.2 via `--check-only` (`lerpf` parses clean; `sqrtf`/`expf`/`move_towardf` error `Function "…()" not found`).

**Fix**
- Use the bare global: `exp(x)`, `sqrt(x)`, `sin(x)`, `pow(x, y)`, `move_toward(a, b, d)`.
- If you need a typed float result, annotate the receiver: `var k: float = exp(-rate * dt)`. The Variant return coerces.
- Do NOT invent `expf`, `sqrtf`, `sinf`, `cosf`, `powf`, `logf`, etc. — none exist. (`lerpf` is a real exception — verified parsing clean on 4.6.2, 2026-06-12; this entry previously listed it as nonexistent, which was wrong.)

**Detect proactively**
Before writing any `<math>f(` form, mentally check the whitelist. Grep heuristic for review: `grep -nE '\b(expf|sqrtf|sinf|cosf|tanf|powf|logf|asinf|acosf|atanf|atan2f|smoothstepf|move_towardf|easef)\(' scripts/` — any hit is a parse error waiting at F5. (`lerpf`/`wrapf` deliberately excluded — they exist.) Sibling-but-inverse to Gotcha #2.

**Confirmed by**
2026-05-27 — `2d-movement-prototype`. Original line in `scripts/player/player_camera.gd`: `expf(-rate * dt)`. Script was not GUT-covered, parse error surfaced only at F5 when `tuning_room.tscn` instantiated `player_camera.tscn`. One-line fix: `expf` → `exp`. Commit `bb20121`.

2026-06-17 — `space-miner-prototype`: `lerpf` re-confirmed to parse clean on Godot 4.6.2 via `--check-only` (and `sqrtf`/`expf`/`move_towardf` confirmed nonexistent, `Function "…()" not found`); entry refined to list `lerpf`/`wrapf` as the typed-variant exceptions and to use `move_toward` (genuinely Variant-only) as the bare-global example.
