### 5. Fetch current Godot docs before version-dependent instructions

**When this applies**

Before instructing on Godot 4.x class API specifics (property names, method signatures, sub-resource shapes), Inspector workflow, or version-sensitive editor affordances.

**Preferred behavior**

Run `mcp__godot-mcp__godot_docs fetch_class <ClassName>` (with `--section properties` / `--section description` as needed) to ground the response on the current engine version's docs rather than memory. Especially relevant for:

- AnimationTree dock UI (reworked in 4.6.x — see personal-gotchas #4)
- Skeleton2D modifications (Inspector behavior shifted — see personal-gotchas #11)
- Tween API, EditorPlugin hooks, FileSystem dock affordances
- Anywhere a walkthrough mentions specific button positions, right-click menu entries, or property names by hand

**Why**

Training data skews to older 4.x and Godot 3.x. Subtle API surface shifts in 4.6.x (and beyond) silently change Inspector workflows. Recommending an outdated step burns user trust and often surfaces as "I think you're using outdated info from a past version's docs" — the user calling out the stale answer mid-task. Catching this BEFORE composing the response is cheaper than fixing it after.

**How to apply**

Make the docs fetch proactive, not reactive — before composing the instructions, not after the user pushes back. The MCP tool auto-detects the editor's connected version; even when patch-level detail is unavailable, "stable" returns reasonable answers (minor patches rarely shift property names).

If the public class doc is incomplete (some classes have editor-internal properties that don't appear in the public API surface — e.g. `SkeletonModification2DTwoBoneIK`'s joint fields), use the template-extraction pattern from preference #1: have the user author one instance in the editor, read the serialized form, propagate inline from there. The two preferences compose.
