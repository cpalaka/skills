---
name: audit-improvements
description: Monthly-ish cleanup pass over ~/Claude/improvements.md — annotate stale/superseded entries, promote durable lessons into active config. Slash-only: /audit-improvements.
disable-model-invocation: true
---

# Audit Improvements

## Overview

Keep `~/Claude/improvements.md` clean and useful: catch stale/incorrect/superseded entries, and surface durable lessons that should be promoted into active config so they actually fire. The analysis fan-out is the engine — **the Workflow script `audit-workflow.js` in this skill dir** (run it under ultracode; it extracts entries, deep-audits only what's new, cheap-sweeps all refs for rot, adversarially verifies). This skill adds only what a fresh agent + the raw engine do *not* do reliably, and a RED baseline proved each one fails without it: **scope incrementally from the watermark, annotate in the ONE locked format, never delete, gate every active-config edit, and exit clean when nothing's new.**

The log is read-to-append, not consulted-to-decide (settled 2026-06-19) — so a lesson that lives only here never fires. The promotion step is the point, not a bonus.

## Process

1. **Read the watermark.** `grep -m1 audit-watermark ~/Claude/improvements.md` → the last-audited date. None present → treat as a first/full run (audit everything, then seed the banner in step 5).

2. **Run the engine.** Launch the Workflow tool with `scriptPath` = this skill's `audit-workflow.js`, `args = { filePath: "~/Claude/improvements.md", sinceDate: "<watermark>", mode: "incremental" }`. (Use `mode: "full"` only ~quarterly or on suspicion — it adds the heavy full-corpus transcript scan, which is otherwise wasted re-answering a settled question.) If the Workflow tool isn't available this turn, enable ultracode; do not hand-audit from scratch.

3. **Apply in-file annotations** (additive; never delete an entry). For each finding with disposition `annotate-deadref` or `annotate-superseded`, add the marker in the **locked format below** — these are already adversarially verified by the engine. For each `deadrefs` hit from the cheap rot-sweep, first **CONFIRM it's genuinely gone** — re-check existence across roots (`~/Claude`, `~/gamedev`, `~/Code`, `~/.claude`, `~/.agents`), since the sweep can mis-root a relative path — and annotate only confirmed-absent refs on entries not `already_annotated`. A false "dead ref" written into the file is worse than a missed one.

4. **Promote / route — GATED.** Active config (`CLAUDE.md`, skills, memory) is read every session and edits it; per *authority ≠ permission*, present `promote_candidates` to the user and get an explicit "go" BEFORE editing — show the exact diff. For `route_candidates` (project-local one-offs), tell the user it belongs in that project's `NOTES.md`/`docs/adr/` going forward; leave the historical log entry in place. Do not invent new log structure (no status legends, no indexes).

4b. **Reverse pass — audit the rules already promoted.** Promotion without expiry is a ratchet, so every run also walks the `[imp:]`-tagged rules **already in `CLAUDE.md`** and asks of each: (a) is it now redundant with the assistant's own default behaviour — quote the system-prompt line that covers it; (b) has a later entry superseded it; (c) does it *contradict* something now native? Report the candidates with evidence; retirement is gated on the user's "go" exactly like promotion. This pass is not optional on a run where nothing new was found — a quiet log is when the existing rulebook most needs the look.

   **Trigger it out-of-band on a model-family change.** New model generation → run the reverse pass regardless of the watermark, before any other work. That is the event that silently invalidates promoted rules, and it is invisible to a date-scoped incremental scan. (The 2026-07-25 pass found three: an invoke-this-skill mandate whose skill duplicated the system prompt and contradicted it on when to ask; a permission-scope rule the system prompt had absorbed verbatim; and a use-web-search rule that had become default behaviour.)

5. **Advance the watermark + record.** Set the banner's date to today — edit only the `audit-watermark: YYYY-MM-DD` date inside the existing banner comment (directly under the `# Claude Behavior Improvements` title), leaving the rest of the banner line intact. Update the `improvements-md-audit` memory's "already done — do NOT re-flag" note with this run's annotations.

6. **Close.** Summarize: entries reviewed (new vs swept), annotations applied, promotions approved/pending, routes flagged. Leave any git commit to the user.

## The locked annotation format — use these two, nothing else

A fresh agent invents a new marker every run, and the file fragments. Use exactly:

- **Dead / incorrect ref** → an indented italic line appended right after that bullet's `**Why:**` line:
  `  _[YYYY-MM-DD audit: <what's wrong now, one line>.]_`
- **Superseded / generalized / made redundant by a later entry** → a blockquote placed directly under the `## …` heading, before the first bullet:
  `> **Superseded** (noted YYYY-MM-DD audit): <what changed> — see the <date> entry. <one line on what's kept>.`
  Swap the lead word to match: **Partly superseded** (only part reversed), **Generalized** (a later entry widened it), **Redundant** (fully promoted into active config).

Date = today (the audit date), not the entry's date. Annotate, never rewrite the original claim.

## Never delete the LOG — but the rulebook must decay

Two artifacts, two opposite rules. Do not let the first one's discipline leak into the second:

- **`improvements.md` is an archive** — append-only. CLAUDE.md cites entries here as the "why" backstop; back-pointers and other entries reference them. Even a fully superseded or project-local entry stays, **annotated**. The RED baseline reached for "delete this entry" — don't. Zero deletions.
- **`CLAUDE.md` and the skills are a hot path** — read on every request, so a rule that no longer earns its tokens is a live cost, not harmless history. These *must* shed rules (step 4b). Retiring one is not a deletion from the record: the log entry and its `**Why:**` survive untouched, and the `[imp:]` tag is what lets a future reader recover the reasoning.

An archive that forgets is broken; a rulebook that can't forget is also broken. The gotchas and preferences skills already run this way — measured row budgets, a `**Status:** retired <date> — <reason>` stamp, bodies and numbers never deleted. Use the same shape for `[imp:]` rules.

## Nothing-new exit — a first-class outcome

`nothing_new: true` (no entries past the watermark) does NOT mean "find something." Apply any rot-sweep dead-ref fixes (a skill/path can vanish between audits), advance the watermark, and report the log is current. Never manufacture findings to justify the run.

## Red flags — STOP

- Editing `CLAUDE.md`/a skill/memory to promote a lesson without an explicit user "go" first
- Deleting any entry — annotate + route forward; keep history
