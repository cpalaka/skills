# Design: Codex migration review repairs

**Date:** 2026-07-31
**Status:** Approved by the user's instruction to address every review finding
**Source:** Review of commit `f894c50` against `aa2bcc4`; original migration request in the
Codex attachment for task `aa0b183b-b9db-4519-8260-95d4d12893e5`.

## Problem

The first migration commit made the priority Codex paths usable, but its review found seven
defects: no durable spec/plan, stale Claude-only domain definitions, a dead rationale-archive
path, an incomplete parity instrument, incomplete activation/execution evidence, loss of Claude's
`ultracode.` kickoff signal, and a gotcha-row result measured from unrelated dirty state.

The same review exposed a concrete gap behind the parity failure: installed explicit-only
Matt Pocock skills are discoverable by Codex, but some upstream bodies still spell nested skill
invocations with Claude Code's `/skill-name` syntax.

The completion review found one further pre-existing inventory defect: the unlocked
`~/.agents/skills/claude-activity` copy advertises a Codex journal whose generator, index, and
`~/.Codex/projects` input do not exist.

## Verified premises

- **[reuse]** The rationale archive exists at `~/Claude/improvements.md`; there is no
  `~/Codex/improvements.md` or `~/Codex/` directory.
- **[reuse]** Codex discovers user skills under `~/.agents/skills`, supports symlinked skill
  directories, and invokes skills with `$skill-name` or `/skills`.
- **[reuse]** Claude Code and Codex share the updater-managed Matt Pocock directories:
  `~/.claude/skills/<name>` points to `~/.agents/skills/<name>`.
- **[reuse]** `~/.agents/.skill-lock.json` owns those vendored directories. Editing or replacing
  their bodies would either be overwritten by `skill-updater` or hide upstream updates.
- **[reuse]** `godot-architecture-review/PHASES.md` is the canonical Claude source; its
  `ultracode.` prefix is an active Claude Workflow router, not portable prose.
- **[reuse]** The real `~/Claude/Claude-activity-log` generator scans only
  `~/.claude/projects`; it is not a Codex-capable source that a thin adapter can safely reuse.

## Decisions

| Surface | Decision | Why |
|---|---|---|
| Missing design record | Add this follow-up spec and a paired plan before repair implementation | The timing defect cannot be retroactively erased; the follow-up must nevertheless obey the repository gate and leave a durable record. |
| Domain language | Extend `Skill`, `Personal skill`, `Chunk`, and `dev-base`; add `Host adapter` | Existing glossary statements become false once Codex is a supported host. |
| Rationale paths | Keep the shared archive at `~/Claude/improvements.md` in both host instructions and shared skills | There is one real archive; changing the label without moving the data created a dead pointer. |
| Matt Pocock nested invocations | Add a Codex global rule translating `/skill-name` in vendored skill bodies to `$skill-name`; do not modify updater-managed bodies | One host-level compatibility rule survives upstream refreshes and preserves Claude's shared source. |
| Architecture review | Restore `ultracode.` in canonical Claude kickoff prompts; add a thin Codex adapter that reads the canonical skill and substitutes native subagent routing | This preserves both hosts without duplicating the full skill body. |
| Broken `Codex-activity` copy | Remove the misleading copy from Codex discovery, preserve it in a recoverable temporary backup, and mark the feature deferred | Repointing its paths would corrupt the Claude-only journal or falsely claim Codex ingestion. A real port must teach the generator the `~/.codex/sessions` schema first. |
| Audit instrument | Replace the four-column 13-skill table with the required seven-field infrastructure matrix and a separate activation/evidence matrix | Discovery, visibility, invocation policy, invocation, and execution are different states. |
| Dirty-tree verification | Record 95 rows for the committed migration artifact and identify the unrelated 96th row as uncommitted user state | A durable report must be reproducible from the exact Git tree it describes. |

## Scope

### Repository changes

- Add the paired spec and plan.
- Refresh `CONTEXT.md`, repository `AGENTS.md`, shared skill wording, architecture prompts, and
  the durable audit.
- Add `codex-skills/godot-architecture-review/` as a thin host adapter.

### User-level changes

- Correct `~/.codex/AGENTS.md` paths from nonexistent `~/Codex/...` to the existing
  `~/Claude/...` hierarchy.
- Add the vendored-skill invocation translation rule to `~/.codex/AGENTS.md`.
- Repoint `~/.agents/skills/godot-architecture-review` from the canonical Claude skill to the
  Codex adapter. Leave `~/.claude/skills/godot-architecture-review` unchanged.
- Move the broken unlocked `~/.agents/skills/claude-activity` copy out of discovery to a
  recoverable `/private/tmp` backup; do not change the working Claude activity skill or project.

### Out of scope

- Editing or forking updater-managed Matt Pocock skill bodies.
- Committing the pre-existing gotcha #96 or Workflow-input rule.
- Re-running game/editor verification or changing any game repository.
- Installing or replacing external plugins.

## Acceptance criteria

1. The follow-up commit contains this spec and its paired plan.
2. `CONTEXT.md` describes both hosts and both Chunk delivery mechanisms without duplicating deeper
   documentation.
3. Every active repo/global reference to the rationale archive resolves to
   `~/Claude/improvements.md`; no active `~/Codex` path remains.
4. Claude's Phase 0 and Phase 1 kickoff prompts again begin with `ultracode.` in the canonical
   source; a fresh Codex task loads the adapter and reports native subagent routing instead.
5. Fresh Codex explicit probes for `$grill-me` and `$wayfinder` translate their nested `/...`
   references to `$...` without editing the vendored directories.
6. The audit contains the seven required fields for skills, instructions, chunks, agents, hooks,
   MCP, plugins, settings, and permissions, plus evidence appropriate to each activation mode.
7. A clean tree built from the exact staged follow-up state reports 95 gotcha rows and passes the
   23-check scanner self-test, hook checks, frontmatter checks, and `git diff --check`.
8. The three pre-existing user changes remain uncommitted after the follow-up commit.
9. The audit reconciles the complete user skill root; a fresh Codex task does not advertise the
   broken `Codex-activity` copy, and the removed copy remains recoverable from the documented path.
