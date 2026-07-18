<!-- chunk:sandbox-auto | kind: invariant | single-source: cpalaka-claude-skills/chunks/sandbox-auto.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## Sandbox + auto permission mode (session baseline)

Run Claude Code in this repo with **sandbox on** and **`auto` permission mode on by
default**. The combination — Claude edits and runs without per-call prompts, gated by
the auto-mode classifier, inside a sandbox that prevents real damage — is the standing
baseline for any session here. Treat it as the default expectation unless the user
explicitly asks for a session *without* it (e.g. a risky deploy that should re-prompt).

**Where it lives + minimum shape.** Both are configured in `.claude/settings.local.json`
(gitignored — personal, not committed), which should contain at least:

```jsonc
{
  "permissions": { "defaultMode": "auto" /*, "allow": [...] */ },
  "sandbox": { "enabled": true }
}
```

**Session-init, not toggleable.** Neither sandbox nor permission mode can be changed
mid-session via a tool call — both are read once at session start. So at session start,
confirm the auto-mode and sandbox indicators are present; if the file lacks them, update
it and **restart** before proceeding. A fresh session needs this configured explicitly:
`settings.local.json` is gitignored, so it does not travel with a clone or a new
worktree. (How the defaults reach subagents vs. fresh worktree sessions: see
`parallel-work`.)

**Git ops that write `.claude/` need the sandbox off.** The sandbox's `denyWithinAllow`
blocks writes to `.claude/` (and `.git/config`/`.git/hooks`) but NOT `.git/objects`/
`.git/refs` — so `git commit` succeeds under the sandbox, yet a `git checkout`/`switch`/
`merge`/`rebase`/`stash pop` that must modify a **tracked** file under `.claude/` fails
`Operation not permitted` and **half-switches**: HEAD moves, other files revert to the
target branch, but the denied file is left dirty, so the next `merge` aborts. Run such
branch ops with the sandbox disabled; read-only git (`status`/`log`/`diff`) is always
safe — assess first. Recover a half-switched tree with `git checkout -- <denied-file>`
(sandbox off) then redo. Rationale: `~/Claude/improvements.md` (2026-07-03).

**Bash writes OUTSIDE the repo need the sandbox off.** The write-allowlist covers only this
repo + temp dirs, so a Bash command writing to any outside path — `cp` into a sibling repo,
`git add`/`commit` in another checkout — fails `Operation not permitted` on the first try
(reads are unrestricted). Don't burn the failed attempt: use the Write/Edit tools (not
bash-sandboxed) for outside-file edits, and run outside-repo `cp`/git writes with the sandbox
disabled directly.

**Allowlist hygiene — keep destructive globs OUT.** `permissions.allow` *overrides* the
classifier, so anything it matches runs silently with no gate. Therefore:

- Keep `git push` OFF the allowlist. Pushes must surface to the classifier or a prompt,
  never run silently — so no autonomous loop or subagent can ever push without scrutiny.
- Keep `gh` **write** globs off the allowlist. A broad pattern like `Bash(gh pr *)` or
  `Bash(gh issue *)` pre-authorizes the destructive writes (`gh pr create`/`merge`,
  `gh issue create`/`edit`) that a human must gate: the `*` glob can't tell a read from a
  write, and since the allowlist overrides the classifier, such an entry silently defeats
  the gate in every session and subagent. Allowlist only the specific read subcommands you
  need (`gh pr view`, `gh issue list`, …); let every `gh` write fall through to the
  classifier.
- General rule: never put a broad or destructive glob on the allowlist — allow only
  specific, safe, read-shaped commands. (The destructive operations themselves — force-push,
  tag/remote deletion, `gh` writes — are gated by `git-confirm-destructive`.)

Per-project allow entries are project-specific (inline-leaf), not part of this chunk.

**`settings.local.json` merge contract — union, never clobber.** Any time you add to
`.claude/settings.local.json` (at init or later), merge rather than overwrite:

- Union the `permissions.allow` arrays using **strict exact-string dedup**. Do NOT try to
  semantically merge overlapping `Bash(...)` patterns: if one entry is
  `"Bash(lsof -nP -iTCP -sTCP:LISTEN)"` and another is `"Bash(lsof -nP -iTCP:6550*)"`, keep
  **both** — they are different commands, and collapsing them changes the permission surface.
- Preserve every other top-level key (`model`, `theme`, `hooks`, `enabledMcpjsonServers`,
  and the `sandbox` / `defaultMode` baseline itself) untouched.
- Never overwrite an existing `settings.local.json` wholesale: read → union → write back.
