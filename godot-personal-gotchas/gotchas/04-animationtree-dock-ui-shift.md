### 4. AnimationTree dock UI shifted in Godot 4.6.2

**Symptom**
- Following an AnimationTree dock walkthrough (from training data, tutorials, older docs, or LLM-generated instructions) and the described UI affordance doesn't exist:
  - "Double-click `StateMachine` / `BlendTree` / `BlendSpace2D` to enter its sub-editor" — double-clicking does nothing.
  - "Right-click a node → Rename" — no Rename entry in the menu.
  - "Right-click a state → Set as Start / Set Start Node" — no such entry, no toolbar icon either.
- No error message; the user just can't find the control. Easy to spend minutes hunting before realizing the affordance moved.

**Cause**
The AnimationTree dock UI was reworked in Godot 4.6.x. As of 4.6.2:
- **Entering a sub-editor** (StateMachine, SubStateMachine, BlendTree, BlendSpace1D, BlendSpace2D): each container node has an **Open Editor** button inside its node header. Click that. *(Godot 4.7: rendered as a small **pen / edit icon** on the node — same affordance, just re-iconned.)*
- **Renaming a node**: the name is an editable inline field on the node — click into it and type. No menu, no F2 shortcut needed.
- **Setting the Start state of a StateMachine**: there is no "Set as Start" affordance. Use the default **Connect Nodes** tool and drag from the green `Start` node to the desired state. Godot serializes this as `transitions = ["Start", "<TargetState>", SubResource(...)]` with default `advance_mode = 2` (Enabled) and no condition — fires unconditionally on entry, functionally equivalent to "this is the Start state."

**Fix**
Use the 4.6.2 idioms above. When writing AnimationTree dock instructions, do not say "double-click", "right-click → Rename", or "Set as Start" — say "Open Editor button", "edit the name field", "drag from Start to <state>".

**Detect proactively**
If you find yourself following or writing a walkthrough that uses the old affordances, translate before clicking (or before instructing a user to click). For LLM-generated walkthroughs: training data skews to older Godot UI conventions — assume the dock UI advice is stale unless explicitly verified against the current Godot version.

**Confirmed by**
Hit during the `3d-prototype-1` Step 5 AnimationTree build on 2026-05-26, Task 4. Agent's walkthrough said "double-click Top to enter its editor", "right-click → Rename", and "Set as Start"; user reported all three were absent in Godot 4.6.2. Resolved by clicking the **Open Editor** button on the Top node header, editing the inline name field, and dragging from `Start → Locomotion`. Serialization verified equivalent: `transitions = ["Start", "Locomotion", SubResource(...)]` with `advance_mode = 2`.

2026-06-18 — re-confirmed on **Godot 4.7** (live, AnimationTree StateMachine): the idioms hold. Entering a sub-editor is now a small **pen / edit icon** on the node (the 4.6.x "Open Editor" button, re-iconned); a node is renamed by clicking its **name field**; there is **no node-specific right-click menu at all** (right-click anywhere is the global add-node menu — so still no "Set as Start" and no "Rename"); dragging `Start → state` with the **Connect** tool works as before.
