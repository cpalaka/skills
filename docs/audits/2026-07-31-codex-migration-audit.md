# Codex migration audit and repair — 2026-07-31

## Verdict

The Claude Code infrastructure remains intact, and the priority Codex migration paths are now
functional without copied sources of truth. Confidence is **high** for skill discovery, explicit
skill invocation, chunk reads, project-local skills/agents, the domain SessionStart hook, and MCP
tool registration because each was checked in a newly started Codex task. Confidence is
**moderate** for plugin health: configured plugins were inventoried, but one enabled
third-party/plugin SessionStart hook still reports a generic runtime failure and the stale remote
Slack/Google Calendar identifiers are not active tools.

No game source, scene, resource, asset, tracked Claude configuration, git branch, commit, push,
permission rule, or external service was changed.

## Official Codex contracts used

This audit used the current official Codex manual fetched on 2026-07-31, not a remembered Claude
Code mapping:

- [Skills](https://learn.chatgpt.com/docs/build-skills): user skills live under
  `~/.agents/skills`, repository skills under `.agents/skills`; symlinked skill directories are
  supported; invoke with `$skill-name` or the `/skills` picker.
- [Skill metadata](https://learn.chatgpt.com/docs/build-skills#add-ui-and-invocation-metadata):
  `agents/openai.yaml` can set `policy.allow_implicit_invocation: false` for explicit-only skills.
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md): Codex builds an
  instruction chain from user and project `AGENTS.md` files. The current documentation does not
  define Claude Code's `@path` import expansion.
- [Hooks](https://learn.chatgpt.com/docs/hooks): user hooks live in `~/.codex/hooks.json`, require
  hash-bound review/trust, and SessionStart JSON accepts `hookEventName` plus
  `additionalContext`. Matching commands run concurrently; unsupported Claude output fields must
  be adapted.
- [MCP](https://learn.chatgpt.com/docs/extend/mcp): user servers are configured in
  `~/.codex/config.toml`; trusted project servers can be configured in `.codex/config.toml`.
- [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents): custom agents are
  TOML definitions under `~/.codex/agents/` or project `.codex/agents/`.
- [Custom prompts](https://learn.chatgpt.com/docs/custom-prompts): prompts under
  `~/.codex/prompts` are deprecated and use `/prompts:name`; they are not a replacement for
  Claude slash-only skills.
- [Plugins](https://learn.chatgpt.com/docs/plugins): installed plugin state is session input and
  requires a new task after changes.

## 13-skill parity table

Legend: **[reuse]** direct canonical source; **[adapt]** thin Codex wrapper; **[project]** stays
project-local; **[defer]** not safely compatible.

| Skill | Intended scope / activation | Initial Codex state | Decision and repaired state |
|---|---|---|---|
| `audit-godot-parity` | User, auto-trigger on Godot parity work | Missing from `~/.agents/skills` | **[reuse]** Linked to the canonical repository directory; path resolution and invocation wording are now cross-host. Fresh Codex catalog: present. |
| `godot-architecture-review` | User, auto-trigger on Godot architecture campaigns | Missing | **[reuse]** Linked canonically; Workflow/`ultracode.` wording now describes host-neutral parallel subagent work. Fresh Codex catalog: present. |
| `godot-personal-gotchas` | User, auto-trigger on Godot work/failures | Missing | **[reuse]** Linked canonically; migration invocation text now names `$audit-godot-parity` for Codex. Scanner self-test: all 23 checks fired; index lint: 96 rows, clean. |
| `godot-personal-preferences` | User, auto-trigger on Godot work | Missing | **[reuse]** Linked canonically without body changes. Fresh Codex catalog: present. |
| `multi-agent-policy` | User, auto-trigger before any orchestration | Missing | **[reuse]** Linked canonically; added explicit Claude/Codex routing for effort pins, agents, waits/heartbeats, and registry reloads. The pre-existing user addition about JSON-string Workflow args was preserved. Fresh Codex catalog: present. |
| `refresh-context` | User, **explicit-only** | Missing; canonical frontmatter is Claude-only and invalid for Codex | **[adapt]** Added `codex-skills/refresh-context/` with valid Codex frontmatter and `agents/openai.yaml` setting implicit invocation false. `$refresh-context` in a fresh task loaded the adapter and then the canonical source. It is intentionally absent from the passive skill catalog. |
| `game-design-context` | Space Miner project, auto-trigger | Present twice as byte-identical copied directories | **[project]** Kept tracked `.claude/skills/game-design-context` as the project canonical source; both `.agents/skills/game-design-context` paths are now relative symlinks to it. Fresh Space Miner catalog: present. |
| `audit-improvements` | User, explicit-only Claude maintenance | Missing | **[defer]** Claude-specific paths, Workflow procedure, invalid unquoted-colon YAML description, and unsupported `disable-model-invocation` key. No misleading Codex install created. |
| `init-project` | User, explicit-only scaffolder | Missing | **[defer]** Generates Claude `@` imports, `.claude/settings.local.json`, and Claude MCP/instruction shapes. Requires a designed Codex profile, not string replacement. |
| `sandbox-and-permissions` | User, explicit-only recovery/config | Missing | **[defer]** Its authority model and file formats are Claude-specific. Codex approval/sandbox/rules were audited independently and left safer. |
| `skill-updater` | User, explicit-only maintenance | Missing | **[defer]** Calls Claude plugin/CLI ecosystems and would mutate installations. A Codex port needs a separate source/trust model. |
| `tournament` | User, explicit-only fan-out authoring | Missing | **[defer]** Depends on Claude Workflow scripts and semantics. No compatible Codex execution adapter exists yet. |
| `wrap-session` | User, explicit-only session close | Missing | **[defer]** Depends on Claude memory/session and slash-command semantics; its manifest also has invalid Claude-oriented frontmatter for Codex. |

### Manifest validation

The official `skill-creator/scripts/quick_validate.py` could not run because the machine's
Homebrew Python lacks `PyYAML` (`ModuleNotFoundError: yaml`). That is an **instrument failure**,
not a skill failure. An independent Ruby `Psych` validator was calibrated against malformed YAML,
then checked all six installed Codex paths for symlink resolution, valid frontmatter, matching
names, and supported keys; verdict: **PASS**. The explicit adapter's `openai.yaml` policy and
`$refresh-context` default prompt also passed.

## Skills and symlinks changed

Added user skill links, all pointing to canonical repository sources:

```text
~/.agents/skills/audit-godot-parity
~/.agents/skills/godot-architecture-review
~/.agents/skills/godot-personal-gotchas
~/.agents/skills/godot-personal-preferences
~/.agents/skills/multi-agent-policy
~/.agents/skills/refresh-context -> codex-skills/refresh-context
```

No top-level broken links or recursive loops were found under `~/.agents/skills`. Existing Claude
links and host-specific Claude copies (`claude-activity`, `grok`, `impeccable`) were preserved.

## Shared chunks

- Added `~/.codex/chunks` as a symlink to this repository's canonical `chunks/` directory.
- Replaced unsupported `@~/.Codex/chunks/...` lines in both Space Miner `AGENTS.md` files with
  explicit read directives for `dev-base.md`, `git-flow-squash.md`, and `backlog-core.md`.
- `dev-base.md` now explicitly tells Codex to read all eight child files it lists and to resolve
  Claude chunk paths through `~/.codex/chunks/`; no rule bodies were flattened or copied.
- A fresh Space Miner task read the three named files and all eight `dev-base` children, then
  correctly reported the squash-merge approval rule, board-as-progress-source rule, and fresh
  verification gate.

The choice is recorded in
`docs/adr/0005-codex-chunks-use-explicit-read-directives.md`.

## Global and repository instructions

### Repaired `~/.codex/AGENTS.md`

- `~/.Codex/skills` / project `.Codex/skills` -> official `~/.agents/skills` /
  `.agents/skills`.
- Claude slash invocation -> Codex `$skill-name` and `/skills` picker.
- Claude Workflow routing -> Codex subagent routing plus `$multi-agent-policy`.
- Removed the nonexistent Claude `worktree.bgIsolation` / `.Codex/settings.json` mapping.
- `opus-implementer.md` -> existing Codex `~/.codex/agents/opus-implementer.toml`.
- `/refresh-context`, `/code-review`, and related skill references -> Codex `$...` spelling.
- `~/.Codex.json` -> the actual `~/.codex/config.toml` registry/config surface.

### Added repository `AGENTS.md`

The repository now has a Codex entry point directing the agent to the existing canonical
`CLAUDE.md`, `CONTEXT.md`, and relevant ADRs. It also pins canonical-source/symlink policy,
host invocation spelling, dirty-tree preservation, and no implicit commit/push behavior without
duplicating the full Claude guide.

## Hooks

### Repaired behavior

`~/.codex/hooks.json` now has one trusted user `SessionStart` command:

```text
bash /Users/chaipalaka/Code/github/cpalaka-claude-skills/codex-hooks/session-start.sh
```

It combines two canonical Claude-side probes through thin Codex adapters:

1. Domain context + ADR index from `~/.claude/hooks/context-md-adr-inject.sh`.
2. Godot AI availability from `~/.claude/hooks/godot-ai-channel-check.sh --check`.

Why an adapter was unavoidable:

- Claude's context hook emitted `watchPaths`, which is outside Codex's documented SessionStart
  output shape.
- The original logger leaked a sandbox redirection error before `2>/dev/null`; its one-line
  brace-wrapped logging fix was applied in place and works for both hosts.
- The combined handler uses the payload `.cwd` for project resolution and emits one Codex-shaped
  context object, avoiding concurrent user-hook merge ambiguity.
- Healthy/non-Godot Godot checks are silent; `DEGRADED`/`ABSENT` states add a model-visible
  warning that blocks false visual/runtime verification claims.

Verification:

- Known-good domain payload -> exact Codex JSON keys and nonempty context: **PASS**.
- Invalid payload -> no output, exit 0: **PASS**.
- `DEGRADED` Godot state -> model-warning context: **PASS** during the unavailable-channel control.
- Live normal task -> canonical probe reported `OK` and therefore correctly emitted no warning.
- Fresh task, without tools -> auto-loaded anchor
  `/Users/chaipalaka/gamedev/godot/space-miner-game/CONTEXT.md`, first terms `Ship`, `Gaze`,
  `Burst`: **PASS**.
- Official `/hooks` inspector after trust: `SessionStart 4 installed / 4 active`, no pending
  review: **PASS**.

One of the other three plugin-provided SessionStart hooks still logs a generic runtime failure;
the user handler's unique domain payload proves it is not the repaired handler. Plugin hook
candidates are the enabled `security-guidance`, Codex companion, and Grok bridge plugins. This was
not repaired by editing plugin cache files, which would be overwritten by plugin updates.

Claude-only `Notification` and `StopFailure` events have no documented Codex equivalents. The
existing native Codex `notify` command was retained instead of adding duplicate desktop alerts.

## Agents and multi-agent policy

- User `~/.codex/agents/opus-implementer.toml` already existed, parsed, pinned its effort, and was
  advertised as a custom agent; no change was needed.
- Space Miner `.codex/agents/godot-export-verifier.toml` was advertised in a fresh task at the
  correct project path; no dispatch was needed to prove discovery.
- `multi-agent-policy` now separates Claude Workflow/Agent/Monitor mechanics from Codex subagent,
  `reasoning_effort`, bounded-wait, and TOML-registry mechanics while keeping common verification
  and reconciliation rules single-source.

## MCP

### User scope

`codex mcp list` parses and reports:

- `blender` — enabled (`uvx blender-mcp`); Blender tools were visible in the active task.
- `openaiDeveloperDocs` — enabled HTTP MCP.
- `node_repl` — enabled.
- `computer-use` — configured but disabled.

### Space Miner project scope

`.codex/config.toml` parses and configures `godot`, `godot-ai`, and `godot-mcp`. A fresh read-only
Space Miner task reported runtime registration of:

| Server | Configured | Tool definitions visible |
|---|---:|---:|
| `godot` | yes | 4 |
| `godot-ai` | yes | 43 |
| `godot-mcp` | yes | 13 |

Runtime-visible tool definitions do not by themselves prove editor readiness; the SessionStart
probe owns that distinction. No project MCP config changed.

## Plugins

Enabled/cached plugin inventory was preserved. Sites, browser, visualize, document/PDF/sheets/
presentations/template tooling, Codex/Grok bridges, Anthropic skills, security guidance, and
plugin-management packages were visible through their current skills/tools.

Two enabled legacy identifiers—`google-calendar@openai-curated` and `slack@openai-curated`—had no
active skills or tools, while the current remote Google Calendar and Slack plugins were reported
as not installed. They were **not** silently replaced or installed because that would change
external connector/plugin state. Fresh tasks also report upstream plugin warnings for invalid
icon paths, excess default prompts, two skipped legacy marketplace entries, and skill-description
compression to the 2% context budget; those are upstream/plugin hygiene, not migration repair
failures.

## Permissions and settings

- `~/.codex/config.toml`, user rules, and both inspected project `.codex/config.toml` files parse.
- Codex has only three narrow user exec-policy allow rules; broad Claude `permissions.allow`
  entries were not imported.
- No approval mode, sandbox mode, trust classification, writable root, notification command,
  model, feature, or MCP setting was changed except registering/trusting the approved user hook.
- No `.Codex/settings.json` compatibility fiction was created.

## Space Miner changes and safety

Only infrastructure-only, already-untracked paths were changed in the main checkout and hygiene
worktree:

```text
AGENTS.md
.agents/skills/game-design-context
```

The two `AGENTS.md` files remain byte-identical. Both skill links resolve to each checkout's
tracked `.claude/skills/game-design-context`. The original byte-identical copies remain
recoverable at:

```text
/private/tmp/space-miner-game-design-context-main.pre-codex-link
/private/tmp/space-miner-game-design-context-worktree.pre-codex-link
```

The main checkout was already on `feat/task-161.03-voxel-playground`; no checkout, branch create,
merge, rebase, commit, stage, push, game command, editor write, source edit, or board edit occurred.

## Verification summary

| Gate | Result |
|---|---|
| Calibrated YAML/symlink validator | PASS |
| No broken top-level `~/.agents/skills` links | PASS |
| `refresh-context` explicit invocation in fresh task | PASS |
| Five priority auto-trigger skills in fresh catalog | PASS |
| Gotcha scanner `--selftest` | PASS, all 23 checks fired and clean complement passed |
| Gotcha index lint | PASS, 96 rows |
| Hook JSON + shell syntax | PASS |
| Domain hook visible in fresh normal task | PASS |
| `/hooks` trust/active state | PASS, 4/4 active |
| Space Miner chunks read in fresh task | PASS |
| Project skill and custom agent discovery | PASS |
| Project MCP tool registration | PASS, 4/43/13 |
| Repository `git diff --check` | PASS |
| Game source/branch mutation | NONE |
| Commit/stage/push | NONE |

## Remaining work

1. Port the six deferred Claude-specific skills only when their Codex behavior is designed; do
   not globally symlink them as-is.
2. Reinstall current Slack/Google Calendar remote plugins only if those connectors are wanted;
   remove the stale legacy identifiers in the same deliberate operation.
3. Diagnose or update the one failing plugin-provided SessionStart hook through its owning plugin,
   not by patching cache files.
4. Install `PyYAML` in an isolated validator environment if the official `quick_validate.py`
   instrument itself must be part of CI; the independent and runtime discovery checks already
   cover the repaired skills.

## Pre-existing user changes preserved

The working tree was dirty before this audit:

- `godot-personal-gotchas/SKILL.md`
- `multi-agent-policy/SKILL.md`
- untracked `godot-personal-gotchas/gotchas/96-preload-is-not-a-parse-gate.md`

This audit added migration edits to the first two files without removing the user's content; the
new gotcha file remains untracked and untouched. Nothing was staged or committed.
