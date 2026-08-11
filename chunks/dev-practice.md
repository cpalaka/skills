<!-- chunk:dev-practice | kind: value-variant | single-source: skills/chunks/dev-practice.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->
<!-- Renamed from superpowers-default 2026-07-25: the superpowers plugin was uninstalled and the
     name pointed at nothing. Knob marker renamed with it — `<!-- knobs:dev-practice -->`. -->

## Dev practice defaults

**Invoke a skill when it holds knowledge you don't** — a project's gotchas, a tool's
quirks, a rubric, a procedure with a known failure mode. Don't invoke one to be told
how to work. When a skill's own description names your situation, that is the signal;
weigh the read against what you'd otherwise get wrong, and skip it when you already
know the answer.

**Named loops for two situations** — not because the practice is unfamiliar, but so the
project's own skill gets used rather than an ad-hoc version: a non-obvious bug or
unexplained test failure runs the `diagnosing-bugs` loop before any patch, and runtime
behaviour (modules, pure functions, adapters, endpoints, physics/math) is driven test-first
via `tdd`. Skip TDD for pure scaffolding. The roster of required-coverage modules is the
project's own — see the **test-roster knob**.

**Plan-approval is a gate.** The chain is **pick → plan approval → implement → verify →
sign-off**. For non-trivial scope, plan briefly in chat (1–5 bullets) and get the plan
approved before writing code. One-line fixes, token tweaks, and doc edits skip the
approval round — do not bloat trivial work with ceremony. Route the planning method by
question type: fuzzy idea → `grilling`; data-model or state-machine doubt → `prototype`;
feel/look doubt → build minimal + an `agent-browser` screenshot loop; codebase-bound,
clear-what/unclear-how → plan mode. (Verify step = `verify-gate`; sign-off = the human
Done-gate, in `backlog-core` for board-driven projects or the project's own inline rule.)

**Drive `agent-browser` yourself, in the main session.** For the real-browser pass before
calling a visual or interactive slice done, do the check yourself — don't punt "eyeball
this" to the user — and run it in the **main session, never a subagent**: a subagent's
screenshot is never returned to the orchestrator, so a visually-AC'd task would pass
unverified. This is why visual/feel tasks run solo, not in waves (see `parallel-work`).
The `errors` buffer is cumulative and `--clear` is a no-op — `close --all` before each
`open` for per-page attribution; some framework errors (SSR/hydration) surface on
`errors`, not `console`. Unit tests and DOM-class checks miss real render bugs.

**Grill against the docs when they exist.** When the project carries a `CONTEXT.md` or a
`docs/adr/` directory, pair `grilling` with `domain-modeling` (the `grill-with-docs`
pairing) rather than grilling as generic Q&A — use it when a slice introduces new domain
language or a decision worth promoting into an ADR.

**Knobs (value-variant).** Two, in `<!-- knobs:dev-practice -->`: the **test-roster
pointer** (where the authoritative list of required-coverage modules lives) and the
**spec-verify source path** (the tree that a spec's reuse claims are checked against).
The project's per-type **skill list** — which React / Godot / framework skills to invoke
and their triggers — is **inline-leaf**, hand-authored in the project's CLAUDE.md: not a
knob, not part of this chunk.
