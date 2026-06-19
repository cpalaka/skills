# git-flow is a structural fork (`squash` default), with three coupled rules per variant

**Status:** accepted

chaipalaka.com evolved to **squash-merge** (code + Done collapse into one commit on
main) while the backlog init template used **`--no-ff`** merge commits — mutually
exclusive integration models, not value tweaks. So git-flow ships as two variant
Chunks a project imports exactly one of: **`git-flow-squash`** (the new default) and
**`git-flow-noff`** (opt-in). Three rules ride the fork *together* and must never
cross-ship: merge model, branch-name prefix (`<type>/task-NNN` vs plain `task-NNN`),
and the backlog `--notes` SHA policy.

**Consequences (the non-obvious coupling):** **no-SHA-in-notes is a consequence of
squash** — the squash commit does not exist when the task is marked Done on the
branch, so its SHA can't be recorded; `--no-ff` produces a real merge SHA at marking
time, so it *requires* the hash. Therefore the SHA rule lives in the git-flow variant
files, **not** in `backlog-core` (which stays merge-agnostic and defers to "your
git-flow variant"). Emitting the chaipalaka no-SHA rule into a `--no-ff` project — or
vice versa — would be a bug.
