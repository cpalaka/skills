### 5. Fetch current Godot docs before version-dependent instructions

**When this applies**

Before instructing on Godot 4.x class API specifics (property names, method signatures, sub-resource shapes), Inspector workflow, or version-sensitive editor affordances.

**Preferred behavior**

Two sources, and **the split matters** (corrected 2026-08-07 — the older form of this preference
claimed godot-ai was docs-blind, which was wrong):

- **godot-ai `api_manage(op="get_class")`** → version-correct ClassDB **metadata** read live from the
  connected editor: property, method, signal, enum and constant names plus signatures, and the
  inheritor list. This is what "sub-resource property names" actually needs, so reach for it first.
  The caller-facing op is `get_class`; the GDScript handler is named `get_class_info` and writing
  *that* into a call gets it rejected.
- **`mcp__godot-mcp__godot_docs fetch_class <ClassName>`** (`section: "description"`) → the
  class-reference **prose** ClassDB does not carry. This is the only remaining reason to keep
  godot-mcp connected for docs work, alongside `godot_runtime_state`'s hz-sampled watch.

Especially relevant for:

- Tween API, EditorPlugin hooks, FileSystem dock affordances
- Anywhere a walkthrough mentions specific button positions, right-click menu entries, or property names by hand
- Any editor-affordance claim: dock layouts and Inspector behaviour shifted through 4.6.x and again in 4.7

**Why**

Training data skews to older 4.x and Godot 3.x. Subtle API surface shifts in 4.6.x (and beyond) silently change Inspector workflows. Recommending an outdated step burns user trust and often surfaces as "I think you're using outdated info from a past version's docs" — the user calling out the stale answer mid-task. Catching this BEFORE composing the response is cheaper than fixing it after.

**How to apply**

Make the docs fetch proactive, not reactive — before composing the instructions, not after the user pushes back. The MCP tool auto-detects the editor's connected version; even when patch-level detail is unavailable, "stable" returns reasonable answers (minor patches rarely shift property names).

If the public class doc is incomplete (some classes have editor-internal properties that don't appear in the public API surface — e.g. `SkeletonModification2DTwoBoneIK`'s joint fields), use the template-extraction pattern from preference #1: have the user author one instance in the editor, read the serialized form, propagate inline from there. The two preferences compose.
