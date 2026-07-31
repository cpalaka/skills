# Codex migration audit and repair — 2026-07-31

## Verdict

The Claude Code infrastructure remains intact, and the priority Codex migration paths are now
functional without copied sources of truth. Confidence is **high** for skill discovery, explicit
skill invocation, chunk reads, project-local skills/agents, the domain SessionStart hook, and MCP
tool registration because each was checked in a newly started Codex task. Confidence is
**moderate** for plugin health: configured plugins were inventoried, but one enabled
third-party/plugin SessionStart hook still reports a generic runtime failure and the stale remote
Slack/Google Calendar identifiers are not active tools.

No game source, scene, resource, asset, Space Miner tracked Claude configuration, git branch,
push, permission rule, or external service was changed. This repository was committed only after
the user's explicit commit requests.

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

## Infrastructure parity matrix

Legend: **[reuse]** direct canonical source; **[adapt]** thin Codex wrapper; **[project]** stays
project-local; **[defer]** not safely compatible; **[preserve]** valid existing Codex state.

| Component | Claude source | Codex destination / discovery mechanism | Current status | Intended scope | Repair | Verification |
|---|---|---|---|---|---|---|
| `audit-godot-parity` | Repository `audit-godot-parity/` via `~/.claude/skills/` | `~/.agents/skills/audit-godot-parity` symlink | **[reuse]** repaired | User; implicit or `$audit-godot-parity` | Linked the canonical directory and made path/invocation wording cross-host. | Fresh passive catalog and explicit load: **PASS**; canonical path and first gate reported. |
| `godot-architecture-review` | Repository `godot-architecture-review/` via `~/.claude/skills/`; Claude kickoffs require `ultracode.` | `~/.agents/skills/godot-architecture-review` -> `codex-skills/godot-architecture-review/` | **[adapt]** repaired | User; implicit or `$godot-architecture-review` | Restored the canonical Claude router and added a thin Codex adapter that reads the canonical body while translating only host routing. | Fresh Claude CLI probe reported `ultracode.` for both kickoff prefixes; fresh Codex catalog/load reported the adapter and native subagents after `$multi-agent-policy`: **PASS**. |
| `godot-personal-gotchas` | Repository `godot-personal-gotchas/` via `~/.claude/skills/` | `~/.agents/skills/godot-personal-gotchas` symlink | **[reuse]** repaired | User; implicit or explicit | Linked canonical directory; cross-host audit invocation retained. | Fresh catalog/load: **PASS**; scanner self-test **23/23**; clean committed index **95 rows**. The live worktree's pre-existing row 96 was excluded. |
| `godot-personal-preferences` | Repository `godot-personal-preferences/` via `~/.claude/skills/` | `~/.agents/skills/godot-personal-preferences` symlink | **[reuse]** repaired | User; implicit or explicit | Linked canonical directory without copying the body. | Fresh catalog/load: **PASS**; canonical path and first rule action reported. |
| `multi-agent-policy` | Repository `multi-agent-policy/` via `~/.claude/skills/` | `~/.agents/skills/multi-agent-policy` symlink | **[reuse]** repaired | User; implicit before orchestration or explicit | Added cross-host routing and restored the real `~/Claude/improvements.md` archive path. | Fresh Claude CLI reported `~/Claude/improvements.md`; fresh Codex catalog/load reported the first pin; archive exists: **PASS**. |
| `refresh-context` | Repository `refresh-context/`; Claude-only frontmatter/procedure | `~/.agents/skills/refresh-context` -> `codex-skills/refresh-context/` | **[adapt]** repaired | User; explicit-only | Added valid Codex frontmatter and `policy.allow_implicit_invocation: false`; adapter reads canonical procedure. | Absent from passive catalog as designed; explicit `$refresh-context` load: **PASS**. |
| `game-design-context` | Space Miner `.claude/skills/game-design-context/` | Each checkout's `.agents/skills/game-design-context` relative symlink | **[project]** repaired | Space Miner; implicit or explicit | Replaced byte-identical copies with links to the tracked project source. | Fresh Space Miner catalog: **PASS**; both link targets resolve to their checkout's canonical source. |
| `audit-improvements` | Repository `audit-improvements/` | None | **[defer]** | User; explicit-only Claude maintenance | Deferred because paths, Workflow procedure, unsupported frontmatter, and lifecycle are Claude-specific. | Source inspected; no misleading Codex install exists. |
| `init-project` | Repository `init-project/` | None | **[defer]** | User; explicit-only scaffolder | Deferred because it emits Claude imports, settings, MCP, and instruction shapes. | Source inspected; no mechanical port installed. |
| `sandbox-and-permissions` | Repository `sandbox-and-permissions/` | None | **[defer]** | User; explicit-only recovery/config | Deferred because its authority model and file formats are Claude-specific. | Codex sandbox, approval, and rules audited independently. |
| `skill-updater` | Repository `skill-updater/` | None | **[defer]** | User; explicit-only maintenance | Deferred because it invokes Claude plugin/CLI ecosystems and mutates installations. | Source inspected; updater-managed Codex skills were left under their existing lockfile. |
| `tournament` | Repository `tournament/` | None | **[defer]** | User; explicit-only Workflow authoring | Deferred because it depends on Claude Workflow scripts and semantics. | Source inspected; no incompatible executable adapter created. |
| `wrap-session` | Repository `wrap-session/` | None | **[defer]** | User; explicit-only session close | Deferred because it depends on Claude memory/session and slash-command semantics. | Source/frontmatter inspected; no incompatible install created. |
| Matt Pocock updater-managed skills (38, including `grill-me` and `wayfinder`) | `~/.agents/skills/*` as the shared upstream-managed bodies; Claude links point there | Same `~/.agents/skills/*` directories, tracked by `~/.agents/.skill-lock.json` | **[reuse]** compatible | User; activation follows each upstream manifest | Kept upstream bodies untouched. Added global/repository instruction that nested Claude `/skill-name` references map to Codex `$skill-name`. | Lockfile inventory: **38**; fresh explicit loads of `$grill-me` and `$wayfinder`: **PASS**; nested dependency translation: **PASS**; upstream body mtimes/lock ownership preserved. |
| Other updater-managed skills (18 across 10 upstream sources) | Agent-skills ecosystem; any Claude links reuse the installed bodies | `~/.agents/skills/*`, tracked by `~/.agents/.skill-lock.json` | **[reuse]** preserved | User; activation follows each upstream manifest | No body changes; retained lock ownership. | Lockfile reconciliation: **18/18 present**; no executable claim was inferred from presence alone. |
| Broken copied `Codex-activity` skill | Unlocked copied variant of Claude's `claude-activity`; claimed a nonexistent Codex journal | Removed from `~/.agents/skills/`; backup at `/private/tmp/claude-activity.pre-codex-repair-20260731` | **[defer]** removed misleading install | User activity queries/calendar | Did not repoint paths: the real Claude generator scans only `~/.claude/projects`, not `~/.codex/sessions`. A faithful port requires generator/schema work. | Fresh Codex task: not advertised and not explicitly available; Claude activity source/project untouched. |
| Other unlocked host-specific copies (`grok`, `impeccable`) | Separate Claude host copies exist | Existing `~/.agents/skills/grok` and `impeccable` copies | **[preserve]** | User | Preserved; no false single-source claim. | Both present in the catalog; `grok` skill loaded for the independent-review attempt. No broader execution claim. |
| Global instructions | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | **[adapt]** repaired | User, every Codex task | Corrected discovery, invocation, agents, config paths, archive paths, and vendored nested-skill translation. | Active file contains no live `~/Codex/...` archive references; fresh tasks followed `$...` translation. |
| Repository instructions | Repository `CLAUDE.md` | Repository `AGENTS.md` plus shared `CONTEXT.md` | **[adapt]** repaired | This repository | Added the Codex entry point; made canonical-source, symlink, chunk, and host-adapter language cross-host. | Instruction chain loaded in fresh repo task; docs now describe both discovery roots and host spellings. |
| Shared chunks | Repository `chunks/` via Claude `@import` | `~/.codex/chunks` symlink plus explicit-read directives | **[adapt]** repaired | User/project instructions | Kept one source; taught Codex to read rather than pretending it expands `@path`. | Fresh Space Miner task read all three roots and all eight `dev-base` children: **PASS**. |
| Space Miner project instructions | Main/worktree Claude instruction chains | Main/worktree `AGENTS.md` files | **[adapt]** repaired | Two existing Space Miner checkouts | Replaced unsupported imports with explicit reads; preserved byte identity between checkouts. | Fresh task reported squash approval, board ownership, and verification gate: **PASS**. |
| User skill registry / symlink integrity | `~/.claude/skills/` | `~/.agents/skills/` | **[reuse/adapt]** repaired | User | Added canonical links/adapters and removed one misleading unlocked copy from discovery. | Exact post-repair reconciliation: **64 = 56 lock-owned + 6 personal links + 2 unlocked host-specific copies**; zero missing lock-owned entries or broken top-level links. |
| User custom agent | `~/.claude/agents/opus-implementer.md` | `~/.codex/agents/opus-implementer.toml` | **[preserve]** valid | User | No change required. | TOML parsed; custom agent advertised with pinned effort. |
| Project custom agent | Space Miner `.claude/agents/` behavior | `.codex/agents/godot-export-verifier.toml` | **[preserve]** valid | Space Miner | No change required. | Fresh project task advertised the expected project path. |
| User SessionStart hook | Claude user hook configuration | `~/.codex/hooks.json` -> `codex-hooks/session-start.sh` | **[adapt]** repaired | User | Registered one hash-trusted Codex handler with Codex-shaped JSON. | Known-good, invalid, degraded, and live controls: **PASS**; `/hooks`: **4/4 active**. |
| Canonical Claude hook probes | `~/.claude/hooks/context-md-adr-inject.sh` and `godot-ai-channel-check.sh` | Called by repository `codex-hooks/session-start.sh` | **[reuse/adapt]** repaired | User/project startup context | Reused both probes; fixed one shared logger redirection and adapted unsupported output fields at the boundary. | Domain payload and Godot `OK`/`DEGRADED` controls: **PASS**. |
| User MCP | Claude MCP registrations | `~/.codex/config.toml` | **[adapt/preserve]** valid | User | Audited rather than copying Claude config. | `codex mcp list`: `blender`, `openaiDeveloperDocs`, `node_repl` enabled; `computer-use` disabled. |
| Project MCP | Space Miner Claude/project services | Space Miner `.codex/config.toml` | **[preserve]** valid | Space Miner | No change required. | Fresh task exposed `godot`/`godot-ai`/`godot-mcp` definitions: **4/43/13**. |
| Plugins | Claude plugins and Codex plugin cache/registry | Codex installed plugin registry | **[preserve]** partial health | User | Inventoried without editing updater-owned caches or installing connectors. | Capabilities visible; one third-party SessionStart failure and two stale legacy connector identifiers remain. |
| Settings and permissions | Claude settings/allowlists | `~/.codex/config.toml`, rules, trusted project config | **[adapt/preserve]** valid | User and inspected projects | Did not import broad Claude permissions or invent `.Codex/settings.json`. | Configs parse; only three narrow exec-policy allows; no approval/sandbox/trust expansion. |

