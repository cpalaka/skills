### 47. `godot --headless` segfaults in MoltenVK (`SPIRVToMSLConverter`) inside the Claude Code command sandbox

**Symptom**
- `godot --headless …` crashes with `signal 11` (SIGSEGV) deep in `mvk::SPIRVToMSLConverter::convert` during rendering-device init — on macOS, when the command is launched **inside the Claude Code command sandbox**.
- It crashes even with the most minimal invocation: NO project and NO script (`godot --headless --quit`), so it is not project/scene/script code.
- `--rendering-driver dummy` and `--rendering-driver opengl3` do NOT avoid it, and forcing either arch slice of a universal binary (`arch -arm64 …` / `arch -x86_64 …`) does NOT help.
- The only pre-crash log line is a benign `Failed to open 'user://logs/…'` (an unrelated red herring).

**Cause**
The command sandbox blocks the GPU/Metal device access MoltenVK needs at headless boot. Instead of degrading to the dummy renderer, the rendering-device init path dereferences into MoltenVK's SPIRV→MSL conversion and segfaults. The GUI editor is unaffected — it is the user's own, non-sandboxed process (so an open editor / godot-ai stays connected and healthy).

This masquerades as several things it is NOT: a Godot 4.7 regression, an x86_64-vs-arm64 toolchain problem, or a break introduced by your current changes. A pure-math test untouched by current work crashes identically — proof the crash is environmental (the sandbox), not code.

**Fix**
Run `godot --headless …` (the headless test suite, `--import`, `--check-only`, anything) with the sandbox **disabled**:
- `dangerouslyDisableSandbox: true` on the Bash tool call, OR
- have the user run it in their own (non-sandboxed) terminal.

Unsandboxed it boots clean (`rc=0`) and the suite runs green. Manage the sandbox via `/sandbox`.

**Detect proactively**
If a `godot --headless` invocation segfaults at boot with a MoltenVK / `SPIRVToMSL` / rendering-device frame in the trace — especially when it crashes with NO project AND a pure-logic test crashes the same way — suspect the sandbox FIRST, before chasing a Godot version, an arch mismatch, or your own diff. Re-run once with `dangerouslyDisableSandbox: true` to confirm. (A project's `tests/run_tests.sh` is the usual trigger.) Sibling to #31 (another macOS headless-boot hang) and #27 (headless exit codes lie — a segfault here also produces a misleading exit code).

**Confirmed by**
2026-06-24, `space-miner-prototype` (Godot 4.7-stable, universal arm64+x86_64). `godot --headless --quit` with no project segfaulted in `mvk::SPIRVToMSLConverter::convert`; `--rendering-driver dummy`/`opengl3` and both arch slices reproduced it; `test_vacuum_math.gd` (pure math) crashed identically. Disabling the sandbox booted clean (`rc=0`), suite green (7/7 files, 60/60 checks).
