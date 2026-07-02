---
name: tournament
description: Author and run a generate → judge → verify → synthesize tournament workflow in any domain — interview for the spec, assemble a self-contained Workflow script from the stage catalog, lint + smoke-run it, then launch and relay results. Use to "run a tournament", do a "generate-and-judge" pass, "pick the best X via fan-out", build a "bracket/scoreboard of candidates", or set up a "tournament workflow". Persists a reusable spec for re-runs.
---

# Tournament

Turn a recurring "generate a bunch, judge them, pick and refine a winner" job into an editable, reusable **spec** and a self-contained **Workflow** script. This skill is a code generator, not a library: the Workflow runtime forbids `import`/`require`/fs and `Date.now()`/`Math.random()`/argless `new Date()` (DESIGN §3), so each run emits a fresh literal script.

## 1. When to use & the invariant pipeline

Use when the task is: produce many candidates, screen and rank them, run a judge tournament, stress-test the winner, and synthesize a final answer. Domains are open (game concepts, recipes, research options, skill audits) — only the content changes; the mechanics are invariant:

```
context/research → [verify dubious claims] → generate (N lens-generators + guaranteed "seed" candidates)
  → filter (hard-constraint kill + multi-axis screen → shortlist/bracket)
  → tournament (judge panel; bracket OR scoreboard) → verify champion (adversarial skeptics)
  → synthesize (graft winner + runner-up grafts + skeptic fixes) → [QA red-team + patch]
```

Bracketed stages (`[...]`) are per-spec toggles. Everything else is always present.

## 2. Reuse model (new vs reuse)

Every run **persists a resolved spec** so the design thinking — lenses, judges, axes, domain framing — is saved, not just boilerplate. Runs are reproducible and diffable.

- **Spec path:** `~/Claude/tournaments/<name>.spec.md` (central archive, discoverable from any cwd).
- **New run:** interview (§3) → write spec → assemble (§5) → gate (§6) → launch (§7).
- **Reuse run:** load an existing `<name>.spec.md`, optionally tweak fields, regenerate. **Reuse skips elicitation entirely** (§3).
- **Spec format:** small YAML frontmatter (scalars/enums/keys: `name`, `domain`, `tags`, `mode: bracket|scoreboard`, counts, `claimVerify`/`qa` toggles, lens/judge/axis keys) + prose under stable `##` headings (domain/constraints block, each lens prompt, each judge persona+rubric, each axis instruction, candidate-field list). See `reference/example-spec.md` for the golden worked example.

At run end, results are written to `~/Claude/tournaments/<name>.result-<date>.md` (§7).

## 3. Elicitation (three depths)

The interview fills gaps from the free-form brief, then confirms a compact spec. Strong overridable defaults mean the user supplies only the non-default; the interview **actively elicits domain + lenses + judges + mode** (candidate schema is inferred, §4), and everything else defaults silently but is written into the spec for editing.

Depths are realized by **replicating the posture inline** — do NOT sub-invoke the `brainstorming`/`grilling` skills (their hard-gates and terminal states fight the tournament flow):

- **quick** (default) — the structured interview: ask only for the missing required fields, propose defaults for the rest, confirm.
- **brainstorm** — collaborative, one question at a time, scoped strictly to producing the `.spec.md` (no design-doc / writing-plans detour).
- **+grill** (opt-in add-on) — a relentless one-at-a-time stress pass over the drafted spec before generating.

**Escalation-suggest heuristic:** default to `quick`, but *suggest* escalating to brainstorm/+grill when stakes are high — many lenses/judges, large estimated agent-count, or the user signals a real decision. Suggest; don't force.

**Reuse skips elicitation** — loading an existing spec goes straight to optional tweak → regenerate.

## 4. Candidate schema (infer + propose)

The candidate shape varies per domain and a flat config can't express it. Strategy: **infer + propose, archetype-seeded.** Carry ~3 archetypes — `creative-concept`, `procedure/recipe`, `evaluated-option` — infer the best-fit field set from objective + domain, and propose it for one-line edits. Default shape = a handful of **structured comparable fields** + an optional **freeform `body` markdown field**.

