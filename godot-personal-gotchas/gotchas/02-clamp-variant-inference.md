### 2. `clamp`/`min`/`max`/`abs`/`sign` return Variant — break `:=` inference under warnings-as-errors

**Symptom**
- GDScript line like `var magnitude := clamp(distance / walk_threshold, 0.0, 1.0)` fails to parse.
- Error message: `Parser Error: The variable type is being inferred from a Variant value, so it will be typed as Variant. (Warning treated as error.)`
- The arguments are all floats — looks like it should infer `float`.

**Cause**
Godot 4's global `clamp`, `min`, `max`, `abs`, `sign`, `floor`, `ceil`, `round` are *overloaded* across numeric types — they accept Variant and return Variant. With `gdscript/warnings/untyped_declaration` enabled and `treat_warnings_as_errors` on (defaults in many projects), `:=` inferring Variant becomes a hard error.

**Fix**
Use the explicitly-typed variants. They return `float` or `int` directly so `:=` resolves cleanly.

| Variant return | Float variant | Int variant |
|---|---|---|
| `clamp(x, a, b)` | `clampf(x, a, b)` | `clampi(x, a, b)` |
| `min(a, b)` | `minf(a, b)` | `mini(a, b)` |
| `max(a, b)` | `maxf(a, b)` | `maxi(a, b)` |
| `abs(x)` | `absf(x)` | `absi(x)` |
| `sign(x)` | `signf(x)` | `signi(x)` |
| `floor(x)` | `floorf(x)` | `floori(x)` |
| `ceil(x)` | `ceilf(x)` | `ceili(x)` |
| `round(x)` | `roundf(x)` | `roundi(x)` |

Alternative (worse): annotate explicitly — `var x: float = clamp(...)`. Works, but more verbose than swapping the function name.

**Confirmed by**
Hit during the `3d-prototype-1` movement-depth implementation on 2026-05-24, line 36 of `scripts/player.gd`: `var magnitude := clamp(distance / walk_threshold, 0.0, 1.0)` → fixed by swapping to `clampf`.
