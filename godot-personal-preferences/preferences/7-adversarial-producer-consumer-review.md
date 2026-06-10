### 7. Adversarial producer/consumer review before committing cross-module wiring

**When this applies**

About to commit a Godot scene/wiring task where the changed code **consumes values produced by another module** — an animation controller reading gameplay state (aim angle, facing, velocity), a UI node binding to sibling nodes, one system driving another via a shared convention. Especially when the contract is implicit: units, sign, coordinate handedness (screen-Y-down vs world), angle wrapping / ±π branch cuts, facing-relative vs world-space.

**Preferred behavior**

After your own headless/automated verification passes, but BEFORE the per-task commit, dispatch a **read-only** review subagent (general-purpose) with an explicit producer/consumer-trace lens: for every gameplay value the changed code consumes, trace it back to its producer and verify the consumer's assumption matches the producer's actual contract. Reconcile the findings, fix, THEN commit. Skip for pure headless-TDD helper tasks that are already test-covered (no cross-module consumption).

**Why**

Solo authoring + self-consistent verification is self-confirming: the author's own check asserts against the author's own (possibly wrong) assumption, so a producer/consumer convention mismatch passes the check and ships. These bugs live OUTSIDE the changed diff — in the contract *between* modules — which is exactly the blind spot an adversarial cross-module review covers. Empirically, one such task shipped three convention-mismatch bugs (a raw screen-space angle fed to a facing-canonical cone; inverted elevation; a linear chase sweeping the long way across the ±π branch cut when facing left) that the author's headless check missed because it asserted against the same wrong assumption.

**How to apply**

Dispatch the subagent read-only over: the changed consumer script(s) + the producer scripts it reads + the scene that wires them. Prompt it specifically to check units / sign / screen-Y-down / angle-wrapping / facing-relative-vs-world for each consumed value — not a generic "review this." Reconcile, fix, commit. Complements the F5-batching discipline (preference #2): F5 catches "does it look right," this catches "is the contract right" before the visual check even runs.
