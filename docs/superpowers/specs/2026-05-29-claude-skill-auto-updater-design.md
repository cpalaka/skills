# Claude Skill Auto-Updater — Design

- **Date:** 2026-05-29
- **Status:** Approved (design); pending implementation plan
- **Project dir:** `~/Claude/claude-skill-auto-updater/`
- **Installed as:** `~/.claude/skills/skill-updater/` (symlink → `…/skill/`)

## Goal

A single, manually-invoked "meta skill" that checks every installed skill for upstream
updates and installs them — auto-applying updates from trusted sources and pausing for
confirmation on everything else.

## Background: two skill ecosystems on this machine

The user's installed skills come from **two independent systems**, each with its own
update tooling. Both must be covered.

### Ecosystem 1 — Claude Code plugins (`claude plugin` CLI)

- Installed under `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
- Tracked in `~/.claude/plugins/installed_plugins.json` (version + `gitCommitSha`).
- Marketplaces (GitHub repos) tracked in `~/.claude/plugins/known_marketplaces.json`.
- Currently installed (4):
  - `superpowers@claude-plugins-official` (5.1.0)
  - `security-guidance@claude-plugins-official` (2.0.0)
  - `andrej-karpathy-skills@karpathy-skills` (1.0.0)
  - `obsidian@obsidian-skills` (1.0.1)
- **Update path:**
  - `claude plugin marketplace update` — refresh marketplace metadata from source.
  - `claude plugin list --json --available` — installed vs. available versions (read-only diff).
  - `claude plugin update <id> --scope user` — apply one plugin's update.
- ⚠️ **Restart required** for plugin updates to take effect in a running session.

### Ecosystem 2 — `npx skills` agent-skills (the `skills` npm CLI)

- Installed under `~/.agents/skills/<name>/`, symlinked into `~/.claude/skills/<name>`.
- Tracked in `~/.agents/.skill-lock.json` (v3): per-skill `source` repo, `skillPath`,
  `skillFolderHash`.
- 28 skills from 10 GitHub sources (mattpocock/skills, vercel-labs/\*, anthropics/skills,
  wshobson/agents, thedivergentai/\*, softaworks/\*, intellectronica/\*,
  spillwavesolutions/\*).
- Installer/updater is the npm package literally named `skills` (run via `npx skills@latest`),
  v1.5.7 at time of writing.

#### Critical finding: `npx skills` has no dry-run and no per-skill confirmation

`check`, `update`, and `upgrade` are **aliases for the same routine** (`runUpdate`). For
global skills it fetches each skill folder's upstream hash, builds a list of changed
skills, and **immediately applies all of them** by spawning `skills add <url> -g -y`
(the `-y` is hardcoded). There is:

- **No read-only / dry-run mode** — `check` applies just like `update`.
- **No per-skill confirmation** — it's all-or-the-filtered-set.
- **Only one form of selectivity:** `npx skills update <name> -g -y` updates a single
  named skill (via an internal skill-name filter).

**Consequence for this design:** "auto trusted, confirm rest" cannot be done with one
`skills` command. We must (a) detect community updates ourselves, non-destructively, and
(b) apply updates one named skill at a time.

## Decisions (from brainstorming Q&A)

| Decision | Choice |
|---|---|
| Apply mode | **Auto-apply trusted sources; confirm community sources before applying.** |
| Cadence | **Manual invocation only** (no scheduled routine). Skill is runnable on demand. |
| Scope | **Both ecosystems.** |

### Trusted vs. confirm — default classification

**Trusted → auto-apply:**

- Plugin marketplace: `claude-plugins-official` → `superpowers`, `security-guidance`.
- Agent-skill repos: `anthropics/*`, `vercel-labs/*` → `frontend-design`, `mcp-builder`,
  `find-skills`, `agent-browser`, `vercel-composition-patterns`,
  `vercel-react-best-practices`, `vercel-react-view-transitions`, `web-design-guidelines`.

**Community → confirm first:**

- Plugin marketplaces: `karpathy-skills`, `obsidian-skills`.
- Agent-skill repos: `mattpocock/skills` (14 skills), `wshobson/agents`,
  `thedivergentai/gd-agentic-skills`, `softaworks/agent-toolkit`,
  `intellectronica/agent-skills`, `spillwavesolutions/design-doc-mermaid`.

`kepano/obsidian` defaults to "confirm" but can be promoted to trusted in config.

The classification lives in an editable `trusted-sources.json`, so the user can promote
or demote any source without touching logic.

### Excluded by construction

The user's 4 **hand-authored personal skills** — `godot-personal-gotchas`,
`godot-personal-preferences`, `init-godot-claude-project`, `sync-godot-skills` (real
directories in `~/.claude/skills/`, not symlinks) — are **never touched**. They are
neither marketplace plugins nor entries in `.skill-lock.json`, so detection never sees
them. No remote exists to update them from.

## Architecture

A small bundled script does the **deterministic** work (detection + applying a single
update); the skill prompt (agent) does the **judgment** work (summarize diffs, run the
confirmation gate, report results). This split is deliberate: detection of community
updates is non-trivial and must be reliable, while the confirm-and-report step benefits
from the agent's ability to summarize what a third-party change actually does.

### Components (under the `skill/` subdir → symlinked to `~/.claude/skills/skill-updater/`)

| File | Role |
|---|---|
| `SKILL.md` | Orchestrator. Invoked manually ("check my skills for updates" / `/skill-updater`). |
| `scripts/skillsync.py` | Engine with subcommands: `detect`, `apply`, `diff`. Pure/deterministic, emits JSON. |
| `trusted-sources.json` | The auto-apply allowlist (marketplaces + repo glob patterns). User-editable. |

### `skillsync.py` subcommands

- **`detect [--refresh]`** → prints a JSON report of all pending updates across both
  ecosystems. `--refresh` first runs `claude plugin marketplace update`. Each entry:
  `{ ecosystem, name, source, installedVersion|installedRef, availableVersion|null,
  trusted: bool, updateAvailable: bool, diffstat: str|null, note: str|null }`.
- **`apply --plugin <id>`** → `claude plugin update <id> --scope user`.
- **`apply --skill <name>`** → `npx skills update <name> -g -y`.
- **`diff --skill <name>`** → full unified diff of the local skill folder vs. upstream
  (used when the user asks to see details at the confirm step).

### Detection mechanism (non-destructive)

- **Plugins:** `claude plugin list --json` (installed) joined with
  `claude plugin list --json --available` (latest). `updateAvailable` when versions
  differ. `trusted` when the marketplace is in the allowlist.
- **Agent-skills:** read `~/.agents/.skill-lock.json`. Group skills by `source` repo.
  For each unique repo, do **one** shallow sparse clone
  (`git clone --depth 1 --filter=blob:none --sparse`) to a temp dir, sparse-checkout the
  needed skill folders, then `diff -r` each skill folder against its local install
  (`~/.agents/skills/<name>`). `updateAvailable` when folders differ; capture a diffstat.
  This is **independent of the `skills` tool's internal hash format** (robust to tool
  version changes) and produces a real diff for the confirm step.

### Run flow (`SKILL.md`)

1. Announce the plan and that it will fetch from GitHub.
2. Run `skillsync.py detect --refresh`. If nothing is pending → report "all up to date"
   and stop.
3. **Auto-apply** every trusted update (`apply --plugin` / `apply --skill`), collecting
   per-item success/failure.
4. **Community updates:** present each with its source and diffstat summary; use
   `AskUserQuestion` (multi-select) to let the user pick which to apply, with a path to
   show the full diff (`skillsync.py diff --skill <name>`) before deciding. Apply only
   the chosen ones.
5. Final report grouped by ecosystem (applied / skipped / failed), ending with a
   prominent **"restart Claude Code / start a new session to load updates"** note —
   skills load at session start and plugin updates explicitly require a restart.

### `trusted-sources.json` schema

```json
{
  "marketplaces": ["claude-plugins-official"],
  "repos": ["anthropics/*", "vercel-labs/*"]
}
```

A source is trusted if its plugin marketplace is in `marketplaces`, or its agent-skill
`source` repo matches any glob in `repos`. Everything else is community → confirm.

## Project layout & installation

```
~/Claude/claude-skill-auto-updater/         # project root (git-tracked)
├── README.md
├── docs/superpowers/specs/                  # this spec + future docs
└── skill/                                   # the installable skill (self-contained)
    ├── SKILL.md
    ├── trusted-sources.json
    └── scripts/skillsync.py
```

Install step: `ln -s ~/Claude/claude-skill-auto-updater/skill ~/.claude/skills/skill-updater`
— matching how the user's other skills are already symlinked into `~/.claude/skills/`.

## Error handling & edge cases

- **Per-source network / rate-limit failure:** isolated and reported; never blocks other
  sources. Honors `GITHUB_TOKEN` / `GH_TOKEN` if set (the `skills` tool already does).
- **Offline / `npx skills` unresolvable:** that ecosystem is skipped with a clear message;
  the other ecosystem still runs.
- **Legacy lock entries** lacking `skillFolderHash` / `skillPath`: flagged
  "manual update only" with the source URL; not auto-touched.
- **Personal skills:** excluded by construction (see above).
- **Restart semantics:** the report always states updates load only after a restart /
  new session.

## Testing strategy

- `skillsync.py detect`: unit-test the version-diff and folder-diff logic against fixture
  `installed_plugins.json` / `.skill-lock.json` and a local temp git repo standing in for
  "upstream" (no live network needed for the core logic).
- Trusted/community classification: table-test the glob matching against the known
  sources.
- End-to-end dry check: run `detect` against the real machine state and eyeball the JSON
  before wiring up `apply`.

## Out of scope (YAGNI)

- Scheduled/recurring runs (user chose manual; can be added later via `/schedule`).
- Updating the Claude Code app/CLI itself (already auto-updates natively).
- MCP servers (not skills).
- Rolling back / pinning skill versions.
- A TUI; the skill drives everything through the agent + `AskUserQuestion`.
