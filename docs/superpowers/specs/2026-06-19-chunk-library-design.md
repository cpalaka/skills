# Design: Chunk library + `init-project` engine

**Date:** 2026-06-19
**Author:** @cpalaka (with Claude)
**Status:** Approved — ready for implementation plan
**Grilled:** /grill-with-docs session 2026-06-19; CONTEXT.md updated inline (Chunk, dev-base, Profile, knob, inline-leaf; Template refined).

## Problem

Dev-process rules (git flow, sandbox+auto, backlog conventions, parallel-work,
skill discipline, …) are duplicated and drifting across `chaipalaka.com/CLAUDE.md`
and the per-type init skills (`init-backlog-project`, `init-godot-claude-project`).
An audit (2026-06-19, read-only, 22 agents) catalogued **206 rules** across all
surfaces: every one accounted for in exactly one home, with the key divergence
being the git-flow integration model. We want one source of truth per rule,
composable across project types, and clean to extend as new types appear.

## Locked decisions (and why)

| Decision | Choice | Why |
|---|---|---|
| **Delivery** | `@import`-from-home, NOT stamp-and-copy | Solo dev, no collaboration ever → no need for self-contained repos. Single source ⇒ zero drift, no parity/propagate for Chunks. See **ADR-0001**. |
| **Storage** | `chunks/` in this repo, symlinked to `~/.claude/chunks` | Rides the existing clone-and-symlink bootstrap; works on any machine incl. Windows (junction). |
| **Granularity** | Bundled `dev-base.md` (recursive `@import`) + explicit fork/backlog imports | Every serious dev project gets the base; base chunks are safe-when-unused. Project file stays ~3 import lines. The git-flow fork and backlog-core stay explicit (a fork can't be baked into a shared bundle — `@import` can't be undone). |
| **Engine** | ONE `init-project` skill + declarative **Profiles**; retire `init-backlog-project` + `init-godot-claude-project` | Maximally DRY; new project type = new Profile, never a new skill. Engine never changes as types grow. See **ADR-0003** (to confirm). |
| **Profile shape** | Declarative manifest + optional bespoke imperative recipe | A list can't express godot's MCP install / `project.godot` edits; the recipe escape-hatch keeps the engine uniform while supporting gnarly types. |
| **Knobs** | Engine-written tagged inline blocks (`<!-- knobs:<chunk> -->`) | Machine-writable + idempotent re-runs; stable anchor a Chunk can name; separates engine-managed values from hand-authored inline-leaf. |
| **git-flow** | Structural fork: `git-flow-squash` (default) ↔ `git-flow-noff` | Squash vs `--no-ff` are mutually-exclusive integration models; three rules ride the fork together. Squash (chaipalaka's evolved model) is the new default. See **ADR-0002**. |
| **code-hygiene** | Its own dev-only Chunk, NOT global | Dev-specific (irrelevant to non-dev Claude sessions); keeps `~/.claude/CLAUDE.md` lean. |

## Domain vocabulary

Ratified into `CONTEXT.md` this session: **Chunk** (referenced, single-source,
invariant — vs **Template**, copied + parity-tracked), **dev-base** (the bundle
Chunk), **Profile** (the recipe for a project type, consumed by `init-project`),
**knob** (per-project value in a tagged inline block), **inline-leaf** (hand-authored
project-specific content).

## Chunk library

From the audit taxonomy, with three refinements noted below. `in dev-base` = pulled
by the bundle; the rest are imported explicitly by a Profile.

| Chunk | kind | variation | in dev-base | notes |
|---|---|---|---|---|
| `git-sync-branch-start` | invariant | — | ✅ | sync main + branch off fresh main |
| `git-commit-format` | invariant | — | ✅ | conventional-commit subject/footer, one-logical-change, never-amend-pushed, never-bypass-hooks |
| `git-confirm-destructive` | invariant | — | ✅ | force-push / tag-remote-delete / gh-write gating |
| `git-flow-squash` | fork | structural | ❌ (explicit) | **default**: squash, `<type>/task-NNN` branch, **no-SHA in notes**, no-PR local review |
| `git-flow-noff` | fork | structural | ❌ (explicit) | opt-in: `--no-ff`, plain `task-NNN` branch, SHA-in-notes |
| `sandbox-auto` | invariant | — | ✅ | sandbox+auto baseline, allowlist-hygiene principle, **+ settings.local.json merge contract** (folded in) |
| `parallel-work` | value-variant | — | ✅ | waves/worktrees; **delegates the merge/Done step to the project's git-flow fork** (never inlines squash/no-SHA); states both settings-inheritance branches |
| `verify-gate` | value-variant | — | ✅ | **NEW** — the "run the project verify gate before commit/handoff" principle (had no home); knobs = exact commands |
| `superpowers-default` | value-variant | — | ✅ | skill 1%-rule, planning routing, spec hygiene; knobs = test-roster pointer, spec-verify src path |
| `codegraph` | invariant | — | ✅ | opt-in, self-gates on `.codegraph/` |
| `code-hygiene` | invariant | — | ✅ | no-secrets / no-console.log-in-prod / no-undeclared-deps / ask-when-unsure |
| `backlog-core` | value-variant | — | ❌ (explicit) | board conventions, **merge-agnostic** (defers notes-SHA policy to the git-flow fork); knobs = VERSION / PLANS_DIR / VERIFY_EXAMPLES / DoD items |

**Refinements from the audit taxonomy (confirm):**
1. `settings-merge-contract` (1 member) folded into `sandbox-auto` — same file's concern.
2. `init-scaffold-core` (generator mechanic: inventory→merge/skip, append-not-overwrite, dedup, verify-after-write, lockfile-freeze) lives in the **`init-project` skill**, not `dev-base` — it's only relevant during scaffolding, so it should not be always-loaded in every project session.
3. `verify-gate` promoted to a real Chunk (the audit found it referenced but never created).
4. `no-SHA-in-notes` moved out of `backlog-core` into `git-flow-squash` (squash-coupled).

`INLINE-LEAF` (per project: Hetzner, React skills, toolchain pins, exact verify
commands) and `STAMPED-godot-templates` (mcp.json, gotcha catalog — keep
stamp+parity) are NOT Chunks.

## Generated project `CLAUDE.md` anatomy

Three zones:

```markdown
# Working on <project>
@~/.claude/chunks/dev-base.md          # bundle: 9 base chunks
@~/.claude/chunks/git-flow-squash.md   # the fork choice (explicit)
@~/.claude/chunks/backlog-core.md      # only for backlog projects

<!-- knobs:backlog-core -->            # engine-written, re-run-updatable
- backlog version: 1.45.2
- plans dir: docs/superpowers/plans/
- AC verify examples: typecheck/test/build green, dev smoke, screenshot
- DoD items: <…, ending in "User sign-off received">
<!-- /knobs:backlog-core -->

## Project-specific (inline-leaf)       # free-form, hand-authored
Hetzner deploy …, React skill list …, exact toolchain pins …
```

## `init-project` engine + Profiles

- **Engine** (`init-project/SKILL.md`): uniform apply-algorithm — write the chunk
  `@import`s, write/update tagged knob blocks, stamp Templates, merge
  `settings.local.json` (union by exact-string dedup, never clobber the baseline),
  then run the Profile's bespoke recipe. Carries the `init-scaffold-core` mechanic.
- **Profile** (`init-project/profiles/<type>.md`): frontmatter manifest
  (`imports`, fork, `templates`, `knobs`) + an optional `## Bespoke setup` recipe.
  `web` has an empty recipe (it *references* the `backlog` recipe for board setup rather
  than duplicating it — profiles do not compose); `backlog` carries the real Backlog.md
  setup recipe (install + `init` + config DoD + seed), ported from `init-backlog-project`
  — the design's earlier "empty recipe" claim was wrong, since init-project must replace
  init-backlog (ADR-0003); `godot` carries MCP install + project.godot edits and owns its
  Template assets under `profiles/godot/templates/`.

## Storage & bootstrap

```
cpalaka-claude-skills/
├── chunks/            # the Chunk library; ~/.claude/chunks → here
├── init-project/
│   ├── SKILL.md
│   └── profiles/{backlog,web,godot}.md  (+ godot/templates/)
└── bootstrap.{sh,ps1} # clone + symlink/junction for a new machine
```

New machine: clone, then `ln -s "$PWD/cpalaka-claude-skills/chunks" ~/.claude/chunks`
(macOS/Linux) or `mklink /J %USERPROFILE%\.claude\chunks …\chunks` (Windows, no admin
needed). First `@import` per project triggers a one-time approval dialog.

## Extensibility contract

- **Add a project type** → add `profiles/<type>.md`. No engine change.
- **Add a cross-cutting concern** → add `chunks/<name>.md` (invariant); add to
  `dev-base.md` if universal, else reference from the relevant Profiles. No engine change.
- The `init-project` engine and `dev-base` bundle are stable; only data grows.

## Rollout sequence

1. **Spec + ADRs** (this document).
2. **Pilot one chunk** end-to-end — `sandbox-auto`: canonicalize, set up the
   `~/.claude/chunks` symlink, `@import` into a scratch test, confirm a live session loads it.
3. **Build the rest of the chunk library** + `dev-base` bundle (fan-out: author each
   from its audited source items, adversarially verify each preserves its rules).
4. **Build `init-project`** + the `backlog` / `web` / `godot` Profiles.
4.9. **Promote chaipalaka's `CLAUDE.lean.md`** (+ append the staged solo-worktree
   recipe to `docs/process/parallel-work.md`) — clean baseline before the chunk rewrite.
5. **Migrate `chaipalaka.com`** as the first real consumer (rewrite to imports + knobs +
   inline-leaf; full behavior diff + sign-off).
6. **Migrate a godot project** (proves fork + templates + bespoke recipe).
7. **Retire** `init-backlog-project` + `init-godot-claude-project` once both consumers work.

Old skills stay untouched until step 7. The backlog `claude-section.md` Template is
promoted to the `backlog-core` Chunk.

## Open / build-phase items

- Supply-chain pinning (lockfile-freeze, commit-lockfile-not-modules, clone-rehydrate)
  is currently godot-only; its SHAPE folds into `init-scaffold-core`, version payloads
  stay godot-leaf. Promote to a cross-type concern when a second type needs it.
- Exact byte-level content of each Chunk is the build phase's job, with the audit
  (cached) as input. The fork-coupling triplet (merge model + branch prefix + notes-SHA)
  must stay intact per variant file — never split across core and fork.
