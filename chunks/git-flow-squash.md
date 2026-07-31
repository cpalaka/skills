<!-- chunk:git-flow-squash | kind: fork | single-source: cpalaka-claude-skills/chunks/git-flow-squash.md -->
<!-- Delivered by Claude @import or a Codex AGENTS.md explicit read through the host's chunk symlink.
     Edit here only — no per-project copies, no parity. -->

## git-flow — squash (default variant)

This is the **default** git-flow variant: integration is a local **squash-merge** to
`main` with no PRs. Three rules ride this fork **together** and must stay coupled —
squash-merge, the typed branch prefix, and no-SHA-in-notes. Do not import this alongside
`git-flow-noff`; a project picks exactly one variant. (Start a task on a fresh `main` and
a correctly-named branch per `git-sync-branch-start`; write commit subjects/footers per
`git-commit-format`.)

**Board-less projects** (no `backlog-core` imported — e.g. a prototype with no `backlog/`):
there are no task ids, so use `<type>/<slug>` branches (e.g. `feat/vacuum-suction`) and omit
every `task-NNN` reference below — the branch-name id, the `Refs task-NNN` footer, the
`<area>/task-NNN` commit scope, and (c)'s notes policy (no board notes exist to write). The
integration mechanics — squash-merge to `main`, local diff review, no PRs, push only on
approval — apply unchanged. The rest of this chunk assumes a board.

**(a) Integration = squash-merge — code + Done collapse into ONE commit on `main`.**
After the diff is approved (see below), mark the task Done **on the branch** and commit
that there, then squash-merge so the code change and the Done-stamp become a single commit:

- `git checkout main && git merge --squash <branch>` → **review the staged changes** →
  `git commit` (write the message per `git-commit-format`), or `git reset --merge` to abort.
- Push `main`. The diff approval **is** the authorisation for that one push — see (d).
- **Merging from a worktree? Release `main` right after the push.** If the main checkout is held
  by a parallel session on another branch, you `git checkout main` *inside your own worktree* to
  run the merge — but Git allows a branch in only ONE worktree at a time, so while your worktree
  sits on `main` no other checkout can check it out, **silently blocking** the parallel session
  the moment it tries to merge its own branch. Immediately after the push, `git checkout --detach`
  in the worktree (or remove it) to free `main`. The block is invisible until the other session
  merges, so releasing `main` is part of the ritual, not an afterthought.
- **`main` already checked out somewhere else? Merge WITHOUT taking it.** Git refuses
  `git checkout main` outright while another worktree holds that branch, and grabbing it would
  inflict the very block described above on that session. When your branch is already a linear
  descendant of `origin/main` (rebase first if not), the squash result is by definition your
  branch's tree with `origin/main` as its single parent — so build it directly and push the SHA:

  ```sh
  SQ=$(git commit-tree "$(git rev-parse HEAD^{tree})" -p origin/main -F msg.txt)
  git push origin ${SQ}:main            # fast-forward; never touches the local `main` ref
  ```

  Verify before pushing, and derive each verdict rather than assuming it: the parent must equal
  `origin/main`, and `git diff $SQ HEAD` must be **empty** (the commit's tree is the reviewed
  branch's tree, so the approval still covers exactly what ships). Pushing the SHA rather than the
  branch also means a sibling's unpushed commit sitting on your local `main` cannot ride along.
  The other checkout simply fast-forwards on its next pull.
- This squash-merge pause doubles as the review surface; a compare-references diff view is
  the alternative. There is no merge commit to inspect after the fact, so review happens here.

**(b) Branch name = typed prefix `<type>/task-NNN`.** The feature branch carries a
conventional-commit `<type>/` prefix (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`)
followed by the backlog task id zero-padded to 3 digits — e.g. `feat/task-003`, optionally
with a short kebab description. Never a plain `task-NNN` (that is the `git-flow-noff`
shape — keep the variants from cross-shipping).

**(c) NO commit SHA in the backlog `--notes`.** When the task is marked Done it is marked
**on the branch, before the squash-merge** — so the squash commit **does not exist yet** and
its SHA cannot be recorded. Therefore `--notes` carries the summary only, never a hash. The
task↔commit link is the subject scope + `Refs task-NNN` footer (`git log --grep`), not a
recorded SHA. `backlog-core` is merge-agnostic and **defers the notes-SHA policy to this
file** — under this variant the policy is: omit it.

**(d) No PRs — review locally; push to `main` only on per-branch diff approval.**

- Integration is a **local squash-merge**, not a PR. Never open a PR for new work; the
  per-PR `gh` writes are gated by `git-confirm-destructive`.
- When a branch is ready, report it in chat: what's on it, what's verified, and anything
  the reviewer should look at closely (the content that used to live in a PR body).
- The reviewer approves the **diff** before any merge. That approval authorises **exactly
  one** squash-merge to `main` and the accompanying push of `main` — nothing more.
- **Check what else is riding before that push: `git log origin/main..main` must contain
  only your squash commit.** In a multi-session repo the local integration branch can
  already carry another session's unpushed work, and your push publishes it — under your
  approval, inside your commit's blast radius, with the approver having no way to know. If
  the list is not just yours, STOP and ask; never reset or rebase another session's commit
  out of the way. This is what makes "nothing more" above enforceable rather than
  aspirational. (Commit-time sibling, different failure: `git-commit-format`'s
  re-verify-the-branch rule.)
- Never push to `main` without that per-branch approval; never merge a branch that has not
  been reviewed. Force-pushing `main` is never OK (see `git-confirm-destructive`).
- **Pushing the feature branch to origin is optional** (backup / multi-machine) — it is **not**
  part of the review flow: review happens on the local diff, and the only required push is
  `main` after approval.
- **Delete the feature branch after merge** (locally, and remotely if it was pushed).
- **Verify the branch landed by diffing it against the SQUASH COMMIT, not against current
  `main`.** `git branch -d` refuses a squash-merged branch by design (there is no merge record),
  so the delete is a `-D` and the safety check is yours to run. Run the right one:

  ```sh
  git diff --quiet <squash-sha> <branch> && git branch -D <branch>   # RIGHT
  git diff --quiet main <branch>                                     # WRONG once main moved
  ```

  `git diff main <branch>` answers *"what would change if `main` became `<branch>`"* — so every
  commit `main` gained **after** the merge (your own follow-up grooming, a sibling's push) reads
  as branch-content-missing-from-main. The guard then fires a **false alarm on a correct merge**,
  and the obvious next move is to re-merge or re-push something that already landed. Diff against
  the squash SHA instead: it is by definition the reviewed tree.
