<!-- chunk:git-flow-noff | kind: fork | single-source: skills/chunks/git-flow-noff.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## git-flow: `--no-ff` merge variant (opt-in)

This is the **opt-in** git-flow fork — a project imports exactly one git-flow variant, this
one *or* `git-flow-squash` (the default), never both. The three rules below ride this fork
**together**; do not mix any one of them with the squash variant's opposite rule. (The
structural-fork reasoning is in ADR-0002.)

**Integration = a `--no-ff` merge commit.** Each backlog task lands on `main` via an
explicit `--no-ff` merge after sign-off sets the task Done — **one real merge commit per
task**, so the task reads as a single unit in history (merge SHA ↔ task ID) and `main` stays
at a known-good state between tasks. Do not squash and do not fast-forward; the merge commit
is the point. (Non-task chores — board/docs housekeeping — may still commit straight to
`main`.)

**Branch name = plain `task-NNN`.** Feature branches are named `task-NNN-<slug>` with **no
typed prefix** — created before the first commit of the task's work. (This is the deliberate
opposite of the squash variant's typed `<type>/task-NNN` form; never emit the typed prefix in
a `--no-ff` project.)

**SHA-in-notes is REQUIRED.** Record the merge commit SHA in the backlog `--notes` at
Done-marking time: `--notes "<summary + merge commit SHA>"`. This is possible *because* the
`--no-ff` merge commit already exists when the task is marked Done — a real merge SHA is in
hand at marking time, so it must be captured. (This is why `backlog-core` stays merge-agnostic
and defers the notes-SHA policy here: see `backlog-core`. The squash variant omits the SHA for
the opposite reason — its commit doesn't exist yet at marking time — so never carry a no-SHA
rule into a `--no-ff` project.)
