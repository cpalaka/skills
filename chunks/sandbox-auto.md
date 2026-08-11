<!-- chunk:sandbox-auto | kind: invariant | single-source: skills/chunks/sandbox-auto.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->
<!-- Trimmed 2026-07-25: the allowlist-hygiene rules, the settings.local.json merge contract, and
     the half-switched-tree recovery moved to the `sandbox-and-permissions` skill. They fire only
     when you are editing permissions or recovering from a denial — this chunk is read every
     session, so only the session-init baseline belongs here. -->

## Sandbox + auto permission mode (session baseline)

Run Claude Code in this repo with **sandbox on** and **`auto` permission mode on by
default** — Claude edits and runs without per-call prompts, gated by the auto-mode
classifier, inside a sandbox that prevents real damage. Treat it as the default
expectation unless the user asks for a session without it (e.g. a risky deploy that
should re-prompt).

**Where it lives + minimum shape.** Both in `.claude/settings.local.json` (gitignored —
personal, not committed):

```jsonc
{
  "permissions": { "defaultMode": "auto" /*, "allow": [...] */ },
  "sandbox": { "enabled": true }
}
```

**Session-init, not toggleable.** Neither can be changed mid-session by a tool call —
both are read once at session start. Confirm the indicators at session start; if the file
lacks them, update it and **restart** before proceeding. A fresh session needs this
configured explicitly: the file is gitignored, so it does not travel with a clone or a
new worktree. (How defaults reach subagents vs. fresh worktree sessions: `parallel-work`.)

**Two writes the sandbox denies.** Reads are unrestricted; writes are not. (a) Bash writes
to any path **outside this repo** — use the Write/Edit tools instead, or run the command
with the sandbox disabled. (b) A `git checkout`/`switch`/`merge`/`rebase`/`stash pop` that
must modify a **tracked file under `.claude/`** — run those with the sandbox off. Both fail
`Operation not permitted`; don't burn a retry. Recovery from a half-switched tree and the
rules for editing `permissions.allow` safely live in the **`sandbox-and-permissions`**
skill — read it before editing an allowlist or a `settings.local.json`.

Per-project allow entries are project-specific (inline-leaf), not part of this chunk.
