# Gotcha-catalog single-source migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the universal Godot gotcha catalog out of per-project `docs/godot-gotchas.md` copies into the `godot-personal-gotchas` skill as the single source; shrink space-miner's doc to project-local + pointer as the reference application.

**Architecture:** Two phases. **Phase A** edits the skills repo (`cpalaka-claude-skills`) source-side — these auto-correct every *future* godot project via the templates. **Phase B** applies the migration to space-miner as the first/reference application. The other 7 projects are deferred (lazy-migrate on next touch). No code; all edits are to skill/template/doc/recipe files, verified by grep/diff rather than unit tests.

**Tech Stack:** Markdown skill & doc files; YAML-frontmatter profile recipe; git (two repos, feature branch each); the `Workflow` tool for the Phase-B classification fan-out.

## Global Constraints

- **Single-source rule:** universal gotchas live ONLY in `godot-personal-gotchas`; project docs hold only project-local entries + a pointer. Never re-introduce a full copy. (spec §2, §3)
- **Classifier (verbatim):** *universal* = reproducible on any project here given the same engine/tooling/addon (Godot, godot-ai, godot-mcp, GDScript, headless harness, dev machine, third-party addon) → skill. *project-local* = bound to this project's own code/scenes/assets/param-tuning → project doc. *convention* (axis-flip, naming) = not a gotcha → `docs/adr/`. (spec §3)
- **Addon gotchas → skill** (precedent: Rapier #33 already in the skill). (spec §3)
- **Shrink rails (all four):** (1) removal only for **body-level** verified duplicates (diff shown), not symptom-match; (2) provenance/locality (Confirmed-by anchor, project path, param-tuned, **divergent fix**) is KEEP-by-default, never auto-proposed; (3) uncertain → keep+flag; (4) project-write half visually demarcated in the parity table. (spec §5)
- **Content stays unidirectional (project → skill).** The shrink is gated project-side cleanup, not skill→project content flow. (spec §9)
- **Out of scope / untouched:** `godot-export-verifier`; the other 7 projects; no convention-vs-gotcha reclassification during the shrink. (spec §9)
- **Phase A repo:** `cpalaka-claude-skills`, branch `chore/gotcha-catalog-single-source` (already created, spec committed there). **Phase B repo:** `~/gamedev/godot/space-miner-prototype`, new branch `chore/gotcha-catalog-single-source`. Commit per task; push only on the user's explicit approval.

---

## PHASE A — Skills repo (source-side, branch `chore/gotcha-catalog-single-source`)

### Task A1: Harden the `godot-personal-gotchas` skill (the single source)

**Files:**
- Modify: `godot-personal-gotchas/SKILL.md` (add a migration note after "How to use" ~line 15; add a "Proactive pre-commit scan" section; rewrite "## Adding new gotchas" ~lines 74-80)

**Interfaces:**
- Produces: the skill's hardened "Adding new gotchas" procedure (the home for the retired curator's discipline) and the "Detect-proactively scan" instruction (the home for the retired reviewer). Tasks A4/A5 reference these.

- [ ] **Step 1: Add the single-source/migration note.** After the "## How to use" section (immediately before "## Tooling: which MCP to use"), insert:

```markdown
> **Single-source / migration note:** universal gotchas live ONLY here. A project's
> `docs/godot-gotchas.md` should hold only *project-local* entries; if it still mirrors this
> index it predates the single-source migration — offer to run `/sync-godot-skills`, which
> shrinks the project doc (removing verified duplicates) under parity-table approval.
```

- [ ] **Step 2: Add the proactive scan section.** Immediately after that note, insert:

```markdown
## Proactive pre-commit scan

Before committing Godot changes, scan the diff against the **Detect proactively** line of each
relevant index entry (read the body file for the full pattern) — this skill is the single source
for those detection patterns. Highest-yield checks: `.tscn` ` = null` overrides (#3); `:=` on
`clamp`/`min`/`max`/`abs`/`sign` (#2) and on cross-script member access (#6); `window_set_mode`
from script (#1); non-code files under a docs folder without `.gdignore` (#7); `basis.z` without a
leading `-` (#17). Report `file:line → entry → fix`; silence is not a pass.
```

- [ ] **Step 3: Rewrite "## Adding new gotchas"** to prepend the classify step. Replace the whole section with:

