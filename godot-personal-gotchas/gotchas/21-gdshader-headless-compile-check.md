### 21. Can't compile-check a `.gdshader` headless — the dummy RenderingServer never compiles shaders

**Symptom**
You want a per-task compile-check of a hand-authored `.gdshader` without an F5 and without wiring it into a used material. `godot --headless --check-only --quit` (and any headless run) reports clean even when the shader has syntax/type errors.

**Cause**
A `.gdshader` only compiles when a **real** RenderingServer loads it into a *used* material. Headless runs use the **dummy RenderingServer**, which never compiles shaders; a bare filesystem import/scan doesn't compile it either (`.gdshader` has no import system — the scan just registers the file).

**Fix (editor OPEN = real RenderingServer)**
1. `godot-ai material_manage op=create params={path:"res://shaders/_tmp.tres", type:"shader", shader_path:"res://shaders/foo.gdshader", overwrite:true}` — throwaway ShaderMaterial.
2. `godot-ai material_manage op=get params={path:"res://shaders/_tmp.tres"}` — the returned `shader_parameters` **enumerate the shader's uniforms**, which only succeeds if the shader PARSED (also a cheap cross-check that the uniform surface matches what the GDScript consumer will `set_shader_parameter()`).
3. `godot-ai logs_read source="editor"` — no `SHADER ERROR` line = clean.
4. Delete the throwaway `.tres`/`.uid`/`.import`. (zsh: a glob with no match aborts the whole `rm` line — split it out.)

Authoritative GPU compile still only happens at F5; this is the cheap per-task gate.

**Detect proactively**
When a plan's per-task gate is "compile-check this script," remember it does NOT cover a `.gdshader` — `--check-only` is blind to shaders. Use the editor-open `material_manage create/get` technique, or treat the F5 gate as the real shader exercise. (Ties to preference #6: GUT/`--check-only` green ≠ everything compiles.)

**Confirmed by**
2026-06-03 — `circle-combat-prototype`, scope-1 stylization Task 2 (`shaders/stylize_post.gdshader`); `get` enumerated all 8 uniforms with exact types+defaults, editor log `total_count:0`. See memory `gotcha-shader-compile-check-no-headless.md`.
