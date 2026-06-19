---
name: refresh-context
description: Use when creating or refreshing a project's CONTEXT.md domain glossary (and any ADRs) — a project with no CONTEXT.md yet, or one that has drifted behind code changes. Triggers include "refresh the context", "build/update the CONTEXT.md", "seed domain docs", /refresh-context.
disable-model-invocation: true
---

# Refresh Context

## Overview

Build or refresh a project's `CONTEXT.md` domain glossary by running a docs-aware grilling session. The discipline already lives in two skills — **REQUIRED SUB-SKILLS:** `grilling` (one-question-at-a-time interview) and `domain-modeling` (writes `CONTEXT.md`/ADRs inline per its `CONTEXT-FORMAT.md`). This skill adds only the four things those skills and a fresh agent do *not* do reliably: **scope the change set from git correctly, mine existing docs, gate every entry to glossary-only, and exit cleanly when nothing changed.**

Mode is automatic: no `CONTEXT.md` → **seed** the first glossary; `CONTEXT.md` present → **update** it against what changed.

## Process

1. **Mode.** `CONTEXT.md` exists? No → seed. Yes → update. (`CONTEXT-MAP.md` at root → multi-context; pick the relevant one.)

2. **Scope what to grill about — do not reread the whole repo.**
   - **Seed:** explore README + structure + load-bearing source. **Mine `docs/` first** for the project's established names and rejected synonyms before you invent any label.
   - **Update:** derive the change set from the glossary's own git history, with the off-by-one guard:
     ```bash
     BASE=$(git log -1 --format=%H -- CONTEXT.md)
     if [ -z "$BASE" ]; then
       echo "CONTEXT.md not committed yet → no baseline. Use full seed-style exploration for scope (the empty-diff exit does NOT apply); you are still in update mode otherwise."
     else
       git show --stat "$BASE"             # if BASE was a docs-only/typo edit, walk back to the last commit that changed a TERM; if BASE also shipped code, that code is already glossed
       git diff --name-only "$BASE"..HEAD  # committed changes since the glossary was written
       git status --porcelain; git log @{u}..HEAD 2>/dev/null || echo "(no upstream → all local commits count as unpushed)"
     fi
     ```
     Ignore build noise (`dist/`, `node_modules/`); trust `git diff`, never mtimes. Mine `docs/` for established names here too — update mode must not re-label a concept the team already named, and a new design doc is an offer-to-flag, not an edit trigger. If the user claims development HEAD doesn't show, check `git branch --no-merged main` (branches actually *ahead* of main — listing every branch by name isn't evidence), `git worktree list`, and `git stash list` before editing.

3. **Grill + write inline.** Run `grilling` using `domain-modeling`, focused *only* on the scoped concepts. Resolve each term with the user; write it into `CONTEXT.md` the moment it resolves, through the gate below.

4. **ADRs.** When a decision surfaces that passes the 3-gate test (hard-to-reverse + surprising-without-context + real trade-off), *offer* it. Don't auto-write; don't bulk-seed.

5. **Wire it into the repo (seed, or any run where the link is missing).** A `CONTEXT.md` only helps if something reads it — and your machine's global read-rule doesn't travel with the repo. Make the project's root `CLAUDE.md` name it: if it has no `CONTEXT.md` reference, append a one-line pointer — *"Read `CONTEXT.md` at the start of a task for the project's domain vocabulary (and `docs/adr/` when present)."* — creating a minimal `CLAUDE.md` if the repo has none. Idempotent: skip if it already references `CONTEXT.md`. This makes the repo self-describing for cloud agents, other machines, and contributors; the global read-rule only covers your own local sessions.

6. **Close.** Summarize terms added/changed, any ADRs offered, and the `CLAUDE.md` wiring. Leave committing to the user.

## The glossary-only gate — apply PER ENTRY, before writing (not as a later cleanup)

Each entry is a **"what it IS" noun definition, one crisp sentence** (examples in parentheses). Strip the offending part, or reject the entry, if it has:

- file paths, class/function names, ports, version numbers, or counts → those belong in the design doc the glossary *points to*
- wire shapes, algorithms, or flow narration → don't smuggle "it's multiplexed / layered / event-sourced" *design* observations into a *definition*
- an `_Avoid_:` line of obvious near-words → list only **real in-repo collisions** (e.g. `Command` vs `Tool`; an MCP `Resource` vs a Godot `.tres` Resource)
- inherited/industry vocabulary (HTTP, WebSocket, MCP) → drop it unless THIS project overloads it. Test: *would a competent domain dev be confused without this entry?*

A `CONTEXT.md` **points into** design docs/ADRs; it never duplicates or summarizes them.

## Empty-diff exit — a first-class outcome

"Update" does not mean "must edit." If the scoped diff has no source changes (only docs/chore/config), **report that the glossary is current and show the diff as proof.** Never invent or pad terms to satisfy the word "update."

## Red flags — STOP

- Trusting `$BASE` blindly — run `git show --stat $BASE` first: an empty `$BASE` (uncommitted glossary) makes the diff falsely empty, and a docs-only/typo edit to `CONTEXT.md` hides un-glossed work committed before it
- Trusting file mtimes over `git diff` (build artifacts look freshly modified)
- Drafting entries, then self-critiquing their format afterward — gate each entry *at write time*
- Adding terms because the user said "update" when the diff shows nothing changed
- Defining a generic/industry term as if it were project-specific
