### 102. An open editor re-saves the scene between your last verified commit and the merge — with animation-preview poses baked in

**Symptom**
- You finish a task, run the full gate, commit, get sign-off, and start the merge. `git status` shows the `.tscn` **modified** — and you did not touch it.
- The diff contains changes nobody wrote: transform lines appearing on nodes that had none, and `visible = false` lines **disappearing**.

```
 [node name="Tumbler" type="Node3D" parent="Bodies/VoxelSlot"]
+transform = Transform3D(0.3380077, -0.008766919, 0.9411025, …)   # a mid-animation pose

 [node name="OrbitKeys" type="Label" parent="Hud/Stack"]
-visible = false                                                   # now shows in every mode
```

**Cause**
Two independent editor behaviours, both of which write **runtime/preview state into authored data**:

1. **AnimationPlayer preview leaves the posed transforms on the nodes.** Previewing a clip in the editor (`animation_manage play`, or scrubbing the timeline) writes each track's target property for real. Stopping does not necessarily restore the pre-preview value — and with no **RESET track** in the animation, nothing defines what "restored" even means. The next scene save persists whatever pose the nodes were left in.
2. **The editor's in-memory copy outlives a `git checkout` of the file.** Restoring the `.tscn` from git changes the file on disk; the open editor still holds its own copy and will happily write it back over yours on any later save. A `git checkout` you *verified as clean at the time* can be silently undone minutes later.

Neither announces itself. The scene still loads, still runs, and the tests may still pass — a baked tumble pose is a legal transform, and a label that lost `visible = false` only misbehaves in the mode it was supposed to be hidden in.

**Fix**
- **`git status` immediately before every merge, whenever an editor is open on the project.** Treat an unexpected `.tscn` modification as editor spill, read the diff, and `git checkout --` it. This is the whole guard; it costs one command.
- After restoring a scene from git while the editor holds it, **`scene_open(force_reload=True)`** so the editor's copy matches disk. Otherwise the next save re-clobbers it.
- Prefer verifying animation behaviour **outside** the editor — read the `Animation` resource with `value_track_interpolate()` in a headless test (no player, no tree, no preview state), and drive the runtime seam in a `--script` run. Use editor preview to *look*, not as the last step before a save.
- If a clip is going to be previewed often, give the AnimationPlayer a **RESET** animation so "restore" is defined.

**Detect proactively**
Between the last verified commit and the merge, `git status --porcelain` must list **only** the files you intended. Then check the staged tree, not just the working tree:

```sh
git diff --cached <scene>.tscn | grep -E '^\+transform'      # baked preview poses
git diff --cached <scene>.tscn | grep -E '^-visible = '      # a hidden node quietly shown
```

Sibling to #55 (editor clobbers on-disk edits) and #99 (the `.tscn` is the authority on what authoring actually did) — same family: **the editor is a second writer to your source tree, and it does not tell you when it writes.**

**Confirmed by**
2026-08-02, `space-miner-game` task-168 (onecam), Godot 4.7 — caught by a `git status` at close-out, after sign-off and after the branch had been fully gated. Three Tumbler nodes carried mid-tumble rotations from an editor animation preview run earlier in the session (whose stop HAD been verified to return them to identity at the time), and `Hud/Stack/OrbitKeys` had lost `visible = false`, which would have shown both key legends simultaneously in follow mode. All of it would have ridden the squash-merge inside an approved diff.
