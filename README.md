# skills

Personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) and Codex
skills authored by [@cpalaka](https://github.com/cpalaka), plus the shared **Chunk library** that
keeps my projects' instruction files in step, and a tracker of the 3rd-party skills I use.

## What's in here

| Path | What it is |
|---|---|
| `<skill-name>/SKILL.md` | A hand-authored skill (12 of them, listed below). Cross-host unless noted. |
| `chunks/` | The **Chunk library** — single-source instruction fragments that projects `@import` rather than copy. |
| `init-project/profiles/` | Declarative project-type **Profiles** (`backlog`, `web`, `godot`) driving the one generic init engine. |
| `codex-skills/` | Codex **host adapters** — used only where sharing the canonical directory would make one host's metadata or procedure invalid. |
| `codex-hooks/` | Session-start hooks for Codex, including a Claude-Code-session-start adapter. |
| `bootstrap.sh` / `bootstrap.ps1` | One-time machine setup: symlinks `~/.claude/chunks` → this clone's `chunks/`. |
| `CONTEXT.md` | The domain glossary (Skill, Chunk, Template, Profile, Gotcha, parity, propagate, …). Read it first. |
| `docs/adr/` | Architecture decisions — chunk delivery, the git-flow fork, the single init engine, gotcha single-source. |

## Install

Clone the repo, run the bootstrap once, then symlink whichever skills you want into either host's
user skills directory:

```bash
git clone https://github.com/cpalaka/skills.git
cd skills && ./bootstrap.sh          # links ~/.claude/chunks -> ./chunks

ln -s "$PWD/godot-personal-gotchas" ~/.claude/skills/godot-personal-gotchas
ln -s "$PWD/godot-personal-gotchas" ~/.agents/skills/godot-personal-gotchas
```

Claude Code invokes a skill as `/skill-name`; Codex invokes one as `$skill-name`.

**Two skills ship a Codex host adapter** — `godot-architecture-review` and `refresh-context`. For
those, point the Codex link at the adapter, not the root directory:

```bash
ln -s "$PWD/refresh-context"              ~/.claude/skills/refresh-context
ln -s "$PWD/codex-skills/refresh-context" ~/.agents/skills/refresh-context
```

Chunk imports resolve through `~/.claude/chunks`, so headless runs need
`--add-dir ~/.claude/chunks`; interactive runs need the external-includes prompt approved once.

## Skills I've authored

### godot-personal-gotchas

A personal index of Godot 4.x editor and engine gotchas. It maps symptoms — silent failures, settings that don't take effect, mode setters that no-op, panels showing stale state — back to a known cause and fix, and ships a proactive pre-commit scan.

**When to use:** Working on a Godot project (`.gd`, `.tscn`, `.tres`, `project.godot`, godot-mcp/godot-ai tools) when an operation behaves unexpectedly, before a risky operation, and before committing any Godot change.

[`SKILL.md`](./godot-personal-gotchas/SKILL.md)

### godot-personal-preferences

A personal index of workflow preferences for Godot 4.x projects — how to handle `.tscn` edits, when to skip per-task F5 verification during plan execution, when to invoke other Godot skills proactively, public-repo hygiene rules. These are active behavioral rules, not just reference material.

**When to use:** Whenever working on a Godot project (`.gd`, `.tscn`, `.tres`, `project.godot`, godot-mcp tools).

[`SKILL.md`](./godot-personal-preferences/SKILL.md)

### init-project

The single engine that scaffolds (or migrates) a dev project onto the **Chunk library** — it writes the chunk `@import`s, knob blocks, stamps Templates, merges `settings.local.json`, and runs a project-type **Profile**'s bespoke recipe. Adding a project type is adding a `profiles/<type>.md`; the engine never changes ([ADR 0003](./docs/adr/0003-single-init-project-engine.md)). Ships `backlog`, `web`, and `godot` profiles (the godot profile owns the MCP scaffolding + reference-doc templates).

**When to use:** Setting up a new dev project, adopting the chunk library in an existing one, or adding a new project type.

[`SKILL.md`](./init-project/SKILL.md)

### audit-godot-parity

Audits and propagates learnings from a Godot project's docs and per-project memory back to the source skills (the `init-project` godot profile, `godot-personal-gotchas`, `godot-personal-preferences`, `godot-architecture-review`). Identifies drift, presents a parity table for user approval, applies surgical updates to skill files only. Direction is always project → skill, never the reverse.

**When to use:** Running a parity check between project docs/memory and skills, propagating new Godot gotchas or workflow feedback back to their skills, running the gotcha leak-audit + gated single-source doc-shrink, or the user says "audit godot parity" / invokes `/audit-godot-parity`.

[`SKILL.md`](./audit-godot-parity/SKILL.md)

### godot-architecture-review

A convergent, re-runnable architecture review & refactor campaign for Godot projects — applies *A Philosophy of Software Design* (deep modules, depth-as-leverage, information hiding) without fighting Godot idioms, applying the `codebase-design` deep-module vocabulary under Godot guardrails and leaving durable convergence artifacts (`CONTEXT.md`, `docs/adr/`, `docs/architecture/system-map.md`).

**When to use:** A Godot project needs an architecture review, a refactor or deepening campaign, or the user says "architecture review" / "refactor process" / "find shallow modules" / "APoSD review".

[`SKILL.md`](./godot-architecture-review/SKILL.md) · Codex adapter: [`codex-skills/`](./codex-skills/godot-architecture-review/SKILL.md)

### refresh-context

Builds or refreshes a project's `CONTEXT.md` domain glossary (and any ADRs) through an explore-first, docs-aware grilling session. A thin wrapper over the `grilling` + `domain-modeling` skills, adding automatic seed-vs-update mode detection, a git-derived change-set baseline on reruns (so you never supply a tag), a write-time glossary-only gate, and a first-class "nothing changed" exit. General-purpose — not Godot-specific.

**When to use:** A project with no `CONTEXT.md` yet, or one that has drifted behind code changes; the user says "refresh the context" / "seed domain docs", or invokes `/refresh-context`.

[`SKILL.md`](./refresh-context/SKILL.md) · Codex adapter: [`codex-skills/`](./codex-skills/refresh-context/SKILL.md)

### multi-agent-policy

The cross-host model/effort policy and orchestration procedure for multi-agent work — per-stage model/effort pins, severity-tiered verification, fan-out → verify discipline, heartbeat monitoring, and stale-cache gotchas. Names tiers (`workhorse` / `budget` / `scarce`), never model names, so it survives model churn.

**When to use:** BEFORE launching any workflow, subagent fan-out, adversarial review, tournament, or orchestrator-delegate handoff.

[`SKILL.md`](./multi-agent-policy/SKILL.md)

### tournament

Authors and runs a generate → judge → verify → synthesize **tournament** workflow in any domain — interviews for the spec, assembles a self-contained Workflow script from a stage catalog, lints + smoke-runs it, then launches and relays results. Persists a reusable spec for re-runs.

**When to use:** The user wants to "run a tournament", do a "generate-and-judge" pass, "pick the best X via fan-out", or build a "bracket/scoreboard of candidates".

[`SKILL.md`](./tournament/SKILL.md)

### sandbox-and-permissions

Claude Code sandbox denials and permission-allowlist safety. Split out of the `sandbox-auto` chunk — the chunk carries the session-init baseline, this skill carries what you need only when a denial actually fires or you are about to edit permissions (the allowlist overrides the classifier, so a broad glob silently disables a gate in every session and subagent).

**When to use:** A Bash or git command fails "Operation not permitted", a branch switch half-completes and the next merge aborts, or before adding any entry to `permissions.allow`.

[`SKILL.md`](./sandbox-and-permissions/SKILL.md)

### skill-updater

A manually-invoked meta-skill that checks every installed Claude skill for upstream updates and installs them. Auto-applies updates from trusted sources (Anthropic, Vercel, the official marketplace) and confirms community sources first. Covers both ecosystems on the machine — Claude Code plugins (`claude plugin` CLI) and `npx skills` agent-skills (`~/.agents`). Hand-authored personal skills are never touched.

**When to use:** The user says "check my skills for updates" / "any skill updates?", or invokes `/skill-updater`.

[`SKILL.md`](./skill-updater/SKILL.md)

### audit-improvements

A manually-invoked meta-skill that audits and cleans up `~/Claude/improvements.md` (the cross-session behavior-improvements log) — the recurring "is this log still clean and useful?" pass, run roughly monthly as entries accumulate.

**When to use:** The user says "audit the improvements log" / "check improvements for stale entries", or invokes `/audit-improvements`.

[`SKILL.md`](./audit-improvements/SKILL.md)

### wrap-session

End-of-session closeout checklist — loose ends, working tree, task state, memory, improvements log, next-session handoff. Slash-only.

**When to use:** Invoke `/wrap-session` at the end of a working session.

[`SKILL.md`](./wrap-session/SKILL.md)

## Chunk library

A **Chunk** is a single-source instruction fragment living in `chunks/`. Projects reference it rather
than copying it, so editing a chunk here updates every consuming project at its next launch — Claude
Code via `@~/.claude/chunks/<name>.md` imports, Codex via explicit read directives in `AGENTS.md`
([ADR 0001](./docs/adr/0001-import-from-home-chunk-delivery.md),
[ADR 0005](./docs/adr/0005-codex-chunks-use-explicit-read-directives.md)). This is the opposite of a
**Template** (`init-project/profiles/<type>/templates/`), which is *copied* at init and thereafter
kept aligned by a parity check.

| Chunk | Covers |
|---|---|
| `dev-base.md` | The base import every project starts from. |
| `dev-practice.md` | Dev practice defaults — planning, diagnosis, TDD, browser QA. |
| `code-hygiene.md` | What's off-limits in code, and when to ask. |
| `verify-gate.md` | The verify gate to run before any commit or handoff. |
| `git-commit-format.md` | Commit format & hygiene. |
| `git-sync-branch-start.md` | Sync main, then branch off it, at task start. |
| `git-flow-squash.md` / `git-flow-noff.md` | The two git-flow variants — squash is the default, `--no-ff` is opt-in ([ADR 0002](./docs/adr/0002-git-flow-structural-fork.md)). |
| `git-confirm-destructive.md` | Confirm with a human before any hard-to-reverse or outward-facing git/gh action. |
| `backlog-core.md` | Task tracking with backlog.md. |
| `parallel-work.md` | Parallel work — waves & solo worktrees. |
| `sandbox-auto.md` | Sandbox session-init baseline (see the `sandbox-and-permissions` skill for denials). |
| `codegraph.md` | Code intelligence — CodeGraph, opt-in and self-gating. |

## 3rd-party skills I use

Skills installed locally and used as part of my workflow, grouped by upstream source. Managed by
`skill-updater`; hand-authored skills above are never touched by it. Updater-managed bodies may
retain Claude Code `/skill-name` references — Codex should load the corresponding `$skill-name`
dependency at runtime rather than fork or patch the upstream body.

### From [mattpocock/skills](https://github.com/mattpocock/skills)

- `ask-matt` — Router over the skills in this repo: ask which skill or flow fits your situation.
- `claude-handoff` — Hand the current conversation off to a fresh background agent that picks up the work immediately.
- `code-review` — Review changes since a fixed point along two axes (Standards and Spec), in parallel sub-agents, reported side by side.
- `codebase-design` — Shared vocabulary for designing deep modules — interfaces, deepening opportunities, where a seam goes.
- `diagnosing-bugs` — Diagnosis loop for hard bugs and performance regressions.
- `domain-modeling` — Build and sharpen a project's domain model — ubiquitous language and architectural decision records.
- `git-guardrails-claude-code` — Claude Code hooks that block dangerous git commands (push, `reset --hard`, `clean`, `branch -D`) before they execute.
- `grill-me` — A relentless interview to sharpen a plan or design.
- `grill-with-docs` — Same interview, but creating ADRs and a glossary as it goes.
- `grilling` — Grill the user relentlessly about a plan, decision, or idea.
- `handoff` — Compact the current conversation into a handoff document for another agent.
- `implement` — Implement a piece of work based on a spec or set of tickets.
- `improve-codebase-architecture` — Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through one.
- `loop-me` — Grill me about specs for the workflows I want to build.
- `migrate-to-shoehorn` — Migrate test files from `as` type assertions to `@total-typescript/shoehorn`.
- `prototype` — Build a throwaway prototype to answer a design question.
- `research` — Investigate a question against high-trust primary sources and capture the findings as Markdown in the repo.
- `resolving-merge-conflicts` — Resolve an in-progress git merge/rebase conflict.
- `scaffold-exercises` — Create exercise directory structures with sections, problems, solutions, and explainers.
- `setup-matt-pocock-skills` — Configure a repo for the engineering skills — issue tracker, triage labels, domain doc layout. Run once.
- `setup-pre-commit` — Set up Husky pre-commit hooks with lint-staged, type checking, and tests.
- `tdd` — Test-driven development: red-green-refactor, integration tests.
- `teach` — Teach the user a new skill or concept, within this workspace.
- `to-questionnaire` — Turn a decision you can't fully answer into a questionnaire for someone else to fill in.
- `to-spec` — Turn the current conversation into a spec and publish it to the project issue tracker.
- `to-tickets` — Break a plan or spec into tracer-bullet tickets, each declaring its blocking edges.
- `triage` — Move issues and external PRs through a state machine of triage roles.
- `wait-what` — Stop. That last message did not land — re-pitch it.
- `wayfinder` — Plan work too big for one agent session as a shared map of decision tickets, resolved one at a time.
- `wizard` — Generate an interactive bash wizard for steps only a human can perform (credentials, CI secrets, third-party dashboards).
- `writing-beats` — Writing, exploit — assemble raw material into a journey of beats.
- `writing-for-agents` — Writing documents for agents. Use when creating or editing skills, `AGENTS.md`, or `CLAUDE.md`. *(Renamed upstream from `writing-great-skills`.)*
- `writing-fragments` — Writing, explore — mine raw fragments, no structure yet.
- `writing-shape` — Writing, exploit — shape raw material into an article, paragraph by paragraph.

### From [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)

- `vercel-composition-patterns` — React composition patterns that scale — compound components, render props, context providers. Includes React 19 API changes.
- `vercel-react-best-practices` — React and Next.js performance optimization guidelines from Vercel Engineering.
- `vercel-react-view-transitions` — Smooth, native-feeling animations using React's View Transition API.
- `web-design-guidelines` — Review UI code for Web Interface Guidelines compliance — accessibility, UX, design audits.

### From [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)

- `agent-browser` — Browser automation CLI for AI agents — navigate, fill forms, screenshot, scrape, test web apps, and automate Electron desktop apps.

### From [vercel-labs/skills](https://github.com/vercel-labs/skills)

- `find-skills` — Discover and install agent skills when the user asks "how do I do X" or "is there a skill that can…".

### From [anthropics/skills](https://github.com/anthropics/skills)

- `frontend-design` — Distinctive, intentional visual design when building new UI or reshaping an existing one.
- `mcp-builder` — Guide for creating high-quality MCP servers in Python (FastMCP) or Node/TypeScript (MCP SDK).

### From [thedivergentai/gd-agentic-skills](https://github.com/thedivergentai/gd-agentic-skills)

- `godot-animation-tree-mastery` — AnimationTree patterns: StateMachine transitions, BlendSpace2D directional movement, BlendTree layering, root motion.
- `godot-particles` — GPU particle systems — `GPUParticles2D/3D`, `ParticleProcessMaterial`, gradients, sub-emitters, custom shaders.
- `godot-procedural-generation` — Procedural content — FastNoiseLite, random walks, BSP trees, Wave Function Collapse, seeded randomization.
- `godot-shaders-basics` — Godot shader patterns for batch-safe hitflash, alpha-scissor foliage/dissolve, screenspace postFX, triplanar, instance uniforms.

### From [wshobson/agents](https://github.com/wshobson/agents)

- `architecture-patterns` — Clean Architecture, Hexagonal Architecture, and Domain-Driven Design for backends.
- `godot-gdscript-patterns` — Godot 4 GDScript patterns — signals, scenes, state machines, optimization.

### From [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit)

- `mermaid-diagrams` — Comprehensive guide to software diagrams in Mermaid — class, sequence, flowchart, ER, C4, state, gantt.

### From [intellectronica/agent-skills](https://github.com/intellectronica/agent-skills)

- `beautiful-mermaid` — Render Mermaid diagrams as SVG and PNG using the Beautiful Mermaid library.

### From [spillwavesolutions/design-doc-mermaid](https://github.com/spillwavesolutions/design-doc-mermaid)

- `design-doc-mermaid` — Create Mermaid diagrams (activity, deployment, sequence, architecture) from text descriptions or source code.

### From [kambleakash0/agent-skills](https://github.com/kambleakash0/agent-skills)

- `english-humanizer` — Detect and remove AI-generated writing patterns from English text.

### Claude Code plugins

Installed via the `claude plugin` CLI rather than `npx skills`, so they live under
`~/.claude/plugins/` instead of `~/.agents/skills/`.

- [`obsidian`](https://github.com/kepano/obsidian-skills) — `defuddle`, `json-canvas`, `obsidian-bases`, `obsidian-cli`, `obsidian-markdown`.
- [`security-guidance`](https://github.com/anthropics/claude-plugins-official) — security review of pending changes.
- [`codex`](https://github.com/openai/codex-plugin-cc) — delegate investigation or implementation to the local Codex CLI.
- [`grok-build`](https://github.com/xai-org/grok-build-plugin-cc) — delegate to the Grok Build CLI over the bridge runtime.

## License

MIT. See [LICENSE](./LICENSE).
