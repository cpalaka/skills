# Build plan: Chunk library + `init-project`

**Tracked by:** `docs/superpowers/specs/2026-06-19-chunk-library-design.md` (design of record)
**ADRs:** `docs/adr/0001` (@import delivery), `0002` (git-flow fork), `0003` (single engine)
**Date:** 2026-06-19 · **Status:** ready to build (steps 1–4)
**Source of truth for per-chunk content:** the 2026-06-19 audit (206 rules → chunks). The
audit's full chunk→source-item mapping was cached in a workflow run; this plan distills
the load-bearing per-chunk guidance so the build does not depend on that cache.

This repo (`cpalaka-claude-skills`) has **no `CLAUDE.md`** — this plan + the spec govern the
build. Global `~/.claude/CLAUDE.md` still applies.

## ⚠️ Cross-repo permission gates (READ FIRST)

The build authors files **in this repo only** for steps 1–4. Some later steps touch OTHER
repos and are **gated on explicit user authorization** — do NOT autonomously switch repos:

| Step | Repo touched | Gate |
|---|---|---|
| 1–4 (chunks, `dev-base`, engine, profiles) | `cpalaka-claude-skills` only | proceed |
| 4.9 promote chaipalaka lean | `chaipalaka.com` | **DONE 2026-06-19** (commit `6d18468`) |
| 5 migrate chaipalaka to chunks | `chaipalaka.com` | **DONE 2026-06-19** (merged `ba5b72a`; followed `chaipalaka.com/CLAUDE.md` in full — branch → 38-agent behavior diff → verify → sign-off → squash-merge). 5 chunk fixes + 3 web-profile fixes applied in this repo to keep the migration zero-behavior-change. |
| 6 migrate a godot project | that godot repo | **explicit user go required**, AND follow that repo's own CLAUDE.md/process. |
| 7 retire old init skills | `cpalaka-claude-skills` | only after steps 5–6 prove the replacement |

Rule of thumb: a skills-repo build session **never edits another repo without the user
explicitly saying so in that moment**, and when it does, it obeys that repo's CLAUDE.md.

## Chunk build inventory

Author each as `chunks/<id>.md`. `db` = pulled by `dev-base.md`. Variant: I=pure-invariant,
V=value-variant, F=structural-fork. Keep the fork triplet (merge model + branch prefix +
notes-SHA) intact per variant file — never split across core and fork.

| # | chunk | db | var | what it holds (invariant core) | knobs / fork |
|---|---|---|---|---|---|
| 1 | `git-sync-branch-start` | ✅ | I | sync main first (`git checkout main && git pull origin main`), branch off fresh main at task start | — (default branch = main) |
| 2 | `git-commit-format` | ✅ | I | conventional-commit subject/footer, one-logical-change, never-amend-pushed, never-bypass-hooks | task-NNN scope bits cross-ref `backlog-core` |
| 3 | `git-confirm-destructive` | ✅ | I | force-push / tag+remote deletion / gh-write gating; strip chaipalaka "PRs retired" rationale (keep the rule) | — |
| 4 | `git-flow-squash` | ❌ | F | **DEFAULT**: squash-merge (code+Done→1 commit), `<type>/task-NNN` branch, **NO-SHA in backlog `--notes`**, no-PR local review, push-auth-on-approval | the squash triplet |
| 5 | `git-flow-noff` | ❌ | F | opt-in: `--no-ff` merge commit, plain `task-NNN` branch, **SHA-in-notes required** | the noff triplet |
| 6 | `sandbox-auto` | ✅ | I | sandbox+auto baseline, `settings.local.json` shape, session-init-not-toggleable, allowlist-hygiene (no broad destructive glob), **+ settings.local.json union-by-exact-string-dedup merge contract** (folded in) | per-project allow-globs are leaf |
| 7 | `parallel-work` | ✅ | V | waves (bg subagents in worktrees, orchestrator re-verifies) + solo-worktree, BOTH settings-inheritance branches, visual/feel-AC runs solo. **Delegates merge/Done step to the project's git-flow fork — never inlines squash/no-SHA.** | worktree path prefix, install cmd |
| 8 | `verify-gate` | ✅ | V | **NEW** — run the project verify gate before commit/handoff: typecheck→test→build→smoke→secret-scan, clean-output, docs-synced | exact commands / paths / grep / env |
| 9 | `superpowers-default` | ✅ | V | skill 1%-rule, diagnosing-bugs, tdd-before-impl, plan-approval gate, spec-hygiene `[reuse]`/`[extend]`/`[new]`, agent-browser-yourself-in-main-session, ask-before-brainstorming, grill-with-docs trigger | test-roster pointer, spec-verify src path. NOT React skills (leaf) |
| 10 | `codegraph` | ✅ | I | opt-in, self-gates on `.codegraph/`, prefer-before-grep, impact/affected over-report, per-machine init | — |
| 11 | `code-hygiene` | ✅ | I | no hardcoded secrets, no console.log in prod, no undeclared top-level deps, ask-when-unsure / small reversible steps | — |
| 12 | `backlog-core` | ❌ | V | board-as-source, CLI/`--plain`/no-MCP, AC vs DoD, **sign-off gate**, drafts/labels/milestones, Done-on-branch, **propagate-downstream-findings**, main-session-only `task create`. **MERGE-AGNOSTIC** — defers notes-SHA to the imported git-flow fork | VERSION, PLANS_DIR, VERIFY_EXAMPLES, DoD items |
| — | `dev-base.md` | — | — | bundle: recursively `@import`s 1,2,3,6,7,8,9,10,11 (NOT the git-flow fork, NOT backlog-core) | — |
| — | `init-scaffold-core` | — | — | NOT a chunk — lives in the `init-project` SKILL.md (inventory→merge/skip, append-not-overwrite, dedup, verify-after-write, lockfile-freeze) | — |

