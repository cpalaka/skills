### 11. Skeleton2D modification `bone_index` auto-derives from `bone2d_node` in 4.6.2

**Symptom**
- Walkthroughs (training data, tutorials, LLM-generated instructions) for `SkeletonModification2DLookAt` / `SkeletonModification2DTwoBoneIK` describe setting `bone_index` to a specific integer AND setting `bone2d_node` to a NodePath as two independent steps.
- In Godot 4.6.2's Inspector, picking a Bone2D from the `bone2d_node` dropdown **auto-populates `bone_index`** to that bone's position in the Skeleton2D's bone array. The integer field appears manually editable but is computed.

**Cause**
The Skeleton2D modification UI in 4.6.x resolves the picked Bone2D's bone index and writes it to `bone_index`. The integer ends up in the serialized `.tscn`, but is populated by the UI from the NodePath selection — not entered separately by the user.

**Fix**
- When writing or following Skeleton2D modification walkthroughs, instruct: "Set `bone2d_node` to the Bone2D path. `bone_index` will auto-populate."
- Hand-writing `.tscn`: both fields ARE in the serialized form (`bone_index = 9`, `bone2d_node = NodePath("Hip/Torso/Head")`), so both still need to be written. Just keep them consistent — the index is derivable from the path, not arbitrary.

**Detect proactively**
When reviewing AI-generated or older-docs walkthroughs that describe `bone_index` as a manual step, flag as stale.

**Confirmed by**
2026-05-27 — `2d-movement-prototype` Task 15 Step 1. Instructions told user "set bone index to <Head>, set bone2d_node to ../Head"; user observed `bone_index` auto-set when picking the `Head` Bone2D via the `bone2d_node` dropdown. Verified in saved `scenes/player/player_rig.tscn`: both fields present, index matches the Bone2D's array position.
