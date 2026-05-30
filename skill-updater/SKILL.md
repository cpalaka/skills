---
name: skill-updater
description: Check installed Claude skills for upstream updates and install them. Auto-applies updates from trusted sources (Anthropic, Vercel, official marketplace) and confirms community sources first. Covers both ecosystems — Claude Code plugins (claude plugin CLI) and npx-skills agent-skills (~/.agents). Use when the user says "check my skills for updates", "update my skills", "any skill updates?", or invokes /skill-updater. Does NOT touch hand-authored personal skills.
---

# Skill Updater

Detects and installs updates for every installed skill across both ecosystems. The
deterministic work is done by the bundled `scripts/skillsync.py`; you orchestrate.

**Engine path:** `~/.claude/skills/skill-updater/scripts/skillsync.py`
(`python3` must be on PATH; `git`, `claude`, and `npx` are used by the engine.)

## Steps

### 1. Announce and detect

Tell the user you're checking both ecosystems and that this fetches from GitHub
(marketplace metadata + a shallow clone per agent-skill repo). Then run:

```bash
python3 ~/.claude/skills/skill-updater/scripts/skillsync.py detect --refresh
```

Parse the JSON. It has three keys: `plugins`, `skills`, `errors`. Each plugin/skill
entry has `trusted` (bool), `updateAvailable` (bool), an identifier (`id` for plugins,
`name` for skills), `availableLabel`/`diffstat`, and an optional `note`.

If every entry has `updateAvailable: false` and `errors` is empty, report
"✓ All skills are up to date" and stop.

Always surface anything in `errors` (e.g. a repo that failed to clone) — report it but
keep going with what succeeded.

### 2. Auto-apply trusted updates

Collect the trusted entries with `updateAvailable: true`:

- **Plugins** (`trusted: true`): for each, run
  `python3 ~/.claude/skills/skill-updater/scripts/skillsync.py apply-plugin <id>`.
- **Skills** (`trusted: true`): collect their `name`s and run ONE batched call:
  `python3 ~/.claude/skills/skill-updater/scripts/skillsync.py apply-skills <name1> <name2> ...`.

Record each result (success/failure from exit code and output).

### 3. Confirm community updates

For the entries with `updateAvailable: true` and `trusted: false`, present them to the
user with their source and `diffstat`/`availableLabel`. Use the `AskUserQuestion` tool
with `multiSelect: true` so the user can pick which to apply. Include the option to see a
full diff first — if asked, run for that skill:

```bash
python3 ~/.claude/skills/skill-updater/scripts/skillsync.py diff-skill <name>
```

(Plugin community updates — e.g. `karpathy-skills`, `obsidian-skills` — have no per-file
diff; present them by version/`availableLabel` and confirm the same way.)

Apply only the chosen ones using the same `apply-plugin` / `apply-skills` commands as
Step 2.

### 4. Report

Summarize grouped by ecosystem: what was applied, skipped (declined), and failed. Then
end with this note verbatim:

> **Restart Claude Code (or start a new session) to load the updated skills.** Plugin
> updates explicitly require a restart; agent-skills are loaded at session start.

## Notes

- **Never touches personal skills.** Hand-authored skills (real directories in
  `~/.claude/skills/` that are not symlinks, and not in `~/.agents/.skill-lock.json`) are
  invisible to the engine by construction.
- **Trusted vs. community** is defined in `~/.claude/skills/skill-updater/trusted-sources.json`.
  To promote a source to auto-apply, add its marketplace name to `marketplaces` or its
  `owner/*` glob to `repos`.
- **Offline / failures** are isolated per source and reported; the other ecosystem still runs.
- Set `GITHUB_TOKEN` in the environment to avoid GitHub rate limits on the clones.
