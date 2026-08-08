# `/tournament` — design spec

**Status:** approved design (2026-06-17), since implemented — `SKILL.md` is the live spec; this file is the rationale archive.
**One-liner:** A personal skill that authors a complete, self-contained Claude Code **Workflow** script for a generate → judge → verify → synthesize *tournament* in any domain, persists the resolved spec for reuse, and (on approval) launches it and relays results.

---

## 1. Problem / motivation

A skill-usage audit (2026-06-17, workflow `wf_eb4a97c9-d28`) found the single largest source of repeated toil is hand-authoring 150–300 line tournament `wf_*.js` scripts — ~26 runs across game-storming + misc-research, each re-deriving the same orchestration boilerplate **and** the same design thinking (lenses, judges, axes, domain framing). The mechanics are nearly identical across wildly different domains (game concepts, recipes, skill-audits); only the content changes. This skill captures the invariant mechanics once and turns recurring tournaments into editable, reusable specs.

## 2. The invariant pipeline (what's being templated)

Confirmed identical across the three golden scripts (§9):

```
context/research → [verify dubious claims] → generate (N lens-generators + guaranteed "seed" candidates)
  → filter (hard-constraint kill + multi-axis screen → shortlist/bracket)
  → tournament (judge panel; bracket OR scoreboard) → verify champion (adversarial skeptics)
  → synthesize (graft winner + runner-up grafts + skeptic fixes) → [QA red-team + patch]
```

Bracketed stages are per-spec toggles. v1 supports **all** of it (both tournament modes + optional claim-verify + optional QA).

## 3. Key constraint that shapes the form

A Workflow script **must** be a self-contained literal: it begins with a literal `export const meta = {...}`, and the runtime forbids `import`/`require`, filesystem, modules, and `Date.now()`/`Math.random()`/argless `new Date()`. **Therefore a reusable runtime library is impossible** — the skill must *generate* a fresh self-contained script each time. This is a code generator, not a library.

## 4. Form: a script-authoring skill

- **Name / slash:** `tournament` / `/tournament`.
- **Location:** `cpalaka-claude-skills/tournament/`, symlinked into `~/.claude/skills/` like the other personal skills.
- **Files (progressive disclosure):**
  - `SKILL.md` — the interview, the assembly process, the Workflow-constraint safety rules, the run flow. Kept lean.
  - `reference/stages.md` — the **stage catalog**: one canonical, slot-marked, copy-paste-exact snippet per stage. Loaded only when assembling. Source of truth for all boilerplate.
  - `reference/example-spec.md` — one worked `.spec.md` → script example (the curry tournament) as a golden reference.
  - `DESIGN.md` — this document.

## 5. The spec artifact

- **Reuse model:** every run **persists a resolved spec**. A run is either *new* (interview → spec → script) or *reuse* (load an existing spec, tweak, regenerate). This saves the design thinking, not just the boilerplate, and makes runs reproducible, resumable, and diffable.
- **Location:** central archive `~/Claude/tournaments/<name>.spec.md` (discoverable for reuse from any cwd; matches the `~/Claude` hub pattern). The generated *script* still auto-saves to the session's workflow dir as today; the *spec* is the new durable, git-able artifact.
- **Format:** markdown + small YAML frontmatter. Frontmatter holds scalars/enums/keys (`name`, `domain`, `tags`, `mode: bracket|scoreboard`, counts, `claimVerify`/`qa` toggles, lens/judge/axis keys). Body holds prose under stable `##` headings (domain/constraints block, each lens prompt, each judge persona+rubric, each axis instruction, candidate-field list). Consumed by the skill's agent (an LLM), so heading-convention parsing is reliable; prose dominates and markdown is its best home.

## 6. Parameter surface (the interview)

Invoked with a free-form brief; the skill fills gaps by asking, confirms a compact spec, then generates. Fields (strong overridable defaults so you supply only the non-default):

