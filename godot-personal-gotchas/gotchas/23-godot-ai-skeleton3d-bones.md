### 23. godot-ai cannot author `Skeleton3D` bones — hand-write the bones block, then a USER reload is required

**Symptom**
`node_set_property bones/0/name` → `PROPERTY_NOT_ON_CLASS` ("not found on Skeleton3D"). The dynamic `bones/N/*` properties don't exist until the bone exists, and there's no bone-count setter to bootstrap one. `batch_execute` has create-node/set-property/delete/attach-script commands but NO method-call command, so it can't call `add_bone`/`set_bone_parent`/`set_bone_rest` either.

**Cause**
godot-ai exposes nodes + properties + a few batch verbs, with no `Skeleton3D` bone-authoring API and no general method-call path; the bone array is engine-internal state reached only through methods godot-ai can't invoke.

**Fix**
Hand-write the bone array into the `[node ... type="Skeleton3D"]` block, 7 lines/bone: `bones/N/name`, `/parent` (int, lower index), `/rest` (`Transform3D`), `/enabled = true`, `/position` (`Vector3` = rest origin), `/rotation` (`Quaternion`, identity `(0,0,0,1)` for translation-only), `/scale = Vector3(1,1,1)`. **Include the pose triple** — omitting it collapses the rig to pose=identity. `Transform3D` is **row-major** (`Transform3D(m00,m01,m02, m10,m11,m12, m20,m21,m22, ox,oy,oz)`); template-extract a rotated basis by setting a node's Euler `rotation` via godot-ai and reading the serialized `transform=`. The editor will NOT pick up the hand-edit on an open scene, and you must NOT `scene_save` (it writes the bone-LESS in-memory copy over your disk bones); tab-switch and `write_text` do NOT reload — a **USER must "Scene → Reload Saved Scene."** Verify the reload: a `BoneAttachment3D.bone_idx` resolves 0..n (write both `bone_name` and `bone_idx`); validate the disk file independently via headless `load().instantiate()` + `get_bone_count()`. After the user reload, `scene_save` is safe and bakes the BA global transforms.

**Detect proactively**
Any task needing `Skeleton3D` bones (or `BoneAttachment3D` rigs) with godot-ai as writer: plan the hand-write + one user reload up front. The `bones/N/name` `PROPERTY_NOT_ON_CLASS` error is the tell. Sibling to #25 (AnimationTree authoring) and the open-scene resync of #15.

**Confirmed by**
2026-06-02 — `circle-combat-prototype` animation slice Task 3 (`scenes/character_puppet.tscn`, `cf77418`), godot-ai 2.5.13 / Godot 4.6.2. See memory `gotcha-godot-ai-skeleton-bones.md`.
