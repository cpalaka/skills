### 5. AnimationTree dock spams stale-preview errors after incremental build

**Symptom**
- While a scene containing a freshly-built `AnimationTree` is open in the editor, the Output panel spams two errors every frame (hundreds per second):
  - `Type mismatch between initial and final value: float and bool` (and `bool and float`) — `animation.cpp:5723` (`validate_type_match`).
  - `Condition "playback_new.is_null()" is true. Returning: AnimationNode::NodeTimeInfo()` — `animation_node_state_machine.cpp:1640` (`_process`).
- Errors fire even when `AnimationTree.active = false`.
- Errors fire even when the `AnimationTree` node isn't selected (so it's not a dock-preview-while-selected thing).
- Errors fire as long as the affected scene is open. Switching to another scene silences them; returning resumes them.
- The on-disk `.tscn` is unchanged — `git status` clean.

**Cause**
During a session of incrementally building an AnimationTree topology — adding `StateMachine`, `SubStateMachine`, `BlendSpace2D`, `OneShot`, etc., one at a time, with saves in between — the editor's AnimationTree dock holds a preview/evaluation cache that can fall out of sync with the actual sub-resource tree. The dock's continuous preview tries to evaluate the stale cache against the newer tree, hitting type mismatches and missing sub-state playbacks. Not a real type mismatch in the imported `.glb` clips, not a `.tscn` corruption.

**Fix**
Close the scene tab (`Cmd+W` or right-click the tab → Close) and reopen it from the FileSystem dock. Forces the editor to rebuild its preview cache from the on-disk `.tscn`. Errors stop immediately. Fastest fix; no edits needed.

**Detect proactively**
After a session of incremental AnimationTree dock work, if the Output panel is noisy with these two specific errors, try a scene close+reopen *before* diving into clip type inspection. Real `.glb`-clip type mismatches exist but require a different repro (re-import after Blender changes, missing animations, etc. — see Godot forum thread linked below).

**Confirmed by**
Hit during the `3d-prototype-1` Step 5 AnimationTree build on 2026-05-26, after 10 incremental tasks on `scenes/player.tscn`. Output panel spamming both error types continuously. Animation track inspection via `mcp__godot-mcp__godot_animation get_details` confirmed clean Skeleton3D `position_3d`/`rotation_3d` tracks across all 12 clips — no value/bool/float tracks. Closing+reopening the player scene tab silenced the errors entirely; `git status` showed `.tscn` clean. Related (but distinct repro) Godot Forum thread: https://forum.godotengine.org/t/type-mismatch-between-initial-and-final-value/123942

2026-06-18 — NOT reproduced on **Godot 4.7** in a synthetic incremental build (a StateMachine plus several added sub-nodes, no imported `.glb`-backed Skeleton3D clips). Left as a 4.6.x observation: this was always a finicky stale preview-cache artifact, and the original repro used imported `.glb` clips that this quick check didn't include — so it's suggestive, not a confirmed fix. If the two errors recur on 4.7, the close+reopen fix still applies.
