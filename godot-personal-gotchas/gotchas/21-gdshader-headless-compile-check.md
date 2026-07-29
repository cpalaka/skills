### 21. `--check-only` is blind to `.gdshader` — but a headless run DOES type-check one, if you bind it to a ShaderMaterial

**Symptom**
You want a compile-check of a hand-authored `.gdshader` without an F5. `godot --headless --check-only --quit` reports clean even when the shader has syntax/type errors — and so does a headless `--script` run that merely `preload()`s the shader or sets `Shader.code`.

**Cause**
Nothing compiles a shader until it is bound into a **material**. `--check-only` parses GDScript and never instantiates anything, so it cannot reach a shader. Setting `Shader.code` alone also compiles nothing.

**What binding actually gets you (MEASURED on 4.7.stable, 2026-07-25 — this corrects the earlier claim)**
The dummy RenderingServer used by headless runs **does compile and type-check shader code**; the errors come out of `servers/rendering/dummy/storage/material_storage.cpp` `shader_set_code` as real `SHADER ERROR:` / `ERROR: Shader compilation failed.` lines at column 0. Confirmed caught headless: invalid assignment (`float` to `vec3`), unknown identifier, the 16-`instance uniform` cap ("Too many 'instance' uniforms in shader, maximum supported is 16"), and both invalid instance-uniform qualifiers (arrays and samplers → "The 'SCOPE_INSTANCE' qualifier is not supported for …"). The earlier version of this gotcha said the dummy server "never compiles shaders" — that is **false on 4.7**; the real gate was always the *material binding*, not the renderer.

**Fix — cheap headless gate (no editor, no F5)**
```gdscript
extends SceneTree
const Sh := preload("res://path/to/foo.gdshader")
func _initialize() -> void:
    var mat := ShaderMaterial.new()
    mat.shader = Sh          # <- THIS is what compiles it; preload alone does not
    quit(0)
```
Run it and treat any `^SHADER ERROR` in the output as failure. Six traps, all measured:
- **`Shader.code = "..."` does not compile.** Only the `mat.shader = sh` binding does. Keeping the `Shader` alive does *not* help either — a shader held in an array with broken code set and no material stays silent, so this is not a RefCounted-lifetime artifact.
- **`load()`/`preload()` of a broken `.gdshader` raises NOTHING.** Verified by writing a deliberately-broken shader to `user://` and `load()`ing it: silent. So a test that only imports the resource proves nothing — and adding `^SHADER ERROR` to a runner's fail patterns does **not** by itself buy you shader coverage, because nothing in a typical suite binds a shader to a material. You need the binding.
- **Test runners usually don't grep for it.** A suite that greps `^SCRIPT ERROR` / `^Failed to load script` stays green through a `SHADER ERROR` — so assert on it inside the test *and* add `^SHADER ERROR` to the runner's fail patterns; neither alone is sufficient.
- **The `SHADER ERROR` line does not name the shader file.** It reports `at: (null) (:4)` — a line number with no path. Only the following `ERROR: Shader compilation failed.` carries a real `at:`, and that names the *engine* source (`shader_set_code (servers/rendering/dummy/storage/material_storage.cpp:192)`), never your `.gdshader`. The GDScript backtrace beneath it points at the line that did the binding — so a gate that binds several shaders in a loop cannot tell you which one failed unless you print your own marker per shader.
- **Only the FIRST error is reported.** A shader with an invalid assignment on line 4 *and* an unknown identifier on line 5 emits one `SHADER ERROR` for line 4 and stops. Re-run after each fix; a clean pass one edit later does not mean there was only ever one problem.
- **`Shader.get_shader_uniform_list()` cannot see `instance uniform`s at all.** A shader with 3 plain + 4 instance uniforms reports **3**. So the editor-open uniform enumeration below — and any test asserting "the shader exposes the params my GDScript sets" — silently under-reports the surface. Never use that list to confirm an `instance uniform` was declared, or to cross-check `set_instance_shader_parameter()` call sites against the shader.

(A code path that *does* compile it incidentally: production code that builds its own `ShaderMaterial` from a preloaded shader. If a test drives that path, the shader is compiled as a side effect — which is worth knowing when deciding whether you already have coverage.)

**Fix — editor OPEN (also enumerates the uniform surface)**
Still useful when you want the uniform list cross-checked against what the GDScript consumer will `set_shader_parameter()`:
1. `godot-ai material_manage op=create params={path:"res://shaders/_tmp.tres", type:"shader", shader_path:"res://shaders/foo.gdshader", overwrite:true}`.
2. `godot-ai material_manage op=get params={path:"res://shaders/_tmp.tres"}` — the returned `shader_parameters` enumerate the uniforms, which only succeeds if the shader parsed.
3. `godot-ai logs_read source="editor"` — no `SHADER ERROR` line = clean.
4. Delete the throwaway `.tres`/`.uid`/`.import`. (zsh: a glob with no match aborts the whole `rm` line — split it out.)

**What is still genuinely headless-blind**
Only *rendered behaviour*: actual pixels, whether a uniform is wired to the value you think, whether an effect reads at all, GPU-specific compile/link failures, and anything about visual correctness. Authoritative GPU compilation still happens at F5. So: **syntax and types → headless is enough; look and feel → F5.**

**Detect proactively**
When a plan's per-task gate is "compile-check this script", it does NOT cover a `.gdshader` via `--check-only` — but do not conclude the shader is unverifiable without an F5 either. Add the 6-line material-binding check above. Beware any project comment or plan asserting "a .gdshader never compiles headless" (space-miner-game's `cell_split_3d.gdshader` header said exactly that) — it is stale.

**Confirmed by**
- 2026-06-03 — `circle-combat-prototype`, scope-1 stylization Task 2 (`shaders/stylize_post.gdshader`): editor-open `get` enumerated all 8 uniforms with exact types+defaults.
- 2026-07-25 — `space-miner-game` task-137 (A3D-WS2c), Godot 4.7.stable.official.5b4e0cb0f: direct probe binding deliberately-broken shaders to a `ShaderMaterial` headless; every error class above was raised. This is what corrected the "never compiles" claim, and it also verified the `CUSTOM0` → `varying flat` → `instance uniform` construct headless before any F5.
- 2026-07-28 — **independently re-measured** during the parity audit that draft-007 queued (same engine build, a throwaway project outside any game repo), because the correction had been filed straight into this skill without a second pass. Seven cases, each in its own process: `Shader.code` set then dropped → silent; `Shader.code` set and kept alive, no material → silent; bound to a `ShaderMaterial` → `SHADER ERROR` + `Shader compilation failed`; `load()` of a valid shader → silent; **`load()` of a deliberately broken `.gdshader`, no material → loads fine, NO error**; `load()` of the broken one *then* bound → errors; and a control binding a *valid* shader → silent (so the error is attributable to the code, not to binding as such). Also re-derived: the instance-uniform cap is exactly 16 (17 fails, 16 clean — both directions), both qualifier rejections, and the `get_shader_uniform_list()` blindness. Every claim above reproduced. Note the first attempt returned a clean sheet on *all seven* cases because the sandbox denied `user://` and the script never ran (#88) — the known-positive binding case is what exposed the dead instrument.
