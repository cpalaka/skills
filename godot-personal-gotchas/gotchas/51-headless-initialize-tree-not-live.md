### 51. Headless `SceneTree` test: the tree is NOT live during `_initialize()` — `get_tree()`/groups are null/empty there

**Symptom**
- A headless GDScript test that `extends SceneTree` (or the shared `scene_tree_test.gd` base, which runs `_run()` from `_initialize()`), attaches nodes under `get_root()` in `_initialize`, and then drives a node method that calls `get_tree()` — aborts with `SCRIPT ERROR: Cannot call method 'get_nodes_in_group' on a null value` (or any `get_tree()...` deref). The pre-error line is `ERROR: Parameter "data.tree" is null. at: get_tree (scene/main/node.h:559)`.
- `add_to_group("foo")` called in `_initialize` **also silently fails to register**: a later `get_nodes_in_group("foo")` / `get_tree().get_nodes_in_group("foo")` returns 0. So a group-driven controller (e.g. one that iterates `get_tree().get_nodes_in_group(...)`) sees an empty group even though you "added" the node.
- This is the stronger sibling of #26 (`_ready` not firing synchronously in `_initialize`): same root cause, worse symptom — there `_ready` was merely deferred; here `get_tree()` is outright null.

**Cause**
During `SceneTree._initialize()` the root Window is **not yet inside the tree** — empirically `get_root().is_inside_tree() == false`, and a child added via `get_root().add_child(n)` gets `n.get_tree() == null` and `n.is_inside_tree() == false`. The engine only enters the root (and propagates `data.tree` to descendants, and registers group membership with the SceneTree) once the main loop starts iterating, i.e. **after `_initialize()` returns**. A base harness that does `_run()` + `quit()` entirely inside `_initialize()` therefore never sees a live tree, so anything touching `get_tree()`/groups/`get_nodes_in_group()` fails.

**Fix**
Run the test body in the **first `_process(delta)` frame**, where the tree is live (`get_root().is_inside_tree() == true`, children's `get_tree()` resolves, group queries work). Concretely, in a test extending the `scene_tree_test.gd` base:

```gdscript
func _initialize() -> void:
    pass  # override the base's run-in-dead-tree flow

func _process(_delta: float) -> bool:
    _run()                                  # tree is live here
    _check_pin()
    print("\n%d/%d checks passed, %d failures" % [_checks - _failures, _checks, _failures])
    quit(1 if _failures > 0 else 0)
    return true
```

Do node setup + `add_to_group` + assertions all inside `_run()` (now invoked from `_process`). You can still **drive `_physics_process(DT)` directly** N times for deterministic stepping — the single `_process` frame only establishes a live tree; it does not step your reel/physics for you. Nodes added during that first `_process` are in-tree immediately (their `get_tree()` resolves and group registration takes effect at once).

**Detect proactively**
Any new headless scene-tree test that (a) needs `get_tree()`, `get_nodes_in_group()`, group membership, `_physics_process` on a controller that queries the tree, or otherwise a *live* SceneTree — must NOT do its work in `_initialize()`. If a test author's harness pins "attach under `get_root()` and drive from `_initialize`", that shape aborts; move the body to the first `_process` frame. A pure-logic (`preload` + math) test or a **detached** `instantiate()` smoke test needs no live tree and is exempt.

**Confirmed by**
2026-07-01, `space-miner-prototype` (Godot 4.7-stable). `tests/test_vacuum_claims.gd` (task-005, two-vacuum reel-claim regression) — `vacuum.gd._physics_process` calls `get_tree().get_nodes_in_group("vacuumable")`; the spec/plan-pinned `_initialize` harness aborted `Cannot call method 'get_nodes_in_group' on a null value`. A probe confirmed `get_root().is_inside_tree()==false` in `_initialize` and `==true` in the first `_process`. Moving the body to `_process` yielded 9/9. Sibling to #26/#27.
