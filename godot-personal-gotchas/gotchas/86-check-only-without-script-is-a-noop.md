### 86. `--check-only` WITHOUT `--script` parses nothing — it just boots the main scene

**Symptom**
- `godot --headless --path . --check-only --quit` prints nothing and exits 0, while a script in the project has a **blatant syntax error**. A later run of the scene that loads it floods the log with `SCRIPT ERROR: Parse Error: …` → `Failed to compile depended scripts` → cascading `Could not resolve class` lines.
- Used as a project-wide "typecheck" gate, it certifies a tree it never read. Any script the main scene does not load — a dev/lab subtree, an editor-only tool, a scene excluded from the preload smoke test — passes silently, forever.
- Reads as an *exhaustive parse* because that is what the flag name implies.

**Cause**
Without `--script`, `--check-only` is effectively a **no-op flag**: the run is an ordinary headless boot of `run/main_scene`, and the only scripts compiled are the ones that boot loads. Measured on 4.7 in an isolated project (main scene + two unreferenced broken scripts):

| run | invocation | output |
|---|---|---|
| A | `--headless --path . --check-only --quit` (2 broken orphan scripts) | `MAIN_OK`, no errors, exit 0 |
| B | same, error moved **into** `main.gd` (loaded by the main scene) | `Parse Error: Expected parameter name.` — exit **0** |
| C | `--headless --path . --quit`, **no** `--check-only` | `MAIN_OK`, no errors, exit 0 — **byte-identical to A** |
| D | `--check-only --script res://orphan_syntax.gd` | `Parse Error: Expected parameter name.` — caught |
| E | `--check-only --script res://orphan_infer.gd` | `Parse Error: Cannot infer the type of "db" …` — caught |

A ≡ C is the whole finding: adding `--check-only` changed nothing. Note also that B/D/E all exit **0** on a hard parse error — the verdict must come from the output (#27).

**Fix**
- With `--script <file>`: `--check-only` **is** a real parse check, per file (D/E). That is its documented use — but it false-fails on any script referencing an `[autoload]` (#35), so it is only safe on autoload-free files.
- For project-wide parse coverage, the working gates are: a **preload-smoke test** that `preload()`s every script in the shipped surface (the real backstop — see personal-preferences #6), a **bounded real boot** of each entry scene (`godot --headless --path . res://path/scene.tscn`, killed after a few seconds, asserting zero `SCRIPT ERROR` lines), or the editor's own log (`get_log_messages source="editor"`).
- If a project's CLAUDE.md / CI describes bare `--check-only --quit` as an "exhaustive GDScript parse", that wording is wrong — fix the wording, not just the command.

**Detect proactively**
Grep scripts, CI configs and docs for a `godot … --check-only` invocation with no `--script` on the same line (mechanized as check #86 in `precommit-scan.sh`). Also: any subtree deliberately excluded from the preload smoke test (dev/lab scenes, editor tools) has **no** parse gate at all unless one is named explicitly.

Sibling to #35 (`--check-only --script` false-fails on autoloads), #77 (check-only skips constant folding), #83 (headless prints no warnings), #21 (blind to `.gdshader`), #27 (exit codes lie).

**Confirmed by**
2026-07-27, Godot v4.7.stable.official (`5b4e0cb0f`), macOS — isolated throwaway project, runs A–E above, with B as the known-bad control (the same syntax error IS reported once the script is on the boot path). Universal core promoted from `space-miner-game`'s `docs/godot-gotchas.md` P5 (task-120, 2026-07-22, where the symptom was a lab subtree excluded from the preload smoke) via `/audit-godot-parity`; that project's entry keeps the lab-specific detail.