```markdown
## Adding new gotchas

**This skill is the SINGLE SOURCE for universal gotchas** — do not copy them into any project's
`docs/godot-gotchas.md`. Classify first:

- **Universal** — reproduces on any Godot project here given the same engine / tooling / addon
  (Godot, godot-ai, godot-mcp, GDScript, the headless harness, the dev machine, a third-party
  addon). **File it here** (steps below).
- **Project-local** — bound to one project's own code, scenes, assets, or param-tuning. File it in
  *that project's* `docs/godot-gotchas.md`, not here.
- A *convention* (axis-flip, naming, a design rule) is not a gotcha — record it as a `docs/adr/`
  entry, in neither catalog.

To file a universal gotcha here:

1. Append a row to the **Gotcha index** table with a one-line symptom and a one-line cause.
2. Create `gotchas/NN-<slug>.md` (NN = the new row number, zero-padded to 2 digits; slug = short
   kebab-case from the title) with **Symptom / Cause / Fix / Detect proactively / Confirmed by**
   subsections (same format as existing body files). A gotcha first hit in a specific project keeps
   its `Confirmed by: <project> <date>` anchor here — provenance lives in the skill.
3. Keep entries symptom-first — what you'd type into a search box at 11pm.
4. Do NOT renumber existing entries — the row number is the stable pointer from index to body file.
```

- [ ] **Step 4: Verify the edits landed.** Run:

```bash
cd ~/Code/github/cpalaka-claude-skills
grep -c "SINGLE SOURCE for universal gotchas" godot-personal-gotchas/SKILL.md   # expect 1
grep -c "Proactive pre-commit scan" godot-personal-gotchas/SKILL.md             # expect 1
grep -c "Single-source / migration note" godot-personal-gotchas/SKILL.md        # expect 1
```
Expected: each prints `1`.

- [ ] **Step 5: Commit.**

```bash
git add godot-personal-gotchas/SKILL.md
git commit -m "feat(godot): make godot-personal-gotchas the single source

Add the classify-first 'Adding new gotchas' procedure (home for the retired
gotcha-curator's discipline), a proactive pre-commit diff-scan section (home
for the retired godot-gotcha-reviewer's checks, sourced from each entry's
Detect-proactively line), and a single-source/migration note that primes
un-migrated projects to run /sync-godot-skills."
```

---

### Task A2: Thin-starter template `godot-gotchas.md`

**Files:**
- Modify (replace whole file): `init-project/profiles/godot/templates/godot-gotchas.md`

