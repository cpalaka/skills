# Godot 4.x Gotchas

Project-level catalog of Godot engine, editor, and tooling quirks that bit us during development. Add entries here as new gotchas surface so any developer (human or LLM) cloning this project benefits.

Each entry: **symptom → cause → fix**. Optional: how to detect proactively.

---

## Embedded game tab blocks `window_set_mode` (Godot 4.6)

**Symptom:** Calling `DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)` or `WINDOWED` from a running game produces no visible change — no error, no log entry, just nothing happens.

**Cause:** Godot 4.6's editor embeds the running game inside the editor's "Game" tab by default. The embedded child viewport is not a real OS window, so window-mode operations no-op silently.

**Fix:**
- One-shot: click "Make Floating" on the Game tab during play to detach it into a real OS window.
- Persistent: Editor Settings → Run → Embed Game On Next Play → uncheck.

**Detect proactively:** If a window-mode toggle binding "doesn't work" in the editor but the bound action fires correctly (verify via `print` in the input handler), check whether the game is embedded.

---

## GDScript `:=` inference fails on `clamp`/`min`/`max`/etc. with warnings-as-errors

**Symptom:** GDScript parse error on lines like `var x := clamp(a, 0.0, 1.0)`:

> Parser Error: The variable type is being inferred from a Variant value, so it will be typed as Variant.

**Cause:** Godot 4's global `clamp`, `min`, `max`, `abs`, `sign`, `floor`, `ceil`, `round` are *overloaded* across numeric types — they accept Variant arguments and return Variant. With `gdscript/warnings/untyped_declaration` enabled and `treat_warnings_as_errors` on (defaults in many configs), `:=` inference on a Variant return becomes a hard error.

**Fix:** Use the explicitly-typed variants. They return `float` or `int` directly so `:=` resolves cleanly.

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

**Detect proactively:** When writing new GDScript, default to the typed variants. Grep existing GDScript for `clamp\(|min\(|max\(|abs\(|sign\(` inside `var ... :=` expressions.

---

## GDScript `:=` inference fails on cross-script member access without `class_name`

**Symptom:** GDScript parse error on lines accessing another node's script-defined symbol:

> Parse Error: Cannot infer the type of "x" variable because the value doesn't have a set type.

Typically on lines like `var steering := _player.is_steering()` or `var slow := speed < _player.idle_threshold`, where `_player` is typed (e.g. `CharacterBody3D`) but the accessed symbol is defined on its attached script (not the base class).

**Also fires on a member of a *fully untyped* base** — most commonly an untyped function parameter: `func drive(p, delta: float, axis: float): var s := p.speed`. Here `p` has no annotation at all, so it's Variant, `p.speed` has no inferable type, and `:=` errors with the same message. Note: unlike the typed-but-classless case above, this variant is a **HARD compile error independent of `treat_warnings_as_errors`** — `:=` simply cannot infer from a Variant member access regardless of the warnings gate.

**Cause:** With `_player: CharacterBody3D`, the static parser only knows about `CharacterBody3D`'s built-in members. Script-defined symbols (custom exports, methods, signals) aren't visible to the parser unless the source script declares `class_name Foo` — making `Foo` a globally-known type. Without `class_name`, `_player.script_member` resolves to Variant; `:=` inference fails the same warnings-as-errors gate as the `clamp` family above. When the base itself is untyped (Variant) — e.g. an untyped param `p` accessed as `p.speed` — there's no type to infer at all and `:=` hard-errors regardless of warnings config.

**Fix:** Two options, in order of preference:

1. **Add `class_name` to the source script** — e.g. `class_name Player extends CharacterBody3D` at the top of `player.gd`. Makes its members statically visible everywhere. Side effect: `Player` becomes a global identifier.
2. **Annotate the consumer explicitly** — `var steering: bool = _player.is_steering()`. Minimal surgical fix; doesn't touch the source script. Use when adding `class_name` would cause naming friction.

For the **untyped-base** variant (`var s := p.speed` on an untyped param `p`): use plain `=` (`var s = p.speed` — `s` becomes Variant, which is legal), or annotate the receiver (`var s: float = p.speed`). Never `:=` on a member access of an untyped/Variant base.

**`mcp__godot__get_diagnostics` does NOT catch this** — the per-file LSP has no cross-script context and reports the file clean. The engine parser at script-load time is what fails. Always cross-check `mcp__godot-mcp__godot_editor get_log_messages source="editor"` after writing cross-script access. (See `docs/godot-mcp-guide.md` → "Reading errors when the scene fails to load".) Same hidden-until-headless class as the `class_name`-cache and typed-array gotchas below — an actual headless run is what catches it, not the diagnostics call.

**Detect proactively:** When writing GDScript that touches `other_node.some_member` where `some_member` is declared on `other_node`'s attached script, prefer typed annotations on the consumer side or add `class_name` to the source. Likewise never write `var x := <untyped_param>.<member>` — annotate the receiver or use `=`.

---

## `.tscn` null overrides silently zero typed exports

**Symptom:** After a play session involving live Inspector tuning, the affected `.tscn` file contains lines like:

```
[node name="Player" ...]
script = ExtResource("...")
max_speed = null
turn_rate_deg = null
```

Current session works fine because the Inspector still holds live values. But on a fresh checkout / fresh editor session / fresh F5 by a different developer, the player's `max_speed` and `turn_rate_deg` load as `0.0`, freezing it.

**Cause:** When the Inspector "clears" an override on an exported property (right-click → Reset, or manual deletion of the override entry), Godot may write back `property = null` instead of removing the line. The apparent intent is "fall back to script default," but the on-disk representation is a destructive `null` override. On scene load, Godot applies the override and silently coerces `null` to `0.0` for typed numeric exports — overriding the script default.

**Fix:** Hand-edit the `.tscn` to remove the `= null` lines entirely. The script's default then applies on load. (Alternative: set the property to its intended value rather than leaving it null.)

**Detect proactively:** After any live-Inspector-tuning session, grep affected `.tscn` files:

```bash
grep ' = null' scenes/*.tscn
```

Hits are suspicious — investigate whether they're stale clear-overrides.

---

## AnimationTree dock UI shifted in Godot 4.6.2

**Symptom:** Old AnimationTree dock walkthroughs (training data, tutorials, older docs) reference UI affordances that no longer exist in Godot 4.6.2:
- "Double-click a `StateMachine` / `BlendTree` / `BlendSpace2D` node to enter its sub-editor" — double-click no longer does anything.
- "Right-click a state → Set as Start / Set Start Node" — that menu entry is gone.
- "Right-click a node → Rename" — that menu entry is gone too.

Following stale instructions produces no error — the user just can't find the control, then improvises (or gets stuck).

**Cause:** The AnimationTree dock UI was reworked in Godot 4.6.x. Specific 4.6.2 affordances:
- **Enter a sub-editor**: each container node (`StateMachine`, `SubStateMachine`, `BlendTree`, `BlendSpace2D`, `BlendSpace1D`) has an **Open Editor** button inside its node header. Click that.
- **Rename a node**: the node's name is an editable inline field — click into the field and type. No right-click menu, no F2.
- **Set Start state of a StateMachine**: there is no "Set as Start" affordance. Instead, use the **Connect Nodes** tool (default cursor) and drag from the green `Start` node to the desired state. Godot serializes this as a transition `["Start", "<TargetState>", SubResource(...)]` with default `advance_mode = 2` (Enabled) and no condition — fires unconditionally on entry, functionally equivalent to "this is the Start state."

**Fix:** When writing or following AnimationTree dock walkthroughs, use the 4.6.2 idioms above.

**Detect proactively:** If a walkthrough says "double-click X to enter" or "right-click to rename/Set Start," and you're on Godot 4.6.x, translate to the new affordances before clicking.

---

## AnimationTree dock spams stale-preview errors during incremental build (Godot 4.6.2)

**Symptom:** While a scene containing a freshly-built `AnimationTree` is open in the editor, the Output panel spams two errors continuously (every frame, hundreds per second):

- `Type mismatch between initial and final value: float and bool` (and `bool and float`) — fires in `animation.cpp:5723` (`validate_type_match`).
- `Condition "playback_new.is_null()" is true. Returning: AnimationNode::NodeTimeInfo()` — fires in `animation_node_state_machine.cpp:1640` (`_process`).

The errors fire even when `AnimationTree.active = false`. They fire even when the `AnimationTree` node isn't selected. They fire as long as the scene is open. Switching to a different scene silences them; coming back resumes them.

**Cause:** During a session where you incrementally build an AnimationTree topology — adding `StateMachine`, `SubStateMachine`, `BlendSpace2D`, `OneShot`, etc., one at a time, with saves in between — the editor's AnimationTree dock holds a preview/evaluation cache that can fall out of sync with the actual sub-resource tree. The dock's continuous preview tries to evaluate the stale cache against the newer tree, hitting type mismatches and missing sub-state playbacks.

**Fix:** Close the scene tab (`Cmd+W` or right-click the tab → Close) and reopen it from the FileSystem dock. Forces the editor to rebuild its preview cache from the on-disk `.tscn`. Errors stop immediately. No `.tscn` change required — `git status` confirms the file is untouched.

**Detect proactively:** After a session of incremental AnimationTree dock work, if the Output panel is noisy, try closing+reopening the affected scene tab *before* hunting for a real type mismatch in the animation clips. (Real type mismatches in imported `.glb` clips do exist — see related forum threads — but a fresh first-import with clean Skeleton3D `position_3d`/`rotation_3d` tracks is unlikely to produce them.)

Related forum thread (different repro, same symptom): https://forum.godotengine.org/t/type-mismatch-between-initial-and-final-value/123942 — discusses stale animation references after `.glb` re-import; the fix there (delete-anim-from-tree before re-import) is heavier than the scene-reload fix above.

---

## Docs/assets folders get auto-imported as game resources unless `.gdignore`'d

**Symptom:** Putting an `.svg` (or `.png`, `.glb`, etc.) inside `docs/` for documentation purposes makes Godot generate a sibling `.import` file (e.g., `mydoc.svg.import`) and treat the file as a project resource. It shows up in the FileSystem dock and would be packaged into game exports.

**Cause:** Godot scans the entire project root for importable files. There's no special-casing for `docs/`, `README/`, etc. — any folder under `res://` is fair game.

