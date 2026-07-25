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

2026-07-25 — NOT re-verified on 4.7. Reproducing it requires inducing a fatal setup error (the original was a mid-install Rapier addon), and the failure mode is an indefinite hang, so it is not safe to provoke on a machine running an active editor session. Entry stays 4.6.2-anchored; treat the 4.7 status as unknown, not as fixed.

2026-07-25 — **an unexplained sibling hang exists on 4.7; do not assume it is this entry.** A `--headless --path . --script <f.gd>` run hung indefinitely at ~0% CPU, reproducibly (2/2) in one scratch tree with `.godot/` removed. Five candidate causes were each isolated and **falsified** in clean projects — missing import cache, `preload()` of a freshly-written `.gd`, a parse-broken sibling script in the tree, an `[autoload]` / `run/main_scene` entry, and `.uid`-sidecar-vs-cache desync (all exited in 1s). Not filed as its own entry: the symptom is real but the cause is unisolated, so there is nothing to detect proactively and no fixture to plant. Operational takeaway that holds regardless: **never run headless without a wall-clock bound** — background it and poll, because the failure mode is silence, not an error. Reproducer + falsified-hypothesis table: `~/Claude/notes/godot-headless-hang-2026-07-25.md`.
