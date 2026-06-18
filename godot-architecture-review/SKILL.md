---
name: godot-architecture-review
description: Convergent, re-runnable architecture review & refactor campaign for Godot projects — applies A Philosophy of Software Design (deep modules, depth-as-leverage, information hiding) without fighting Godot idioms, applying the codebase-design deep-module vocabulary under Godot guardrails and leaving durable convergence artifacts (CONTEXT.md, docs/adr/, docs/architecture/system-map.md). Use when a Godot project needs an architecture review, a refactor or deepening campaign, or the user says "architecture review", "refactor process", "find shallow modules", "APoSD review", "set up the review loop".
---

# Godot Architecture Review (APoSD-aligned)

A repeatable, **convergent** process for improving a Godot project's architecture using the
principles of John Ousterhout's *A Philosophy of Software Design* (APoSD), adapted so it does
not fight Godot's idioms. Each run leaves artifacts that make the next run cheaper and quieter
(re-runs find *less*, never loop, never re-raise settled items). Run **one phase per fresh
session** ([PHASES.md](PHASES.md) has copy-paste kickoff prompts).

## Layering — orchestrate, don't duplicate

- **Survey engine**: the `codebase-design` skill — vocabulary (its `SKILL.md` glossary), the
  deletion test, and `codebase-design/DEEPENING.md` + `codebase-design/DESIGN-IT-TWICE.md` at dive
  time. Grilling discipline: the `grilling` skill. HTML-report format: vendored here as
  [HTML-REPORT.md](HTML-REPORT.md).
- **Artifact formats**: the `domain-modeling` skill — `domain-modeling/CONTEXT-FORMAT.md`,
  `domain-modeling/ADR-FORMAT.md`.
- **Godot realization idiom** at dive time: the `godot-gdscript-patterns` skill; engine quirks per
  the project's gotchas catalog and the `godot-personal-gotchas` skill.

This skill adds the three things those lack: **Godot guardrails**, **population pre-labeling**,
and the **convergence protocol** ([ARTIFACTS.md](ARTIFACTS.md) + [PHASES.md](PHASES.md)).

## Anchor to real drivers (required, before any phase)

The campaign is learning + concrete pay-off, anchored so it never drifts academic. In the
project's `docs/architecture/campaign.md` (the thin project-parameters file — see ARTIFACTS.md), name:

- **Driver #1 — clean extension.** 1–2 **anchor tasks**: real, near-term "add feature X" tasks
  whose blast radius will prove leverage (hard gate 5).
- **Driver #2 — clean extraction.** Which subsystems should lift into a *new* project with zero
  edits (hard gate 4). A second project is a **second real caller** — which is what *justifies*
  generalizing those modules (and **only** those).

> ⚠️ **The framing trap.** "Make everything general-purpose" is the opposite of APoSD; the actual
> rule is **"somewhat general-purpose is best"** — generalizing for callers that don't exist is
> speculative generality. **Deep ≠ general-purpose**: deep = a lot of behavior behind a small
> interface; a module can be deep *and* narrowly scoped. Generalize **only** when a second real
> caller exists — never on spec.

## Vocabulary

Speak the `codebase-design` vocabulary throughout: **module** · **interface**
(*everything a caller must know* — invariants, ordering, error modes, implicit facts like "must
be a child of `Player`", not just the signature) · **depth-as-leverage** (reject depth-as-ratio —
it rewards padding) · **seam** (say "seam", not "boundary") · **deletion test** (imagine deleting
it: complexity *vanishes* = shallow pass-through; *reappears across N callers* = it earned its
keep) · **one adapter = hypothetical seam, two adapters = real seam**.

## Populations — pre-label before surveying (opposite treatments)

Never survey the codebase as one undifferentiated thing. Pre-label modules in `campaign.md`:

| Pop. | What | Treatment |
|---|---|---|
| **A — Extract candidates** | Already deep, already portable: pure `RefCounted` math/data modules, data-driven engines separable from their data | Work = **packaging assessment**, not deepening (deepening these is a no-op) |
| **B — Deepen-the-glue** | The real friction: nodes conflating concerns, upward reaches (`get_parent().state`), stringly-typed seams (AnimationTree param paths), scene-node-name coupling | Work = **shrink the implicit interface** |
| **C — Game-specific** | Coordinators, input handling, game states | **Extend-in-place only; never generalize** — portable as patterns, never as files. Generalizing these is the trap |
| **D — Throwaway tooling** | Debug overlays, dev-only controllers | **Out of scope** (tactical code may stay shallow) — but *log* smells they surface against other populations |

## Godot guardrails (the engine is not shallow)

Applied naively, the APoSD lens generates **category errors** in Godot. Forbid these; require fixes in idiom:

- **Never flag the engine surface as shallow.** A `CharacterBody2D`/`Node2D` exposes a huge
  interface but hides enormous behavior — it is *deeply leveraged*, not shallow.
- **Signals = the idiomatic seam** (Observer). Do **not** propose replacing signal wiring with
  direct calls or a DI container.
- **Scene tree + `.tscn` composition = the module system.** `@export var NodePath`, `$Child`,
  `owner` are the idiomatic wiring. The fix for an upward reach (`get_parent().x`) is an injected
  `NodePath` / a signal / a setter — **not** a framework.
- **`Resource`/`.tres` = the idiomatic injection seam.** Prefer an `@export`'d `Resource` over a generic factory.
- **Autoloads/singletons** *are* questionable (global state) — fair game to scrutinize.
- **Scene-node-name coupling is not sacred** — literal `&"NodeName"` dict keys, sibling
  `get_node_or_null("Name")` lookups: a **wide implicit interface** (misname → silent no-op / wrong
  state), prime deepening target.

## Phases (one per fresh session)

| Phase | What | Mode |
|---|---|---|
| 0 | Domain language → `CONTEXT.md` | **Workflow** (exploration) |
| 1 | Whole-game survey → `system-map.md` + friction report → ranked candidates | **Workflow** (exploration) |
| 2…M | Deep-dives, one candidate per session | **Solo** — grilling + TDD, surgical |
| re-run | Verbatim Phase-1 re-run; convergence verdict computed **post-hoc** | **Workflow** + solo verdict |

Execution split: **workflows for exploration** (read-only, parallel-friendly); **solo for
deep-dives** (write-heavy, coupling-sensitive — parallel edits conflict on shared seams).
Escalation valve: a *single* dive with a genuinely wide interface-design space may use a
judge-panel workflow — otherwise stay solo.

## Verification gate — what "it worked" means

Signals 4+5 are the verdict (hard, binary); 1–3 and 6 support. A re-derived diagram is the
**narrative**, never the **proof** (fewer boxes ≠ deeper modules).

1. **Interface shrank, behavior held** — everything-a-caller-must-know (incl. implicit facts) got smaller.
2. **Deletion test flipped** — a pass-through became a module whose deletion would scatter complexity.
3. **Tests simplified** — "testing past the seam" disappeared.
4. 🔒 **Extraction runs standalone** — drop a Population-A module + its data contract into an
   *empty* Godot project; it runs with **zero** edits. Proves Driver #2.
5. 🔒 **Anchor-task blast radius dropped** — actually perform an anchor task; confirm a
   *localized* change, not a shotgun edit. Proves Driver #1.
6. **Convergence re-run** finds less and re-raises nothing ADR'd — verdict computed **post-hoc**,
   never given as a kickoff target (see PHASES.md for why).

## Maintaining this skill

Direction is always **project → skill** (via `sync-godot-skills`): when a campaign run in a real
project teaches a new guardrail, gate, or artifact convention, generalize it back here. Project
parameters (drivers, anchor tasks, population labels, candidates) never propagate.
