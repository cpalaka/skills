# 62 — Godot 4.7 first re-save rewrites the whole .tscn (uids, unique_id, default-pruning)

## Symptom

Saving a scene in the 4.7 editor after a tiny change (one node added via MCP, one property
tweak) produces a diff touching **every line of the file**:

- the `[gd_scene]` header gains `uid="uid://…"` (and may drop `load_steps`),
- every script `[ext_resource]` gains a `uid=` attribute,
- **every** `[node]` line gains a `unique_id=NNNN` attribute,
- and — the alarming part — **committed property lines disappear** (e.g. a spawner's
  `count = 10`, `spawn_radius = 1200.0`, a CanvasLayer's `layer = 1`).

No error, no warning. The vanished lines look like lost overrides / scene corruption, and the
mechanical noise buries the one intended change in the diff.

## Cause

Godot 4.7's save-time serialization: scene + script UIDs and per-node `unique_id` are stamped
on every save, and `ResourceSaver` **prunes any property whose value equals the script's
CURRENT `@export` default**. A `.tscn` last saved by an older serializer (or hand-authored)
carries redundant default-valued lines and none of the new attributes, so the first 4.7 save
normalizes all of it at once.

## Fix

- The pruning is load-identical **only if** each vanished value really equals the script's
  current default — before trusting the diff, check every dropped `prop = value` line against
  the script's `@export var prop := default` (and built-in defaults like `CanvasLayer.layer = 1`).
  A mismatch means the value was a REAL override that the editor's stale in-memory copy lost
  (that failure is gotcha #55, not this one).
- Once verified, commit the normalization noise with the intended change (or as its own
  mechanical commit) — it happens once per scene; later saves are quiet.
- Expect it on ANY scene not yet re-saved under 4.7; don't burn time diagnosing "corruption".

## Detect proactively

After any editor-side scene save (MCP `scene_save` included) on a project recently moved to
4.7: `git diff --stat <scene>` — a whole-file rewrite for a one-node change means the
normalization fired; verify the pruned lines per the Fix before committing.

## Confirmed by

space-miner-game 2026-07-12 (task-107): godot-ai `node_create` + `scene_save` of one
`CursorWidget` node on `world.tscn` rewrote the file — uids + `unique_id` everywhere;
`TestFieldSpawner` lost `count/spawn_radius/min_spacing/world_seed/region_id`,
`DebrisSpawner` lost `count/spawn_radius`, `AccentLayer` lost `layer = 1`. Every pruned value
byte-matched the script `@export` defaults (verified by grep) — load-identical, committed.
