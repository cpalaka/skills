### 100. godot-ai `add_property_track` stores a Quaternion/Vector key as a **Dictionary**, and `validate` still says the track is fine

> **PROBED 2026-08-07 on godot-ai 3.1.3 — STILL LIVE, both halves. Not fixed.**
> Ran the probe below in a throwaway scene (Godot 4.7-stable): `add_property_track` on
> `Spatial:quaternion` with `{"x":0,"y":0,"z":0,"w":1}`, then `scene_save`. The saved `.tscn`:
> ```
> tracks/0/path = NodePath("Spatial:quaternion")
> tracks/0/keys = { ... "values": [{ "w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0 } ...
> ```
> A **Dictionary**, and zero `Quaternion(...)` literals anywhere in the file. `animation_manage
> op="validate"` on that same track then returned `valid: true, broken_count: 0, valid_count: 1` —
> so the acknowledgement lies exactly as described.
> **The coercion table is real but does not reach this path**: `handlers/animation_values.gd:39-44`
> does map `TYPE_QUATERNION → ["xyzw", TYPE_FLOAT]`, which is why source-reading suggested a fix.
> That is precisely why this entry could only be closed by reading the SAVED FILE — treat the
> source table as evidence about intent, never about the artifact.
> Everything below stands as written.

> *(Original status note, superseded by the probe above — kept for the reasoning:)*
> **A component-key coercion table now EXISTS in 3.1.3, so this may
> be fixed, but DO NOT retire the entry until the probe below runs.**
> `handlers/animation_values.gd:39-44` maps `TYPE_QUATERNION → ["xyzw", TYPE_FLOAT]` alongside
> `TYPE_VECTOR4`/`TYPE_VECTOR4I`, and `:439` carries a comment about "stringified rotation_3d
> keyframe Quaternions" — i.e. a table exists exactly where this entry says none did. That is
> suggestive, not dispositive: **this entry's whole premise is that the acknowledgement lies**, so
> source-reading cannot close it. Only the saved file can.
> **Probe (cheapest in the corpus — `precommit-scan.sh` check #100 already implements the grep):**
> `animation_manage op="add_property_track" track_path="X:quaternion"
> keyframes=[{"time":0,"value":{"x":0,"y":0,"z":0,"w":1}}]` → `scene_save` → then
> `grep -A6 'tracks/[0-9]*/keys' <scene>.tscn | grep '"values": \[{'`. Zero hits **and** `values`
> reading `Quaternion(0, 0, 0, 1)` ⇒ fixed. A leading `{` ⇒ still Dictionary-ified.
> Run it in a THROWAWAY scene, not a working one — it is a write into an open editor (see #102).

**Symptom**
- You author an animation track through godot-ai —
  `animation_manage(op="add_property_track", track_path="Slot/Tumbler:quaternion", keyframes=[{"time": 0, "value": {"x": 0, "y": 0, "z": 0, "w": 1}}, ...])`.
- Every acknowledgement is green: the call returns `{"keyframe_count": 4, "undoable": true}`, the scene **saves**, and `animation_manage(op="validate")` reports `{"broken_count": 0, "valid_count": 3, "valid": true}`.
- `animation_manage(op="get")` echoes the keys back as `"value": {"w": 1, "x": 0, "y": 0, "z": 0}` — which reads exactly like a Quaternion being rendered as JSON, because JSON is the only thing the transport has.
- **The animation drives nothing.** Playing it leaves the target property untouched. Nothing errors.

**Cause**
`add_property_track` stores keyframe values **as received**. JSON has no Quaternion, Vector2/3/4, Color, or Transform type, so an `{x, y, z, w}` payload is committed as a **`Dictionary`**, not the typed Variant the property needs. `validate` only checks that track **paths resolve** — it never type-checks a key against the property the path names, so a fully inert track passes it.

The saved `.tscn` is where the difference is visible, and it is unmistakable:

```
"values": [{                          # DICTIONARY — inert
"w": 1.0,
"x": 0.0,
...
"values": [Quaternion(0, 0, 0, 1), …] # what a real key looks like
```

**Fix**
Do **not** hand-type the values into the editor's animation panel instead — for a rotation track that is twelve quaternions transcribed by hand, which is #97's failure mode wearing a different hat.

Derive them **in the editor**, from the parameterisation they come from, with a throwaway `@tool` script:

```gdscript
@tool
extends AnimationPlayer
func _ready() -> void:
	if not Engine.is_editor_hint(): return
	var anim := get_animation("tumble")
	for i in anim.get_track_count():
		for k in anim.track_get_key_count(i):
			var t := anim.track_get_key_time(i, k)
			anim.track_set_key_value(i, k, Quaternion(axis_for(i), RATE * t))
```

Attach it, `scene_open(force_reload=true)` so `_ready` fires, save, then **detach the script and delete the file**. The `.tscn` ends up carrying plain authored keys with no script attached, and no number passed through a human. Deriving from the key's own stored `time` also makes the rate/time coupling exact rather than two lists that have to agree.

Use godot-ai for the **structure** (player, clip, length, loop mode, track paths, key times) — all of that survives the JSON transport intact. Only the typed VALUES need the `@tool` pass.

**Detect proactively**
Grep any `.tscn` you authored animation tracks into:

```sh
grep -A6 'tracks/[0-9]*/keys' *.tscn | grep -n '"values": \[{'
```

A `values` array that opens with `{` is a Dictionary key. Expect zero hits on any track addressing a typed property (`:quaternion`, `:position`, `:scale`, `:modulate`, …). **Never accept `validate`'s `valid: true` as evidence that keys are typed** — it is a path check, nothing more. `precommit-scan.sh` check #100 runs this.

The general form: any MCP write whose value is a *structured* Variant is a candidate for silent Dictionary-ification. Read the saved file, not the tool's acknowledgement. Sibling to #99 (the `.tscn` is the authority on what authoring actually did); #45/#24 were the same report-success-and-no-op class before godot-ai ≥3.1.3 resolved them (retired — see RETIRED.md).

**Confirmed by**
2026-08-02, `space-miner-game` task-168 (onecam Tumble AnimationPlayer), Godot 4.7, godot-ai 2.8.4 — three quaternion tracks, twelve keys, all committed as Dictionaries. Caught only because the task's new test interpolated the track and tried to assign the result to a typed `Quaternion` (`Trying to assign value of type 'Dictionary' to a variable of type 'Quaternion'`); the scene had already saved and validated clean.