## Activation and execution evidence

The passive catalog is the startup-advertised skill list. Explicit-only skills may be omitted from
that list by `agents/openai.yaml` policy, so absence there is not an installation failure.

| Skill | On disk | Codex-discoverable | Fresh passive catalog | Implicit eligibility | Explicit invocation | Executable / behavior evidence |
|---|---:|---:|---|---|---|---|
| `audit-godot-parity` | yes | yes | advertised | eligible | **PASS** | Loaded canonical path and reported its first parity gate. |
| `godot-architecture-review` | yes | yes | advertised | eligible | **PASS** | Loaded adapter; mapped canonical `ultracode.` kickoff to Codex-native subagents after `$multi-agent-policy`. |
| `godot-personal-gotchas` | yes | yes | advertised | eligible | **PASS** | Loaded canonical path; scanner self-test **23/23** and clean committed index **95**. |
| `godot-personal-preferences` | yes | yes | advertised | eligible | **PASS** | Loaded canonical path and reported the first applicable rule action. |
| `multi-agent-policy` | yes | yes | advertised | eligible | **PASS** | Loaded canonical path and reported the first hard pin. |
| `refresh-context` | yes | yes | intentionally omitted | disabled | **PASS** | Adapter loaded canonical procedure and exposed explicit-only policy. |
| `game-design-context` | yes | yes, project | advertised in Space Miner | eligible | not separately probed | Fresh project catalog and symlink resolution: **PASS**; no execution claim. |
| `grill-me` | yes | yes | intentionally omitted | disabled | **PASS** | Loaded updater-managed body; nested `/grilling` resolved as `$grilling`. |
| `wayfinder` | yes | yes | intentionally omitted | disabled | **PASS** | Loaded updater-managed body; all five nested slash references mapped to installed `$...` skills. |
| `codex-activity` | no; backup only | no | omitted | unavailable | unavailable | **Deferred honestly**: the existing Claude generator does not ingest Codex sessions. |