| Field | Notes / default |
|---|---|
| Objective | 1 line → `meta` + synthesis framing |
| Domain block | fixed context every agent needs (the `HARD`/`CONSTRAINTS`/`ORIGINAL` equivalent) |
| Candidate fields | inferred+proposed (§7) |
| Context sources | optional: local files to distill and/or web-research briefs `[{key,prompt}]` |
| Claim-verify | toggle; default lenses=3, refuted if ≥2 |
| Generation | lenses `[{key,prompt}]`; default 4 candidates/lens; optional guaranteed seeds `[{label,prompt}]` |
| Filter | constraint-kill (reuses domain block) + screening axes `[{key,instr}]` + shortlist size + guaranteed-keeps |
| Tournament mode | `bracket` (default 8 slots, pairing 1v8·4v5·3v6·2v7) or `scoreboard` (default 0–50, round-robin) |
| Judges | `[{key,persona,rubric}]`; default panel = 3; tie-break default = higher seed |
| Verify-champion | toggle; skeptic lenses + refute threshold; default swap-to-runner-up if ≥2 fatal |
| Synthesize | output sections + result schema |
| QA | toggle; red-team checklist + patch |
| Knobs | per-stage effort, counts. Concurrency auto-capped by runtime |

The interview actively elicits **domain + lenses + judges + mode** (the candidate schema is inferred and confirmed, §7); everything else defaults silently but is written into the spec for editing.

## 7. Candidate schema strategy

The candidate JSON Schema varies per domain and a flat config can't express it. Strategy: **infer + propose, archetype-seeded.** The skill carries ~3 archetypes — `creative-concept`, `procedure/recipe`, `evaluated-option` — infers the best-fit field set from objective+domain, and proposes it for one-line edits. Default shape = a handful of **structured comparable fields** + an optional **freeform `body` markdown field** (covers both corpus styles: 9 structured concept fields vs. a `recipeMarkdown` blob). **Coherence check:** during the interview the skill verifies every axis/judge maps to at least one candidate field and flags any judge with nothing to grade.

## 8. Elicitation depths

Three selectable depths, realized by **replicating the posture inline** (not sub-invoking the `brainstorming`/`grilling` skills, whose hard-gates and terminal states would fight the tournament flow):

- **quick** (default) — the structured interview.
- **brainstorm** — collaborative one-question-at-a-time spec exploration, scoped to producing the `.spec.md` (no design-doc/writing-plans detour).
- **+grill** (optional add-on) — a relentless one-at-a-time stress pass over the drafted spec before generating.

The skill picks `quick` by default but **suggests escalating** when stakes are high (many lenses/judges, large estimated agent-count, or the user signals a real decision). *Reuse-from-existing-spec skips elicitation entirely.*

## 9. Stage catalog & assembly

`reference/stages.md` holds canonical slotted snippets, built by **normalizing the three golden scripts and validating the normalization by regenerating equivalents of the originals** (idealized for a consistent API, but acceptance-tested against battle-proven code, not trusted blind).

**Golden source scripts:**
- bracket + screening: `…/game-storming/…/incremental-concept-tournament-wf_6b58e640-617.js`
- scoreboard + claim-verify + QA: `…/misc-research/…/moms-curry-tournament-wf_00bd1b8e-e68.js`
- pipeline + adversarial + per-domain ranking: the skill-audit workflow `wf_eb4a97c9-d28`

> **Provenance note:** these scripts live in ephemeral session/workflow dirs (subject to transcript cleanup), so implementation **step 0** is to snapshot them into `reference/golden/` — otherwise the catalog loses its validation baseline.

**Catalog stages:** `meta`-builder · schema-builders (candidate / KEEP / SCORES / MATCH / JUDGE / SKEPTIC / VERDICT / SYNTH / QA) · context-research · claim-verify (extract→3-lens consensus) · generate (lenses+seeds) · filter (dedup/kill→axis-screen→rank→bracket/shortlist) · **bracket-runner** (`runMatch` panel→majority→tiebreak→log + round orchestration) · **scoreboard** (pipeline generate→judge, or judge-existing→leaderboard) · verify-champion (skeptic fan-out+consensus+swap) · synthesize · QA (red-team+patch) · render helpers · result shape.

The skill composes only the needed subset and wires stages via a **consistent binding contract** (each stage reads/writes named bindings), which is what makes machine-assembly safe.

## 10. Workflow-constraint safety (lint)

