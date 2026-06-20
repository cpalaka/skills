<!-- chunk:parallel-work | kind: value-variant | single-source: cpalaka-claude-skills/chunks/parallel-work.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## Parallel work — waves & solo worktrees

Two modes of doing more than one task at once. Pick by the decision rule: **one task →
the standing single-task process; you driving 2+ tasks hands-on → solo worktrees;
dependency-free fan-out you are NOT hand-driving → background waves.**

**Knobs** (`<!-- knobs:parallel-work -->` in this project's `CLAUDE.md`): the **worktree
path prefix** (where `git worktree add` puts each tree) and the **install command** (what
to run in a fresh worktree to make it buildable). This chunk names them; it never bakes a
literal path or command.

**Mode A — Waves (dependency-free fan-out via background subagents).** For multiple tasks
with no shared state and no ordering between them:

- **Main session only** syncs `main` and marks each task In Progress before fanning out —
  board writes never happen inside a subagent (ID generation collides under concurrency).
- Per task, from the repo root, create the worktree under the **worktree path prefix** knob
  (`git worktree add <prefix>-<slug> -b <branch> main`) and run the **install command** in
  it. No settings copy needed here: a subagent **inherits the parent session's permission
  mode and sandbox** (see `sandbox-auto`).
- Spawn one background subagent per task, all in a **single message** so they run
  concurrently. Each subagent's prompt must, verbatim: confine it to its own worktree; have
  it read the task and the relevant design docs first; run the full project verify gate (see
  `verify-gate`) and paste the output into its report; commit on the branch; end with a
  review handoff. **Hard limits, in every prompt:** no merge, no push, no marking Done, no
  deploys, no board writes, no `gh` writes.
- Steer a drifting subagent with a message rather than respawning it (a respawn loses its
  context).
- **The orchestrator re-verifies every handoff itself.** On each subagent handoff, the main
  session independently re-runs the verify gate in that worktree before relaying anything to
  the user — never pass on a subagent's claims unverified. Writer/subagent agents
  systematically **over-report their own output**; treat any self-reported metric (lines
  changed, "26% smaller", "tests pass") as a claim, not a measurement, and diff the real
  output against source yourself before believing it.

**Mode B — Solo worktrees (you hands-on, 2+ tasks concurrently).** Each interactive worktree
session is the **main session for its own task** — so per-session status edits are fine;
only `task create` stays main-repo-only (the max+1 ID scan collides under concurrency, see
`backlog-core`).

- Set up with `git worktree add <prefix>-<slug> -b <branch> origin/main`. Branching off
  fresh `origin/main` already satisfies the standing sync-`main`-first step, so don't re-run
  the checkout-and-pull inside the worktree.
- **Footgun — a fresh interactive worktree does NOT inherit sandbox+auto.** Unlike a subagent
  (Mode A, which inherits the parent), a fresh interactive worktree session starts WITHOUT
  the sandbox+auto defaults: `.claude/settings.local.json` is gitignored, so it does not
  travel with the new worktree. **Copy it into the worktree's `.claude/` first**
  (`cp .claude/settings.local.json <prefix>-<slug>/.claude/`) or the session silently runs
  without the defaults (see `sandbox-auto`).

**Visual / feel-AC work runs solo, never as a background wave.** Any task whose acceptance
criteria are visual or "feels right" (screenshots, motion, layout judgment) needs a human
watching mid-flight — run it solo in-session, not as a background subagent.

**Delegate the merge and Done step to the git-flow fork — never inline it here.** However a
branch was produced (wave or solo), how it lands — merge style, branch naming, and whether a
commit SHA goes in the backlog notes — is owned entirely by this project's git-flow fork
(`git-flow-squash` by default, or `git-flow-noff`). Do not restate squash-vs-no-ff or
notes-SHA policy in this chunk; follow whichever fork the project imports.
