# 107 — A file git never tracked ships to players anyway: `git status` clean is not export clean

## Symptom

You inspect a shipped release pack and find a file you never committed — a scratch shader, an
experiment scene, a WIP asset. It was sitting in the working tree as an ordinary untracked `??`
entry the whole time. The pre-ship ritual passed: the branch was clean, the diff was reviewed, the
gate was green, and nothing anywhere flagged the file.

The trap is that `git status` is routinely used as the "is my tree ready to ship?" check, and it
renders untracked files as low-signal noise — the same visual weight as an editor dropping or a
`.DS_Store`. Reviewers scan for ` M` and skip past `??`.

## Cause

**Godot's exporter walks the filesystem; git is not an input to any inclusion decision.** What lands
in a pack is decided by the preset's `include_filter`/`exclude_filter` globs over resource paths and
by which resources the engine has imported — there is no VCS awareness anywhere in the pipeline.
Godot's own ignore mechanism is a `.gdignore` file in a directory, which is unrelated to
`.gitignore` and is not implied by it.

So *tracked* and *shipped* are independent properties, and the usual mental shortcut runs backwards:
developers check "is it committed?" to answer "will it ship?", when the export never asked.

This is the mirror image of the more familiar failure (a claim checked against the git tree being
blind to what the project deliberately gitignores). Here the git tree is the thing that is blind.

## Measured

space-miner-game, 2026-08-07, release preset:

| file | `git ls-files` | `git check-ignore` | in shipped `.pck` |
|---|---|---|---|
| `src/test.gdshader` (3,346 B) | untracked | not ignored | **present** (3 hits) |
| `src/test.tscn` | untracked | not ignored | **present** (2 hits, as `.remap`) |
| `src/test.gdshader.uid` | untracked | not ignored | absent — `.uid` sidecars never pack |

Instrument calibrated in the same pack before the positives were believed: `project.binary` reads 1
(so the grep sees pack internals) and `src/core/dev/lab` reads 0 (a genuine, intended exclusion
reads as a true zero, so the tool is not simply matching everything).

**UNVERIFIED extension — do not quote it as measured:** whether a *gitignored* (as opposed to
merely untracked) importable resource also ships. The mechanism above predicts yes, since
`.gitignore` is never read, but it has not been probed. Probe: drop a `.gdshader` into a gitignored
directory under a packed path, export, and grep the pack for its path.

## Fix

Before any build that leaves the machine, resolve every untracked entry under a packed source
directory — do not merely note it:

```sh
git status --porcelain | grep '^??'      # each of these is a SHIP CANDIDATE, not noise
```

Each one gets one of three dispositions: **delete** it, **commit** it, or **exclude** it in the
preset's `exclude_filter`. Adding it to `.gitignore` does **not** stop the export and is the
tempting wrong answer — it makes the file *quieter* in `git status` while leaving it in the pack,
which is strictly worse than leaving it visible.

Then verify against the artifact rather than the intent, because the pack is the only authority:

```sh
command grep -ac 'src/test.gdshader' build/release/*/game.pck   # expect 0
```

Use `command grep -a` — the plain `grep` shim is `ugrep -I`, which skips files it judges binary and
would report a confident false absence on a `.pck`.

## Detect proactively

- Treat "clean tree" as meaning **zero `??` under packed paths**, not "no modified files". Untracked
  entries in `src/`, `scenes/`, `assets/` are pre-ship blockers; untracked entries in `build/`,
  `tools/` generally are not.
- Any session that creates a throwaway probe scene/shader (a very common MCP and lab workflow) owns
  deleting it, and the delete belongs in the same session — an orphan probe survives indefinitely
  precisely because it never appears in a diff.
- After a milestone export, grep the pack for the basename of every `??` entry that existed at build
  time. This is the only check that measures what actually shipped.

## Confirmed by

2026-08-07 — space-miner-game, godot-export-verifier checkpoint run (four presets) plus an
independent re-check in the main loop. `src/test.gdshader` and `src/test.tscn` were untracked, not
gitignored, and both present in the shipped release pack.

## Related

- **#66** — the adjacent-but-distinct case: content the preset explicitly *excluded* shipping anyway
  (autoload scripts are force-included regardless of `exclude_filter`). #66 is "the filter was
  overridden"; this entry is "the file was never a git object at all". Different detection, so
  checking one does not cover the other.
