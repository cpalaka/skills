# Phases & kickoff prompts

Run **one phase per fresh session**. Every kickoff starts by reading the project's
`docs/architecture/campaign.md` (parameters) and invoking this skill (recipe). Engine quirks:
obey the project's gotchas catalog and the `godot-personal-*` skills throughout.

The `ultracode.` prefix on the exploration kickoffs opts the session into workflow-driven
fan-out; the deep-dive kickoff deliberately has none (solo, write-heavy).

## Phase 0 — Domain language → `CONTEXT.md` · WORKFLOW · exploration

Fan out parallel readers over the project's subsystems + docs + memory; each returns candidate
domain terms (`term → 1–2 sentence what-it-IS + _Avoid_ synonyms`); synthesize into one
opinionated, deduped glossary; write `CONTEXT.md`. This is the foundation every later phase
builds on — and it seeds all future development with a pinned vocabulary. Phase 0 produces
*vocabulary only*; the whole-game map is Phase 1.

```
ultracode. Invoke the godot-architecture-review skill and read docs/architecture/campaign.md,
then execute Phase 0 (domain language → CONTEXT.md). Fan out parallel readers over the
subsystems listed in campaign.md plus docs/ and project memory; produce an opinionated, deduped
glossary (term → what-it-IS + _Avoid_); write CONTEXT.md at repo root per
domain-modeling/CONTEXT-FORMAT.md (terse, points into <DEEP-DESIGN-DOC>, project-specific terms
only). Then show me the glossary for review before finalizing.
```

## Phase 1 — Whole-game survey → map + friction report · WORKFLOW · exploration

Use the `codebase-design` skill for vocabulary + the deletion test, the `grilling` skill for
grilling discipline, and this skill's [HTML-REPORT.md](HTML-REPORT.md) for the friction-report
format — then fan out per-subsystem analysts that apply the APoSD lens
**under the Godot guardrails** and the **pre-labeled populations** from `campaign.md`.
**Adversarially verify** every "shallow module" claim (a skeptic that tries to refute it) before
it survives. Synthesize into: (a) the populations table, (b) the whole-game
`docs/architecture/system-map.md` (skeleton in ARTIFACTS.md), (c) the HTML friction report
(generated to `$TMPDIR` per [HTML-REPORT.md](HTML-REPORT.md), then **archived frozen** to `docs/architecture/runs/`).
Inspect Population-D (throwaway) modules for smells they surface **against A/B/C** — node-name
coupling, interface-widening of a deepen-target — and log those in the friction report even
though D itself stays out of scope. End by ranking candidate deep-dives, recommending one
(prefer a first dive that **serves both drivers** — sits on an extraction seam *and* has
anchor-task blast radius), and **offering to record the run's load-bearing refutations as ADRs**
(rejection memory — candidate-adjacent rejections recorded now become scope-fences for the
dives). Read `CONTEXT.md` and any `docs/adr/` first; suppress settled items.

```
ultracode. Invoke the godot-architecture-review skill and read docs/architecture/campaign.md and
CONTEXT.md, then execute Phase 1 (whole-game survey). Use the codebase-design skill for vocabulary
and this skill's HTML-REPORT.md for the report format, but apply the Godot guardrails and the pre-labeled populations from
campaign.md, scrutinize scene-node-name coupling, and adversarially verify every shallow-module
claim. Produce: the populations table, a regenerated docs/architecture/system-map.md, and an
HTML friction report (generated to $TMPDIR, then archived frozen to docs/architecture/runs/).
Read docs/adr/ if present and suppress settled items. End by listing candidate deep-dives
ranked, recommending one, and offer to record the run's load-bearing refutations as ADRs.
```

## Phase 2…M — Deep-dives, one candidate per session · SOLO · grilling + TDD

1. **Orient on `docs/adr/` first** — ADRs are scope-fences; surface any conflict for an explicit
   amend/supersede decision *before* the grill locks the thread. Sweep for candidate-adjacent
   ADRs, not just exact-name matches.
2. **Grill the design** (the `grilling` skill): walk the seam, the shape of the
   deepened module, what sits behind it, what tests survive.
3. **Run the realization through `godot-gdscript-patterns`** so the idiom is right (signal vs
   setter vs `.tres` vs `NodePath`).
4. **Implement solo + TDD** — surgical; no opportunistic refactoring. Inline side effects as
   decisions crystallize: new domain term → `CONTEXT.md`; load-bearing rejection → offer an ADR.
5. **Before committing cross-module changes**, dispatch a read-only **adversarial review
   subagent** that traces every consumed value to its producer and checks the convention matches
   (units, sign, coordinate handedness, angle wrapping, facing-relative vs world). Solo
   verification asserts against your own assumption; producer/consumer mismatches live outside
   the diff.
6. **Verify against the gate** — hard gates 4 + 5 (standalone extraction; anchor-task blast
   radius), empirically where possible (a *virgin* project for gate 4, an actually-performed
   anchor task for gate 5).

```
Invoke the godot-architecture-review skill and read docs/architecture/campaign.md, CONTEXT.md,
and docs/adr/ (ADRs are scope-fences — surface any conflict for an amend/supersede decision
before locking it). Deep-dive on <CANDIDATE>. Use the grilling skill to walk the seam and the
deepened-module shape; run the Godot realization through godot-gdscript-patterns; implement
solo + TDD, surgical only. Update CONTEXT.md for any new term and offer an ADR for any
load-bearing rejection. Dispatch the adversarial cross-module review before committing. Verify
against the gate (hard gates 4 + 5).
```

## Convergence re-run (signal 6) · WORKFLOW + post-hoc verdict

When the candidate list is exhausted (or to close a campaign), re-run the **Phase-1 kickoff
verbatim** against HEAD. Then — in a **second, separate step**, after the survey's report exists —
compute the verdict against the archived baseline: `runs/` report diff, `system-map.md` diff,
ADR cross-check (does the new run re-raise anything ADR'd?).

> ⚠️ **Never give the verdict as a kickoff target.** No "must not re-raise" framing, no prior
> claims in the prompt: a surveyor graded against a known rubric suppresses borderline items for
> compliance — masking exactly the artifact-insufficiency this signal exists to detect. The
> Phase-1 prompt *is* the artifact under test; re-run it verbatim.

**Converged** ≈ zero high-severity finds, re-finds correctly suppressed by ADRs, residue is
low-severity hygiene. Log the verdict in `campaign.md` and the `runs/` index.

## Campaign close — skill maintenance

The generic learnings of a campaign (a new guardrail, a gate refinement, an artifact convention)
propagate **project → skill** via `sync-godot-skills`. Project parameters never propagate. If the
campaign exposed a new engine gotcha, file it in both the project catalog and
`godot-personal-gotchas` per the usual two-layer discipline.
