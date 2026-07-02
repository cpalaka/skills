# 55 — The open editor silently clobbers external disk edits on its next save (stale in-memory copies)

## Symptom

You hand-edit an open file on disk from OUTSIDE the editor — a `.tscn`/`.tres` (e.g. the #52
typed-`Array[NodePath]` dodge) or `project.godot` (e.g. a physical-keycode `[input]` action, #46) —
the edit is correct on disk, then later it silently reverts: the node/action/array you wrote is
gone. No error, no warning. Can wipe committed content from the working tree (e.g. a whole scene
instance + an input action disappear mid-merge).

## Cause

The Godot **editor keeps in-memory copies of every open resource** (open scenes AND
`project.godot` ProjectSettings) and does **not** auto-reload them when the file changes on disk
externally. On its next save — F5 autosave, Ctrl+S, or a godot-ai `scene_save` — it writes its
stale in-memory copy back, overwriting the external edit. This is the **editor's own behavior, not
any MCP server's**; it is the root mechanism behind the "if the scene is open, close+reopen before
saving so you don't clobber the hand-edit" fix notes in **#15** (godot-mcp `Rect2`), **#24**
(godot-ai `Vector2i`), and **#52** (godot-ai typed `Array[T]`). Those MCP coercion gaps just make
it *common* by forcing hand-edits.

## Fix

- Prefer editing open `.tscn`/`.tres`/`project.godot` **through the editor / godot-ai**, not a
  direct disk write.
- When a disk hand-edit is unavoidable: **commit it immediately**, then **reload the editor's
  copy** — Scene → Reload Saved Scene (`.tscn`), Project → Reload Current Project
  (`project.godot`), or close+reopen the scene. Note `scene_open` of an *already-open* scene does
  NOT reload it (preserves in-memory state) — open a different scene and come back, or use the
  menu reload.
- Recovery if clobbered: the committed content is the truth — `git checkout -- <file>` / re-run
  the merge restores disk over the clobber.

## Detect proactively

Any Edit-tool / direct disk write to `project.godot` or an open `.tscn`/`.tres` while the editor
is running is a clobber setup. Before a commit/merge that depends on such an edit, `grep` the
on-disk file for the expected node/action/value rather than trusting that a previously-verified
edit is still there.

## Confirmed by

space-miner-prototype task-008 (2026-07-02) — hand-edited a `buddy_toggle` action into
`project.godot` + an accent `Array[NodePath]` into `main.tscn` with the editor open; the editor's
stale saves wiped both the action and the Buddy scene instance from disk mid-squash-merge;
recovered from the branch commits. Root behavior behind the close+reopen notes in #15/#24/#52.