**Coherence check (during the interview):** verify every axis and judge maps to at least one candidate field; flag any judge with nothing to grade. This catches incoherence before assembly.

## 5. Assembly

Compose the script from the catalog — never write stage boilerplate from scratch.

1. **Read `reference/stages.md`** — the complete stage catalog (meta · schema-builders · render helpers · context · claim-verify · generate · filter · bracket/scoreboard · verify-champion · synthesize · QA · result-shape).
2. **Obey the Binding Contract** at the top of `stages.md` — the verbatim table of binding NAMES + TYPES (`DOMAIN`, `briefs`, `candidates`, `seedIndices`, `kept`, `ranked`, `bracket`/`shortlist`, `champion`/`runnerUp`, `board`/`winner`, etc.). These exact names are what wire stages together and make machine-assembly safe.
3. **Compose ONLY the stages the spec needs**, in pipeline order (drop claim-verify/QA when toggled off; pick bracket *or* scoreboard variant).
4. **Fill each `// FILL:` slot** from the spec.
5. **DELETE any line marked `// STANDALONE PARSE ONLY — DELETE at assembly`** — those exist only so each snippet parses in isolation.
6. **Model policy — every `agent()` pins an explicit `model:` (never inherit the session model).** All stages use `model: 'opus'`; the single final synthesis agent may opt into `model: SYNTH_MODEL` set to `'fable'` for max-insight synthesis — the **sole sanctioned Fable call site** in a tournament (model policy 2026-07-01; a tournament fans out 89–111 agents, so silent Fable inheritance is a weekly-budget blowout). The catalog stages ship pinned; keep them pinned.
7. **Vote-tallying stages reconcile SENT vs RETURNED** (bracket, claim-verify, champion-skeptic): compute `dropped = sent − returned`, log it, and flag any tie or dropped vote as `needsAdjudication` (improvements 2026-06-28 — a dropped vote silently flips a winner/consensus/fatalCount). The catalog stages already do this; preserve it when filling slots.

**Never hand-edit a generated script.** It is a build artifact; hand-edits diverge from the spec (DESIGN §14). To change behavior, **edit the spec and regenerate.**

## 6. Safety gate (lint always; smoke-run on new/edited)

Before any full launch, self-lint the emitted script against the runtime's hard constraints:

```
node reference/lint.mjs <script.js>
```

Exit **0** = clean, **1** = errors (must fix), **2** = usage. It prints `WARN:`/`ERROR:` lines and checks: literal `export const meta`, `meta.phases` match `phase()` calls, **no `Date.now()`/`Math.random()`/argless `new Date()`**, no `import`/`require`/fs, `parallel()` guarded by `.filter(Boolean)`, **every `agent()` pins an explicit `model:` (ERROR if missing)**, **vote-tallying stages reconcile sent-vs-returned (WARN if a `winner`/`consensus`/`fatalCount` stage filters results without `dropped`/`votesSent`/`needsAdjudication`)**, and `node --check` syntax. Resolve every `ERROR:` before proceeding.

**Required tiny smoke-run** on a **new or edited** script before full scale: 1 lens / 2 candidates / 1 judge / no web / low effort — a green dry-run proves the wiring. **Skip the smoke-run when re-running an unchanged, previously-green spec.** Never auto-run an unseen full-scale script.

## 7. Launch & relay

1. **Recap:** show the spec recap + the phase outline + the estimated agent-count / cost (§8).
2. **On approval, the main agent launches the assembled script via the Workflow tool (background).** Do not launch without approval.
3. **Relay results:** report + leaderboard/bracket in chat.
4. **Write the result file:** `~/Claude/tournaments/<name>.result-<date>.md`.
5. **Note the `resumeFromRunId` recovery path** — big runs can hit limits mid-flight; resuming from the run id continues rather than restarting.

## 8. Budget

Counts are **explicit in the spec**, so cost is predictable. The launch gate estimates agent-count and, if a `budget.total` target is set, flags whether the run fits and where it would truncate (budget-aware gate). Opt-in **`--scale-to-budget`** derives fleet sizes from `budget.total` for "throw everything at it" runs. Predictable by default, elastic on demand.
