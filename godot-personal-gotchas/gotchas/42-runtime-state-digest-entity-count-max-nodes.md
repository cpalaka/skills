### 42. `godot_runtime_state digest`'s `entity_count` is capped by `max_nodes` (default 40) — a large group reads as if it shrank

**Symptom**
You track a group's size across an action via `godot_runtime_state digest` (e.g. checking whether a mechanic consumed or added members of a `group`), and `entity_count` reads SMALLER than the group actually is — looking like shrinkage, or like no growth, when the group genuinely changed. No error; the number is just wrong-low.

**Cause**
`entity_count` is the count of RETURNED nodes, capped by `max_nodes` (default 40) — not the true group size. Once the group exceeds the cap the read silently truncates and the count plateaus at the cap.

**Fix**
Pass `max_nodes` ≥ the expected group size (with `select="group"`, `group="<name>"`). The returned `entity_count` equals the true group size ONLY when it is strictly below `max_nodes`; if `entity_count == max_nodes`, treat it as "≥ that many," not the exact count, and re-read with a higher cap.

**Detect proactively**
Any time you use `digest` `entity_count` as a population count for a group/scene that could exceed 40 (spawners, projectiles, collectibles, crowds). If `entity_count` sits exactly at `max_nodes` or never rises past it, you are truncated, not measuring. Part of the "verify a cursor-aimed mechanic without cursor control" workflow in `docs/godot-mcp-guide.md`; pairs with the same-batch-screenshot timing trap (sibling #41).

**Confirmed by**
Surfaced verifying a catch/consume mechanic headlessly via group-count deltas — a `digest` read of a group truncated at the default `max_nodes` and read like shrinkage until the cap was raised. Body source: project `docs/godot-mcp-guide.md`.
