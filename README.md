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

### init-godot-claude-project

Bootstraps a Godot project to work with Claude Code via the godot-mcp tools, or adds the MCP scaffolding (`.mcp.json`, `addons/godot_mcp/`, the `docs/godot-mcp-guide.md` / `docs/blender-mcp-guide.md` / `docs/asset-pipeline.md` guides, project Claude perms) to an existing Godot project that lacks them.

**When to use:** A Godot project without `.mcp.json`, godot-mcp tools aren't loading, or the user says "set up godot for claude" / "add godot-mcp to this project" / "init godot project".

[`SKILL.md`](./init-godot-claude-project/SKILL.md)

### sync-godot-skills

Audits and propagates learnings from a Godot project's docs and per-project memory back to the source skills (`init-godot-claude-project`, `godot-personal-gotchas`, `godot-personal-preferences`). Identifies drift, presents a parity table for user approval, applies surgical updates to skill files only. Direction is always project → skill, never the reverse.

**When to use:** Running a parity check between project docs/memory and skills, syncing new Godot gotchas or workflow feedback back to their skills, propagating doc updates to the `init-godot-claude-project` templates, or the user says "audit godot skill parity" / "sync godot skills" / invokes `/sync-godot-skills`.

[`SKILL.md`](./sync-godot-skills/SKILL.md)

### godot-personal-preferences

A personal index of workflow preferences for Godot 4.x projects — how to handle `.tscn` edits, when to skip per-task F5 verification during plan execution, when to invoke other Godot skills proactively, public-repo hygiene rules. These are active behavioral rules, not just reference material.

**When to use:** Whenever working on a Godot project (`.gd`, `.tscn`, `.tres`, `project.godot`, godot-mcp tools).

[`SKILL.md`](./godot-personal-preferences/SKILL.md)

## 3rd-party skills I use

Skills I have installed locally and use as part of my workflow. Grouped by upstream source.

### From [superpowers](https://github.com/obra/superpowers) (plugin)

