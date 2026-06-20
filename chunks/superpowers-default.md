<!-- chunk:superpowers-default | kind: value-variant | single-source: cpalaka-claude-skills/chunks/superpowers-default.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## Skill discipline + superpowers defaults

**The skill 1%-rule — invoke before acting, not after.** If there is even a **1%
chance** a skill applies to what you are about to do, invoke it via the Skill tool
**before** doing the work, not after. The cost of invoking a skill that turns out
not to apply is one tool call; the cost of skipping one that did apply is a
code-review round-trip or a shipped regression. Default to invoking. This governs
the process skills below and every domain skill the project installs.

**Diagnose before you fix.** For any non-obvious bug, test failure, or unexpected
behaviour, run the `diagnosing-bugs` loop — reproduce → minimise → hypothesise →
confirm — **before** proposing or writing a fix. Do not skip straight to a patch
on a symptom you have not reproduced.

**TDD before implementation.** When a slice has verifiable runtime behaviour to
drive (modules, pure functions, adapters, API endpoints, physics/math, …), use the
`tdd` skill: write the failing test first, then the implementation — never the
implementation before the test. Skip TDD only for pure scaffolding. The roster of
required-coverage modules is the project's own — see the **test-roster knob**.

**Plan-approval is a gate.** The chain is **pick → plan approval → implement →
verify → sign-off**. For any non-trivial scope, plan briefly in chat (1–5 bullets)
and **get the plan approved before writing code**. One-line fixes, token tweaks,
and doc edits skip the approval round and go straight to terse execution — do not
bloat trivial work with ceremony. Match the planning method to the uncertainty:
fuzzy idea → `brainstorming`; data-model / state-machine doubt → `prototype`;
feel/look doubt → build minimal + an `agent-browser` screenshot loop;
codebase-bound, clear-what / unclear-how → plan mode. (The verify step is
`verify-gate`; the sign-off step is the human Done-gate — in `backlog-core` for board-driven
projects, or the project's own "Done needs explicit user sign-off" inline-leaf rule for
board-less ones.)

**Ask before brainstorming or writing-plans.** These skills spawn multiple
subagents and are token-expensive, so do not auto-enter them. When work would
normally trigger `brainstorming` or `writing-plans`, pause and ask the user
whether to use them — e.g. "I'd normally brainstorm a spec/plan here; want me to,
or skip straight to implementation?" — and let the user decide per-issue. (This is
the one ask-first carve-out to the 1%-rule.)

**Spec hygiene — tag every reuse claim and re-verify it.** When authoring a spec
or plan in-session, tag every "reuse the existing X" / "already in the stack" /
"this is just the existing Y" assertion `[reuse]` / `[extend]` / `[new]`, and
**verify each `[reuse]` against the actual source** (grep / CodeGraph / read)
before baking it in. AI-authored specs systematically over-claim reuse — it is the
optimistic default — and a wrong reuse premise silently understates scope and
sends a builder hunting for code that is not there. Give a substantial spec an
adversarial review pass (independent lenses cross-checking repo claims) before
handoff; have that review re-verify its own load-bearing facts, not just freshly
authored prose. The source surface to verify against is the **spec-verify knob**.

**Drive agent-browser yourself, in the main session.** For the real-browser visual
verification pass (screenshot + drive the page) before calling any visual or
interactive slice done, do the check **yourself** — don't punt "eyeball this" to
the user — and run it in the **main session**, never a subagent. A subagent's
screenshot is never returned to the orchestrator, so a visually-AC'd wave task
would pass unverified; this is why visual/feel tasks run solo, not in waves (see
`parallel-work`). The `errors` buffer is cumulative across navigations and
`--clear` is a no-op — `close --all` before each `open` for per-page attribution,
and note some framework errors (e.g. SSR/hydration) surface on the `errors`
channel, not `console`. Unit tests and DOM-class checks miss real render bugs (CSS collisions,
invisible text, wrong-state UI); only a rendered screenshot catches them.

**Grill against the docs when they exist.** When the project carries a
`CONTEXT.md` or a `docs/adr/` directory, pair the `grilling` skill with
`domain-modeling` (which grills against the domain model and updates
CONTEXT.md/ADRs inline) rather than grilling as generic Q&A — the `grill-with-docs`
pairing. Use it when a slice introduces new domain language or an architectural
decision worth promoting into an ADR.

**Knobs (value-variant).** This chunk names two knobs in
`<!-- knobs:superpowers-default -->`: the **test-roster pointer** (where the
authoritative list of required-coverage modules lives, e.g. a PRD section) and the
**spec-verify source path** (the directory specs' `[reuse]` claims are checked
against, e.g. the source tree). The project's per-type **skill list** (which React
/ Godot / framework skills to invoke proactively, and their triggers) is
**inline-leaf**, hand-authored in the project's CLAUDE.md — it is *not* a knob and
*not* part of this chunk.
