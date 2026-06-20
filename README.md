# cpalaka-claude-skills

Personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) skills authored by [@cpalaka](https://github.com/cpalaka), plus a tracker of the 3rd-party skills I use.

## Install

Clone the repo, then symlink any skill into your user skills directory:

```bash
git clone https://github.com/cpalaka/cpalaka-claude-skills.git
ln -s "$PWD/cpalaka-claude-skills/godot-personal-gotchas" \
  ~/.claude/skills/godot-personal-gotchas
```

Replace `godot-personal-gotchas` with whichever skill you want.

## Skills I've authored

### godot-personal-gotchas

A personal index of Godot 4.x editor and engine gotchas. It maps symptoms — silent failures, settings that don't take effect, mode setters that no-op, panels showing stale state — back to a known cause and fix.

**When to use:** Working on a Godot project (`.gd`, `.tscn`, `.tres`, `project.godot`, godot-mcp tools) when an operation behaves unexpectedly, especially when calls succeed silently but produce no visible effect.

[`SKILL.md`](./godot-personal-gotchas/SKILL.md)

### init-project

The single engine that scaffolds (or migrates) a dev project onto the **Chunk library** — it writes the chunk `@import`s, knob blocks, stamps Templates, merges `settings.local.json`, and runs a project-type **Profile**'s bespoke recipe. Replaces the old per-type `init-backlog-project` + `init-godot-claude-project` skills: adding a project type is adding a `profiles/<type>.md`, and the engine never changes. Ships `backlog`, `web`, and `godot` profiles (the godot profile owns the MCP scaffolding + reference-doc templates).

**When to use:** Setting up a new dev project, adopting the chunk library in an existing one, or adding a new project type.

[`SKILL.md`](./init-project/SKILL.md)

### sync-godot-skills

Audits and propagates learnings from a Godot project's docs and per-project memory back to the source skills (the `init-project` godot profile, `godot-personal-gotchas`, `godot-personal-preferences`). Identifies drift, presents a parity table for user approval, applies surgical updates to skill files only. Direction is always project → skill, never the reverse.

**When to use:** Running a parity check between project docs/memory and skills, syncing new Godot gotchas or workflow feedback back to their skills, propagating doc updates to the `init-project` godot-profile templates, or the user says "audit godot skill parity" / "sync godot skills" / invokes `/sync-godot-skills`.

[`SKILL.md`](./sync-godot-skills/SKILL.md)

### godot-personal-preferences

A personal index of workflow preferences for Godot 4.x projects — how to handle `.tscn` edits, when to skip per-task F5 verification during plan execution, when to invoke other Godot skills proactively, public-repo hygiene rules. These are active behavioral rules, not just reference material.

**When to use:** Whenever working on a Godot project (`.gd`, `.tscn`, `.tres`, `project.godot`, godot-mcp tools).

[`SKILL.md`](./godot-personal-preferences/SKILL.md)

### skill-updater

A manually-invoked meta-skill that checks every installed Claude skill for upstream updates and installs them. Auto-applies updates from trusted sources (Anthropic, Vercel, the official marketplace) and confirms community sources first. Covers both skill ecosystems on the machine — Claude Code plugins (`claude plugin` CLI) and `npx skills` agent-skills (`~/.agents`). Hand-authored personal skills are never touched.

**When to use:** The user says "check my skills for updates" / "update my skills" / "any skill updates?", or invokes `/skill-updater`.

[`SKILL.md`](./skill-updater/SKILL.md)

### godot-architecture-review

A convergent, re-runnable architecture review & refactor campaign for Godot projects — applies *A Philosophy of Software Design* (deep modules, depth-as-leverage, information hiding) without fighting Godot idioms, applying the `codebase-design` deep-module vocabulary under Godot guardrails and leaving durable convergence artifacts (`CONTEXT.md`, `docs/adr/`, `docs/architecture/system-map.md`).

**When to use:** A Godot project needs an architecture review, a refactor or deepening campaign, or the user says "architecture review" / "refactor process" / "find shallow modules" / "APoSD review".

[`SKILL.md`](./godot-architecture-review/SKILL.md)

### refresh-context

Builds or refreshes a project's `CONTEXT.md` domain glossary (and any ADRs) through an explore-first, docs-aware grilling session. A thin wrapper over the `grilling` + `domain-modeling` skills, adding automatic seed-vs-update mode detection, a git-derived change-set baseline on reruns (so you never supply a tag), a write-time glossary-only gate, and a first-class "nothing changed" exit. General-purpose — not Godot-specific.

**When to use:** A project with no `CONTEXT.md` yet, or one that has drifted behind code changes; the user says "refresh the context" / "build/update the CONTEXT.md" / "seed domain docs", or invokes `/refresh-context`.

[`SKILL.md`](./refresh-context/SKILL.md)

## 3rd-party skills I use

Skills I have installed locally and use as part of my workflow. Grouped by upstream source.

### From [superpowers](https://github.com/obra/superpowers)

- `brainstorming` — You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.
- `dispatching-parallel-agents` — Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
- `executing-plans` — Use when you have a written implementation plan to execute in a separate session with review checkpoints
- `finishing-a-development-branch` — Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
- `receiving-code-review` — Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation
- `requesting-code-review` — Use when completing tasks, implementing major features, or before merging to verify work meets requirements
- `subagent-driven-development` — Use when executing implementation plans with independent tasks in the current session
- `systematic-debugging` — Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
- `test-driven-development` — Use when implementing any feature or bugfix, before writing implementation code
- `using-git-worktrees` — Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
- `using-superpowers` — Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
- `verification-before-completion` — Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
- `writing-plans` — Use when you have a spec or requirements for a multi-step task, before touching code
- `writing-skills` — Use when creating new skills, editing existing skills, or verifying skills work before deployment

### From [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)

- `karpathy-guidelines` — Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.

### From [obsidian](https://github.com/kepano/obsidian-skills)

- `defuddle` — Extract clean markdown content from web pages using Defuddle CLI, removing clutter and navigation to save tokens. Use instead of WebFetch when the user provides a URL to read or analyze, for online documentation, articles, blog posts, or any standard web page.
- `json-canvas` — Create and edit JSON Canvas files (.canvas) with nodes, edges, groups, and connections. Use when working with .canvas files, creating visual canvases, mind maps, flowcharts, or when the user mentions Canvas files in Obsidian.
- `obsidian-bases` — Create and edit Obsidian Bases (.base files) with views, filters, formulas, and summaries. Use when working with .base files, creating database-like views of notes, or when the user mentions Bases, table views, card views, filters, or formulas in Obsidian.
- `obsidian-cli` — Interact with Obsidian vaults using the Obsidian CLI to read, create, search, and manage notes, tasks, properties, and more. Also supports plugin and theme development with commands to reload plugins, run JavaScript, capture errors, take screenshots, and inspect the DOM.
- `obsidian-markdown` — Create and edit Obsidian Flavored Markdown with wikilinks, embeds, callouts, properties, and other Obsidian-specific syntax. Use when working with .md files in Obsidian, or when the user mentions wikilinks, callouts, frontmatter, tags, embeds, or Obsidian notes.

### From [mattpocock/skills](https://github.com/mattpocock/skills)

- `codebase-design` — Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.
- `diagnosing-bugs` — Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
- `domain-modeling` — Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
- `grill-me` — A relentless interview to sharpen a plan or design.
- `grill-with-docs` — A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
- `grilling` — Interview the user relentlessly about a plan or design. Use when the user wants to stress-test a plan before building, or uses any 'grill' trigger phrases.
- `handoff` — Compact the current conversation into a handoff document for another agent to pick up.
- `improve-codebase-architecture` — Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
- `prototype` — Build a throwaway prototype to flesh out a design before committing to it. Routes between two branches — a runnable terminal app for state/business-logic questions, or several radically different UI variations toggleable from one route.
- `resolving-merge-conflicts` — Use when you need to resolve an in-progress git merge/rebase conflict.
- `setup-matt-pocock-skills` — Configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills.
- `tdd` — Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
- `teach` — Teach the user a new skill or concept, within this workspace.
- `to-issues` — Break a plan, spec, or PRD into independently-grabbable issues on the project issue tracker using tracer-bullet vertical slices. Use when user wants to convert a plan into issues, create implementation tickets, or break down work into issues.
- `to-prd` — Turn the current conversation context into a PRD and publish it to the project issue tracker. Use when user wants to create a PRD from the current context.
- `triage` — Move issues through a state machine of triage roles — categorise, reproduce, grill if needed, and write agent-ready briefs.

### From [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)

- `vercel-composition-patterns` — React composition patterns that scale. Use when refactoring components with boolean prop proliferation, building flexible component libraries, or designing reusable APIs. Triggers on tasks involving compound components, render props, context providers, or component architecture.
- `vercel-react-best-practices` — React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns.
- `vercel-react-view-transitions` — Guide for implementing smooth, native-feeling animations using React's View Transition API (`<ViewTransition>` component, `addTransitionType`, and CSS view transition pseudo-elements).
- `web-design-guidelines` — Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".

### From [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)

- `agent-browser` — Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task.

### From [vercel-labs/skills](https://github.com/vercel-labs/skills)

- `find-skills` — Helps users discover and install agent skills when they ask "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. Use when the user is looking for functionality that might exist as an installable skill.

### From [anthropics/skills](https://github.com/anthropics/skills)

- `frontend-design` — Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications.
- `mcp-builder` — Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).

