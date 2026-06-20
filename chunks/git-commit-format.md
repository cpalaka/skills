<!-- chunk:git-commit-format | kind: invariant | single-source: cpalaka-claude-skills/chunks/git-commit-format.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## Commit format & hygiene

**Subject line — conventional-commit shape.** Write the subject as
`<type>(<scope>): <imperative summary>`. Pick the one `<type>` that matches the
*dominant* change (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`). Keep the
whole subject ≤~72 chars including the scope — tighten the summary rather than
overflow. The `<scope>` is the slice/subsystem the change lives in; on a
task-tracked project it also carries the owning task id (see `backlog-core` for
the `<area>/task-NNN` scope convention and the `Refs task-NNN` footer that links
commit ↔ task).

**Body — what and why.** State what changed and, more importantly, *why*. Call
out notable deviations from the plan/spec (and the reason) so a reviewer is not
surprised. Footers carry traceability links.

**One logical change per commit.** Each commit should be a single coherent unit
of work whenever possible. Multiple commits on a branch are fine — how a branch
is integrated (squash vs. merge commit) is the git-flow fork's concern, not this
chunk's.

**Never amend an already-pushed commit without confirming.** Once a commit is on
`origin/<branch>`, do not `git commit --amend` (or otherwise rewrite that
history) without explicit confirmation — it forces a non-fast-forward push that
can clobber shared history. Rewriting *unpushed* local commits is fine. (The
force-push that a confirmed rewrite then requires is itself gated — see
`git-confirm-destructive`.)

**Never bypass hooks.** Do not pass `--no-verify`, `--no-gpg-sign`, or any
equivalent flag that skips a configured commit/push hook. The hooks are the gate;
suppressing them defeats the verification they exist to enforce. If a hook fails,
fix the cause — never silence the check.
