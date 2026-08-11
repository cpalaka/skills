<!-- chunk:git-confirm-destructive | kind: invariant | single-source: skills/chunks/git-confirm-destructive.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## Confirm with a human before any hard-to-reverse or outward-facing git/gh action

These operations are hard to undo or are visible outside the local repo. Each one must
**surface for explicit human approval before it runs** — never autonomously. No loop, wave,
background subagent, or orchestrator may execute any of them on its own; they pause and ask.

**Force-push — always confirm.**

- Force-push to any branch (`git push --force`, `git push --force-with-lease`) — confirm first.
- Force-pushing the default branch is **never** OK, with or without confirmation.

**Deletion that escapes the local repo — confirm.**

- Deleting a tag, or deleting a remote branch (`git push origin --delete …`, `git tag -d` on a
  pushed tag, etc.) — confirm first. (Deleting a *local* feature branch after its approved
  merge is fine and needs no prompt.)

**Every `gh` WRITE command — confirm.**

- Any `gh` command that writes — `gh pr create`, `gh pr merge`, `gh issue` writes, `gh api`
  against a write endpoint — must be human-gated, full stop. The `gh` reads (`gh pr view`,
  `gh issue list`, …) are fine to run without prompting; only the writes gate.
- Anything that costs money or hits a third-party rate limit (e.g. `gh api` write calls)
  belongs in this same confirm-first bucket.

**Allowlist hygiene — keep these gates off the permission allowlist.** The actions above are
exactly what `sandbox-auto`'s allowlist rule protects: a broad glob like `Bash(gh pr *)` or
`Bash(git push *)` on `permissions.allow` would override the classifier and run these silently
in every session and subagent, defeating the gate. Keep `git push`, force-push, and `gh` write
globs OFF the allowlist; allow only specific read-shaped commands. See `sandbox-auto`.
