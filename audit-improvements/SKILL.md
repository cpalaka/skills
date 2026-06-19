---
name: audit-improvements
description: Use when auditing or cleaning up ~/Claude/improvements.md (the cross-session behavior-improvements log) — the recurring "is this log still clean and useful" pass, run roughly monthly after entries accumulate. Triggers include "audit the improvements log", "clean up improvements.md", "check improvements for stale entries", /audit-improvements.
disable-model-invocation: true
---

# Audit Improvements

## Overview

Keep `~/Claude/improvements.md` clean and useful: catch stale/incorrect/superseded entries, and surface durable lessons that should be promoted into active config so they actually fire. The analysis fan-out is the engine — **the Workflow script `audit-workflow.js` in this skill dir** (run it under ultracode; it extracts entries, deep-audits only what's new, cheap-sweeps all refs for rot, adversarially verifies). This skill adds only what a fresh agent + the raw engine do *not* do reliably, and a RED baseline proved each one fails without it: **scope incrementally from the watermark, annotate in the ONE locked format, never delete, gate every active-config edit, and exit clean when nothing's new.**

The log is read-to-append, not consulted-to-decide (settled 2026-06-19) — so a lesson that lives only here never fires. The promotion step is the point, not a bonus.

## Process

1. **Read the watermark.** `grep -m1 audit-watermark ~/Claude/improvements.md` → the last-audited date. None present → treat as a first/full run (audit everything, then seed the banner in step 5).

2. **Run the engine.** Launch the Workflow tool with `scriptPath` = this skill's `audit-workflow.js`, `args = { filePath: "~/Claude/improvements.md", sinceDate: "<watermark>", mode: "incremental" }`. (Use `mode: "full"` only ~quarterly or on suspicion — it adds the heavy 5,420-transcript read/write scan, which is otherwise wasted re-answering a settled question.) If the Workflow tool isn't available this turn, enable ultracode; do not hand-audit from scratch.

3. **Apply in-file annotations** (additive; never delete an entry). For each finding with disposition `annotate-deadref` or `annotate-superseded`, add the marker in the **locked format below** — these are already adversarially verified by the engine. For each `deadrefs` hit from the cheap rot-sweep, first **CONFIRM it's genuinely gone** — re-check existence across roots (`~/Claude`, `~/gamedev`, `~/Code`, `~/.claude`, `~/.agents`), since the sweep can mis-root a relative path — and annotate only confirmed-absent refs on entries not `already_annotated`. A false "dead ref" written into the file is worse than a missed one.

4. **Promote / route — GATED.** Active config (`CLAUDE.md`, skills, memory) is read every session and edits it; per *authority ≠ permission*, present `promote_candidates` to the user and get an explicit "go" BEFORE editing — show the exact diff. For `route_candidates` (project-local one-offs), tell the user it belongs in that project's `NOTES.md`/`docs/adr/` going forward; leave the historical log entry in place. Do not invent new log structure (no status legends, no indexes).

5. **Advance the watermark + record.** Set the banner to today: `<!-- audit-watermark: YYYY-MM-DD -->` (the comment directly under the `# Claude Behavior Improvements` title). Update the `improvements-md-audit` memory's "already done — do NOT re-flag" note with this run's annotations.

6. **Close.** Summarize: entries reviewed (new vs swept), annotations applied, promotions approved/pending, routes flagged. Leave any git commit to the user.

## The locked annotation format — use these two, nothing else

A fresh agent invents a new marker every run, and the file fragments. Use exactly:

- **Dead / incorrect ref** → an indented italic line appended right after that bullet's `**Why:**` line:
  `  _[YYYY-MM-DD audit: <what's wrong now, one line>.]_`
- **Superseded / generalized / made redundant by a later entry** → a blockquote placed directly under the `## …` heading, before the first bullet:
  `> **Superseded** (noted YYYY-MM-DD audit): <what changed> — see the <date> entry. <one line on what's kept>.`
  Swap the lead word to match: **Partly superseded** (only part reversed), **Generalized** (a later entry widened it), **Redundant** (fully promoted into active config).

Date = today (the audit date), not the entry's date. Annotate, never rewrite the original claim.

## Never delete — the log is the rationale archive

CLAUDE.md cites entries here as the "why" backstop; back-pointers and other entries reference them. Even a fully superseded or project-local entry stays, annotated. The RED baseline reached for "delete this entry" — don't. Zero deletions.

## Nothing-new exit — a first-class outcome

`nothing_new: true` (no entries past the watermark) does NOT mean "find something." Apply any rot-sweep dead-ref fixes (a skill/path can vanish between audits), advance the watermark, and report the log is current. Never manufacture findings to justify the run.

## Red flags — STOP

- Re-auditing entries at or before the watermark from scratch (deep-audit is for new entries; old entries get only the cheap existence sweep)
- Inventing a marker format instead of the two above, or adding a "status legend"/"index" section to the log
- Editing `CLAUDE.md`/a skill/memory to promote a lesson without an explicit user "go" first
- Deleting any entry, or "moving" a project-local entry out (annotate + route forward; keep history)
- Re-flagging an entry that already carries an `_[… audit: …]_` note or a `> **Superseded …**` blockquote
- Running `mode: "full"` every time (the read-vs-write question is settled; the heavy scan is ~quarterly)
