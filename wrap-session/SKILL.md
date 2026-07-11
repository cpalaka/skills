---
name: wrap-session
description: End-of-session closeout checklist — working tree, task state, memory, improvements log, next-session handoff. Slash-only: /wrap-session.
disable-model-invocation: true
---

# Wrap Session

## Overview

Run the end-of-session closeout so nothing load-bearing is lost between sessions.

This is a **positive checklist, run in order**. Each step either *reports + offers* or *proposes + waits*. **Never commit, push, mark a task Done, or write to memory / improvements.md / CLAUDE.md without an explicit "go"** — this command surfaces and drafts; the user approves. (Authority ≠ permission.)

## Process — run every step, in order

1. **Working tree.** `git status -sb`. If there are uncommitted changes, summarize them in a line or two and offer to commit (propose the message). Do **not** push or merge — those stay the user's call.

2. **Board / task state** *(only if the repo has a backlog board or a named active task)*. Read the active task's acceptance criteria and check each against what this session actually did. List any AC not yet met. Report readiness; setting the task Done waits for an explicit "go".

3. **Memory pass.** Did this session discover a bug or workaround, learn a user preference, or complete a milestone? If yes, name the memory file(s) worth writing (one fact each, standard memory format) and show the proposed body. Write only on "go". If nothing qualifies, say so and move on — "nothing to file" is a common, valid outcome.

4. **Improvements pass.** Was a new behavioral rule, preference, or workflow correction established this session? If yes, draft the `~/Claude/improvements.md` entry **with a `**Why:**` line** (the motivating problem, not a restatement of the rule). Then judge: does it generalize across projects? → propose promoting it into active config (a CLAUDE.md rule / a skill / memory) and show the exact diff. Project-local? → say it belongs in that repo's `NOTES.md` / `docs/adr/`. All writes gated on "go". If nothing new was established, say so — this is a common, valid outcome.

5. **Handoff.** Emit a copy-pasteable next-session kickoff prompt: branch, what's verified, what to inspect first, the immediate next step. If the work is large or spans many threads, offer to invoke the `handoff` skill for a full document instead.

6. **Close.** One-line summary of what was committed, filed, promoted, and what's still open.

## Red flags — STOP

- Any commit, push, task-Done, or memory / improvements.md / CLAUDE.md write that hasn't received its explicit "go".
