### 31. A fatal startup error in a `--headless` run hangs forever instead of exiting (macOS modal alert)

**Symptom**
`godot --headless --path . --quit` (or any headless invocation) prints the engine banner then sits at 0% CPU forever. The exit code never arrives — `$?` lies by never happening. Looks like a hang or deadlock in the engine or a GDExtension.

**Cause**
Godot routes fatal setup errors through `OS_MacOS::alert()`, which runs a modal `NSAlert` `runModal` loop **even in headless mode** — an invisible (or easily-missed) dialog box parks the process. The actual error text is printed to stderr just before the hang (in the confirming case: `Error: Can't run project: no main scene defined in the project.`).

**Fix**
- Capture stderr (don't `2>/dev/null`) and read the last lines before the silence — the real error is there.
- Confirm the modal-alert stack with `sample <pid> 1 | grep alert` (shows `Main::setup → OS_MacOS::alert → -[NSAlert runModal]`).
- Kill the process; fix the underlying error.

Sibling to #27 (headless exit codes lie) — this is the macOS-alert flavor where the exit code never even arrives. The perl-alarm timeout wrapper documented in #27 also bounds this hang.

**Detect proactively**
Any headless run that goes silent at 0% CPU after the banner: read stderr first, then `sample` the PID for `NSAlert` before suspecting an engine/GDExtension deadlock.

**Confirmed by**
2026-06-10 — `juice-tests`, `sample(1)` call graph showing `Main::setup → OS_MacOS::alert → NSAlert runModal` on Godot 4.6.2 headless, during Rapier 2D addon installation.
