### 88. Two traps that break a throwaway probe project: a `user://logs` SIGSEGV, and `class_name` never resolving

**Symptom**
Building a scratch project to answer a language/engine question in isolation (the right instinct — see #82, #86, #87, all settled that way), two failures arrive that look like the *thing under test* is broken:

1. A `--headless --script res://probe.gd` run prints `Could not create directory: 'user://logs'` and then dies with **SIGSEGV**. Under a sandboxed agent session this is the normal outcome, not an occasional one.
2. `class_name`-based references do not resolve — `Could not find type "MyProbeClass"` — even though the script is on disk with a correct `class_name` line, so the probe reads as "the capability doesn't exist" when nothing was ever measured.

**Cause**
1. The engine wants a writable `user://` data dir for its log file. When the sandbox denies that path, the failure is not handled gracefully — it segfaults rather than degrading to no logging.
2. `class_name` registration lives in `.godot/global_script_class_cache.cfg`, which is built by an **import scan**. A never-imported throwaway project has no cache, so no global class names exist. (Sibling of #13, where the cache is *stale* rather than absent.)

**Fix**
1. Point `HOME` at a writable scratch dir for the probe run: `HOME="$TMPDIR/fakehome" godot --headless --path . --script res://probe.gd`.
2. In a throwaway project, `preload("res://other.gd")` directly instead of naming the global class — or run `godot --headless --path . --import` once first to build the cache. `preload` is the cheaper of the two and keeps the probe single-command.

**Detect proactively**
Any scratch-project probe whose first run fails in a way that would answer the research question **negatively** — stop and check that the harness works at all before recording a "no". This is the calibration rule in its cheapest form: a probe that cannot boot cannot report absence. Related: #47 (this machine's sandbox blocks the Metal device headless boot needs — a probe run may need the sandbox off entirely), #31 (a headless run that hangs instead of exiting), #13 (stale class cache).

**Confirmed by**
2026-07-27, `space-miner-game` session probing #87 (Godot 4.7, macOS, sandboxed Claude Code session) — both traps hit while building the const-re-export probe; the `HOME` override and direct `preload()` each resolved theirs. Filed from memory `gdscript-const-preload-reexport` via `/audit-godot-parity`.