### Manifest validation

The official `skill-creator/scripts/quick_validate.py` could not run because the machine's
Homebrew Python lacks `PyYAML` (`ModuleNotFoundError: yaml`). That is an **instrument failure**,
not a skill failure. An independent Ruby `Psych` validator was calibrated against malformed YAML,
then checked the six migrated user paths plus project-local `game-design-context` for symlink
resolution, valid frontmatter, matching names, and supported keys; verdict: **PASS**. The explicit
adapter's `openai.yaml` policy and `$refresh-context` default prompt also passed. The architecture
adapter's frontmatter and `openai.yaml` also passed.

## Skills and symlinks changed

Added user skill links, all pointing to canonical repository sources:

```text
~/.agents/skills/audit-godot-parity
~/.agents/skills/godot-architecture-review -> codex-skills/godot-architecture-review
~/.agents/skills/godot-personal-gotchas
~/.agents/skills/godot-personal-preferences
~/.agents/skills/multi-agent-policy
~/.agents/skills/refresh-context -> codex-skills/refresh-context
```

No top-level broken links or recursive loops were found under `~/.agents/skills`. Existing Claude
links and the working Claude activity project were preserved. The two other unlocked host-specific
copies (`grok`, `impeccable`) remain. The broken copied activity skill was moved, not deleted, and
is recoverable at `/private/tmp/claude-activity.pre-codex-repair-20260731`.

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
- Active rationale/output paths -> the existing `~/Claude/...` archive and directories; no
  nonexistent `~/Codex/...` storage tree remains in the live instructions.
