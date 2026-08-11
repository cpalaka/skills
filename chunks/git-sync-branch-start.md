<!-- chunk:git-sync-branch-start | kind: invariant | single-source: skills/chunks/git-sync-branch-start.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## Sync main, then branch off it (task start)

At the start of any task, get onto a **fresh `main`** before you branch — never branch
off a stale base. The default branch is `main`.

**Sync `main` first — before reading the task or anything else.** The first technical
action of a task is:

```sh
git checkout main && git pull origin main
```

Do this **even if you think you're already on `main` and up to date.** Sibling work may
have merged since the previous session, and branching from a stale base silently builds
on outdated code and forces avoidable rebases later. The pull costs nothing when main is
already current; skipping it is the only way to lose. Do not skip because the previous
session "ended cleanly."

**If the current branch has uncommitted work, commit (or stash) it FIRST.** Before
`git checkout main`, deal with anything in the working tree on the branch you're leaving:

```sh
git status -sb          # is the working tree dirty?
git add -A && git commit -m "…"   # …on the current branch (or: git stash)
```

Uncommitted, non-conflicting changes **follow a branch switch** — so checking out `main`
with a dirty tree silently carries that work onto `main`. The damage compounds: the
source branch then has *no* commit to merge, a squash-merge of it is a no-op, and a later
push can publish a different, already-committed change instead of yours. Committing (or
stashing) on the branch before you leave it is what keeps the work attached to the right
branch and the eventual merge non-empty.

**Then branch off the freshly-pulled `main`.** Create the feature branch only once
`git checkout main && git pull origin main` has completed, so the new branch's base is
current. (Branch *naming* is the integration model's concern — see `git-flow-squash`
[default] or `git-flow-noff`. Wiring the branch to a task id and the board is
`backlog-core`'s.)