**Propagation gaps to fix while authoring** (chaipalaka has these, the old init-backlog template
lacked them — build the chunk from chaipalaka's evolved version): `propagate-downstream-findings`
(→ `backlog-core`), `sync-main-first` (→ `git-sync-branch-start`), the verify-gate principle
(→ `verify-gate`).

## Rollout status

- [x] 1. Spec + ADRs (this session)
- [x] 4.9. Promote chaipalaka lean (`6d18468`)
- [x] 2. Pilot `sandbox-auto` end-to-end — DONE 2026-06-19. Live-verified; surfaced the headless `@import` boundary: external imports load **interactively** (one-time per-project approval) but are refused in headless `claude -p` regardless of the approval flag — the lever is `--add-dir ~/.claude/chunks`. Recursive `dev-base` import proven (depth-2).
- [x] 3. Build the rest of the library + `dev-base.md` — DONE 2026-06-19. 11 chunks authored from verified source + adversarially verified (10 clean, 2 single-line leaf fixes); fork-coherence (ADR-0002 triplet split, no cross-ship, backlog-core merge-agnostic) PASS.
- [x] 4. Build `init-project` SKILL.md + `profiles/{backlog,web,godot}.md` (+ godot template assets) — DONE 2026-06-19. Engine carries init-scaffold-core (inventory→merge/skip, 3 CLAUDE.md zones, settings merge via a manifest `settings:` field, lockfile-freeze mechanic, verify, handoff) + the `@import` approval / `--add-dir` handling. backlog has the real ported recipe; web minimal (board-by-reference); godot heavy. Deferred to step 6: content-staleness audit of godot-mcp-guide / blender-mcp-guide (blender stamped conditionally).
- [x] 5. Migrate `chaipalaka.com` to chunks — **DONE 2026-06-19** (`ba5b72a`). 38-agent adversarial behavior diff (19 findings, all resolved); 5 dropped/weakened rules fixed in-chunk (backlog-core ×4, git-commit-format, git-flow-squash) + 3 web-profile gaps fixed (parallel-work knobs, large-files inline-leaf, DoD-derive note). chaipalaka CLAUDE.md 438→118 lines, zero behavior change.
- [ ] 6. Migrate a godot project — **gated**
- [ ] 7. Retire `init-backlog-project` + `init-godot-claude-project`

Old skills stay untouched until step 7. The backlog `claude-section.md` Template is promoted
to the `backlog-core` Chunk.

## Bootstrap (set up once, needed for the pilot)

`ln -s "$PWD/chunks" ~/.claude/chunks` (macOS/Linux) or `mklink /J %USERPROFILE%\.claude\chunks
…\chunks` (Windows). First `@import` per project triggers a one-time approval dialog. Add a
`bootstrap.{sh,ps1}` to the repo during step 4.
