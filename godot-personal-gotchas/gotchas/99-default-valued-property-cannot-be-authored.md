# 99 — A default-valued property CANNOT be authored into a `.tscn`: the invariant vanishes

## Symptom

You move a property write out of GDScript and into the editor — the "author static furniture as
nodes" direction — set it in the inspector, save, and the `.tscn` has **no line for it**. `grep -c
<property> scene.tscn` returns `0`. Nothing errors, the scene behaves identically, and a readback
of the instantiated node reports the value you wanted, so every check you would think to run
passes.

Measured 2026-08-02 (Godot 4.7-stable, space-miner-game task-167), converting a dev harness:

```gdscript
# deleted from the script, "moved into the scene":
camera.keep_aspect = Camera3D.KEEP_HEIGHT
```

```
[node name="OneCamera" type="Camera3D" parent="CamRig"]
current = true
far = 40000.0
                      # <- no keep_aspect line. KEEP_HEIGHT is the default.
```

The same fact from the other side, which is the cheap way to confirm it: set the property to a
**non**-default (`KEEP_WIDTH`) and the line appears immediately.

## Cause

Godot's scene serialiser writes only properties that **differ from the class default**. It is
storing a diff against a freshly-constructed node, not a snapshot. So for any property whose
desired value *is* the default, there is nothing to write and no way to make the file carry it.

The trap is that this interacts with a refactor direction, not with a single call. Deleting
`node.prop = DEFAULT` from a script is behaviour-preserving — that assignment was always a no-op.
What it was really doing was **stating an invariant**, and the statement is what gets deleted.
Afterwards the value rides an engine default that nothing in the repo names, asserts, or would
notice changing. Comments claiming the property is "authored in the .tscn" become false, and they
read as true because the behaviour is right.

Worse for a review: the property is usually a default *because the engine's authors picked a sane
one*, which is exactly the class of property whose meaning is load-bearing and whose value is
boring. In the measured case `keep_aspect = KEEP_HEIGHT` is what makes `Camera3D.fov` the VERTICAL
angle that a whole file of framing derivations assumes.

## Fix

Do not try to force the line into the `.tscn` (hand-editing it is both against the usual
scene-editing rule and futile — the next editor save drops it again). **Move the pin to a test**,
which is where a default-valued invariant can actually be checked:

```gdscript
var cam: Camera3D = scene_instance.get_node("CamRig/OneCamera")
_assert(cam.keep_aspect == Camera3D.KEEP_HEIGHT,
    "OneCamera keeps HEIGHT, so fov is the vertical angle the framing math derives (got %d)"
        % cam.keep_aspect)
```

This is **strictly stronger** than the script line it replaces: the assignment could not fail,
while the assertion reds if the engine default ever moves or someone sets the other value in the
inspector. Compare the enum **by name** (`Camera3D.KEEP_HEIGHT`), never by the integer — see
Detect proactively.

## Detect proactively

- **Before deleting any `node.prop = X` in an author-it-in-the-editor conversion, ask whether `X`
  is the class default.** If it is, the conversion cannot carry it and the deletion is a net loss
  of information unless you add a test in the same commit.
- **After authoring, grep the saved `.tscn` for every property on your spec/property list.** A row
  that produced no line is this gotcha, not a mis-click. This is the check that catches it; a
  readback of the instantiated node does NOT, because the instance gets the default either way.
- **Never write an enum by its integer through an MCP/`node_set_property` path without checking
  the returned `old_value` against the documented default.** Same session, same task: `keep_aspect`
  was first set to `0` believing that was KEEP_HEIGHT. The write's `old_value: 1` on a fresh node
  was the tell — the fresh node holds the default, and the docs give the default as `1`, so `1` is
  KEEP_HEIGHT and `0` is KEEP_WIDTH. That would have silently changed what `fov` means.

## Confirmed by

space-miner-game 2026-08-02 (task-167, `src/core/dev/onecam/`), Godot 4.7-stable. Found by a
two-axis `/code-review` — both axes flagged it independently — after a 24-property readback probe
had passed 24/24, because the probe read the instantiated node rather than the file.