**Interfaces:**
- Produces: the thin-starter shape stamped into every new project (and the shape space-miner's doc is shrunk to in Task B2).

- [ ] **Step 1: Replace the entire file** (861 lines of full catalog → the thin starter) with exactly:

```markdown
# Godot 4.x Gotchas — project-local

> **Universal Godot / godot-ai / godot-mcp / GDScript / tooling / addon gotchas live in the
> `godot-personal-gotchas` skill (single source, auto-loaded), NOT here.** This file holds only
> gotchas bound to *this* project's own code, scenes, assets, or param-tuning.

When you hit a new gotcha, classify it:

- **Universal** — reproduces on any Godot project here given the same engine / tooling / addon →
  file it in the `godot-personal-gotchas` skill (its "Adding new gotchas" section).
- **Project-local** — bound to this project's own code/scenes/assets/tuning → append it below.
- A *convention* (axis-flip, naming, a design rule) is not a gotcha → record it as a `docs/adr/`
  entry.

Entry shape: **Symptom → Cause → Fix** (optional: Detect proactively / Confirmed by).

---

## (No project-local gotchas yet)
```

- [ ] **Step 2: Verify the shrink.** Run:

```bash
wc -l init-project/profiles/godot/templates/godot-gotchas.md   # expect ~20, not ~861
grep -c "godot-personal-gotchas" init-project/profiles/godot/templates/godot-gotchas.md  # expect >=1
grep -c "Embedded game tab" init-project/profiles/godot/templates/godot-gotchas.md       # expect 0 (no universal entries)
```
Expected: ~20 lines; pointer present; `0` universal entries.

- [ ] **Step 3: Commit.**

```bash
git add init-project/profiles/godot/templates/godot-gotchas.md
git commit -m "feat(godot): shrink godot-gotchas template to a thin starter

New projects get a pointer to the godot-personal-gotchas skill + an empty
project-local section instead of a full catalog snapshot, so they no longer
re-introduce the divergence on day one."
```

---

### Task A3: Remodel `sync-godot-skills` — gated shrink + rails + leak-audit

**Files:**
- Modify: `sync-godot-skills/SKILL.md` (amend the Constraints carve-out ~line 79; add a "Gotcha-doc shrink" section before "## Constraints"; annotate pair 6 ~line 31)

**Interfaces:**
- Consumes: the classifier and rails (Global Constraints).
- Produces: the gated doc-shrink operation invoked in Task B2 and on lazy-migration.

- [ ] **Step 1: Amend the "no project writes" constraint.** In "## Constraints", replace the bullet:

```
- Do NOT modify any project file. If you find typos or improvements in project files, mention them in the report; the user decides whether to fix.
```
with:
```
- Do NOT modify any project file **except the one gated operation in "## Gotcha-doc shrink"**: that step may DELETE verified-duplicate universal entries from a project's `docs/godot-gotchas.md`, and only after parity-table approval. Everything else in a project stays read-only — find typos/improvements? mention them in the report; the user decides.
```

- [ ] **Step 2: Add the shrink section.** Immediately before "## Constraints", insert:

```markdown
## Gotcha-doc shrink (single-source migration)

Universal gotchas are single-source in the `godot-personal-gotchas` skill; a project's
`docs/godot-gotchas.md` should hold only project-local entries + a pointer. When a project doc
still mirrors the skill (a pre-migration full copy), offer to shrink it. The shrink DELETES
project-doc entries, so it is gated and **content-unidirectional** — it removes redundant project
copies; it never pushes skill content into the project.

Rails (all four hold; a shrink that can't satisfy them is not proposed):

1. **Removal only for verified BODY-level duplicates.** Propose deleting a doc entry only when its
   body is materially equivalent to a `gotchas/NN-<slug>.md` entry; show the matching entry + a
   `diff` in the parity table. A same-symptom entry whose FIX diverges is NOT a duplicate.
2. **Provenance/locality is KEEP-by-default.** A doc entry with a project `Confirmed by:` anchor, a
   project file path, param-tuned values, or a divergent fix is auto-classified KEEP and never
   auto-proposed for removal — surface it separately for a manual call. Before deleting a
   universal-bodied entry that carried an anchor, verify the anchor is captured in the skill entry
   first; if a divergence is a universal improvement, propagate it UP to the skill before removing
   the copy.
3. **Conservative default:** uncertain → keep + flag, never propose removal.
4. **Demarcate the project-write half** of the parity table from the skills-only half, so "this run
   will delete project-doc lines" is unmissable.

After approval: edit the project doc to the thin shape (project-local entries + the skill pointer,
matching `init-project/profiles/godot/templates/godot-gotchas.md`); re-grep to confirm only
project-local + pointer remain.
```

- [ ] **Step 3: Annotate pair 6 as a leak-audit.** Append to the pair-6 bullet (the `docs/godot-gotchas.md` entries ↔ `godot-personal-gotchas` line) this sentence:

```
(Under single-source, new universal gotchas are filed straight into the skill at discovery, so this pair is now primarily a LEAK-AUDIT: flag any universal entry that nonetheless appears in a project doc, ensure it is in the skill, and propose the gated shrink — see "## Gotcha-doc shrink".)
```

- [ ] **Step 4: Verify.** Run:

```bash
grep -c "Gotcha-doc shrink (single-source migration)" sync-godot-skills/SKILL.md   # expect 1
grep -c "verified BODY-level duplicates" sync-godot-skills/SKILL.md                # expect 1
grep -c "except the one gated operation" sync-godot-skills/SKILL.md                # expect 1
grep -c "LEAK-AUDIT" sync-godot-skills/SKILL.md                                    # expect 1
```
Expected: each `1`.

- [ ] **Step 5: Commit.**

```bash
git add sync-godot-skills/SKILL.md
git commit -m "feat(godot): add gated gotcha-doc shrink to sync-godot-skills

Relax the no-project-writes constraint for one gated operation — the
single-source doc-shrink — behind the existing parity-table approval, with
body-level dedup + provenance-KEEP rails. Pair 6 becomes a leak-audit now
that universal gotchas are filed at discovery. Content stays project->skill
unidirectional (the shrink only removes redundant project copies)."
```

---

### Task A4: Retire both gotcha agents + update the profile recipe

**Files:**
- Delete: `init-project/profiles/godot/templates/agents/gotcha-curator.md`
- Delete: `init-project/profiles/godot/templates/agents/godot-gotcha-reviewer.md`
- Modify: `init-project/profiles/godot.md` (remove stamp lines 47-48; repoint backlog-core `VERIFY_EXAMPLES` line 88 and `DoD` lines 94-95)

**Interfaces:**
- Consumes: the skill's "Proactive pre-commit scan" (A1) and "Adding new gotchas" (A1) as the agents' replacements.

- [ ] **Step 1: Delete the two agent templates.**

```bash
git rm init-project/profiles/godot/templates/agents/gotcha-curator.md \
       init-project/profiles/godot/templates/agents/godot-gotcha-reviewer.md
```

- [ ] **Step 2: Remove the two stamp entries** from `init-project/profiles/godot.md`. Delete these two lines (47-48), keeping the export-verifier line (49):

```
  - { src: agents/godot-gotcha-reviewer.md,  dest: .claude/agents/godot-gotcha-reviewer.md }
  - { src: agents/gotcha-curator.md,         dest: .claude/agents/gotcha-curator.md }
```

- [ ] **Step 3: Repoint the backlog-core `VERIFY_EXAMPLES`.** Replace (line 88):

```
    VERIFY_EXAMPLES: "tests/run_tests.sh green via the headless runner; an in-editor F5 / interactive verification of the affected surface; a godot-gotcha-reviewer scan of the diff"
```
with:
```
    VERIFY_EXAMPLES: "tests/run_tests.sh green via the headless runner; an in-editor F5 / interactive verification of the affected surface; a gotcha self-scan of the diff against the godot-personal-gotchas skill's Detect-proactively patterns"
```

- [ ] **Step 4: Repoint the backlog-core `DoD`.** Replace these two list items (lines 94-95):

```
      - "godot-gotcha-reviewer subagent scan of the diff — clean, or each finding addressed"
      - "New gotchas filed in docs/godot-gotchas.md and load-bearing decisions recorded as docs/adr/ entries"
```
with:
```
      - "Gotcha self-scan of the diff against the godot-personal-gotchas skill — clean, or each finding addressed"
      - "New gotchas filed (universal -> godot-personal-gotchas skill, project-local -> docs/godot-gotchas.md); load-bearing decisions recorded as docs/adr/ entries"
```

- [ ] **Step 5: Verify the recipe no longer references the retired agents.** Run:

```bash
git ls-files init-project/profiles/godot/templates/agents/   # expect ONLY godot-export-verifier.md
grep -n "gotcha-curator\|godot-gotcha-reviewer" init-project/profiles/godot.md   # expect NO matches
grep -c "gotcha self-scan of the diff against the godot-personal-gotchas" init-project/profiles/godot.md  # expect 1 (VERIFY_EXAMPLES)
grep -c "Gotcha self-scan of the diff against the godot-personal-gotchas skill" init-project/profiles/godot.md  # expect 1 (DoD)
```
Expected: only `godot-export-verifier.md` remains; no curator/reviewer references; the two replacements present.

- [ ] **Step 6: Commit.**

```bash
git add -A init-project/profiles/godot/templates/agents/ init-project/profiles/godot.md
git commit -m "refactor(godot): retire gotcha-curator and godot-gotcha-reviewer agents

Their jobs fold into the godot-personal-gotchas skill (filing discipline +
proactive diff-scan, single-source). Drop both template stamps and repoint
the backlog-core VERIFY_EXAMPLES/DoD from the reviewer to the skill-sourced
scan. godot-export-verifier is untouched (different subsystem)."
```

---

### Task A5: Rewrite the `CLAUDE.md.full` template pointers

**Files:**
- Modify: `init-project/profiles/godot/templates/CLAUDE.md.full` (lines 17, 24, 27, 28)

- [ ] **Step 1: Rewrite the catalog pointer (line 17).** Replace:

```
- **For Godot engine/editor quirks** (Inspector behavior, `.tscn` file format gotchas, parser warnings, embedded-game-tab oddities), check `docs/godot-gotchas.md` first. This is the project-level catalog of "we hit this and here's the fix." It's the portable counterpart to per-machine personal-gotchas skills — add new entries here so any developer (human or LLM, any machine) cloning the project benefits.
```
with:
```
- **For Godot engine/editor quirks** (Inspector behavior, `.tscn` file format gotchas, parser warnings, embedded-game-tab oddities), the **single source is the `godot-personal-gotchas` skill** (per-machine, auto-loaded). `docs/godot-gotchas.md` holds only *project-local* gotchas + a pointer to the skill — it is NOT a full catalog.
```

- [ ] **Step 2: Rewrite the "add to BOTH" line (line 24).** Replace:

```
  When you discover a new Godot gotcha, add it to BOTH `docs/godot-gotchas.md` (portable, project-wide) and the personal skill (per-machine fast lookup). The two layers serve different scopes.
```
with:
```
  When you discover a new Godot gotcha, file it ONCE in the right layer: **universal** (reproduces on any Godot project here) -> the `godot-personal-gotchas` skill (single source); **project-local** (bound to this project's code/scenes/assets/tuning) -> `docs/godot-gotchas.md`. Never copy a universal gotcha into the project doc.
```

- [ ] **Step 3: Update the sync pointer (line 27).** Replace `Run it after adding entries to `docs/godot-gotchas.md`, the MCP guides,` with `Run it after adding entries to the MCP guides,` and append to that bullet: ` It also runs a leak-audit + the gated single-source doc-shrink (see its "Gotcha-doc shrink" section).`

- [ ] **Step 4: Drop the retired agents from the subagent list (line 28).** Replace:

```
- **Project-local subagents live in `.claude/agents/`** — dispatch them via the `Agent` tool to offload heavy reference docs from main context: `godot-gotcha-reviewer` (read-only diff scan against the gotcha catalog — dispatch on demand for `.tscn`/MCP-authored/cross-script diffs), `gotcha-curator` (files a new gotcha: `docs/godot-gotchas.md` entry + `MEMORY.md` index line), `godot-export-verifier` (pre-push smoke-tester that runs all platform exports headlessly; surfaces PASS/FAIL + interactive verification commands).
```
with:
```
- **Project-local subagents live in `.claude/agents/`** — dispatch them via the `Agent` tool: `godot-export-verifier` (pre-push smoke-tester that runs all platform exports headlessly; surfaces PASS/FAIL + interactive verification commands). (Gotcha filing + diff-scanning are no longer subagents — they live in the `godot-personal-gotchas` skill: file via its "Adding new gotchas" procedure, scan via its "Proactive pre-commit scan" section.)
```

- [ ] **Step 5: Verify.** Run:

```bash
grep -c "add it to BOTH\|cloning the project benefits" init-project/profiles/godot/templates/CLAUDE.md.full   # expect 0
grep -c "single source is the .godot-personal-gotchas. skill" init-project/profiles/godot/templates/CLAUDE.md.full  # expect 1
grep -c "gotcha-curator\|godot-gotcha-reviewer" init-project/profiles/godot/templates/CLAUDE.md.full          # expect 0
grep -c "godot-export-verifier" init-project/profiles/godot/templates/CLAUDE.md.full                          # expect 1
```
Expected: stale phrasing gone (`0`); single-source phrasing present; retired agents gone; export-verifier kept.

- [ ] **Step 6: Commit.**

```bash
git add init-project/profiles/godot/templates/CLAUDE.md.full
git commit -m "docs(godot): repoint CLAUDE.md.full template to single-source gotchas

Skill is the single source for universal gotchas; project doc holds only
project-local. Drop 'add to BOTH', drop the retired curator/reviewer from
the subagent list, note sync's leak-audit + doc-shrink."
```

---

### Task A6: Sharpen the `CONTEXT.md` `Gotcha` glossary entry

**Files:**
- Modify: `CONTEXT.md` (the `**Gotcha**:` entry, ~lines 46-52)

- [ ] **Step 1: Replace the `Gotcha` entry** with the approved wording (spec §4.8):

```markdown
**Gotcha**:
A non-obvious Godot 4.x failure observed first-hand and indexed by *symptom*,
not component — typically "I set X, no error fired, nothing changed." Many have
no error signal, so they must be recognised, not grepped. Body shape: Symptom /
Cause / Fix / Detect proactively / Confirmed by. A gotcha is either **universal**
— reproducible on any project here given the same engine / tooling / addon, so it
lives *only* in the `godot-personal-gotchas` skill (the single source) — or
**project-local** — bound to this project's own code, scenes, assets, or tuning,
so it lives in the project's `docs/godot-gotchas.md`. (A *convention* — axis-flip,
naming — is not a gotcha; it belongs in an ADR.)
_Avoid_: known issue (a gotcha is a hard-won field observation, not a release
note), trap, edge case (an edge case is expected; a gotcha is surprising);
mirroring the universal catalog into a project doc (single-source — the skill is
authoritative; the project doc holds only project-local entries).
```

- [ ] **Step 2: Verify.** Run:

```bash
grep -c "lives \*only\* in the .godot-personal-gotchas. skill" CONTEXT.md   # expect 1
grep -c "mirroring the universal catalog into a project doc" CONTEXT.md     # expect 1
```
Expected: each `1`.

- [ ] **Step 3: Commit.**

```bash
git add CONTEXT.md
git commit -m "docs(context): record universal-vs-project-local gotcha vocabulary

Sharpen the Gotcha glossary entry with the single-source split (universal ->
skill, project-local -> doc) and an _Avoid_ for mirroring the catalog. The
Template entry's 'gotcha-catalog seed' wording already holds, so it is untouched."
```

---

### Task A7: System ADR 0004

**Files:**
- Create: `docs/adr/0004-gotcha-catalog-single-source.md`

- [ ] **Step 1: Read an existing ADR for the house format.**

```bash
sed -n '1,40p' docs/adr/0003-single-init-project-engine.md
```

- [ ] **Step 2: Create `docs/adr/0004-gotcha-catalog-single-source.md`** matching that format. Content:

```markdown
# 4. Gotcha catalog is single-source in the godot-personal-gotchas skill

## Status
Accepted — 2026-06-21.

## Context
The Godot gotcha catalog was copied in full into every project's `docs/godot-gotchas.md` (8
projects) and also held in the per-machine `godot-personal-gotchas` skill. ~95% of entries are
universal; copying them per-project is what makes projects diverge, and the `gotcha-curator` agent
actively re-created the divergence by filing each new gotcha into the project doc as "the source
of truth."

## Decision
Universal gotchas live ONLY in the `godot-personal-gotchas` skill (the single source, auto-loaded).
Each project's `docs/godot-gotchas.md` shrinks to project-local entries + a pointer; the
init-project template becomes a thin starter. New gotchas are classified at discovery (universal ->
skill, project-local -> doc, convention -> ADR). `sync-godot-skills` gains a parity-table-gated
doc-shrink (body-level dedup, provenance KEEP-by-default) and a leak-audit; the `gotcha-curator`
and `godot-gotcha-reviewer` agents are retired into the skill's procedures. Rollout: space-miner
now; the other 7 lazy-migrate on next touch.

## Consequences
Single source for universal knowledge; future projects auto-correct via the thin-starter template.
Same per-machine property as Chunks — a fresh clone elsewhere lacks the skill; handled by
snapshot-on-going-public (documented, not built). Design: `docs/superpowers/specs/2026-06-21-gotcha-catalog-single-source-design.md`.
```

- [ ] **Step 3: Verify + commit.**

```bash
test -f docs/adr/0004-gotcha-catalog-single-source.md && echo OK
git add docs/adr/0004-gotcha-catalog-single-source.md
git commit -m "docs(adr): 0004 gotcha catalog single-source in the skill"
```

---

## PHASE B — space-miner application (repo `~/gamedev/godot/space-miner-prototype`)

> Switch repos. Create the branch first:
> ```bash
> cd ~/gamedev/godot/space-miner-prototype
> git checkout -b chore/gotcha-catalog-single-source
> ```

### Task B1: Classification audit + propagate universal-missing up

**Files:**
- Read: `~/gamedev/godot/space-miner-prototype/docs/godot-gotchas.md` (the full copy)
- Read: `~/Code/github/cpalaka-claude-skills/godot-personal-gotchas/SKILL.md` + `gotchas/*.md`
- Possibly modify (skills repo, Phase-A branch): the skill, if any universal entry is missing

**Interfaces:**
- Produces: the parity table (per doc entry: `universal-verified-in-skill` / `universal-missing` / `project-local` / `convention`) consumed by Task B2. Nothing is deleted in this task.

- [ ] **Step 1: Build the parity table via a Workflow fan-out.** Classify each entry in space-miner's `docs/godot-gotchas.md` against the skill's 42 entries. Use the `Workflow` tool: pipeline over the doc's entries, each agent returning the schema `{title, verdict: "universal-verified"|"universal-missing"|"project-local"|"convention", skill_match: "<NN-slug or null>", evidence: "<body-level diff note or why-local>"}`. Apply the Global-Constraints classifier; body-level match per rail #1; provenance/divergent-fix → `project-local` (KEEP) per rail #2.

- [ ] **Step 2: Present the parity table to the user and PAUSE.** Demarcate the would-shrink (universal-verified) rows from the keep (project-local/convention) rows and the must-propagate-first (universal-missing) rows. Do not proceed without approval.

- [ ] **Step 3: Propagate any `universal-missing` entry UP to the skill first** (in the Phase-A skills-repo branch), via the skill's "Adding new gotchas" procedure (new index row + `gotchas/NN-slug.md`, no renumber, carry the `Confirmed by: space-miner` anchor). Commit in the skills repo:

```bash
cd ~/Code/github/cpalaka-claude-skills
git add godot-personal-gotchas/
git commit -m "feat(godot): propagate space-miner-discovered universal gotcha(s) to the skill

Surfaced by the space-miner single-source classification audit; filed here
before the project doc is shrunk so no knowledge is lost. (Skip-commit if the
audit found none missing.)"
cd ~/gamedev/godot/space-miner-prototype
```

- [ ] **Step 4: Verify nothing universal is missing.** For each `universal-*` row, confirm a skill entry exists:

```bash
# For each universal entry title, grep the skill index/bodies for its symptom keyword:
grep -ric "<symptom keyword>" ~/Code/github/cpalaka-claude-skills/godot-personal-gotchas/   # expect >=1 each
```
Expected: every universal doc entry now has a skill counterpart. (No commit in space-miner this task — the audit is read-only here.)

---

### Task B2: Shrink space-miner's `docs/godot-gotchas.md`

**Files:**
- Modify: `~/gamedev/godot/space-miner-prototype/docs/godot-gotchas.md` (→ thin shape: project-local entries from B1 + pointer)

**Interfaces:**
- Consumes: the B1 parity table (which rows are `project-local` = keep).

- [ ] **Step 1: Rewrite the doc to the thin shape.** Use the thin-starter header from Task A2 (the `# Godot 4.x Gotchas — project-local` block), then under `## ` append ONLY the entries B1 classified `project-local` (verbatim, with their Confirmed-by anchors). If B1 found zero project-local entries, keep the `## (No project-local gotchas yet)` line.

- [ ] **Step 2: Verify only project-local + pointer remain.** Run:

```bash
cd ~/gamedev/godot/space-miner-prototype
grep -c "godot-personal-gotchas" docs/godot-gotchas.md     # expect >=1 (pointer)
grep -c "Embedded game tab\|clamp.*min.*max\|Forward axis is canonical" docs/godot-gotchas.md  # expect 0 (universal entries gone)
wc -l docs/godot-gotchas.md                                # expect far below ~861
```
Expected: pointer present; universal entries gone; file is small.

- [ ] **Step 3: Commit.**

```bash
git add docs/godot-gotchas.md
git commit -m "refactor: shrink godot-gotchas.md to project-local + skill pointer

Universal gotchas are now single-source in the godot-personal-gotchas skill
(any universal-missing entries were propagated up first). This doc keeps only
genuinely project-local gotchas + a pointer. See docs/adr/0002."
```

---

### Task B3: Delete space-miner's agent copies + repoint `CLAUDE.md`

**Files:**
- Delete: `.claude/agents/gotcha-curator.md`, `.claude/agents/godot-gotcha-reviewer.md`
- Modify: `CLAUDE.md` (lines 77, 84, 87, 88 — same rewrites as Task A5, adapted to space-miner's wording)

- [ ] **Step 1: Delete the two agent copies.**

```bash
git rm .claude/agents/gotcha-curator.md .claude/agents/godot-gotcha-reviewer.md
```

- [ ] **Step 2: Rewrite `CLAUDE.md` line 77** (catalog pointer) to the single-source form. Replace the bullet beginning `- **For Godot engine/editor quirks**` and ending `...add new entries here so any developer (human or LLM, any machine) cloning the project benefits.` with:

```
- **For Godot engine/editor quirks** (Inspector behavior, `.tscn` file format gotchas, parser warnings, embedded-game-tab oddities), the **single source is the `godot-personal-gotchas` skill** (per-machine, auto-loaded). `docs/godot-gotchas.md` holds only *project-local* gotchas + a pointer to the skill — it is NOT a full catalog.
```

- [ ] **Step 3: Rewrite `CLAUDE.md` line 84** (the "add to BOTH" sentence inside the personal-gotchas bullet). Replace:

```
  When you discover a new Godot gotcha, add it to BOTH `docs/godot-gotchas.md` (portable, project-wide) and the personal skill (per-machine fast lookup). The two layers serve different scopes.
```
with:
```
  When you discover a new Godot gotcha, file it ONCE in the right layer: **universal** -> the `godot-personal-gotchas` skill (single source); **project-local** (bound to this project's code/scenes/assets/tuning) -> `docs/godot-gotchas.md`. Never copy a universal gotcha into the project doc.
```

- [ ] **Step 4: Update `CLAUDE.md` line 87** (sync bullet). Replace `Run it after adding entries to `docs/godot-gotchas.md`, the MCP guides,` with `Run it after adding entries to the MCP guides,` and append: ` It also runs a leak-audit + the gated single-source doc-shrink.`

- [ ] **Step 5: Rewrite `CLAUDE.md` line 88** (subagent list). Replace the bullet listing the three subagents with:

```
- **Project-local subagents live in `.claude/agents/`** — dispatch them via the `Agent` tool: `godot-export-verifier` (pre-push smoke-tester that runs all platform exports headlessly; surfaces PASS/FAIL + interactive verification commands). (Gotcha filing + diff-scanning are no longer subagents — they live in the `godot-personal-gotchas` skill: file via its "Adding new gotchas" procedure, scan via its "Proactive pre-commit scan" section.)
```

- [ ] **Step 6: Verify.** Run:

```bash
ls .claude/agents/                                                # expect only godot-export-verifier.md
grep -c "add it to BOTH\|cloning the project benefits" CLAUDE.md  # expect 0
grep -c "single source is the .godot-personal-gotchas. skill" CLAUDE.md  # expect 1
grep -c "gotcha-curator\|godot-gotcha-reviewer" CLAUDE.md         # expect 0
```
Expected: only export-verifier remains; stale phrasing gone; single-source phrasing present.

- [ ] **Step 7: Commit.**

```bash
git add -A .claude/agents/ CLAUDE.md
git commit -m "refactor: drop gotcha agents, repoint CLAUDE.md to single-source

Delete the gotcha-curator + godot-gotcha-reviewer copies (folded into the
godot-personal-gotchas skill) and rewrite the gotcha guidance to single-source.
godot-export-verifier kept."
```

---

### Task B4: Application ADR 0002

**Files:**
- Create: `~/gamedev/godot/space-miner-prototype/docs/adr/0002-gotcha-catalog-single-source.md`

- [ ] **Step 1: Read the existing ADR for format.**

```bash
sed -n '1,20p' docs/adr/0001-characterbody2d-manual-integration.md
```

- [ ] **Step 2: Create `docs/adr/0002-gotcha-catalog-single-source.md`:**

```markdown
# Gotcha catalog: single-source in the godot-personal-gotchas skill

This project adopts the machine-wide single-source model for Godot gotchas: universal gotchas live
ONLY in the per-machine `godot-personal-gotchas` skill (auto-loaded), and `docs/godot-gotchas.md`
here holds only *project-local* gotchas + a pointer to the skill — it is no longer a full catalog
copy. New gotchas are filed once in the right layer (universal -> skill; project-local -> the doc;
a convention -> a `docs/adr/` entry). The retired `gotcha-curator`/`godot-gotcha-reviewer` agents
fold into the skill's "Adding new gotchas" + "Proactive pre-commit scan" sections; `sync-godot-skills`
carries a parity-table-gated doc-shrink. The authoritative system decision and rationale live in the
skills repo: `cpalaka-claude-skills/docs/adr/0004-gotcha-catalog-single-source.md` (design:
`.../docs/superpowers/specs/2026-06-21-gotcha-catalog-single-source-design.md`). The per-machine
property (a fresh clone elsewhere lacks the skill) is handled by snapshot-on-going-public, as for
all chunk-delivered dev-process knowledge.
```

- [ ] **Step 3: Verify + commit.**

```bash
test -f docs/adr/0002-gotcha-catalog-single-source.md && echo OK
git add docs/adr/0002-gotcha-catalog-single-source.md
git commit -m "docs(adr): 0002 adopt single-source gotcha catalog

Points at the skills-repo system ADR 0004."
```

---

## Self-review (against the spec)

- **Spec coverage:** §4.1 → A1; §4.2 → A2; §4.3 → A3; §4.4/§4.5 → A4; §4.6 → A5/B3; §4.7 → A4; §4.8 → A6; §4.9 → A7/B4; §3 classifier → Global Constraints (used by A1/A3/B1); §5 rails → A3/B1; §6 rollout (space-miner now; lazy-7 deferred via A1 migration note + A3 leak-audit) → covered, other-7 explicitly out; §7 verification → B1 + each task's verify step; §9 non-goals → Global Constraints. No gaps.
- **Placeholders:** none — every edit shows verbatim old→new text; the only "depends on runtime output" is B1's project-local entry set, which is correctly an audit output, not a placeholder.
- **Type/name consistency:** "Proactive pre-commit scan" and "Adding new gotchas" section names are used identically in A1, A4, A5, B3; "Gotcha-doc shrink" section name identical in A3, A5, B3; ADR numbers (skills 0004, space-miner 0002) consistent across A7/B4 and cross-references.

## Execution handoff

Phase A is 7 tasks on the existing skills-repo branch; Phase B is 4 tasks on a new space-miner branch (B1 may add one skills-repo commit if the audit finds a universal-missing entry). Push neither repo until the user approves.
