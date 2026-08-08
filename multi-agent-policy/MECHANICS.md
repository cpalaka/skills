# Multi-Agent Policy — Claude Code mechanics reference

The API-level detail behind the rules in `SKILL.md`. Read this when you are **writing or editing a
workflow script**; the rules themselves live in `SKILL.md` and are what govern. Nothing here relaxes
anything there — this file only says *how* to express it.

Codex equivalents are noted where they exist; where they don't, the rule still holds and the
mechanism is the host's own dispatch surface.

## Scarce-tier posture ladder — the arg surface

`SKILL.md` defines the ladder (`none | critic | insight | full`) and what each rung buys. The
mechanics:

- **`scarce: "none"|"critic"|"insight"|"full"`** — the opt-in arg in saved adversarial-review
  workflows. Reference implementation: space-miner's `.claude/workflows/adversarial-review.js`.
- **`fable: true` stays accepted as an alias for `critic`.** Live launch snippets and plan docs
  still use it, so removing it would break them silently.
- **An unrecognized posture falls back to `none` with a LOGGED warning**, never silently.
- **`stages: {<stage>: {model, effort}}` outranks the ladder.** This is how a deliberate one-off is
  expressed — including a scarce verify — and it is why the ladder itself needs no special cases.
  A script that allows a scarce verify must warn that its projection excludes it (verify scales with
  findings *found*, so it is unbounded at launch).
- **Model IDs are concrete and probe-resolved**, never short aliases — see the alias rule in
  `SKILL.md` § Tier roles. `tournament/reference/lint.mjs` ERRORs on a bare alias in any script.

## Sizing a fan-out — the `budget` global

`SKILL.md`'s budget-tier exception says "a SMALL agent count." When the user set a token target
(`+500k`-style), that has a mechanism rather than an eyeball:

- `budget.total` — the target, or `null` if none was set.
- `budget.spent()` — output tokens spent this turn across the main loop **and all workflows** (one
  shared pool, not per-workflow).
- `budget.remaining()` — `max(0, total - spent())`, or `Infinity` when no target is set.

The target is a **hard ceiling**: `agent()` throws once spent reaches it. Two shapes:

```js
const FLEET = budget.total ? Math.floor(budget.total / 100_000) : 5   // static scaling
while (budget.total && budget.remaining() > 50_000) { … }             // loop until nearly dry
```

**Guard on `budget.total` in any such loop.** With no target set `remaining()` is `Infinity`, and the
loop runs to the 1000-agent backstop. When no target is set the exception is still a judgment call
and still gets announced.

## Other spawn-time knobs

- **`agentType`** — `agent(prompt, {agentType: 'general-purpose' | 'code-reviewer' | …})` runs a
  stage as a *definition-backed* agent instead of the default workflow subagent, resolved from the
  same registry as the Agent tool. Composes with `schema`. The workflow-side equivalent of the
  `opus-implementer` dispatch, and subject to the same stale-registry gotcha: an edited def is
  **not** hot-loaded.
- **Per-agent `effort`** — overrides effort for a single call, independent of `model`. This is what
  makes "modest = high, full = xhigh" enforceable per *stage* rather than per run. Use `low` only
  for mechanical stages, never for a verify or critic slot.
- **`workflow(nameOrRef, args)`** — runs another workflow inline as a sub-step, sharing this run's
  concurrency cap, agent counter, abort signal, and token budget. Its agents count toward **your**
  projection and **your** size ceiling, so a nested call is a spending decision, not a refactor.
  Nesting is one level only.

## Session-level: ultracode

When a session reminder says ultracode is on, the orchestration opt-in is *standing* — workflows
become the default for substantive tasks. It changes **the opt-in, not the tier rules**: workhorse
default, scarce still opt-in per launch, budget tier still barred from correctness-bearing work, and
both agent-count ceilings still bind. Read the reminder rather than assuming; the pins hold either
way.

## Resume and the transcript files

`Workflow({scriptPath, resumeFromRunId})` replays the longest unchanged prefix of `agent()` calls
from cache and re-runs from the first edited call onward. Same script + same args = 100% cache hit —
which is also the trap: a resumed run can report results no agent produced this session.

Two different files in the run's transcript dir, neither substituting for the other:

| File | Holds | Read it for |
|---|---|---|
| `journal.jsonl` | each call's **return value** | drop reconciliation; diagnosing a thin result |
| `agent-<id>.jsonl` | each agent's **spawn config** + raw turn stream | verifying `"model"` actually applied; fallback when no journal exists |