### From [wshobson/agents](https://github.com/wshobson/agents)

- `architecture-patterns` — Implement proven backend architecture patterns including Clean Architecture, Hexagonal Architecture, and Domain-Driven Design. Use this skill when designing clean architecture for a new microservice, when refactoring a monolith to use bounded contexts, when implementing hexagonal or onion architecture patterns, or when debugging dependency cycles between application layers.
- `godot-gdscript-patterns` — Master Godot 4 GDScript patterns including signals, scenes, state machines, and optimization. Use when building Godot games, implementing game systems, or learning GDScript best practices.

### From [thedivergentai/gd-agentic-skills](https://github.com/thedivergentai/gd-agentic-skills)

- `godot-animation-tree-mastery` — Expert patterns for AnimationTree including StateMachine transitions, BlendSpace2D for directional movement, BlendTree for layered animations, root motion, transition conditions, advance expressions, and state machine sub-states.

### From [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit)

- `mermaid-diagrams` — Comprehensive guide for creating software diagrams using Mermaid syntax. Use when users need to create, visualize, or document software through diagrams including class diagrams, sequence diagrams, flowcharts, ER diagrams, C4 architecture diagrams, and more.

### From [intellectronica/agent-skills](https://github.com/intellectronica/agent-skills)

- `beautiful-mermaid` — Render Mermaid diagrams as SVG and PNG using the Beautiful Mermaid library. Use when the user asks to render a Mermaid diagram.

### From [spillwavesolutions/design-doc-mermaid](https://github.com/spillwavesolutions/design-doc-mermaid)

- `design-doc-mermaid` — Create Mermaid diagrams (activity, deployment, sequence, architecture) from text descriptions or source code. Use when asked to "create a diagram", "generate mermaid", "document architecture", "code to diagram", "create design doc", or "convert code to diagram".

## License

MIT. See [LICENSE](./LICENSE).