- [brainstorming](https://github.com/obra/superpowers) — You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.
- [dispatching-parallel-agents](https://github.com/obra/superpowers) — Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
- [executing-plans](https://github.com/obra/superpowers) — Use when you have a written implementation plan to execute in a separate session with review checkpoints
- [finishing-a-development-branch](https://github.com/obra/superpowers) — Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
- [receiving-code-review](https://github.com/obra/superpowers) — Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performat...
- [requesting-code-review](https://github.com/obra/superpowers) — Use when completing tasks, implementing major features, or before merging to verify work meets requirements
- [subagent-driven-development](https://github.com/obra/superpowers) — Use when executing implementation plans with independent tasks in the current session
- [systematic-debugging](https://github.com/obra/superpowers) — Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
- [test-driven-development](https://github.com/obra/superpowers) — Use when implementing any feature or bugfix, before writing implementation code
- [using-git-worktrees](https://github.com/obra/superpowers) — Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
- [using-superpowers](https://github.com/obra/superpowers) — Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
- [verification-before-completion](https://github.com/obra/superpowers) — Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evide...
- [writing-plans](https://github.com/obra/superpowers) — Use when you have a spec or requirements for a multi-step task, before touching code
- [writing-skills](https://github.com/obra/superpowers) — Use when creating new skills, editing existing skills, or verifying skills work before deployment

### From [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (plugin)

- [karpathy-guidelines](https://github.com/forrestchang/andrej-karpathy-skills) — Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifi...

### From [obsidian](https://github.com/kepano/obsidian-skills) (plugin)

- [defuddle](https://github.com/kepano/obsidian-skills) — Extract clean markdown content from web pages using Defuddle CLI, removing clutter and navigation to save tokens. Use instead of WebFetch when the user provides a URL to read or analyze, for online...
- [json-canvas](https://github.com/kepano/obsidian-skills) — Create and edit JSON Canvas files (.canvas) with nodes, edges, groups, and connections. Use when working with .canvas files, creating visual canvases, mind maps, flowcharts, or when the user mentio...
- [obsidian-bases](https://github.com/kepano/obsidian-skills) — Create and edit Obsidian Bases (.base files) with views, filters, formulas, and summaries. Use when working with .base files, creating database-like views of notes, or when the user mentions Bases,...
- [obsidian-cli](https://github.com/kepano/obsidian-skills) — Interact with Obsidian vaults using the Obsidian CLI to read, create, search, and manage notes, tasks, properties, and more. Also supports plugin and theme development with commands to reload plugi...
- [obsidian-markdown](https://github.com/kepano/obsidian-skills) — Create and edit Obsidian Flavored Markdown with wikilinks, embeds, callouts, properties, and other Obsidian-specific syntax. Use when working with .md files in Obsidian, or when the user mentions w...

### From [mattpocock/skills](https://github.com/mattpocock/skills)

- [caveman](https://github.com/mattpocock/skills) — Ultra-compressed communication mode. Cuts token usage ~75% by dropping filler, articles, and pleasantries while keeping full technical accuracy. Use when user says "caveman mode", "talk like cavema...
- [diagnose](https://github.com/mattpocock/skills) — Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimise → hypothesise → instrument → fix → regression-test. Use when user says "diagnose this" / "debug this", rep...
- [grill-me](https://github.com/mattpocock/skills) — Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on the...
- [grill-with-docs](https://github.com/mattpocock/skills) — Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates documentation (CONTEXT.md, ADRs) inline as decisions crystallise. Use when user wants...
- [improve-codebase-architecture](https://github.com/mattpocock/skills) — Find deepening opportunities in a codebase, informed by the domain language in CONTEXT.md and the decisions in docs/adr/. Use when the user wants to improve architecture, find refactoring opportuni...
- [prototype](https://github.com/mattpocock/skills) — Build a throwaway prototype to flesh out a design before committing to it. Routes between two branches — a runnable terminal app for state/business-logic questions, or several radically different U...
- [setup-matt-pocock-skills](https://github.com/mattpocock/skills) — Sets up an `## Agent skills` block in AGENTS.md/CLAUDE.md and `docs/agents/` so the engineering skills know this repo's issue tracker (GitHub or local markdown), triage label vocabulary, and domain...
- [tdd](https://github.com/mattpocock/skills) — Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first dev...
- [to-issues](https://github.com/mattpocock/skills) — Break a plan, spec, or PRD into independently-grabbable issues on the project issue tracker using tracer-bullet vertical slices. Use when user wants to convert a plan into issues, create implementa...
- [to-prd](https://github.com/mattpocock/skills) — Turn the current conversation context into a PRD and publish it to the project issue tracker. Use when user wants to create a PRD from the current context.
- [triage](https://github.com/mattpocock/skills) — Triage issues through a state machine driven by triage roles. Use when user wants to create an issue, triage issues, review incoming bugs or feature requests, prepare issues for an AFK agent, or ma...
- [write-a-skill](https://github.com/mattpocock/skills) — Create new agent skills with proper structure, progressive disclosure, and bundled resources. Use when user wants to create, write, or build a new skill.
- [zoom-out](https://github.com/mattpocock/skills) — Tell the agent to zoom out and give broader context or a higher-level perspective. Use when you're unfamiliar with a section of code or need to understand how it fits into the bigger picture.

### From [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)

- [vercel-composition-patterns](https://github.com/vercel-labs/agent-skills) — React composition patterns that scale. Use when refactoring components with boolean prop proliferation, building flexible component libraries, or designing reusable APIs. Triggers on tasks involvin...
- [vercel-react-best-practices](https://github.com/vercel-labs/agent-skills) — React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance pat...
- [vercel-react-view-transitions](https://github.com/vercel-labs/agent-skills) — Guide for implementing smooth, native-feeling animations using React's View Transition API (`<ViewTransition>` component, `addTransitionType`, and CSS view transition pseudo-elements). Use this ski...
- [web-design-guidelines](https://github.com/vercel-labs/agent-skills) — Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".

### From [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)

- [agent-browser](https://github.com/vercel-labs/agent-browser) — Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing we...

### From [anthropics/skills](https://github.com/anthropics/skills)

- [frontend-design](https://github.com/anthropics/skills) — Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples in...
- [mcp-builder](https://github.com/anthropics/skills) — Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate exte...

### From [wshobson/agents](https://github.com/wshobson/agents)

- [architecture-patterns](https://github.com/wshobson/agents) — Implement proven backend architecture patterns including Clean Architecture, Hexagonal Architecture, and Domain-Driven Design. Use this skill when designing clean architecture for a new microservic...
- [godot-gdscript-patterns](https://github.com/wshobson/agents) — Master Godot 4 GDScript patterns including signals, scenes, state machines, and optimization. Use when building Godot games, implementing game systems, or learning GDScript best practices.

### From [thedivergentai/gd-agentic-skills](https://github.com/thedivergentai/gd-agentic-skills)

- [godot-animation-tree-mastery](https://github.com/thedivergentai/gd-agentic-skills) — Expert patterns for AnimationTree including StateMachine transitions, BlendSpace2D for directional movement, BlendTree for layered animations, root motion, transition conditions, advance expression...

### From [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit)

- [mermaid-diagrams](https://github.com/softaworks/agent-toolkit) — Comprehensive guide for creating software diagrams using Mermaid syntax. Use when users need to create, visualize, or document software through diagrams including class diagrams (domain modeling, o...

### From [intellectronica/agent-skills](https://github.com/intellectronica/agent-skills)

- [beautiful-mermaid](https://github.com/intellectronica/agent-skills) — Render Mermaid diagrams as SVG and PNG using the Beautiful Mermaid library. Use when the user asks to render a Mermaid diagram.

### From [spillwavesolutions/design-doc-mermaid](https://github.com/spillwavesolutions/design-doc-mermaid)

- [design-doc-mermaid](https://github.com/spillwavesolutions/design-doc-mermaid) — Create Mermaid diagrams (activity, deployment, sequence, architecture) from text descriptions or source code. Use when asked to "create a diagram", "generate mermaid", "document architecture", "cod...

## License

MIT. See [LICENSE](./LICENSE).