- Updater-managed skill bodies keep their upstream slash notation; Codex translates nested
  `/skill-name` dependencies to `$skill-name` at invocation time instead of forking those bodies.

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
merge, rebase, push, game command, editor write, source edit, or board edit occurred. Repository
commits were created later only after the user's explicit requests; no Space Miner path was staged
or committed by this audit.

## Verification summary

| Gate | Result |
|---|---|
| Calibrated YAML/symlink validator | PASS |
| No broken top-level `~/.agents/skills` links | PASS |
| Complete user skill-root reconciliation | PASS, 64 = 56 lock-owned + 6 personal links + 2 unlocked copies |
| Broken `Codex-activity` removal in fresh task | PASS, neither advertised nor explicitly available |
| `refresh-context` explicit invocation in fresh task | PASS |
| Five priority auto-trigger skills in fresh catalog | PASS |
| `grill-me` / `wayfinder` explicit loads and nested dependency translation | PASS |
| `godot-architecture-review` canonical Claude router + Codex adapter | PASS |
| Fresh Claude architecture/policy compatibility probes | PASS, `ultracode.` for both exploration phases and `~/Claude/improvements.md` |
| Gotcha scanner `--selftest` | PASS, all 23 checks fired and clean complement passed |
| Gotcha index lint | PASS, 95 rows in the committed artifact; pre-existing row 96 excluded |
| Hook JSON + shell syntax | PASS |
| Domain hook visible in fresh normal task | PASS |
| `/hooks` trust/active state | PASS, 4/4 active |
| Space Miner chunks read in fresh task | PASS |
| Project skill and custom agent discovery | PASS |
| Project MCP tool registration | PASS, 4/43/13 |
| Repository `git diff --check` | PASS |
| Game source/branch mutation | NONE |
| Repository commit authorization | Explicitly granted after audit; no push |

## Remaining work

1. Port the six deferred Claude-specific skills only when their Codex behavior is designed; do
   not globally symlink them as-is.
2. Build a real Codex activity journal only by extending or replacing the generator to ingest
   `~/.codex/sessions`; do not repoint the Claude journal at Codex data.
3. Reinstall current Slack/Google Calendar remote plugins only if those connectors are wanted;
   remove the stale legacy identifiers in the same deliberate operation.
4. Diagnose or update the one failing plugin-provided SessionStart hook through its owning plugin,
   not by patching cache files.
5. Install `PyYAML` in an isolated validator environment if the official `quick_validate.py`
   instrument itself must be part of CI; the independent and runtime discovery checks already
   cover the repaired skills.

## Pre-existing user changes preserved

The working tree was dirty before this audit:

- `godot-personal-gotchas/SKILL.md`
- `multi-agent-policy/SKILL.md`
- untracked `godot-personal-gotchas/gotchas/96-preload-is-not-a-parse-gate.md`

Migration edits and the review repair were staged by explicit path. The unrelated row-96 hunks in
the first file, the user's JSON-input rule hunk in the second file, and the new gotcha file remain
outside the migration commits and untouched.
