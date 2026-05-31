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

**Cause:** With `_player: CharacterBody3D`, the static parser only knows about `CharacterBody3D`'s built-in members. Script-defined symbols (custom exports, methods, signals) aren't visible to the parser unless the source script declares `class_name Foo` — making `Foo` a globally-known type. Without `class_name`, `_player.script_member` resolves to Variant; `:=` inference fails the same warnings-as-errors gate as the `clamp` family above.

**Fix:** Two options, in order of preference:

1. **Add `class_name` to the source script** — e.g. `class_name Player extends CharacterBody3D` at the top of `player.gd`. Makes its members statically visible everywhere. Side effect: `Player` becomes a global identifier.
2. **Annotate the consumer explicitly** — `var steering: bool = _player.is_steering()`. Minimal surgical fix; doesn't touch the source script. Use when adding `class_name` would cause naming friction.

**`mcp__godot__get_diagnostics` does NOT catch this** — the per-file LSP has no cross-script context and reports the file clean. The engine parser at script-load time is what fails. Always cross-check `mcp__godot-mcp__godot_editor get_log_messages source="editor"` after writing cross-script access. (See `docs/godot-mcp-guide.md` → "Reading errors when the scene fails to load".)

**Detect proactively:** When writing GDScript that touches `other_node.some_member` where `some_member` is declared on `other_node`'s attached script, prefer typed annotations on the consumer side or add `class_name` to the source.

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
| `clamp`, `min`, `max`, `abs`, `sign`, `floor`, `ceil`, `round` | `exp`, `log`, `sqrt`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `pow`, `lerp`, `inverse_lerp`, `remap`, `smoothstep`, `move_toward`, `ease`, `snapped`, `posmod`, `fposmod`, ... |

Note the rare exception: `wrap` is Variant, `wrapf` exists — so don't blanket-assume the lack of typed variants either.

**Fix:**
- Use the bare global: `exp(x)`, `sqrt(x)`, `sin(x)`, `pow(x, y)`, `lerp(a, b, t)`.
- If you need a typed float result, annotate the receiver: `var k: float = exp(-rate * dt)`. The Variant return coerces.
- Do NOT invent `expf`, `sqrtf`, `sinf`, `cosf`, `powf`, `logf`, `lerpf`, etc. — none exist.

**Detect proactively:** Before writing any `<math>f(` form, mentally check the whitelist above. Grep heuristic for review: `grep -nE '\b(expf|sqrtf|sinf|cosf|tanf|powf|logf|asinf|acosf|atanf|atan2f|lerpf|smoothstepf|move_towardf|easef)\(' scripts/` — any hit is a parse error waiting at F5. Sibling-but-inverse to the `clamp`/`clampf` entry above: that one says "the typed variant DOES exist, prefer it"; this one says "the typed variant does NOT exist, don't write it by analogy."

---

## `class_name` cache stale when new script is created outside the editor

**Symptom:** Headless Godot invocations (`godot --headless ... -s addons/gut/gut_cmdln.gd`, `godot --check-only --quit`, custom CLI scripts) fail with `SCRIPT ERROR: Parse Error: Could not find type "X" in the current scope.` for a `class_name X` type that demonstrably exists — the `.gd` file is on disk, the editor is open with the project loaded, and `mcp__godot__get_diagnostics` returns clean diagnostics for both the new file and any file referencing the type. GUT reports `Failed to load script ... with error "Parse error"` followed by `WARNING: Ignoring script ... because it does not extend GutTest`. The error message points at the *consumer* of the new type, not the missing cache entry, which makes the diagnosis indirect.

**Cause:** When a new `.gd` file declaring `class_name X` is created **externally to the editor** (Claude's Write tool, `cat > file.gd`, copy via Finder, scaffolding scripts, MCP file-creation patterns), the on-disk `.godot/global_script_class_cache.cfg` is NOT updated immediately. The editor's LSP can parse files on demand (so per-file diagnostics succeed and give a false-positive green), but the cache file — which **separate headless Godot processes consult to resolve `class_name` references** — only refreshes when the editor's FileSystem dock actually rescans. Rescan triggers: editor-window focus, FileSystem dock interaction, scene save. Files created via the editor's "New Script…" dialog do NOT hit this (the dialog writes the cache as part of its action); edits to existing `class_name` files do NOT hit this either.

**Fix:**
- Focus the editor window (or click anywhere in the FileSystem dock) to trigger a scan. This rewrites `.godot/global_script_class_cache.cfg` with the new `class_name` entries.
- Verify before retrying headless: `grep -c "<ClassName>" .godot/global_script_class_cache.cfg` must return `> 0`.
- Then re-run the headless command.

**Detect proactively:**
- Any time a new `class_name`-declaring script is created via tooling (not the editor's New Script dialog), assume the cache is stale until proven otherwise.
- Before any headless GUT / `--check-only` / CLI invocation that exercises a freshly-added `class_name`, grep the cache: `grep -c "<NewClassName>" .godot/global_script_class_cache.cfg`. Zero hits → focus the editor first.
- Do NOT trust `mcp__godot__get_diagnostics` clean output as evidence the headless run will pass — the LSP parses on demand and does not consult the cache.

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

## (Existing project-level gotchas)

These also exist but live in their own dedicated docs — listed here for discoverability:

- **Godot MCP tool quirks** — see `docs/godot-mcp-guide.md`. Covers: single-client WS bridge, leaked processes, runtime-vs-edit-time state, scene-mutation-on-wrong-scene risk, console-capture quirks (`get_console_output` category/session traps).
- **Blender MCP tool quirks** — see `docs/blender-mcp-guide.md`. Covers: schema inconsistencies, data-API-over-`bpy.ops`, depsgraph staleness, edit-mode bmesh, glTF Material Output AO pattern, Blender 5.x API drift.
- **Asset pipeline shape** — see `docs/asset-pipeline.md`.

---

## Adding new gotchas

When you hit something the engine does that surprised you, add an entry above using the same shape: symptom → cause → fix → (optional) detect-proactively. Keep entries terse — the goal is fast scan-ability, not exhaustive prose. Cross-link to `docs/godot-mcp-guide.md` or `docs/blender-mcp-guide.md` for tool-specific surfaces.
