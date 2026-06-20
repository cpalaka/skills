<!-- chunk:git-flow-squash | kind: fork | single-source: cpalaka-claude-skills/chunks/git-flow-squash.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## git-flow — squash (default variant)

This is the **default** git-flow variant: integration is a local **squash-merge** to
`main` with no PRs. Three rules ride this fork **together** and must stay coupled —
squash-merge, the typed branch prefix, and no-SHA-in-notes. Do not import this alongside
`git-flow-noff`; a project picks exactly one variant. (Start a task on a fresh `main` and
a correctly-named branch per `git-sync-branch-start`; write commit subjects/footers per
`git-commit-format`.)

**(a) Integration = squash-merge — code + Done collapse into ONE commit on `main`.**
After the diff is approved (see below), mark the task Done **on the branch** and commit
that there, then squash-merge so the code change and the Done-stamp become a single commit:

- `git checkout main && git merge --squash <branch>` → **review the staged changes** →
  `git commit` (write the message per `git-commit-format`), or `git reset --merge` to abort.
- Push `main`. The diff approval **is** the authorisation for that one push — see (d).
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
- Never push to `main` without that per-branch approval; never merge a branch that has not
  been reviewed. Force-pushing `main` is never OK (see `git-confirm-destructive`).
- **Delete the feature branch after merge** (locally, and remotely if it was pushed).
