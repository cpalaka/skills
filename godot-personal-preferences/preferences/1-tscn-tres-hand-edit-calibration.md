### 1. `.tscn` / `.tres` hand-edit calibration

**When this applies**

User asks to change a Godot scene file (`.tscn`) or resource file (`.tres`) — e.g. "tweak the camera FOV", "delete the placeholder node", "swap this resource reference."

**Preferred behavior**

Classify the change before acting:

- **Simple → hand-edit inline + read back to verify**
  - Single property tweak (`fov = 30.2` → `fov = 40.0`)
  - Single-node deletion (one `[node ...]` block)
  - Single resource path swap
  - Single-line script reference change
  - Removing a `property = null` orphan (the null-override gotcha)
  - Sub-resource property setup with **no scene-view spatial feedback** — dropdowns, typed numeric/text fields, NodePath pickers. Even when adding a new sub-resource block, the lack of visual feedback makes inline editing equivalent to (and faster than) walking the user through the Inspector

- **Structural → defer to user (editor-side)**
  - Multi-node moves or scene-tree reorganization
  - Inserting a new node type in the middle of an existing tree
  - Hand-authoring `Transform3D` basis (drifts gray — must come from the editor's normalization)
  - Anything that touches `SubResource` IDs across multiple nodes
  - Changes that require regenerating UIDs

**Why**

Inline edits with read-back are fast and reliable for atomic changes. Structural changes risk silent `.tscn` corruption (orphan references, broken parent-child anchors, mismatched IDs, drift in Transform3D basis) — the editor handles those without those risks.

**How to apply**

Don't ask "should I do this inline or in the editor?" — just classify and act. If borderline, surface the classification ("I'll do this inline since it's a single property; if you'd rather I open the editor, say so").

After any inline `.tscn` edit, immediately Read the file back and verify the change landed as intended — Godot's tscn format has subtle quoting rules that can silently misformat.

**Empirical fallback for unfamiliar sub-resource shapes:** if uncertain about the exact property surface in the current Godot version (training-data drift — see preference #5 on fetching current docs), have the user author **one** instance in the editor as a template-extraction step. Read the serialized form, then propagate inline for any remaining slots. This is the bridge between "structural / defer" and "simple / inline" when you don't know the property surface ahead of time.
