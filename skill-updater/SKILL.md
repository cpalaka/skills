---
name: skill-updater
description: Check installed Claude skills for upstream updates and install them, across both ecosystems (Claude Code plugins and npx-skills agent-skills). Use when the user asks to check or update their skills, or invokes /skill-updater. Does NOT touch hand-authored personal skills.
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

Parse the JSON. It has four keys: `plugins`, `skills`, `newSkills`, `errors`. Each
plugin/skill entry has `trusted` (bool), `updateAvailable` (bool), an identifier (`id`
for plugins, `name` for skills), `availableLabel`/`diffstat`, and an optional `note`.

Two special `note` values on `skills` entries:
- **moved upstream** — the skill's folder moved in the source repo (e.g. out of
  `in-progress/`). `updateAvailable`/`diffstat` are computed against the NEW path, but
  `apply-skills` may not follow the move; the note carries the reinstall command
  (`npx skills@latest add <repo> -g -y --skill <name>`) that also fixes the lock path.
- **removed upstream** — the folder is gone from the source repo (often a rename;
  check `newSkills` for a likely successor). Nothing is auto-applied; ask the user
  whether to keep the frozen local copy or remove it
  (`npx skills@latest remove <name> -g -y`).

`newSkills` lists upstream skills with no local install, each with an `installCmd`.
Only repos the user tracks wholesale (>= half the repo's skills installed) are scanned,
so cherry-picked catalog repos don't flood this list. Before offering an install, check
the name doesn't collide with an already-installed skill from a DIFFERENT source repo
(`~/.agents/.skill-lock.json`) — flag collisions instead of installing over them.

If every entry has `updateAvailable: false`, `newSkills` is empty, and `errors` is
empty, report "✓ All skills are up to date" and stop.

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

In the same confirmation, present the `newSkills` entries (with source and path) and any
moved/removed-upstream skills, and apply the user's picks with each entry's
`installCmd` / the note's reinstall or remove command. New installs and moves/removals
are ALWAYS confirmed, even from trusted sources — trusted auto-apply covers only
in-place updates to skills the user already chose to install.

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
- Set `GITHUB_TOKEN` in the environment to avoid GitHub rate limits on the clones.
