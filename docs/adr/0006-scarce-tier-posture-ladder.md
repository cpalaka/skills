# 6. Scarce-tier placement is a cost-ordered posture ladder, not a permission list

## Status
Accepted — 2026-08-08.

## Context
`multi-agent-policy` said "spend the scarce tier mainly on the completeness critic," and the
`tournament` skill said the single synthesis agent is "the **sole sanctioned Fable call site**."
Both were written in mid-2026, when the weekly scarce-tier window allowed roughly one premium slot
per run. The mechanism that implemented them was a boolean: `fable: true|false` in the saved
adversarial-review workflows.

Those rules are **rationing** arguments — one slot was all the window could afford, so it went to
the highest-leverage stage. When the window loosens, a rationing rule does not simply relax; it has
to be re-derived, because the question changes from *"which one slot?"* to *"what does each slot
cost and what does it buy?"* — a different question with a different answer per stage. A boolean
cannot express that answer, and permission language ("sole sanctioned call site") hides the fact
that the constraint was ever about budget at all.

Separately, every one of these scripts pinned models by short CLI **alias** (`'opus'`, `'fable'`),
which the alias rule (2026-07-24) forbids: an alias can lag a release and keep serving the prior
generation while every rule still reads correct.

## Decision
Replace the boolean with a **cost-ordered posture ladder** — `none | critic | insight | full`,
cumulative, each rung stating what it buys and how its agent count scales. `critic` is fixed-cost
(1–2 agents regardless of diff size); `insight` is the first rung that scales with lens count.
Every launch announces its projected scarce-agent count with a **pre-selected recommendation**
rather than posing a cold boolean.

**Verify is never auto-scarce at any rung.** That is a *value* argument ("verify is diligence, not
insight"), not a rationing one, so it survives the ration change untouched. It is also the one stage
whose count is unbounded at launch, so a scarce pin there cannot be projected — an explicit
`stages` override may still force it, and the script must warn that the projection excludes it.

The `stages: {<stage>: {model, effort}}` map outranks the ladder and is how any deliberate one-off
is expressed — which is why the ladder itself needs no special cases. `fable: true` stays accepted
as an alias for `critic` (live launch snippets and plan docs still use it); an unrecognized posture
falls back to `none` **with a logged warning**, never silently.

All model IDs become concrete, probe-resolved at authoring time, and `tournament/reference/lint.mjs`
gained an ERROR-level check that fails any script pinning a bare alias.

## Measurement — the `insight` rung, 2026-08-08

The rung *ordering* is arithmetic on agent counts and needs no experiment. The rung's *value* claim
— that scarce-tier finders discover materially more or better defects — was measured, and is **not
supported**.

Method: one finder lens (`engine-gotchas`), one fixed code diff (space-miner `b3c4747`, 8 files),
N=3 workhorse vs N=3 scarce. Byte-identical prompt built as a single shared const, identical
`xhigh` effort, both arms in one `parallel()` so they share an execution window; the only differing
input is the model ID. 6 agents, 0 dropped, 0 empty. Run `wf_f4c8db2f-d84`.

| | workhorse | scarce |
|---|---|---|
| findings/run | 6, 8, 6 (mean 6.67) | 6, 5, 6 (mean 5.67) |
| HIGH severity | 1 of 20 | 0 of 17 |
| distinct defects | 9 | 8 |

**Within-tier Jaccard 0.61 (the noise floor) vs across-tier 0.51.** The across-tier range
(0.33–0.71) lies inside the within-tier range (0.50–0.75): two runs of the *same* tier disagree as
much as the two tiers do. The delta does not clear the floor, and the point estimate leans against
scarce on both count and severity.

The one clean asymmetry runs *against* the rung. The defect "the new stray guard runs before, and
therefore disables, `export.sh`'s own stale-`.export-bak` recovery" was found 3/3 by workhorse and
0/3 by scarce, and was the only HIGH either tier produced. Scarce's counterpart (a pre-4.3
fullscreen-quad idiom under 4.7 reversed-Z) was 2/3 vs 0/3 — real but weaker. Read together these
argue for *lens diversity*, which the vendor-lens rule already buys more cheaply, not for depth at
2× the token price.

**Consequence: the recommended default posture is `critic`, not `insight`.**

Scope limits, stated so a later reader does not over-read this. One lens, one diff, N=3 — one
sub-class of input, not the domain. Note the tier-unique findings split by *kind* (scarce: a shader
and a doc; workhorse: shell control flow), so a shader- or spec-heavy subject could plausibly
invert it. A general verdict needs more subjects, not more runs on this one. The clustering of 36
raw findings into 11 defects was done by hand and is a chosen threshold; the two load-bearing
claims do not rest on it, since the tier-unique defects are distinct in kind rather than near
paraphrases.

This measurement replaces an earlier design that could not have worked: the only recorded
adversarial-review run with per-finding results (task-126, `wf_03cb7e91-ede`) reviewed a spec whose
reviewed bytes were never committed, and whose committed version has the review's own findings
written into it — re-running finders against it would have scored them against the answer key.

## Consequences
The tournament's one-scarce-slot rule survives, but re-derived from cost *shape* rather than
permission: synthesis is the only tournament stage whose count is fixed at exactly 1 regardless of
bracket size, in a fan-out of 89–111 agents. Any future change to the scarce window changes the
recommended *rung*, not the rules — which is the point of the split.

Scope note: three live workflows in other projects (`game-plan/plan-review.js`,
`space-miner-prototype/buddy-review.js` and its older `adversarial-review.js`) still carry alias
pins and the boolean-era posture; they are recorded as known-stale rather than swept, because
`buddy-review.js` is deliberately all-scarce and needs a posture decision, not a mechanical fix.

Reference implementation: `space-miner-game/.claude/workflows/adversarial-review.js`.
