---
name: wrap-session
description: End-of-session closeout checklist — loose ends, working tree, task state, memory, improvements log, next-session handoff. Slash-only: /wrap-session.
disable-model-invocation: true
---

# Wrap Session

## Overview

Run the end-of-session closeout so nothing load-bearing is lost between sessions.

This is a **positive checklist, run in order**. Each step either *reports + offers* or *proposes + waits*. **Never commit, push, mark a task Done, or write to memory / improvements.md / CLAUDE.md without an explicit "go"** — this command surfaces and drafts; the user approves. (Authority ≠ permission.)

## Process — run every step, in order

1. **Loose ends** *(only if the session ran background work)*. Check for still-running delegates: TaskList, active Workflow runs, Monitor heartbeats. `TaskStop` any heartbeat monitor; if an implementer or workflow is still mid-write, let it land (or get the user's call to kill it) before touching the tree. Never wrap over an in-flight delegate.

2. **Working tree.** `git status -sb`. If there are uncommitted changes, summarize them in a line or two and offer to commit (propose the message). Attribute first: with concurrent sessions, foreign strays near your write paths are the expected case — stage by explicit file path, never `git add <dir>/`, and read the commit's `--stat` back. If this session merged from a worktree, `git worktree list` → confirm no worktree still holds `main`; detach or remove it so a parallel session isn't stranded. Do **not** push or merge — those stay the user's call.

3. **Board / task state** *(only if the repo has a backlog board or a named active task)*. Read the active task's acceptance criteria and check each against what this session actually did. List any AC not yet met. Wire session leftovers — deferred review findings, follow-ups, open questions — onto the owning task via `--ac` / `--append-notes` (never `--desc`, which clobbers), not only into the handoff prompt. Report readiness; setting the task Done waits for an explicit "go".

4. **Memory pass.** Did this session discover a bug or workaround, learn a user preference, or complete a milestone? Run each candidate through **the admission test below** *before* naming it. For survivors, name the memory file(s) (one fact each, standard memory format) and show the proposed body. Write only on "go". *Godot projects:* gotcha/preference-shaped discoveries propagate project → skill via `/audit-godot-parity` — surface them and suggest queueing the audit; don't propose direct edits to the godot skills. **"Nothing to file" is the expected outcome of an ordinary session, not a failure of the step** — most debugging produces a fix, not a durable fact.

5. **Improvements pass.** Was a new behavioral rule, preference, or workflow correction established this session? Run it through **the admission test below** first. If it survives, draft the `~/Claude/improvements.md` entry **in the log's house format (below)**, with a `**Why:**` line carrying the motivating problem, not a restatement of the rule. Then judge: does it generalize across projects? → propose promoting it into active config (a CLAUDE.md rule / a skill / a shared chunk / memory; orchestration lessons → `multi-agent-policy`) and show the exact diff. Project-local? → say it belongs in that repo's `NOTES.md` / `docs/adr/`. All writes gated on "go". If nothing new was established, say so — this is a common, valid outcome.

   **Every promotion names what it displaces** — the `Supersedes:` line from admission test 3, carried into the entry itself. Promotion is the only moment anyone is looking at the section a rule lands in, so it is the only moment the question gets asked; without it the rulebook is append-only by construction (17 promoted rules in 5 months, zero retirements, before this was added 2026-07-25).

6. **Handoff.** Emit a copy-pasteable next-session kickoff prompt: branch, what's verified, what to inspect first, the immediate next step. *Orchestrator sessions:* confirm the approved spec / phase state is persisted (board `--plan` / plan doc) and point the prompt at those artifacts instead of restating them. If the session edited `.claude/agents/*.md` or `.claude/workflows/*.js`, add a line: "re-dispatch <X> in the fresh session — this session's cached copy is stale." If the work is large or spans many threads, offer to invoke the `handoff` skill for a full document instead.

7. **Close.** One-line summary of what was committed, filed, promoted, and what's still open.

## The admission test — apply to every step-4 and step-5 candidate

**You are not required to produce a finding. A wrap that files nothing is a normal wrap.** The
failure mode this section exists to stop is the opposite one: a closeout step reads as a prompt to
generate *something*, the session's most recent difficulty gets written up because it is the only
candidate in view, and the user accepts it because each individual entry looks reasonable. Nobody
is ever looking at the catalog as a whole at the moment a row is added to it.

Measured cost of skipping this (2026-08-08 audit): the Godot gotcha catalog took 30 entries in 13
days — 2.3/day — while the improvements log, which has had a displacement test since 2026-07-25,
stayed flat. Same sessions, same author. The only difference was the gate.

State the verdict per candidate, in one line each. A candidate must pass **all three**:

1. **Recurrence** — will this fire again, on a *different* day and preferably a different project?
   This is the test that actually does the work, and universality is not a substitute for it: "any
   Godot project replacing a line mesh with a shader would hit this" is true and still describes an
   event that happens roughly once. A deep, correct, hard-won write-up of a one-time problem is a
   *project* doc entry (`docs/`, `NOTES.md`, an ADR), not a catalog row. Bias: if you are reaching
   for a hypothetical future session to justify it, it fails.
2. **Non-inferability** — would a competent agent get this wrong *without* the entry? Something the
   error message states plainly, that the type checker catches, or that is standard documented
   engine/library behaviour fails this test — the model reads the error and fixes it. What passes:
   **silent** failures, actively **misleading** signals (a green run that should be red), and
   version-specific tool behaviour that post-dates training. No error signal is the strongest
   possible argument for an entry; a clear error message is a strong argument against one.
3. **Displacement** — name what it replaces, narrows, or makes redundant, *or* the literal words
   `Supersedes: none (net-new surface)`. Not optional, and "none" is not the default: grep the
   target catalog for the nearest existing entry first and say which one you checked. Near-duplicate
   pairs are the normal result of skipping this — the same fact filed twice, weeks apart, the second
   copy 4× longer than the first.

Then check the target's budget (the gotcha index row budget, the global `CLAUDE.md` bullet budget)
and say whether admitting this one breaches it. **A catalog at its budget admits a new entry only by
retiring one** — propose the retirement in the same breath, or withdraw the candidate.

## The improvements-entry format — match the log, don't invent

```
## YYYY-MM-DD — <project> (<session focus>)

- **<the rule, one bold sentence>.** <mechanism/context, a few lines>. **Promoted same-session
  to <target>.** | **NOT promoted — <reason>.**
  **Why:** <the motivating problem — what went wrong or almost did, not the rule restated>.
  - *Reinforcing (existing rules holding, logged as data points):* <optional>
```

Promotion status is part of the entry, recorded inline at write time — an entry with no disposition is unfinished.

## Red flags — STOP

- Any commit, push, task-Done, or memory / improvements.md / CLAUDE.md write that hasn't received its explicit "go".
- Wrapping while a background delegate or workflow is still mid-write, or leaving a heartbeat Monitor running past close.
- **A step-4/5 candidate proposed without its three admission verdicts stated.** An entry that arrives already drafted, with the test skipped or implied, is the exact path that filled the catalog — and it is hard to decline, because the write-up looks good and the reader has no view of the other 106 rows. Draft nothing until the candidate has passed on the record.
