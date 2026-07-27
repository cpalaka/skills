### 84. Widening a shared group/registry query to a second node type breaks every `as T` consumer — at a distance

**Symptom**
- A shared query (`get_nodes_in_group(...)`-backed helper, a spatial `candidates_along(...)`, any registry lookup) is widened to also return a **second node type**. Nothing fails at parse time; `--check-only` is clean; the suite is green.
- At runtime, unrelated call sites die on `Attempt to call function '…' in base 'null instance'` — in files the diff never touched.
- The audit that *should* have caught it looked at the wrong set: grepping who scans the **group name** finds the safe layer, because the breakage is in who consumes the **query**.

**Cause**
A group (or registry key) is a *declaration*; the query is the **seam**. Widening the query changes the effective return type of every call site, and those call sites are one indirection away from the grep you naturally reach for.

GDScript's `as T` **yields `null`** on a failed cast rather than throwing, so `(rock as Asteroid).method()` on the new node type is a null-method-call, not a type error — and the static checker never sees it (`--check-only` cannot know what the query returns at runtime).

**Fix**
- Grep for **call sites of the query symbol** (`candidates_along`, `get_overlapping_bodies`, the registry accessor), separately from grepping the group/registry name, and check each for an unguarded cast.
- Guard the cast rather than asserting the type: `var a := rock as Asteroid; if a == null: continue` — or dispatch on a capability (`rock.has_method(...)`, a shared interface script) instead of a concrete class.
- Prefer narrowing at the seam: return a typed sub-list, or give the query an explicit "which tier do you want" parameter, so the widening is a decision each consumer makes rather than one it inherits.

**Detect proactively**
Any diff that adds a group/type/tier to an existing shared query. Enumerate the query's consumers **before** the change; an `as T` immediately followed by `.` on the same expression is the signature to look for. An ADR or note claiming the widening is "verified" is worth re-reading for *which* set it verified — this failure's whole shape is an audit whose scope silently became part of its claim.

**Confirmed by**
2026-07-26/27, `space-miner-game` task-131 (Godot 4.7) — `FieldRuntime.candidates_along` widened to scan `minable` + `minable_3d`; three consumers (`mining_beam.contact_query`, `mining_beam._world_solid_at`, `player._solid_rock_at`) each did `(rock as Asteroid).method(...)` and called on null for 3D bodies. Found by a standards-axis code review, *after* an ADR recorded the group-scanner audit as verified. Filed from project memory `heterogeneous-group-query-breaks-casters` via `/audit-godot-parity` 2026-07-27.