Before handoff, the skill self-lints the emitted script:
- literal `meta`; `meta.phases` match the `phase()` calls;
- **no `Date.now()`/`Math.random()`/argless `new Date()`** (vary by index);
- no `import`/`require`/fs; `pipeline()` by default, `parallel()` only as a genuine barrier; every fan-out result `.filter(Boolean)`;
- **every `agent()` pins an explicit, CONCRETE `model:`** (ERROR if missing) — no silent session-model inheritance and no short aliases (an alias can lag a release); a tournament fans out 89–111 agents, so a scarce-tier session default would blow the weekly budget (model policy 2026-07-01, alias rule 2026-07-24). All stages workhorse; the single synthesis agent may opt into `SYNTH_MODEL` on the scarce tier — the one stage whose count is fixed at exactly 1 regardless of bracket size, which is the cost argument (see `multi-agent-policy`, posture ladder);
- **vote-tallying stages reconcile SENT vs RETURNED** (WARN if a `winner`/`consensus`/`fatalCount` stage filters agent results without `dropped`/`votesSent`/`needsAdjudication`) — a dropped vote otherwise silently flips a bracket winner, claim consensus, or skeptic fatalCount (improvements 2026-06-28);
- `node --check` for syntax.

## 11. Run flow

Author → **gate** (show spec recap + phase outline + estimated agent-count/cost; for new/edited scripts, run lint + a required tiny **smoke-run**: 1 lens / 2 candidates / 1 judge / no web / low effort) → on approval, the main agent launches via the Workflow tool (background) → relays results. Smoke-run is **skipped** when re-running an unchanged, previously-green spec. Never auto-runs unseen. On completion: relay report + leaderboard/bracket in chat **and** write `~/Claude/tournaments/<name>.result-<date>.md`; note the `resumeFromRunId` recovery path (limits get hit on big runs).

## 12. Budget behavior

Counts are explicit in the spec (predictable). The launch gate estimates agent-count and, if a budget target is set, flags whether it fits and where it'd truncate. An opt-in **`--scale-to-budget`** mode derives fleet sizes from `budget.total` for "throw everything at it" runs. Predictable by default, elastic on demand.

## 13. Testing / verification

- **Smoke-test-then-scale** (baked into the run flow): tiny dry-run green before any full-scale launch of new/edited scripts.
- **Golden reproduction** (build-time acceptance test): point the skill at the curry and game-concept specs; assert the emitted scripts pass `node --check` + the constraint-lint and structurally match the originals' stage graph.

## 14. Risks & mitigations

- **Assembly wiring errors** — stitched snippets mismatch variable names/schemas between stages. *Mitigation:* catalog's consistent binding contract + lint + required smoke-run.
- **Spec/script drift** — the script is a build artifact; hand-edits diverge from the spec. *Mitigation:* edits go in the spec, regenerate; never hand-edit the generated script.
- **SKILL.md complexity** — three depths + reuse + toggles. *Mitigation:* progressive disclosure (lean SKILL.md, `stages.md` on demand).
- **Field/judge incoherence** — judges with nothing to grade. *Mitigation:* coherence check during interview (§7).

## 15. Out of scope (v1)

No GUI/config-file editor (interview only). No auto-tuning of counts (beyond opt-in `--scale-to-budget`). No non-tournament workflow types (research-only, etc.). No persistence of past *results* beyond the written result file. All addable later without rework.

## 16. Decision log

| # | Branch | Resolution |
|---|--------|-----------|
| 1 | Reuse model | Persist `<name>.spec.md`; run = new or reuse-and-tweak |
| 2 | Spec location | Central `~/Claude/tournaments/` |
| 3 | Spec format | Markdown + YAML frontmatter |
| 4 | Candidate schema | Infer+propose, archetype-seeded, coherence-checked |
| 5 | Run boundary | Author → gate (recap + cost) → launch → relay |
| 6 | Catalog source | Normalize from 3 golden scripts, validated by regenerating originals |
| 7 | Elicitation | 3 depths (quick / brainstorm / +grill), posture replicated inline |
| 8 | Smoke-test | Lint always; smoke-run required on new/edited, skipped on unchanged reuse |
| 9 | Budget | Explicit counts; budget-aware gate; opt-in `--scale-to-budget` |
| 10 | Model & vote reconciliation | Every `agent()` pins `model:` (Opus; synthesis opt-in Fable); vote-tally stages reconcile sent-vs-returned + flag ties/drops. Lint-enforced. (2026-07-02 retrofit of the 06-28/07-01 rules the generator predated) |
| — | Form | Script-authoring skill (general scope, all domains) |
| — | Defaults | Strong, overridable; interview asks only domain+candidate+lenses+judges+mode |
| — | Context stage | Inline research agents (+ optional local-doc distillation); not a `deep-research` sub-invoke |
