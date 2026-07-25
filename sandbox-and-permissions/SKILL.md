---
name: sandbox-and-permissions
description: Claude Code sandbox denials and permission-allowlist safety. Use when a Bash or git command fails "Operation not permitted", when a branch switch half-completes and the next merge aborts, and BEFORE adding any entry to `permissions.allow` or writing a `.claude/settings.local.json` — the allowlist overrides the classifier, so a broad glob silently disables a gate in every session and subagent.
---

# Sandbox denials & permission-allowlist safety

Split out of the `sandbox-auto` chunk 2026-07-25. The chunk carries the session-init
baseline (sandbox on, `auto` mode, where the file lives); this skill carries what you need
only when a denial actually fires or you are about to edit permissions.

## A git op half-switched the tree

The sandbox's `denyWithinAllow` blocks writes to `.claude/` (and `.git/config` /
`.git/hooks`) but **not** `.git/objects` / `.git/refs`. So `git commit` succeeds under the
sandbox, while a `checkout` / `switch` / `merge` / `rebase` / `stash pop` that must modify a
**tracked** file under `.claude/` fails `Operation not permitted` and **half-switches**:

- HEAD moves to the target
- other files revert to the target branch
- the denied file is left dirty — so the next `merge` aborts

**Recover:** `git checkout -- <denied-file>` with the sandbox off, then redo the operation
with the sandbox off. Read-only git (`status` / `log` / `diff`) is always safe — assess
first, don't guess at the state. Rationale: `~/Claude/improvements.md` (2026-07-03).

## Allowlist hygiene — keep destructive globs OUT

`permissions.allow` **overrides the classifier**. Anything it matches runs silently with no
gate, in every session and every subagent. That is the whole risk model:

- **Keep `git push` off the allowlist.** Pushes must surface to the classifier or a prompt,
  so no autonomous loop or subagent can ever push without scrutiny.
- **Keep `gh` write globs off.** `Bash(gh pr *)` or `Bash(gh issue *)` pre-authorizes
  `gh pr create`/`merge` and `gh issue create`/`edit` — a `*` glob cannot tell a read from a
  write. Allowlist only the specific read subcommands (`gh pr view`, `gh issue list`, …) and
  let every write fall through.
- **General rule:** never allowlist a broad or destructive glob. Specific, safe, read-shaped
  commands only. The destructive ops themselves (force-push, tag/remote deletion, `gh`
  writes) are gated by the `git-confirm-destructive` chunk.

**Audit an existing allowlist against this** before adding to it — an entry that predates the
rule is exactly as dangerous as one you'd add today.

## `settings.local.json` merge contract — union, never clobber

Any time you add to `.claude/settings.local.json`, at init or later:

- **Union `permissions.allow` with strict exact-string dedup.** Do NOT semantically merge
  overlapping `Bash(...)` patterns: `"Bash(lsof -nP -iTCP -sTCP:LISTEN)"` and
  `"Bash(lsof -nP -iTCP:6550*)"` are different commands — keep both. Collapsing them changes
  the permission surface.
- **Preserve every other top-level key** (`model`, `theme`, `hooks`, `enabledMcpjsonServers`,
  and the `sandbox` / `defaultMode` baseline) untouched.
- **Never overwrite the file wholesale.** Read → union → write back.

The same contract applies to the global `~/.claude/settings.json`.
