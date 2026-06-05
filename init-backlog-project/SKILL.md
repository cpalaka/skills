---
name: init-backlog-project
description: Bootstrap backlog.md (the markdown-native task-board CLI) into a dev project with locked personal conventions — CLI-only/no-MCP, no generated agent instructions, DoD defaults ending in a user-sign-off gate, board as the single source of progress. Use when adopting backlog.md in a project ("add backlog to this project", "set up the task board", "port the backlog conventions"), or when re-orienting on the backlog conventions themselves (DoD vs AC, sign-off rule, plan-doc linkage, seeding, milestones/labels/drafts).
---

# Initialize backlog.md in a Project

Adopts [Backlog.md](https://github.com/MrLesk/Backlog.md) as the project's in-repo task ledger, with the conventions locked during the circle-combat-prototype adoption (2026-06-04). The board replaces roadmap-in-agent-memory and doc-ledger task queues — it does NOT replace ADRs, design docs, or plan docs.

## Locked conventions and why (do not re-litigate without new evidence)

| Convention | Why |
|---|---|
| **CLI-only with `--plain`; NO MCP server** | The MCP server resolves repo root once at startup → writes task files to the wrong repo from git worktrees (upstream #558). The CLI has no such failure surface. |
| **NO generated agent instructions** (`--agent-instructions none`) | `backlog init` injects a ~742-line / ~7.7k-token block into CLAUDE.md (upstream #459) — a permanent per-turn context tax. The hand-rolled section in `templates/claude-section.md` covers everything actually used. |
| **Only the main session creates/edits tasks** — never parallel subagents/workflow agents | ID generation is a max+1 scan; concurrent creation collides (upstream #632; archive releases IDs back, #667). |
| **Done requires explicit user sign-off** — never auto-close on AC/DoD pass | Human-in-the-loop at all four gates: task pick → plan approval (before code) → verification checks → final sign-off. The sign-off is also a visible DoD item on every task. |
| **`docs/adr/` stays the only decision system** | backlog's `decisions/` would duplicate it, and `backlog decision` has only `create` implemented (its own readme is stale). `docs/` likewise beats backlog's `docs/`. |
| **Global pinned install, upgraded deliberately** | `npm i -g backlog.md@<version>` — avoids resolve-latest-at-launch supply-chain exposure without per-repo freezing (a hand-invoked CLI, not an unattended server). |
| **Branch-per-task: feature branch (`task-NNN-<slug>`) before the first commit; `--no-ff` merge to main after sign-off** | Task work reads as one unit in history (merge commit ↔ task ID) and `main` stays at known-good between tasks. Established 2026-06-04 after TASK-001 initially landed direct-to-main and was retro-branched. Non-task chores (board/docs housekeeping) may commit straight to main. |

## Recipe

1. **Install check**: `backlog --version`. If missing: `npm i -g backlog.md@<pinned>` (check current release deliberately; v1.45.2 as of 2026-06-04).
2. **Init** (flags beat the wizard; run from repo root):
   ```
   backlog init <project-name> --agent-instructions none --integration-mode cli \
     --install-claude-agent false --zero-padded-ids 3 --defaults
   ```
   Verify `backlog/config.yml`: `auto_commit: false`, `statuses: [To Do, In Progress, Done]` (keep defaults — gates are DoD items, not columns), `zero_padded_ids: 3`.
3. **DoD defaults — hand-edit `backlog/config.yml`** (`backlog config set` does NOT expose this key). Append, adapting items 1–N to the project's standing gates and ALWAYS ending with sign-off:
   ```yaml
   definition_of_done:
     - "<project test gate, e.g. tests/run_tests.sh green | lint+typecheck+tests green>"
     - "<project review gate, e.g. gotcha-reviewer scan clean | PR opened ready>"
     - "<filing gate, e.g. new gotchas/ADRs filed (or N/A)>"
     - "Debug/scaffolding instrumentation reverted"
     - "User sign-off received — explicit approval before Done"
   ```
   Godot flavor: suite green via the headless runner · gotcha-reviewer scan · gotchas/ADRs filed · debug reverted · adversarial review for cross-module wiring (N/A otherwise) · sign-off. Web/PR flavor: lint+typecheck+tests · PR opened ready (per repo convention) · preview/screenshot check · sign-off.
4. **Stamp the CLAUDE.md section** from `templates/claude-section.md`, filling the `{{...}}` placeholders. Place it before the project's "Running"/build section.
5. **Seed the board** (main session only, sequential):
   - Everything that predates backlog gets the label **`pre-backlog`**.
   - Every task/draft the agent creates gets the label **`claude-generated`**, set in `-l` at create time — provenance marker so the user can tell agent-created board items from ones they enter directly (web UI). The discriminator is creation *mechanism*, not idea origin. Applies during seeding and to every future create.
   - Sources: existing roadmap/TODO docs, doc-ledger task lists, agent-memory forward queues — *verify each item against git first* (docs and memory go stale; the queue may already be done).
   - Tasks = concrete identified work (`-d` description with context + file/doc pointers, `--ac` per task-specific check). Drafts = ungrilled phase-heads (`backlog draft create`).
   - Milestones = phases (`-m <phase>`, auto-created on first use); labels = free-form, multiple via `-l a,b`, let them emerge (the config `labels:` list is suggestions, not a closed vocabulary).
   - After seeding, retire the old queue homes: point roadmap docs/memories at the board, never maintain two queues.
6. **Commit** `backlog/` + CLAUDE.md as the adoption commit (`auto_commit: false` means task-file changes always ride along with code commits thereafter).

## Session flow (the conventions in motion)

Pick from board (user picks) → **branch `task-NNN-<slug>`** → `-s "In Progress"` → plan written INTO the task (`--plan`) or, for multi-task slices, a plan doc carrying a `Tracked by: task-NNN` header and linked via `--doc` → **user approves plan before any code** → execute; `--check-ac N` only as each criterion is empirically proven (never pre-check criteria that need the user's eyes) → DoD sweep with evidence → user sign-off → `--notes "<summary + commit hash>" -s Done` → `--no-ff` merge to main.

**Board status/AC is the single source of progress.** Plan-doc checkboxes are in-session scratch; when a plan completes, give it a STATUS banner (executed/merged, commit refs, whether checkboxes were maintained) instead of trusting ticks.

## Gotchas (hit during the original adoption, v1.45.2)

- `backlog config set` rejects `definition_of_done` — hand-edit the yaml (config is fine to hand-edit; task files are NOT — the CLI owns IDs/naming/frontmatter).
- `backlog task archive` releases the ID back into the pool — a later create reuses it. Don't archive-and-recreate to "renumber".
- `--dod`/`--check-dod` etc. exist on `task edit` — DoD can be retrofitted onto tasks created before the config key was set.
- DoD defaults stamp at *creation time* — config changes don't propagate to existing tasks.
- `backlog task list` has NO label filter (status/assignee/milestone/parent/priority only); label-slicing is web-UI (`backlog browser`, port 6420) or grep territory.
- Drafts have NO edit verb (`backlog draft` = create/archive/promote/view only; `task edit` doesn't see draft IDs) — set labels at `draft create -l` time. Retrofitting onto an existing draft requires a (normally forbidden) hand-edit of the frontmatter `labels:` list in the CLI's own format; verify it round-trips via `backlog draft view --plain`.
- If `to-issues`/`to-prd`/`triage`-style skills run in a backlog project, the board IS the issue tracker — route them to `backlog` CLI commands.
