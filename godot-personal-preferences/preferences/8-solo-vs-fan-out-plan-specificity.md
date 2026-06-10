### 8. Solo-vs-fan-out: gate on plan specificity, not implementation-vs-exploration

**When this applies**

Deciding whether to keep a piece of work on the main thread (solo, surgical) or fan it out to subagents — at the start of any work unit, before dispatching.

**Preferred behavior**

- **Fan out subagents for exploration, research, and codebase reconnaissance** — always, to keep main context light. Understanding-shaped work is fan-out-by-default.
- **Stay solo and surgical while a plan is still fluid or being discovered.** When requirements are being worked out as the code is written, keep changes on the main thread so the user sees and steers each step and retains full understanding/control.
- **Once a plan is fully specified, subagent-driven execution is fine.** A fully-specified plan means exact code / field tables plus verification commands per task — enough that a controller can curate exact per-task context and dispatch implementers without losing the user's grip on the design.

The discriminator is **plan specificity, not implementation-vs-exploration.** "Implementation stays solo" is the wrong cut: a fully-specified implementation plan is a fine subagent-driven target; a fluid, being-discovered design stays solo even when it's nominally "just implementation."

**Why**

The naive rule "fan out for understanding, stay solo for changing" mis-gates: it forces solo execution even on a fully-specified plan where subagent-driven execution runs cleanly. The real risk being managed is loss of the user's steering and understanding while the design is still fluid — which is a function of how specified the plan is, not whether the work is labeled implementation or exploration.

**How to apply**

Before dispatching, ask: *is the plan fully specified?* If it's exploration/research/recon, fan out. If it's a fluid or being-discovered design, stay solo on the main thread. If it's a fully-specified plan (exact code/field tables + verification commands), subagent-driven execution is appropriate — dispatch one implementer at a time (single-writer-safe for MCP) with the per-task review. This is the gating question that preference #2 (F5 batching) presumes already answered: that preference only kicks in *once* you're in subagent-driven plan execution.

_Confirmed by the circle-combat-prototype project-working-style memory: split confirmed 2026-05-31, discriminator refined 2026-06-02._