**Fix:** Drop an empty file named **`.gdignore`** (note: **not** `.godotignore` — that's a common wrong guess) into the folder. Godot will then:
- Skip imports for that folder entirely
- Hide the folder from the FileSystem dock
- Refuse `load()`/`preload()` of paths under it
- Speed up initial project scanning

The file must be empty — `.gdignore` does **not** support `.gitignore`-style patterns. To ignore selectively, organize so the ignored content lives under its own subfolder.

After adding `.gdignore`, delete any already-generated `.import` siblings to keep the tree clean; they won't be regenerated.

**Detect proactively:** Any time you add non-code files (images, PDFs, mermaid renders, design notes with embedded media) under a docs/notes folder, drop `.gdignore` in that folder up front. Reference: https://docs.godotengine.org/en/stable/tutorials/best_practices/project_organization.html

---

## `AnimationNodeStateMachineTransition` conditions never fire unless `advance_mode = 2` (Godot 4.6)

**Symptom:** A StateMachine transition with `advance_condition = &"my_flag"` (or `advance_expression = "..."`) is wired correctly in the AnimationTree dock and the underlying boolean parameter genuinely flips to `true` at runtime — but the transition never fires and the state machine stays stuck on the source node.

The check that nails it: `print($AnimationTree.get("parameters/<sm_path>/conditions/<flag>"))` from inside `_physics_process` returns `true`, yet `playback.get_current_node()` doesn't advance.

**Cause:** `AnimationNodeStateMachineTransition.advance_mode` defaults to `ADVANCE_MODE_ENABLED = 1`. The name is misleading — per the Godot docs:

- `ADVANCE_MODE_DISABLED = 0` — Don't use this transition.
- `ADVANCE_MODE_ENABLED = 1` — **Only use during `AnimationNodeStateMachinePlayback.travel()`.**
- `ADVANCE_MODE_AUTO = 2` — Automatically use this transition if the `advance_condition` / `advance_expression` checks are `true`.

ENABLED only allows `travel()`-based requests; it does NOT auto-fire on condition. AUTO is what you want for condition-driven flow. The AnimationTree dock's default when authoring a transition is Enabled, which silently breaks the common "set advance_condition and let it fire" pattern.

**Fix:** In the AnimationTree dock, click the transition, set **Advance Mode** to **Auto**. In `.tscn` hand-edit, add `advance_mode = 2` to the transition subresource:

```
[sub_resource type="AnimationNodeStateMachineTransition" id="..."]
xfade_time = 0.1
advance_mode = 2          # ← required for advance_condition to auto-fire
advance_condition = &"is_steering"
```

**Detect proactively:** Whenever you set `advance_condition` or `advance_expression`, set `advance_mode = 2` in the same edit. After saving any StateMachine, audit the `.tscn`:

```
grep -B1 -A4 'AnimationNodeStateMachineTransition' YourScene.tscn
```

Every transition that has an `advance_condition` or `advance_expression` line should also have `advance_mode = 2` nearby — otherwise it's dead.

---

## Stale advance-condition boolean flickers the parent StateMachine and resets a nested sub-StateMachine to Start every frame

**Symptom:** An AnimationTree character looks stuck on its Idle clip — animations never progress past idle even when the player is clearly moving and the gameplay conditions are correct. A nested sub-StateMachine's `playback.get_current_node()` keeps reading its Start/Idle node. While standing still, the *top-level* StateMachine visibly oscillates between two states every few frames (e.g. `Grounded` ↔ `Fall`). No errors, no warnings. If the Idle clip happens to have no tracks for some bones (e.g. legs), those bones look frozen during movement, masking that the StateMachine — not the expressions — is the real problem.

**Cause:** A boolean `advance_condition` (or a boolean referenced by an `advance_expression`) is written in only ONE branch of the per-frame update — e.g. `is_falling` set only inside `if state == AIRBORNE`. When that branch stops running (player lands → grounded), the boolean is never cleared, so it **latches stale-true**. The top-level StateMachine evaluates that condition EVERY frame while in the neighbouring state, so a transition like `Grounded→Fall` (on stale `is_falling`) keeps firing, paired with `Fall→Grounded` (on `is_grounded`) → perpetual parent-state flicker. Critically, each time the top-level SM **re-enters** a state containing a nested sub-StateMachine, that sub-SM is **re-initialised to its Start node** — so the nested locomotion SM can never advance past Idle, regardless of speed/expressions.

This is a sibling to the `advance_mode = 2` gotcha above (transitions that need AUTO advance mode), but it is about condition *freshness*, not advance_mode — there advance_mode was already correct (2/AUTO); the bug was the stale boolean.

**Fix:** Maintain advance conditions EVERY frame, not only in the state that sets them. Add an `else` branch that clears them:

```gdscript
if st == PlayerState.AIRBORNE:
    is_falling = velocity.y > 0.0
    # ... set is_jumping / is_fastfalling ...
else:
    is_jumping = false
    is_falling = false
    is_fastfalling = false
```

General rule: any boolean a StateMachine reads as an advance condition/expression must have a defined value on every frame of every state, or it will latch and cause spurious transitions.

**Detect proactively:** If an AnimationTree character is "stuck on idle," log the top-level `playback.get_current_node()` for a few seconds while idle — if it oscillates between two states, suspect a stale advance condition before suspecting the nested SM's expressions. Audit every condition boolean: is it assigned on every code path each frame, or only inside one state's branch?

---

## GDScript 4 lambdas silently no-op on captured local scalar reassignment

**Symptom:** Inside an inline `func(...)` lambda, assigning to a captured local `bool` / `int` / `float` / `String` from the enclosing function's scope silently does nothing. The lambda parses and runs without error, but the outer-scope variable is never updated. Asserts that check the outer value fail. Most painful in GUT unit tests written in the obvious style — the lambda body looks correct but the test fails because the captured flag never flips.

**Cause:** GDScript 4 lambda closures capture outer scalars **by value, not by reference**. Reassignments inside the lambda mutate a captured copy; the outer binding is never updated. The compiler emits no warning. Mutating `self.*` members through a lambda works fine (those go through `self`). Mutating Dictionary entries also works because Dictionaries are reference types. Only captured **local scalars** are affected.

**Fix:** Wrap the captured value in a reference-type container — an `Array[T]` of length 1 is the canonical workaround. Read/write via `arr[0]`.

```gdscript
var fired: Array[bool] = [false]
some_callable(func(_ctx): fired[0] = true)
assert_true(fired[0])
```

Same pattern for `Array[int]`, `Array[float]`, etc. A `Dictionary` like `{value = false}` is an equivalent workaround.

**Detect proactively:** Compiler does NOT warn and `mcp__godot__get_diagnostics` does NOT flag. The bug only surfaces at runtime when an assertion or behaviour check on the outer variable fails. If a lambda "doesn't seem to do anything," first check whether its body reassigns a captured local scalar. Heuristic grep: `grep -nE 'func\([^)]*\):.*=[^=]' scripts/ test/`.

---

## Explicit Euler spring instability above ~6 Hz at 60fps

**Symptom:** A semi-implicit Euler spring driving a node's `scale` (e.g. squash-stretch on a Skeleton2D or sprite) blows up within ~10 frames of the first impulse. Scale oscillates with widening swing, then crosses zero and flips negative, then grows past camera view. Underlying physics keeps working (player can still move, collisions still register), but the affected node is **invisible** because its scale has rocketed past ±10. No error in console, no crash.

**Cause:** Semi-implicit (symplectic) Euler integration of a damped harmonic oscillator has two stability bounds:
- `omega · dt < 2` (oscillation frequency vs step size)
- `2 · zeta · omega · dt < 1` (damping vs step size)

The damping bound is tighter — it's violated *before* the frequency bound. At 60fps (`dt ≈ 0.0167s`), `freq > ~6-7 Hz` typically pushes `2 · zeta · omega · dt` past 1, making amplitudes **grow** each cycle instead of decay. Skeleton2D scale is a single multiplier on the whole rig, so even small instability becomes catastrophic.

**Fix:**
- **Quick**: cap `freq` at ~6 Hz for spring tuning fields when running explicit Euler at 60fps. Damping helps but isn't the right lever.
- **Robust**: replace explicit Euler with one of: (a) sub-stepping (`tick(delta/N)` × N), (b) the analytical critically-damped spring closed form, (c) exponential decay (`current = lerp(current, rest, 1.0 - exp(-rate * dt))`).

**Detect proactively:** Before bumping any spring `freq` value, mentally check `omega · dt` (omega = freq · TAU) against the bounds. For scale-driven springs, treat `~6-7 Hz` as the effective ceiling unless the integrator is sub-stepped or analytical. If a node's scale "becomes invisible after a few frames" and physics still works, prime suspect is unstable spring on a Skeleton2D / sprite scale.

---

## Skeleton2D modification `bone_index` auto-derives from `bone2d_node` (don't set both)

**Symptom:** Walkthroughs for `SkeletonModification2DLookAt` / `SkeletonModification2DTwoBoneIK` say "set `bone_index` to N, then set `bone2d_node` to the Bone2D path" — implying two independent steps. In Godot 4.6.2's Inspector, `bone_index` **auto-populates the moment you pick the Bone2D from the `bone2d_node` dropdown**. No manual integer entry needed. The field looks editable but is computed.

**Cause:** The Skeleton2D modification UI in 4.6.x resolves the picked Bone2D's index in the Skeleton2D's bone array and writes it to `bone_index`. The integer ends up in the serialized `.tscn` but is populated by the UI, not user-entered.

**Fix:**
- Walkthroughs and docs should say: "Set `bone2d_node` to the Bone2D path. `bone_index` will auto-populate."
- If hand-writing `.tscn`: both fields are present in the serialized form (`bone_index = 9`, `bone2d_node = NodePath("Hip/Torso/Head")`), so both still need to be written. Just be aware the index is derivable from the node path, not arbitrary — keep them consistent.

**Detect proactively:** When reviewing AI-generated or older-docs walkthroughs that describe `bone_index` as a manual step, flag it as stale.

---

## Godot 4 ships typed `*f`/`*i` variants only for a narrow whitelist

**Symptom:** GDScript fails to parse with `Identifier "expf" not declared in the current scope.` (or `sqrtf`, `sinf`, `cosf`, `powf`, `logf`, ...). Not a "wrong return type" warning — the identifier simply does not exist. Especially insidious when the failing script is not covered by GUT — the parse error only surfaces at F5 (or via `mcp__godot-mcp__godot_editor get_log_messages source="editor"`).

**Cause:** Godot 4 provides typed `*f` / `*i` variants only for a small comparison/rounding family. Most numeric globals — including all transcendentals and most trig — exist **only** as Variant-returning globals. The pattern does NOT generalize from `clampf` to anything else.

| Has typed variants | Variant-only — no `*f` |
|---|---|
| `clamp`, `min`, `max`, `abs`, `sign`, `floor`, `ceil`, `round`, `lerp` | `exp`, `log`, `sqrt`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `pow`, `inverse_lerp`, `remap`, `smoothstep`, `move_toward`, `ease`, `snapped`, `posmod`, `fposmod`, ... |

Note the rare exceptions: `wrap` is Variant but `wrapf` exists, and `lerp` has a typed `lerpf` (it's in the left column above) — so don't blanket-assume the lack of typed variants either. Both confirmed against Godot 4.6.2 via `--check-only` (`lerpf` parses clean; `sqrtf`/`expf`/`move_towardf` error `Function "…()" not found`).

**Fix:**
- Use the bare global: `exp(x)`, `sqrt(x)`, `sin(x)`, `pow(x, y)`, `move_toward(a, b, d)`.
- If you need a typed float result, annotate the receiver: `var k: float = exp(-rate * dt)`. The Variant return coerces.
- Do NOT invent `expf`, `sqrtf`, `sinf`, `cosf`, `powf`, `logf`, etc. — none exist. (But `lerpf` and `wrapf` DO exist — see the typed-variant column / exceptions note above; don't flag them.)

**Detect proactively:** Before writing any `<math>f(` form, mentally check the whitelist above. Grep heuristic for review: `grep -nE '\b(expf|sqrtf|sinf|cosf|tanf|powf|logf|asinf|acosf|atanf|atan2f|smoothstepf|move_towardf|easef)\(' scripts/` — any hit is a parse error waiting at F5. (`lerpf`/`wrapf` deliberately excluded — they exist.) Sibling-but-inverse to the `clamp`/`clampf` entry above: that one says "the typed variant DOES exist, prefer it"; this one says "the typed variant does NOT exist, don't write it by analogy."

---

## `CanvasItem.texture_filter` "inherit" member is `TEXTURE_FILTER_PARENT_NODE`, not `TEXTURE_FILTER_INHERIT` (Godot 4.6)

**Symptom:** GDScript parse error:

> Parse Error: Cannot find member "TEXTURE_FILTER_INHERIT" in base "CanvasItem".

It's a **LOAD-time** parse error (fires at F5 / game boot / when the script loads), not a `--check-only`-only nicety. If the offending script is `preload`ed by another (e.g. a `player.gd` preloads it), the failure **cascades** and the whole scene won't boot — presenting as "can't start the game / error in the stack trace" rather than a localized error. Surfaces at GDScript `--check-only`, at `mcp__godot-mcp__godot_editor get_log_messages source="editor"`, and at godot-ai `logs_read source=editor` (function `GDScript::reload`). A green GUT run or a `[x]` "docs-confirmed" pre-flight checkbox does NOT catch it.

**Cause:** Godot 4.6's `CanvasItem.TextureFilter` enum has **no** `TEXTURE_FILTER_INHERIT` member. The "inherit from parent node / project default" value is **`TEXTURE_FILTER_PARENT_NODE` (= 0)**. Full member list: `TEXTURE_FILTER_PARENT_NODE` (0), `TEXTURE_FILTER_NEAREST` (1), `TEXTURE_FILTER_LINEAR` (2), `TEXTURE_FILTER_NEAREST_WITH_MIPMAPS` (3), `TEXTURE_FILTER_LINEAR_WITH_MIPMAPS` (4), `..._ANISOTROPIC` (5, 6), `TEXTURE_FILTER_MAX` (7). The trap is writing `_INHERIT` by analogy with the word "inherit" (and `BaseMaterial3D` / older-docs naming intuition); `TEXTURE_FILTER_NEAREST` on the same line is correct, which makes the wrong member look plausible by association.

**Fix:** Use `CanvasItem.TEXTURE_FILTER_PARENT_NODE` for the "leave at the default / inherit" branch. Confirmed against live `mcp__godot-mcp__godot_docs fetch_class CanvasItem` — property `texture_filter` is type `TextureFilter`, default `0` = PARENT_NODE. `TEXTURE_FILTER_NEAREST` for the pixelated branch is correct as-is.

**Detect proactively:** When setting `texture_filter` from script (especially a conditional `NEAREST if pixelated else <default>`), the default branch is `TEXTURE_FILTER_PARENT_NODE`, not `_INHERIT`. More broadly: **re-verify version-sensitive enum/property names against live `godot_docs` even when a plan/pre-flight checkbox CLAIMS they were docs-confirmed** — a `[x]` is not evidence the check ran. Same hidden-until-load class as the `expf`/typed-`*f`-variant entry above and the cross-script-`class_name` entry below — only an actual load (F5 / `--check-only` / editor log read) catches it, not a GUT pass.

---

## `class_name` cache stale when new script is created outside the editor

**Symptom:** Headless Godot invocations (`godot --headless ... -s addons/gut/gut_cmdln.gd`, `godot --check-only --quit`, custom CLI scripts) fail with `SCRIPT ERROR: Parse Error: Could not find type "X" in the current scope.` for a `class_name X` type that demonstrably exists — the `.gd` file is on disk, the editor is open with the project loaded, and `mcp__godot__get_diagnostics` returns clean diagnostics for both the new file and any file referencing the type. GUT reports `Failed to load script ... with error "Parse error"` followed by `WARNING: Ignoring script ... because it does not extend GutTest`. The error message points at the *consumer* of the new type, not the missing cache entry, which makes the diagnosis indirect.

**Cause:** When a new `.gd` file declaring `class_name X` is created **externally to the editor** (Claude's Write tool, `cat > file.gd`, copy via Finder, scaffolding scripts, MCP file-creation patterns), the on-disk `.godot/global_script_class_cache.cfg` is NOT updated immediately. The editor's LSP can parse files on demand (so per-file diagnostics succeed and give a false-positive green), but the cache file — which **separate headless Godot processes consult to resolve `class_name` references** — only refreshes when the editor's FileSystem dock actually rescans. Rescan triggers: editor-window focus, FileSystem dock interaction, scene save. Files created via the editor's "New Script…" dialog do NOT hit this (the dialog writes the cache as part of its action); edits to existing `class_name` files do NOT hit this either.

**Fix:**
- **Preferred when the editor is open + godot-ai MCP is connected** (e.g. an agent session where you can't reliably focus the editor window): `mcp__godot-ai__filesystem_manage` with `op=reimport`, `params={"paths": ["res://scripts/your_new_class.gd", ...]}`. Runs `EditorFileSystem.update_file` — registers the `class_name` in the cache AND generates the `.uid` sidecar, no window focus needed. Works from a subagent too (`ToolSearch` `select:mcp__godot-ai__filesystem_manage` first). **Caveat — reimport is a NO-OP for a script in a BRAND-NEW directory** (a dir the editor's `EditorFileSystem` has not yet scanned; e.g. created via the Write tool / `cat` / Finder). `update_file` updates an *already-recognized* file; if the parent dir was never scanned, there's nothing to update — so reimport **falsely reports success** (`{"reimported_count":1,"not_found":[]}`) while adding NO cache entry and generating NO `.uid`, leaving the class unresolvable headless. The success report means "the op executed," not "the class registered." See trap (3) below for the new-dir fix.
- Otherwise: focus the editor window (or click anywhere in the FileSystem dock) to trigger a scan. This rewrites `.godot/global_script_class_cache.cfg` with the new `class_name` entries.
- **Editor not running at all** (CI, a freshly-bootstrapped project never yet opened, any headless-only box where there's no window to focus): `godot --headless --path . --import` does a full filesystem scan + global-class registration with no GUI — it rewrites `.godot/global_script_class_cache.cfg` from scratch, brand-new directories included (so it sidesteps the new-dir no-op trap below, unlike targeted reimport). This is the CLI counterpart to focusing the editor; use it before any headless run when no editor session exists to focus. (`--import` is an editor-build-only flag; an export-template/headless-server binary lacks it — open the editor once instead.)
- Verify before retrying headless: `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` must return `> 0`.
- Then re-run the headless command.

**Three traps:**
- **Self-references fail too.** A script that uses its OWN `class_name` internally (`X.new()`, `-> X`, `Array[X]`) — not just a cross-file consumer — fails with `Identifier not found: X` until that file is reimported. Every new `class_name` script needs the reimport, even standalone ones.
- **Targeted reimport / `write_text` do NOT prune deletions.** They only update the named paths; a cache entry for a DELETED `class_name` file lingers (`class_name X -> deleted_path`) and will collide if you later add a real `X` at a different path. To supersede it, create the real file with the same `class_name` and reimport THAT (`update_file` replaces the entry's path). Only a full editor rescan prunes vanished files wholesale.
- **Reimport silently no-ops in a brand-new directory — and as of godot-ai v2.7.2, `write_text` no longer forces a scan either.** When the `class_name` script lives in a directory the editor never scanned, `reimport` returns success but registers nothing (see Fix caveat above; re-validated against the v2.7.2 source — `filesystem_handler.gd:97-101` still reports unconditional success after a bare `EditorFileSystem.update_file`, no cache-membership check). **v2.5.x workaround:** `write_text` triggered a real editor filesystem scan — re-writing the file (or any sibling) indexed the new directory, registering the class AND generating the `.uid`. **v2.7.2:** `write_text` now deliberately does the same single-file `update_file` as reimport (no scan — `filesystem_handler.gd:60-66`, avoiding a WorkerThreadPool SIGABRT under concurrent writes; the server docstring still claiming it "Triggers an editor filesystem scan" is stale), so the `write_text` lever is dead — focus the editor window / FileSystem dock to force a real scan instead. (The only MCP-reachable full scan left is `editor_reload_plugin`, which calls `fs.scan()` — `editor_handler.gd:1039` — but it reloads the godot-ai plugin itself; untested as a workaround.) **Never trust the `reimport` return value for a new dir** — verify with `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` (> 0).

**Detect proactively:**
- Any time a new `class_name`-declaring script is created via tooling (not the editor's New Script dialog), assume the cache is stale until proven otherwise.
- Before any headless GUT / `--check-only` / CLI invocation that exercises a freshly-added `class_name`, grep the cache: `grep -c "<NewClassName>" .godot/global_script_class_cache.cfg`. Zero hits → focus the editor first.
- Do NOT trust `mcp__godot__get_diagnostics` clean output as evidence the headless run will pass — the LSP parses on demand and does not consult the cache.
- **Bootstrap / fresh-clone:** a never-imported project (just bootstrapped, or freshly cloned — `.godot/` is gitignored) false-FAILs `tests/run_tests.sh`'s `fixture_pass.gd` with `SCRIPT ERROR`, because the project's `MCPGameBridge` autoload (registered in `project.godot`) can't resolve its `class_name`s headless and its parse errors are prepended to every test's output. The `init-godot-claude-project` skill's step 8 (Edit C) runs `godot --headless --path . --import` at bootstrap to prevent this; on a fresh clone, run that once (or open the editor) before any CLI test run. The runner's error greps are anchored to `^` so a *benign* autoload `print()` containing the substring won't trip them — but the unresolved-autoload case is a real parse failure that genuinely needs the import.

---

## Typed `Array[T]` property rejects an untyped array-literal assignment (Godot 4.6, runtime-only)

**Symptom:** Assigning an array literal to a typed-array **property** throws at runtime:

> SCRIPT ERROR: Invalid assignment of property or key 'edges' with value of type 'Array' on a base object of type 'Resource (MoveDef)'.

e.g. `move_def.edges = [make_edge()]` where `edges` is `@export var edges: Array[MoveEdge]`. It throws even when every element is the correct type, and even when the element comes from a function typed `-> MoveEdge`. The script **parses clean** — the error only fires at runtime — so `--check-only` and `mcp__godot__get_diagnostics` miss it; only an actual run catches it.

**Cause:** An array literal `[...]` is an untyped `Array`. Godot 4 refuses to assign an untyped `Array` to a typed `Array[T]` property (no implicit element-wise coercion on property set). Note the asymmetry: an EMPTY literal `[]` → typed array is fine, and passing an untyped array to an untyped function **parameter** is fine. The failure is specifically untyped-literal → typed-`Array[T]` **property** assignment.

**Fix:** Use `Array.assign()`, which copies + element-type-checks:

```gdscript
move_def.edges.assign([make_edge(), make_edge()])
```

Or build a typed local first: `var arr: Array[MoveEdge] = [make_edge()]; move_def.edges = arr`. Both verified.

**Detect proactively:** Watch any test / factory / `.tres`-builder code that populates a typed-array resource field. Grep heuristic: `grep -nE '\.[a-z_]+[ ]*=[ ]*\[' scripts/ tests/` and check whether the LHS property is a typed `Array[T]`. Surfaces only at runtime, so a unit-test run (not `--check-only`) is what catches it.

---

## godot-mcp silently no-ops `Rect2`/`region_rect` writes (v3.6.1) — and the open editor then holds a STALE copy of the hand-edit until a close+reopen+save resync

**Symptom:** Setting `Rect2`/`region_rect` via the godot-mcp `node.update` / property-write call silently fails to take, with no error — the call returns "success."

- **`Rect2`** (e.g. `Sprite2D.region_rect`): **all** tried formats no-op — string-expression `"Rect2(0,0,6,6)"`, dict `{"position":..,"size":..}`, and array `[0,0,6,6]`. The property stays at its default `Rect2(0,0,0,0)`. **Still broken in v3.6.1.**
- **`Transform2D`** (e.g. `Bone2D.rest`) + **`NodePath`** — *RESOLVED in v3.6.1*: formerly only the basis landed and the origin was dropped (a freshly-created bone could end up a degenerate all-zeros `Transform2D`, det == 0); v3.6.1 now writes both correctly. (`Transform3D`/`Basis` unverified post-fix — treat with caution.)

Because the write silently fails, the value must be **hand-edited into the `.tscn`**. But then a second failure mode kicks in: the editor that has the scene open keeps serializing its **stale in-memory copy**. `node.get_properties` reports the stale value (NOT the on-disk one — so it can't be trusted as confirmation), and a subsequent editor save (Cmd+S or MCP `scene.save`) **clobbers the hand-edit**, reverting disk to the stale value. Re-opening an already-open scene does NOT force a disk re-read.

**Cause:** The godot-mcp bridge's property-set path doesn't serialize `Rect2` — that format isn't implemented (see the property-formats section of `godot-mcp-guide.md`, which documents the working formats and flags `Rect2` as the remaining no-op). v3.6.1 fixed the earlier `Transform2D`-origin and `NodePath` gaps. Separately, the editor doesn't reload an externally-modified open scene without an explicit close+reopen.

**Fix:** Hand-edit the struct property into the `.tscn`, then force a **close-tab → reopen-scene → save** resync before any further MCP `node.*` calls or editor saves. If other MCP-settable props were also changed, `scene.save` them to disk **first**, **then** hand-edit the struct props, **then** resync — so the resync preserves everything. Don't trust `node.get_properties` until after the resync; verify against the on-disk `.tscn` (grep/read).

**Detect proactively:** Before writing any `Rect2`/`region_rect` property via `node.update`, assume the write will silently no-op — plan to hand-edit the `.tscn`. (`Transform2D`/`NodePath` write fine in v3.6.1; no workaround needed.) After any such hand-edit on an open scene, treat `node.get_properties` as suspect until a close+reopen+save resync; grep the on-disk `.tscn` to confirm (e.g. `grep -n 'region_rect = Rect2' scenes/...`). See `godot-mcp-guide.md` § "Property formats".

---

## `AnimatableBody2D` with `sync_to_physics = true` ignores a `move_and_slide` parent — pinned bodies don't track

**Symptom:** A `RigidBody2D` is pinned (via `PinJoint2D`) to an `AnimatableBody2D` anchor that is a child of a `CharacterBody2D`. The intent: the anchor "rides" the parent so the pinned body follows. But when the parent moves via `move_and_slide()`, the anchor — and therefore the pinned body — stays frozen at its spawn position; the pinned body visibly detaches from the moving parent. No error, no warning. Also manifests on the initial gravity settle: the anchor stays at the spawn Y while the parent falls, leaving the pin offset above the true attachment point.

**Cause:** `AnimatableBody2D` with `sync_to_physics = true` reads its position authoritatively FROM the physics frame — it is designed to be moved *manually* by code, `AnimationPlayer`, or `RemoteTransform2D` (per the class docs). A parent `CharacterBody2D`'s `move_and_slide()` updates the child's scene-tree global transform, but `sync_to_physics = true` makes the body ignore that and hold its physics-frame position (where nothing actively moved it). The docs explicitly warn "Do **not** use [sync_to_physics] together with `move_and_collide()`" — a `move_and_slide()` parent is the same conflict class.

**Fix:** Set `sync_to_physics = false` on the `AnimatableBody2D`. Then scene-tree parent inheritance drives the body's physics transform and the anchor (plus the pinned body) tracks the parent. **This inverts the common assumption** that `sync_to_physics = true` is the "safe default" for a parent-ridden anchor — for a *parent-driven* (not code-driven) anchor, `true` is the BROKEN setting.

**Detect proactively:** If a pinned/jointed body "won't follow" a node moved by `move_and_slide`/`move_and_collide`, and the anchor is an `AnimatableBody2D`, check `sync_to_physics` first. Diagnose numerically: watch the anchor's world position while the parent moves — if the parent's x advances and the anchor's x has slope 0, the anchor isn't tracking.

---

## Forward axis is canonical -Z

**Symptom:** A `Node3D` faces or moves the wrong way — code computes "forward" as `+Z` (uses `transform.basis.z` directly, or `atan2(horizontal.x, horizontal.z)` for a heading) and the result points backward relative to the engine's own helpers.

**Cause:** Godot's convention is **local -Z is forward** — the `-Z` axis points out the "front" of a `Node3D`, and both `Node3D.look_at` and `-transform.basis.z` assume it. Code that treats `+Z` as forward fights `look_at` and every engine system that follows the convention.

**Fix:** Use `-transform.basis.z` for the forward vector, and the negated `atan2` form when deriving a heading from a horizontal direction. Audit code that assumes `+Z forward`, uses `transform.basis.z` (vs `-transform.basis.z`), or `atan2(horizontal.x, horizontal.z)` (vs the negated form).

**Detect proactively:** Grep changed `.gd` for `basis.z` without a leading `-`, and `atan2(` in heading math.

---

## godot-ai omits `uid=` on a script ext_resource when the `.uid` sidecar doesn't exist yet at save time

**Symptom:** godot-ai adds a brand-new script node to a scene (`node_create` + `script_attach` + `scene_save`) and the saved `[ext_resource type="Script" ...]` line in the `.tscn` is written WITHOUT its `uid=` attribute — even though sibling script ext_resources have `uid="uid://..."`. It still resolves by `path=` (so it works at runtime), but it's inconsistent with the other entries and breaks if the script is later renamed/moved outside the editor.

**Cause:** godot-ai serializes the ext_resource with whatever it knows at save time. The UID isn't available until the editor imports the freshly-written `.gd` and generates its `.uid` sidecar — which hasn't happened yet at the moment of the save. *(Re-validated against the v2.7.2 source: the save path is still a bare `EditorInterface.save_scene()` passthrough with no uid handling — `scene_handler.gd:244-247`; zero `ResourceUID` references in plugin or server.)*

**Fix:** Do NOT hand-edit the `.tscn`. Instead:

1. `mcp__godot-ai__filesystem_manage` with `op=reimport`, `params={"paths": ["res://scripts/your_script.gd"]}` — generates the `.uid` sidecar.
2. `mcp__godot-ai__scene_save` again — godot-ai now writes the `uid=` cleanly.

Verified to produce exactly a one-line diff (`+[ext_resource ... uid="uid://..." path=...]`) with zero `unique_id` churn or reordering.

The same `reimport` trick force-generates a `.uid` for a new script (e.g. so it can be committed, if the project tracks `.uid` files). Note: the headless `--script` test runner does NOT generate a `.uid` for a script it only `preload`s by path, so reimport is the reliable way to materialize it.

**Detect proactively:** After any godot-ai scene edit that attaches a newly-created script, grep the saved `.tscn` for the new script's ext_resource line — if it has `path=` but no `uid=` while siblings do, reimport + re-save before committing. See `godot-mcp-guide.md` for the godot-ai writer surface.

---

## godot-ai `resource_manage` can't author script-`class_name` resources — only built-in engine types

**Symptom:**
- godot-ai `resource_manage` `op=create` (or `op=get_info`) with `type="<YourScriptClass>"` — e.g. a `class_name MoveDef extends Resource` — fails with `VALUE_OUT_OF_RANGE: Unknown resource type: MoveDef`.
- There's no path through godot-ai to instantiate/save a `.tres` for a custom Resource subclass (any `class_name X extends Resource`).
- Built-in engine resource types (`Curve`, `Environment`, `Gradient`, physics shapes, etc.) DO work via `resource_manage`.

**Cause:** godot-ai's `resource_manage` resource handler resolves type names against the engine's built-in ClassDB only; it does not consult the script-registered global-class cache (the `class_name` cache). So a custom Resource type name is "unknown" to it even though the editor and GDScript resolve it fine. *(Re-validated against the v2.7.2 source: `resource_handler.gd:207-209` still rejects via `ClassDB.class_exists` → `Unknown resource type`, instantiates via `ClassDB.instantiate` — no script-class fallback on the create path.)*

**Fix:**

1. **Hand-write the custom-resource `.tres` inline** (Write tool), using an existing editor-saved instance of the same resource as the format template. Key format points:
   - Reference the script via `[ext_resource type="Script" uid="uid://…" path="res://scripts/x.gd" id="…"]` — the `uid` comes from the script's `.gd.uid` sidecar.
   - Author data as `[sub_resource type="Resource" id="…"]` blocks, each with `script = ExtResource("…")`.
   - Typed-array properties serialize as `Array[ExtResource("def_id")]([SubResource("…"), …])`.
   - `StringName` fields → `&"…"`; `@export_enum` String fields → plain `"…"`.
2. **Verify** the hand-written file by godot-ai `resource_manage op=load` (parses + lists properties) plus a `project_run` boot-check, reading `logs_read source="game"/"editor"` for any load-time `push_error`.
3. **Built-in resources still go through godot-ai** — e.g. a Curve via `resource_manage op=create type="Curve" resource_path="…"` then `op=curve_set_points` with points as `{offset, value}` dicts (NOT `[x, y]` arrays — that errors `Curve points[0] must be {offset, value, …}`). godot-ai embeds the Curve's `uid` inline in its `[gd_resource]` header (no `.uid` sidecar — resources carry uid inline; sidecars are script-only).

**Detect proactively:** Before reaching for godot-ai `resource_manage` to create/inspect a `.tres`, check whether the resource's `type` is a `class_name` (your script) or a built-in engine class. Custom = hand-write inline + verify via `op=load` + boot-check; built-in = godot-ai is fine. A `resource_manage` call that returned `Unknown resource type:` is this gotcha. Related: the `uid`-omission entry above and the `class_name` cache-stale entry above (both godot-ai/`class_name` resource-handling quirks).

---

## godot-ai cannot author `Skeleton3D` bones — hand-write the bones block into the `.tscn`, then a USER reload is required

**Symptom:** Creating `Skeleton3D` bones via godot-ai fails — bones are neither child nodes nor settable properties. `node_set_property bones/0/name` → `PROPERTY_NOT_ON_CLASS` ("not found on Skeleton3D"): the dynamic `bones/N/*` properties don't exist until the bone exists, and there's no bone-count setter to bootstrap one. `batch_execute` has create-node/set-property/delete/attach-script commands but NO method-call command, so it can't call `add_bone`/`set_bone_parent`/`set_bone_rest` either.

**Cause:** godot-ai exposes nodes + properties + a few batch verbs, but no `Skeleton3D` bone-authoring API and no general method-call path. The bone array is engine-internal state reached only through methods (`add_bone`, …) that godot-ai can't invoke. *(Re-validated against the v2.7.2 source: `set_property` still gates names on the node's `get_property_list()` → `PROPERTY_NOT_ON_CLASS` — `node_handler.gd:194-202`; `batch_execute` still has no method-call verb — `batch_handler.gd:39-55`.)*

**Fix:** Hand-write the bone array into the `[node ... type="Skeleton3D"]` block of the `.tscn`. Per bone, 7 lines: `bones/N/name`, `bones/N/parent` (int; must reference a lower index), `bones/N/rest` (`Transform3D`), `bones/N/enabled = true`, `bones/N/position` (`Vector3` = rest origin), `bones/N/rotation` (`Quaternion` = identity `(0,0,0,1)` for a translation-only rest), `bones/N/scale = Vector3(1,1,1)`. **Include the pose triple** (`position`/`rotation`/`scale`) — omitting it leaves bones at pose=identity, not rest, collapsing the rig.

- **Identity-basis rests are translation-only → safe to hand-author.** For a *rotated* rest, the `.tscn` `Transform3D` is **row-major**: `Transform3D(m00,m01,m02, m10,m11,m12, m20,m21,m22, ox,oy,oz)`. Don't guess the basis — template-extract it: set a node's `rotation` (Euler) via godot-ai (which serializes the basis correctly) and read the resulting `transform =` line. (A π/4-about-Z rest is `0.7071068,-0.7071068,0, 0.7071068,0.7071068,0, 0,0,1`.)
- **The editor will NOT pick up the hand-edit on an open scene, and you must NOT `scene_save` to fix it** (that writes the bone-LESS in-memory copy over your disk bones). godot-ai `scene_open` tab-switching does NOT force a reload; `filesystem_manage op=write_text` does NOT either. A **user must do Scene → Reload Saved Scene** (or close + reopen the tab) — the same close+reopen resync as the `Rect2`/stale-open-scene gotcha above, here for scene *creation*.
- **Verify the reload worked** before continuing: a child `BoneAttachment3D`'s `bone_idx` resolves to `0..n` (it stays `-1` if the skeleton still has 0 bones). `bone_name` alone does NOT resolve `bone_idx` at edit-time via MCP — write both `bone_name` and `bone_idx` in the `.tscn`. Independently, validate the disk file headless before bothering the user: `load("res://…tscn").instantiate()` then `get_bone_count()`.
- **After the user reload**, the in-memory scene HAS the bones, so `scene_save` is now safe and beneficial — it blesses the format and bakes each `BoneAttachment3D`'s resolved global transform into the `.tscn`. Order: author the full rig on disk → user reload → screenshot-verify → `scene_save` → commit.

**Detect proactively:** Any time a task needs `Skeleton3D` bones (or `BoneAttachment3D` rigs) and godot-ai is the writer, plan for the hand-write + one user reload up front — don't discover it mid-build. The `bones/N/name` `PROPERTY_NOT_ON_CLASS` error is the tell.

---

## godot-ai `node_set_property` can't write a `Vector2i` — v2.5.x sets the container's LENGTH; v2.7.2 silently no-ops

**Symptom:** Setting a `Vector2i` property via godot-ai (e.g. `SubViewport.size`) silently produces the wrong result. Version-dependent:
- **v2.5.x:** dict `{"x":256,"y":256}` → `Vector2i(2, 2)` (took the dict's **key count**); array `[256, 256]` → `Vector2i(2, 2)` (took the array **length**); string `"Vector2i(256, 256)"` → **no-op**. A 2-element container of any shape becomes `(2, 2)` regardless of the values you passed.
- **v2.7.2:** the length mangling is gone — every form should now **silently no-op** (the property keeps its old value) while the tool still reports success. The one tell: the response echoes the live property value (`node_handler.gd:280`), so a response `value` ≠ what you sent reveals the rejected write.

**Cause:** godot-ai's value-coercion path doesn't handle `Vector2i`. In v2.5.x the broken branch coerced to the container length. In v2.7.2 (verified in source) the coercion table has **no `Vector2i`/`Vector3i`/`Vector4i` branch at all** (`_coerce_value`, `node_handler.gd:657-762`) and the check step waves integer-vector targets through (`_check_coerced` wildcard, `:546-572`), so the raw JSON dict/array reaches the engine un-coerced and the assignment is rejected (engine-side rejection inferred from source, not yet reproduced live). Element-wise `Vector2i` coercion exists in v2.7.2 only on the UI `build_layout` path (`ui_handler.gd:484-491`), not `node_set_property`. **`Vector3` is unaffected** — `{"x":0,"y":1.6,"z":4}` set a `Camera3D.position` correctly in the same session — the gap is specific to the integer-vector types.

**Fix:** Hand-edit the `Vector2i` line in the `.tscn` (`size = Vector2i(256, 256)`). If the scene is open, the editor holds a stale copy — apply the same close+reopen+save resync discipline as the other open-scene gotchas (don't `scene_save` over your hand-edit before the reload).

**Detect proactively:** When a godot-ai `node_set_property` targets a `Vector2i`-typed property (`SubViewport.size`, `size_2d_override`, TileMap cell coords, etc.), assume it won't land — set it by hand and read back the `.tscn`. Sibling to the godot-mcp `Rect2` no-op above: both are struct-coercion gaps, different MCP server.

---

## godot-ai cannot author an `AnimationTree` graph — hand-write `tree_root` + bone-track clips into the `.tscn`, verify headless (don't `scene_save`)

**Symptom:** Building an `AnimationTree` via godot-ai, there's no verb for the graph. `animation_manage` is **AnimationPlayer-only** (`player_create`, `add_property_track`, `preset_*`…) — no `AnimationNodeBlendTree` / `AnimationNodeStateMachine` / `AnimationNodeBlendSpace1D` / `AnimationNodeAnimation` authoring, and `add_property_track` is **value-track-only** (bone clips need `rotation_3d`/`position_3d` transform tracks it can't make). Sibling to the skeleton-bones gotcha above.

**Cause:** godot-ai's writer surface covers AnimationPlayer ops and ordinary property/value tracks; the `tree_root` sub-resource graph and transform-track clips are outside its verb set (same class of gap as the custom-resource and Vector2i gotchas above). *(Re-validated against the v2.7.2 source: `animation_manage` still exposes only 15 AnimationPlayer ops — `src/godot_ai/tools/animation.py:113-129`, no BlendTree/StateMachine/BlendSpace verbs — and `add_property_track` still hardcodes `Animation.TYPE_VALUE` — `animation_handler.gd:295`.)*

**Fix — hand-write into the `.tscn`** (same discipline as the bones block):
- **Clips** as `[sub_resource type="Animation"]`: `tracks/N/type = "rotation_3d"`, `path = NodePath("Skeleton3D:bone_name")`, `interp = 0` (nearest = stepped), `keys = PackedFloat32Array(time, transition, qx,qy,qz,qw, …)` (6 floats/key for rotation_3d; 5 for position_3d: time,transition,x,y,z). Bundle in `[sub_resource type="AnimationLibrary"] _data = { &"RESET": …, &"idle": …, … }`; AnimationPlayer `libraries = { "": SubResource("…lib") }`. AnimationPlayer `root_node` defaults `NodePath("..")` (its parent) → bone paths are `Skeleton3D:bone`, **NOT** `../Skeleton3D:bone`.
- **Tree graph** sub-resources, **leaf→composite order**: `AnimationNodeAnimation` (`animation = &"idle"`) → `AnimationNodeBlendSpace1D` (`blend_point_0/node = SubResource(…)`, `blend_point_0/pos`, `min_space`/`max_space`) → `AnimationNodeStateMachine` (`states/<Name>/node` + `/position`, `transitions = ["Start", "<Name>", SubResource(<trans>)]`; do NOT declare `states/Start/…` — Start/End are implicit) → `AnimationNodeBlendTree` (`nodes/<name>/node`, `nodes/output/position`, `node_connections = [&"output", 0, &"<name>"]`). Start→state transition: set `advance_mode = 2` (AUTO) so it fires on entry — see the `advance_mode = 2` gotcha above. **Runtime param paths follow the author-chosen node names**: nested-SM-in-BlendTree → `parameters/<smNodeName>/playback` and `parameters/<smNodeName>/<StateName>/blend_position`.
- **`AnimationTree` node**: `tree_root = SubResource("…BlendTree")`, `anim_player = NodePath("../AnimationPlayer")`, `active = true`, `callback_mode_process = 2` (MANUAL, for a stepped clock). (Property names confirmed against 4.6.2 docs: `AnimationMixer.callback_mode_process`, `AnimationTree.anim_player`/`tree_root`.)
- **Masked `Blend2` sector layer**: `AnimationNodeBlend2` filter serialization is **not in the public docs** (found via a `ResourceSaver.save` probe) — `filter_enabled = true` then `filters = ["Skeleton3D:upper_arm_r", "Skeleton3D:forearm_r", …]` are **plain quoted path strings in a flat array, NOT `NodePath(...)`**. Mask semantics at `blend_amount = 1.0`: filtered tracks take from input **1**, unfiltered from input **0** → wire `arm_blend.0 ← locomotion`, `arm_blend.1 ← arm`.

**Verify WITHOUT the editor — and do NOT `scene_save`:** when the puppet scene is already open in a tab, `scene_open` just re-activates the **STALE** in-memory tab (`scene_get_hierarchy`/`get_properties`/screenshots all read stale, same as the skeleton-bones gotcha above), and a `scene_save` would **CLOBBER** the disk hand-edit. Adding an AnimationPlayer/AnimationTree introduces **no new Transform3D** → nothing to normalize → **skip `scene_save` entirely** (no user reload needed; F5 reads disk). Validate with a throwaway headless `extends SceneTree` script: `load(…).instantiate()`, assert clips present, `tree_root != null`, and that `at.get("parameters/<sm>/playback")` / `…/blend_position` **resolve** (proves the param paths the animator code uses match the authored node names). Headless `--script` runs fine with the editor open here; `ps aux | grep godot` after to catch orphans.

**Detect proactively:** Any task needing an `AnimationTree` graph or `rotation_3d`/`position_3d` bone clips with godot-ai as writer — plan the `.tscn` hand-write + headless param-path check up front. Before using any `parameters/...` path in animator code, read the **real** authored node names (in code, not by eye); don't assume the plan's names.

---

## A standalone `.gdshader` can't be compile-checked headless — the dummy RenderingServer never compiles shaders

**Symptom:** You want a per-task compile-check of a hand-authored `.gdshader` (syntax/type errors) WITHOUT an F5 and without wiring it into a used material. Every headless lever comes back clean even when the shader is broken: `godot --headless --check-only --quit` (or any headless run) does NOT surface shader syntax/type errors, and a bare filesystem import/scan doesn't either.

**Cause:** A `.gdshader` only compiles when a **real** RenderingServer loads it into a *used* material. Headless Godot uses the **dummy RenderingServer**, which never compiles shaders, so errors are never raised. And `.gdshader` has no import system — a filesystem scan just registers the file, it doesn't compile it. So the per-task compile-check model needs a different lever for shaders than for scripts. Same "a green headless/GUT pass is not proof it compiles" theme as the typed-array and `class_name`-cache entries above — but here it's the RenderingServer, not the parser, that's stubbed out.

**Fix (editor OPEN = real RenderingServer):**
1. `mcp__godot-ai__material_manage op=create params={path:"res://shaders/_tmp.tres", type:"shader", shader_path:"res://shaders/foo.gdshader", overwrite:true}` — a throwaway ShaderMaterial.
2. `mcp__godot-ai__material_manage op=get params={path:"res://shaders/_tmp.tres"}` — the returned `shader_parameters` array **enumerates the shader's uniforms**, which only succeeds if the shader PARSED (`: source_color` vec4 uniforms come back typed `Color` with correct defaults). Bonus: the enumerated names/types double as a cross-check that the uniform surface matches what the GDScript consumer will `set_shader_parameter()`.
3. `mcp__godot-ai__logs_read source="editor"` — empty / no `SHADER ERROR` line = clean. (The editor-source buffer persists across `project_run`; `run_id` empty.)
4. Delete the throwaway: `rm -f shaders/_tmp.tres shaders/_tmp.tres.uid shaders/_tmp.tres.import`. **zsh trap:** a `.godot/imported/_tmp*` glob with NO match aborts the entire `rm` line (silently skipping the real deletes) — split it onto its own line.

**Authoritative GPU compile still happens at F5** (shader wired into a rendered material). This editor-open technique is the cheap per-task gate; the F5 Gate is the real exercise. See `docs/godot-mcp-guide.md` for the godot-ai `material_manage` writer surface.

**Detect proactively:** Whenever a per-task plan says "compile-check the shader," do NOT reach for `--check-only`/`--headless` — they won't catch shader errors. Use the editor-open `material_manage create` + `get` (uniform enumeration) + `logs_read source=editor` recipe instead.

---

## `Script.can_instantiate()` returns `true` for an `@abstract` GDScript — use `is_abstract()` to pin abstractness (Godot 4.6.2)

**Symptom:** `Script.can_instantiate()` returns `true` for a GDScript marked `@abstract`. A test/assertion that pins "this base class is abstract / not instantiable" via `not script.can_instantiate()` does the exact inverse of intent: it silently passes against a NON-abstract script and fails against the genuinely-abstract one. No error, no warning — the method just doesn't consult abstractness.

**Cause:** `can_instantiate()` reports whether the script is **compiled / valid**, not whether instantiation is *permitted*. GDScript abstractness (the 4.5+ `@abstract` annotation) is enforced at `.new()` time but is NOT reflected in `can_instantiate()`. The truthful queryable signal is **`Script.is_abstract()`** (also 4.5+), which correctly returns `true` for the abstract base and `false` for concrete subclasses.

**Fix:** Pin abstractness with `script.is_abstract()`, never `not script.can_instantiate()`.

```gdscript
var base := load("res://scripts/base_state.gd")  # @abstract class_name BaseState
assert_true(base.is_abstract())          # ✓ correct — true for the abstract base
# assert_false(base.can_instantiate())   # ✗ WRONG — can_instantiate() is true for the abstract base

var leaf := load("res://scripts/concrete_state.gd")          # concrete
assert_false(leaf.is_abstract())         # ✓ false for concrete subclasses
```

Verified empirically (Godot 4.6.2): the abstract base → `can_instantiate() == true`, `is_abstract() == true`; a concrete subclass → `is_abstract() == false`.

**Detect proactively:** Grep tests for abstractness pins routed through the wrong method: `grep -nE 'can_instantiate\(\)' tests/`. Any assertion that treats `can_instantiate()` as a proxy for "is abstract / not instantiable" is inverted — switch it to `is_abstract()`.

---

## Headless `--script` harness: `_ready()` does NOT fire synchronously after `add_child()` inside `_initialize()`

**Symptom:** A headless GDScript test (`extends SceneTree`, entry point `_initialize()`) adds a node with `add_child(node)` and immediately asserts against its initialized state — the assertions see uninitialized/default values, as if `_ready()` never ran. No error, no warning: `add_child(node)` succeeds, but the node's `_ready()` has not fired yet.

**Cause:** `_initialize()` runs before the tree processes ready notifications, so a node's `_ready()` is NOT fired synchronously after `add_child(node)` there — full-lifecycle assertions placed right after `add_child` run against a not-yet-ready node.

**Fix:**
- Call `node._ready()` explicitly after `add_child(node)`, OR defer the assertions to the first `_process(delta)` (which runs after the tree has processed ready notifications).
- To test input handlers without a real mouse, construct InputEvents directly — `InputEventMouseMotion.new()` with `.relative`, `InputEventMouseButton.new()` with `.button_index` / `.pressed` — and feed them to `node._unhandled_input(ev)` (godot-mcp `godot_input` cannot inject mouse motion/buttons).

**Detect proactively:** Any headless test asserting on state a node sets up in `_ready()`: make sure the assertion runs after an explicit `_ready()` call or inside `_process`, never directly after `add_child` in `_initialize()`.

---

## Headless `--script` test-harness exit codes lie — a parse failure AND a mid-run runtime abort BOTH exit 0 (Godot 4.6.2)

**Symptom:** This project's headless test harness (`extends SceneTree` + `_initialize()` calling `_run()` then printing a summary and `quit(1 if _failures > 0 else 0)`, invoked via `godot --headless --path . --script res://tests/<file>.gd`) exits **0** — looking green to `$?` / CI — in BOTH failure modes that bypass the assert counters:

- **(a) The test file FAILS TO PARSE** (e.g. references a const/method that doesn't exist yet on a `preload`'d script — the normal TDD RED state). Godot prints `SCRIPT ERROR: Parse Error: ...` + `ERROR: Failed to load script "res://tests/..." with error "Parse error".` and the process **exits 0** — `quit(1)` never ran because nothing ran.
- **(b) A RUNTIME error inside `_run()`** (nonexistent method on a Variant, wrong arg count, etc.) aborts ONLY `_run` — the CALLER `_initialize` **continues**, prints a truncated-but-green-looking summary counting only the asserts reached before the abort (e.g. `0/0 checks passed, 0 failures`, or worse a real-looking `4/4 checks passed`), and calls `quit(0)`. Exit 0, output looks like a pass.

**Cause:** GDScript runtime errors do **not** propagate up the call stack — the erroring function aborts and returns `null`, but the caller resumes at its next statement. And a `--script` load/parse failure does **not** set a nonzero process exit code. So the harness's quit-code contract only holds when every test line actually executes; any abort that skips `quit(1)` (or runs it after a truncated count) leaves `$?` == 0.

**Fix — never trust exit codes from this harness:**
- **Assert on OUTPUT, not `$?`.** Grep for the `N/N checks passed, 0 failures` line AND the **absence** of `SCRIPT ERROR` — and **pin the EXPECTED total N** (a truncated green summary has a too-small N; that's the only tell for mode (b) when the reached asserts all passed).
- **Wrap every invocation in a timeout.** macOS has no GNU `timeout`; use `perl -e 'alarm 30; exec @ARGV' /Applications/Godot.app/Contents/MacOS/Godot --headless --path . --script res://tests/<file>.gd` — because an abort in `_initialize` ITSELF (before `quit()`) hangs the process forever.
- **As TDD RED evidence, read the `SCRIPT ERROR` lines as the RED signal, never the exit code.**

**Detect proactively:** Treat a green `$?` from a `--script` run as meaningless on its own. Every such run needs the output-grep + pinned-N check + perl-alarm wrapper. A durable structural fix is to wrap the harness in a shared base that requires an `EXPECTED_CHECKS` pin (turning mode (b) and silent truncation into a counted failure + real nonzero exit) plus a per-process perl-alarm test runner that derives its verdict from output, never `$?`. Mode (a) parse failures remain undetectable in-process — only such a runner (or a manual output read) catches them.

---

## godot-ai has no file-move op — directory reorgs need a USER FileSystem-dock drag (rewrites `ext_resource` paths, NOT bare `preload()` strings)

**Symptom:** A file/directory reorganization (moving `.gd`/`.tscn`/`.tres` into new folders) has no godot-ai verb — `filesystem_manage` only does `read`/`write`/`reimport`/`search`. And moving the files outside the editor (`mv`, Finder, Write-to-new-path + delete) silently orphans every reference: `ext_resource` paths, `.uid` sidecars, `preload()` strings.

**Cause:** Dependency-safe moves are an editor FileSystem-dock operation — the dock's drag is what triggers the engine's dependency-rewrite pass. godot-ai has no verb for it; out-of-editor moves bypass the rewrite entirely.

**Fix:** Have the **USER drag the files in the editor FileSystem dock**:
- The drag auto-rewrites all uid-keyed `ext_resource` `path=` entries across `.tscn` + `.tres` (uids stay byte-identical), carries the `.uid` sidecars, and re-points the `class_name` cache via the editor's own scan (no brand-new-dir reimport trap — the editor creates the dirs itself; see the `class_name` cache entry above).
- It does **NOT** rewrite bare `preload("res://…")` string paths — afterwards run `grep -rn 'preload(' scripts/ tests/` and hand-fix any stale paths.
- Benign side effect: the editor may re-serialize a touched `.tres` and drop optional `load_steps` hints — not corruption.

**Detect proactively:** Any task that says "move/reorganize files": plan the USER dock-drag step plus a post-move `preload(` grep up front; never `mv` referenced files out-of-editor.

---

## `--check-only --script` falsely fails any autoload-referencing script with `Identifier not found: <AutoloadName>` (Godot 4.6.2)

**Symptom:** `godot --headless --check-only --script <file.gd> --quit --path .` fails with `SCRIPT ERROR: Compile Error: Identifier not found: <AutoloadName>` (plus `Failed to compile depended scripts` for its dependents) on a script that references a project autoload (e.g. a call to one of your `[autoload]` singletons) — even though the autoload IS correctly registered in `project.godot` and the same script compiles and runs flawlessly in a real game boot. The error is a false negative of the check-only harness, not a real defect.

**Cause:** Autoload singletons are registered as compile-time-resolvable globals only when the full game/SceneTree initializes. `--check-only --script` parses/compiles the one script WITHOUT registering project autoloads, so any autoload identifier fails to resolve in that mode.

**Fix — correct verification routes for autoload-referencing scripts:**
- Bounded full headless boot of a scene that loads the script: `godot --headless --path . res://<your main scene>.tscn --quit-after 30 2>&1 | grep -E "SCRIPT ERROR|Failed to load"` — empty output = clean.
- Or read the open editor's log: `mcp__godot-mcp__godot_editor get_log_messages source="editor"`.
- Keep `--check-only --script` for autoload-FREE scripts only (pure-logic files) — there it remains a fast, reliable parse check.

**Detect proactively:** Before reaching for `--check-only --script` on a file, check it for references to any name in `project.godot`'s `[autoload]` section — any hit means check-only will false-fail; route through the bounded-boot check instead. Don't confuse with the `op=reimport` stale-log entry below: same `Identifier not found: <AutoloadName>` text, but that one is transient append-only editor-log noise after a reimport, while this one is structural to check-only mode and fires on every run.

**Confirmed by:** Godot 4.6.2 — the headless `--check-only --script` harness does not register `[autoload]` singletons; an autoload-referencing script that fails check-only with `Identifier not found: <AutoloadName>` still passes a bounded full headless boot and F5.

---

## godot-ai `op=reimport` logs STALE fatal-looking errors — autoload `Identifier not found` in dependents + preload `no resource loaders` on just-written assets (transient; read the log in deltas)

**Symptom:** After `mcp__godot-ai__filesystem_manage op=reimport` of a GDScript, `logs_read source="editor"` shows fatal-looking errors that are actually stale/transient:

- **(a)** Dependent scripts log `Compile Error: Identifier not found: <AutoloadName>` + `Failed to load script ... Compilation failed` when the reimported script IS the autoload they reference.
- **(b)** A script `preload()`ing binary assets (`.wav`/`.svg`) written moments earlier logs `Parse Error: Preload file "res://..." has no resource loaders (unrecognized file extension)` because the reimport raced the asset's `.import` sidecar generation.

Meanwhile the headless test suite passes and the game boots clean — the errors do not reflect current state.

**Cause:** Two races in the same family:

- **(a)** Reimporting an autoload script triggers dependent-script recompilation WHILE the autoload's own GDScript is mid-reload, so the global identifier is momentarily unresolvable. The editor logs the failure and never retracts it — the editor log buffer is **append-only** (`run_id` empty, never rotates; same buffer behavior noted in the `.gdshader` compile-check entry above).
- **(b)** `reimport` of a script whose `preload()` targets are brand-new binary assets can run before EditorFileSystem finishes generating those assets' `.import` sidecars — the parse fails on the missing loader, then the assets finish importing and the logged error is stale.

**Fix:** Treat the editor log as APPEND-ONLY and work in deltas: note `total_count` before a reimport batch; read with `offset=<previous total_count>` after. When these errors appear:

1. Verify prerequisites settled: `.import` sidecars exist on disk for every preloaded asset; the autoload is registered.
2. Re-reimport ONLY the failing script once.
3. Read the log delta again — zero NEW entries = clean; the earlier errors were transient.

Ordering that avoids most of it: reimport the autoload script alone first, then dependents in a second call; write binary assets and confirm their `.import` sidecars exist before reimporting scripts that `preload()` them.

**Detect proactively:** Any `op=reimport` batch that touches an autoload script, or a script `preload()`ing assets written in the same session — expect these log lines and apply the delta-read discipline before treating them as real failures. Sibling of the `class_name`-cache-stale entry above (same EditorFileSystem-timing family — there the reimport is the fix; here the reimport is the trigger). Truth signal when in doubt: the headless test suite + a clean boot, not the cumulative editor log.

---

## Installing a GDExtension while the editor is running crashes the editor instantly — server-level extensions can't hot-load

**Symptom:** Copied a new GDExtension addon (e.g. godot-rapier2d, a PhysicsServer2D replacement) into `addons/` while the Godot editor had the project open. The editor's filesystem watcher picked it up, wrote the extension to `.godot/extension_list.cfg`, then the editor process died instantly — no error dialog, no crash report, just gone.

**Cause:** Physics-server extensions (and other server-level extensions: rendering, audio) register at the Servers init stage, which only happens at process startup — they cannot hot-load into a running editor. The filesystem watcher's attempt to load the extension mid-session kills the process.

**Fix:**
- **Close the editor before dropping any `.gdextension` addon into the project** — especially server-level extensions (physics, rendering, audio).
- If the crash already happened: the `extension_list.cfg` registration the dying editor leaves behind is actually valid — the next launch loads the extension correctly at the proper init stage. No cleanup needed; just relaunch.

**Detect proactively:** Before any `cp`/`mv`/unzip that lands a `.gdextension` under `addons/`, check for a running editor (`ps aux | grep -i godot`) and close it first. Also verify any GDExtension install/upgrade with a headless editor boot (`godot --headless -e --quit --path .`) before trusting it in the GUI editor.

---

## A fatal startup error in a `--headless` run hangs forever instead of exiting (macOS modal alert)

**Symptom:** `godot --headless --path . --quit` (or any headless invocation) prints the engine banner then sits at 0% CPU forever. The exit code never arrives — `$?` lies by never happening. Looks like a hang or deadlock in the engine or a GDExtension.

**Cause:** Godot routes fatal setup errors through `OS_MacOS::alert()`, which runs a modal `NSAlert` `runModal` loop **even in headless mode** — an invisible (or easily-missed) dialog box parks the process. The actual error text is printed to stderr just before the hang (e.g. `Error: Can't run project: no main scene defined in the project.`).

**Fix / diagnosis:**
- Capture stderr (don't `2>/dev/null`) and read the last lines before the silence — the real error is there.
- Confirm the modal-alert stack with `sample <pid> 1 | grep alert` (shows `Main::setup → OS_MacOS::alert → -[NSAlert runModal]`).
- Kill the process; fix the underlying error.

Related to the "Headless `--script` test-harness exit codes lie" entry above — this is the macOS-alert flavor where the exit code never even arrives. The perl-alarm timeout wrapper documented there also bounds this hang.

**Detect proactively:** Any headless run that goes silent at 0% CPU after the banner: read stderr first, then `sample` the PID for `NSAlert` before suspecting an engine/GDExtension deadlock.

---

## Injected MCP mouse clicks act at one fixed wrong world position when the handler uses `get_global_mouse_position()`

**Symptom:** godot-ai `game_manage op=input_mouse event="button"` returns `sent:true` and the game's `_unhandled_input` genuinely fires — but a click handler that calls `get_global_mouse_position()` acts at a far-off-window position, and EVERY injected click acts at the SAME wrong position (e.g. one fixed world x repeatedly; spawned bodies land in the void and freefall). The freefall can look exactly like physics tunneling. Injecting `event="motion"` first does NOT fix it.

**Cause:** The injected `InputEventMouseButton` carries its `position`, but `get_global_mouse_position()` reads the Viewport's tracked OS cursor, which sits wherever the real mouse is (outside the game window in MCP-driven sessions). Injected motion events don't warp the tracked cursor either.

**Fix:** In click handlers that should be injectable/testable, use the event's own position converted to world space:

```gdscript
var world_pos := get_canvas_transform().affine_inverse() * event.position
```

Identical behavior for real clicks, correct for injected ones.

**Detect proactively:** Grep input handlers before MCP-driven testing: `grep -rn 'get_global_mouse_position' scripts/` — any hit in a click handler will misbehave under injected input. Trap note: the freefalling-body signature (huge y, ~constant gravity acceleration, same spawn x every time) reads as "physics blasted the body through the floor" — check the spawn position before blaming the solver. Identical x across independent drops is the giveaway.

---

## Rapier Fluid2D particles silently leak/explode through static walls when per-step travel exceeds the SPH kernel radius

**Symptom:** Fluid particles vanish through a `StaticBody2D` container with no error; reading the `Fluid2D` `points` at runtime shows positions at y ~ 4e6 / x ~ ±30k. The pool's level mysteriously stops rising (leak rate = pour rate). Also affects the addon `Faucet2D`'s injected stream. Worse at smaller `physics/rapier/fluid/fluid_particle_radius_2d`.

**Cause:** SPH boundary coupling is only as thick as the kernel radius (= `fluid_smoothing_factor` × `fluid_particle_radius_2d`; defaults 2.0 × 20). A particle moving faster than ~kernel-radius-per-physics-step (e.g. 20 px/frame = 1200 px/s at radius 10) crosses the boundary's sampled region in one step; the resulting pressure spike ejects it ballistically. The addon's `Faucet2D` hardcodes its injection velocity to full gravity speed (980 px/s) in `_ready`, which after any fall distance exceeds the limit. The same spike can eject coupled `RigidBody2D`s.

**Fix:** Keep fluid impact speeds under ~kernel radius per physics step:
- Override `faucet.velocities_new` with a gentle velocity after `add_child` (its `_ready` already ran).
- Shorten drop heights.
- Thicken container walls.
- Raise `fluid_smoothing_factor`.
- For rigid bodies interacting with agitated fluid, set `continuous_cd = RigidBody2D.CCD_MODE_CAST_SHAPE` as a containment backstop.

**Detect proactively:** Before lowering `fluid_particle_radius_2d` or adding a tall faucet drop, compute kernel radius (`smoothing_factor × particle_radius`) and the per-step travel at expected impact speed (speed / physics fps) — travel > kernel radius means leaks. At runtime, sample `Fluid2D.points` extrema: any |coordinate| in the tens of thousands means particles already escaped.

---

## godot-ai MCP server won't launch on Intel macOS — `cryptography` 49 has no x86_64 wheel + ancient Rust

**Symptom:** The godot-ai editor dock shows:

> The server exited before the WebSocket handshake, even after a `uvx --refresh` retry. If this is a brand-new release, PyPI's index may still be propagating (~10 min). Wait a moment and click Reload Plugin to retry, or check Godot's output log for Python's traceback. Target: godot-ai==2.7.5.

godot-ai never connects (`/mcp` shows it disconnected); ports 8000 (HTTP/MCP) and 9500 (WebSocket) stay free because the Python server process never starts. The error's own hypothesis ("brand-new release / PyPI propagating") and "downgrade the godot-ai version" are BOTH red herrings — see Cause.

**Cause:** A three-part environment trap, and it is **version-INDEPENDENT**:

1. The machine is Intel / x86_64 macOS.
2. `cryptography==49.0.0` ships **NO x86_64-macOS wheel**. Verified with uv's resolver on Python 3.11/3.12/3.13/3.14 — all report "cryptography==49.0.0 has no usable wheels." So uv is forced to build it from source on EVERY Python (the "use a newer/older Python" angle is a dead end — wheel availability is gated on the platform, not the Python).
3. Building from source needs Rust, but the toolchain here is `cargo/rustc 1.43.1` (May 2020) — older than Cargo workspace inheritance (added in cargo 1.64, Sept 2022), which cryptography 49's vendored `src/rust/Cargo.toml` uses. So `cargo metadata` fails with `invalid type: map, expected a sequence for key 'package.authors'`, maturin's `build_wheel` returns non-zero, uv aborts the install, and the server never starts. (cryptography 49's real MSRV is far above 1.43 regardless.)

Dependency chain: the dock runs `uvx --from godot-ai==<ver> godot-ai`; godot-ai → `fastmcp` 3.4.2 → `fastmcp-slim[client]` → `authlib` 1.7.2 → `cryptography` 49.0.0 (uv picks the newest cryptography satisfying authlib, and godot-ai declares only a range `fastmcp>=3.0.0,!=3.3.*,<3.5.0`).

**Version-independent:** godot-ai 2.7.4 fails identically — `pyproject.toml` is byte-identical between 2.7.4 and 2.7.5 except the version string, so downgrading the addon does nothing. (For reference, the only functional change in godot-ai 2.7.5 was PR #558 "Capture exact GDScript write diagnostics" — unrelated to deps/networking.)

**Fix (verified end-to-end):** Constrain cryptography to `<49`. uv then resolves `cryptography==48.0.1` — the last version WITH an x86_64-macOS wheel — still satisfying authlib 1.7.2 + fastmcp 3.4.2. The whole 67-package tree installs from wheels: no Rust, no native build. Verified: `Installed 67 packages in 152ms`; the server boots and binds `127.0.0.1:8000` (HTTP/MCP) + `127.0.0.1:9500` (WebSocket), logging "Application startup complete."

The dock spawns `uvx` as a child of the editor and uvx honors the `UV_CONSTRAINT` env var. So:

1. Create a constraints file (e.g. `~/.config/godot-ai/constraints.txt`) containing `cryptography<49`.
2. Launch the editor with `UV_CONSTRAINT` set so the dock's uvx child inherits it:

   ```bash
   UV_CONSTRAINT="$HOME/.config/godot-ai/constraints.txt" /Applications/Godot.app/Contents/MacOS/Godot --path . -e
   ```

   A terminal launch (or a wrapper/alias) scopes the var to just the Godot process tree.
3. In the dock, click Reload Plugin (or it starts fresh on launch), then `/mcp` to reconnect.

**WARNING:** do NOT `export UV_CONSTRAINT` globally in `~/.zshrc` or via `launchctl setenv` — that forces `cryptography<49` on EVERY uv operation machine-wide, which can break an unrelated Python project that needs cryptography ≥49. Keep it scoped to the editor launch.

Alternative fixes (heavier): `rustup update` (+ likely Homebrew OpenSSL + env) so cryptography 49 builds from source natively (slow, recompiles each bump); or move to Apple Silicon (has wheels). Drop the constraint if you do either.

**Detect proactively:**
- Any `uvx`/`uv`-launched Python tool with a native (Rust/C) extension on Intel macOS: before blaming a version bump, check whether the offending transitive dep actually has a wheel for this platform — `uv venv /tmp/t --python 3.13 && uv pip install --python /tmp/t/bin/python --only-binary :all: '<pkg>==<ver>' --dry-run` ("has no usable wheels" = no wheel → forced source build). If a source build is forced, check Rust age (`cargo --version`) — anything pre-1.64 can't build modern crates.
- "Server exited before the WebSocket handshake" / "exits before handshake" from an MCP dock almost always means the install/spawn failed, not a networking issue — read the actual `uvx` build output (run the dock's command by hand) before touching ports/firewall/version.

This is an environment (per-machine, Intel mac) gotcha, not a code one — unlike the other godot-ai entries above (`uid`-omission, `class_name` cache, custom-resource, Vector2i, Skeleton3D bones, AnimationTree), which are about godot-ai's writer/RPC surface. Cross-references `docs/godot-mcp-guide.md` for the godot-ai server surface.

**Confirmed by:** Diagnosed and verified end-to-end on Intel/x86_64 macOS — uv resolves `cryptography==48.0.1` (last x86_64-mac wheel), the whole 67-package tree installs wheel-only (no Rust, no native build), and the server boots and binds 8000/9500.

---

## godot-ai MCP server won't launch on Apple Silicon — `uvx` resolves x86_64 wheels because the Python interpreter is x86_64

**Symptom:** The godot-ai editor dock shows:

> The server exited before the WebSocket handshake, even after a `uvx --refresh` retry. If this is a brand-new release, PyPI's index may still be propagating (~10 min). Wait a moment and click Reload Plugin to retry, or check Godot's output log for Python's traceback. Target: godot-ai==<ver>.

godot-ai never connects (`/mcp` shows it disconnected); ports 8000 (HTTP/MCP) and 9500 (WebSocket) stay free because the Python server process never starts. The dock log (or a direct `uvx` run) shows `Building cryptography==49.0.0` then `Failed to build` — maturin / `cargo metadata` errors with `invalid type: map, expected a sequence for key 'package.authors'`.

This is the **Apple Silicon (arm64) variant** of the Intel-mac `cryptography`-wheel gotcha above: same symptom, same dependency chain (`fastmcp` 3.4.x → `authlib` → `cryptography>=49`), but a different root cause and a different fix. Here the box is arm64 yet `uvx` is resolving x86_64 wheels.

**Cause:** The dock launches its Python server with `uvx --from godot-ai==<ver> godot-ai` (the `uvx` binary is resolved by godot-ai's `CliFinder`, which checks `~/.local/bin` → `~/.cargo/bin` → `/opt/homebrew/bin` → `/usr/local/bin`, in that order). **uv resolves wheels for the Python INTERPRETER's architecture, not uv's own.** If `uvx` selects an x86_64 Python, it resolves x86_64-macOS wheels. `cryptography>=49` dropped its x86_64-macOS wheel, so uv falls back to building from source, which needs a modern Rust toolchain. On a machine whose toolchain is x86_64 — the classic case is Intel Homebrew at `/usr/local` running under Rosetta on Apple Silicon (often inherited via Migration Assistant, sometimes with a years-old Rust) — the source build fails, the server never installs, and the dock reports "exited before the WebSocket handshake."

Two red herrings the error (and instinct) lead you to, both WRONG:

1. **"Brand-new release / PyPI propagating"** and **"downgrade the godot-ai version"** — godot-ai's deps are version-independent *ranges*, so an older godot-ai (e.g. 2.7.4) resolves the exact same `fastmcp`/`cryptography` and fails identically. The addon version is not the variable.
2. **Installing a native arm64 `uv` is NECESSARY BUT NOT SUFFICIENT** — uv still resolves for the *Python's* arch, so an x86_64 Python under an arm64 uv still fails.

**Fix (verified end-to-end: `Installed 67 packages`, server boots and binds `127.0.0.1:8000` + `127.0.0.1:9500`):**

1. **Install a NATIVE arm64 `uv` into `~/.local/bin`** (`CliFinder` checks it first): `curl -LsSf https://astral.sh/uv/install.sh | sh`, run from a native arm64 shell. Verify `arch` = `arm64` and `file ~/.local/bin/uvx` reports arm64.
2. **Force a managed (non-system) Python** via `~/.config/uv/uv.toml`:

   ```toml
   python-preference = "only-managed"
   ```

   This makes `uvx` use a uv-managed Python rather than the x86_64 system/Homebrew one. `uvx` reads user config for this. (Note: `uvx` does NOT honor `constraint-dependencies` from config, but DOES honor `python-preference` — so the `UV_CONSTRAINT` approach in the Intel-mac entry above is the lever there, `python-preference` is the lever here.)
3. **Gotcha-within-the-gotcha — curate the managed Python pool to arm64-only.** `only-managed` selects the **highest-VERSION** managed Python, regardless of architecture. A leftover uv-managed *x86_64* Python that is higher-version than your arm64 one will be chosen and reintroduce the failure. Fix the pool:

   ```bash
   uv python uninstall <the x86_64 managed python>
   uv python install <current>      # a native arm64 uv fetches an aarch64 build
   uv python list --only-installed | grep python   # must show ONLY ...aarch64...
   ```
4. Click **Reload Plugin** in the godot-ai dock (its retry re-runs `uvx` and now succeeds). No full editor restart needed once the pool is arm64-only.

**Verification discipline (this caused a false "fixed" during diagnosis):** ALWAYS verify with `--refresh`. A bare `uvx` (no `--refresh`) reuses any cached env and gives a FALSE pass — and the dock's retry uses `--refresh`, so a bare-`uvx` pass does not predict the dock:

```bash
~/.local/bin/uvx --refresh --from godot-ai==<ver> godot-ai --version
# must print "godot-ai <ver>" with NO "Building cryptography"
```

**Detect proactively:**
- "Server exited before the WebSocket handshake" from the godot-ai dock = the `uvx` INSTALL/spawn failed, not a network/port/firewall issue. Reproduce by running the dock's command directly and reading the traceback: `~/.local/bin/uvx --refresh --from godot-ai==<ver> godot-ai --version`.
- On Apple Silicon, check toolchain arch before blaming godot-ai: `arch` (should be `arm64`), `file "$(command -v uv)"`, `file "$(python3 -c 'import sys;print(sys.executable)')"`. An x86_64 `uv`/`python3` (e.g. resolved under `/usr/local` = Intel Homebrew) is the tell. The same class of failure hits ANY `uvx`/`uv`-launched tool with a native (Rust/C) extension that lacks an x86_64-mac wheel.
- Cross-check a suspect transitive dep's wheel availability without installing — in a throwaway venv: `uv pip install --only-binary :all: '<pkg>==<ver>' --python-platform aarch64-apple-darwin --dry-run` (arm64) vs the default. "No usable wheels" for x86_64 but "Would install" for arm64 confirms the arch is the variable.

Sibling to the Intel-mac `cryptography`-wheel entry above (same symptom + dependency chain). There the box is genuinely x86_64 and the fix is `UV_CONSTRAINT=cryptography<49`; here the box is arm64 and the fix is a native arm64 uv + a managed arm64 Python. Both are environment (per-machine) gotchas, not code ones. Cross-references `docs/godot-mcp-guide.md` for the godot-ai server surface.

**Confirmed by:** Diagnosed and verified end-to-end on Apple Silicon — `Installed 67 packages`, server boots and binds `127.0.0.1:8000` + `127.0.0.1:9500`.

---

## godot-ai script `ext_resource` `uid=` won't materialize for a BRAND-NEW script until the editor's FS watcher scans it — `reimport` no-ops; on macOS `osascript`-activate the window FIRST, then reimport, then save

**Symptom:** After creating a brand-new `.gd` script (via the Write tool), attaching it to a node, and `scene_save` via godot-ai, the saved `.tscn` `[ext_resource type="Script" ...]` line for that script has **no `uid=`** (path-only, inconsistent with sibling scripts, fragile on later rename/move). Calling `mcp__godot-ai__filesystem_manage op=reimport` on the script — even repeatedly — does **NOT** fix it: the `.uid` sidecar / `uid_cache.bin` stays unpopulated (the reimport reports success), and a second `scene_save` still emits the `ext_resource` without `uid=`.

**Cause:** For a brand-new script file, the editor's filesystem watcher hasn't yet scanned the file into its `EditorFileSystem`, so `reimport` operates on an unscanned entry and **silently no-ops** the UID materialization while reporting success. The reimport can only generate the `.uid` / populate `uid_cache.bin` once the editor's FS watcher has registered the file. This is the concrete root of the `uid=`-omission entry above ("`.uid` sidecar doesn't exist yet at save time") and a specific instance of the brand-new-directory `reimport` no-op trap (trap 3 of the `class_name` cache-stale entry above) — as of godot-ai v2.7.2, `write_text` no longer forces a scan either, so the only remedy is to wake the watcher.

**Fix (verified — wake the FS watcher FIRST, then reimport, then save):** On macOS, **activating the editor window triggers the rescan**. Sequence:

1. `osascript` to activate the Godot app/window (forces the FS watcher to scan the new file).
2. `mcp__godot-ai__filesystem_manage op=reimport` on the script — now operates on a scanned entry, generates the `.uid` / populates `uid_cache.bin`.
3. `mcp__godot-ai__scene_save` — godot-ai now writes a clean one-line `uid=` on the `ext_resource`.

In practice the `uid=` appeared only on the **THIRD** save: (1) first save → no uid; (2) reimport + second save → still no uid (unscanned entry, reimport no-op); (3) osascript-activate + reimport + third save → `uid="uid://..."` present. The `osascript`-activate → reimport → scene_save ordering is the new, concrete lever; mere repeated reimport is not enough.

**Detect proactively:** After any godot-ai scene edit that attaches a freshly-Written script, grep the saved `.tscn` for that script's `ext_resource` line — if it has `path=` but no `uid=` while siblings do, the FS watcher hasn't scanned it: `osascript`-activate the editor window, reimport, re-save, then re-grep to confirm `uid=` is present. Do NOT trust a `reimport` success report on a brand-new script as proof the UID materialized. See the `uid=`-omission entry and the `class_name` cache-stale entry (trap 3) above; also `docs/godot-mcp-guide.md` for the godot-ai writer surface.

**Confirmed by:** godot-ai MCP server v2.7.2, Godot 4.6.2-stable, macOS — `uid=` materialized only on the THIRD save (osascript-activate → reimport → scene_save).

---

## (Existing project-level gotchas)

These also exist but live in their own dedicated docs — listed here for discoverability:

- **Godot MCP tool quirks** — see `docs/godot-mcp-guide.md`. Covers: single-client WS bridge, leaked processes, runtime-vs-edit-time state, scene-mutation-on-wrong-scene risk, console-capture quirks (`get_console_output` category/session traps).
- **Blender MCP tool quirks** — see `docs/blender-mcp-guide.md`. Covers: schema inconsistencies, data-API-over-`bpy.ops`, depsgraph staleness, edit-mode bmesh, glTF Material Output AO pattern, Blender 5.x API drift.
- **Asset pipeline shape** — see `docs/asset-pipeline.md`.

---

## Adding new gotchas

When you hit something the engine does that surprised you, add an entry above using the same shape: symptom → cause → fix → (optional) detect-proactively. Keep entries terse — the goal is fast scan-ability, not exhaustive prose. Cross-link to `docs/godot-mcp-guide.md` or `docs/blender-mcp-guide.md` for tool-specific surfaces.
