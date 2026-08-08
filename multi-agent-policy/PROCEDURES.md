# Multi-Agent Policy — situational procedures

Two procedures that fire only when a specific *kind* of multi-agent session is being set up. They
are not consulted on a normal fan-out, which is why they live here rather than in `SKILL.md`: the
skill body loads on every invocation, and these two would be paying rent on every launch to serve a
rare one. Read this file when you are:

- **granting an orchestrator hands-off execution of a ticket** → *Hands-off ticket design*
- **about to run a planning/decision session over a multi-session doc corpus** → *Doc-corpus
  consistency sweep*

Everything in `SKILL.md` still applies — these narrow it, they never override it.

## Hands-off ticket design (autonomous execution grants)

When the user wants a ticket (or a chain of tickets) executed by an orchestrator with zero
involvement — merges, pushes, cleanup, Done included — convert the ticket's gates rather than
skipping them (established 2026-08-03, youtube-manager task-022..024):

- **Record the grant in the artifact the executing session will read** — the task's own notes, never
  only chat. State what is waived (sign-off/review DoD items, merge + push + branch/worktree cleanup
  confirmations), what is NOT (force-push, PR/`gh` writes, `--no-verify`, the verify gate itself),
  and the case that still escalates (e.g. a foreign commit riding the push publishes someone else's
  work under the grant — stop and ask).
- **Convert every human-eye AC into a machine probe**: "audio audibly stops" → adapter-receives-destroy
  + element-leaves-DOM; "feels right after clicking" → dispatched events asserted on observable
  effects. An AC only a human can check makes the ticket structurally hands-on no matter what the
  grant says.
- **Demote look-checks to non-gating committed artifacts** (screenshots + paths appended to the
  task's notes) for async review. This is legitimate only when an upstream approved design-reference
  task carries the frozen feel verdict — it narrows, not displaces, the "visual/feel work runs solo,
  never as a background wave" rule: the feel verdict moves upstream, and only the implementation
  tickets become wave-able.
- **Make the close-out an explicit AC** (gate green → merge → push → cleanup → Done) so the
  autonomous finish is checkable rather than improvised.

## Doc-corpus consistency sweep

Before a planning/decision session that consumes a multi-session doc corpus, run a cheap
workhorse-tier consistency sweep first: per-doc auditors + a cross-doc reconciler + a
surviving-open-inventory agent; verify, then apply only provenance-derivable fixes — never resolve an
`[open]`. The planning session should never be the thing that discovers doc rot; the inventory output
doubles as the planning session's wall of items it must not silently resolve.
