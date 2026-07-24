# 76 — Headless `--import` (or editor open) strips an ABSENT enabled plugin from `project.godot`

## Symptom

Running `godot --headless --path . --import` (the standard class-cache/reimport step) — or just
opening the editor — in a checkout or git worktree that is **missing an enabled editor plugin's
addon directory** silently rewrites `project.godot`. It shows up as an unexpected `project.godot`
modification in `git status`/the diff: the plugin's entry vanishes from `[editor_plugins]
enabled=`. The import/editor itself reports success and everything else builds; the change looks
like something you did. Commit it and you ship a build config with that plugin disabled.

## Cause

On import and editor-init Godot tries to load **every** plugin listed in `[editor_plugins]
enabled=`. When an entry points at a `res://addons/<x>/plugin.cfg` whose directory is absent, it
logs:

```
Addon 'res://addons/<x>/plugin.cfg' failed to load. No directory found. Removing from enabled plugins.
```

and **force-writes the pruned enabled list back to `project.godot`**. This is the common case when
an addon is gitignored / vendored per-machine (a fresh clone or worktree has no copy until it is
re-vendored) — the import then "helpfully" removes it. The class cache still builds and the
headless test suite still runs green despite the missing addon (nothing at runtime depends on the
editor plugin), so no other gate flags the mutation. Any autoload the plugin injects also errors
harmlessly at boot (`Failed to instantiate an autoload …`).

## Fix

After any headless import / editor open in a checkout that lacks a vendored addon, check
`git status` and revert before staging:

```sh
git checkout -- project.godot
```

Never let the pruned-plugin diff leak into a commit. If you genuinely need the plugin available on
that machine, re-vendor the addon dir first, then import. (Complement of #66, which is the *other*
direction — the same plugins force-*re-add* their autoloads when the addon IS present.)

## Detect proactively

Any `--headless --import` or editor open in a git worktree / fresh clone where a
`[editor_plugins] enabled=` entry is gitignored or otherwise absent. The tell is a `project.godot`
line-removal in the worktree diff you didn't author, paired with a "Removing from enabled plugins"
log line.

## Confirmed by

space-miner-game (2026-07-24) — headless import in a vendor-less worktree missing the gitignored
`addons/godot_ai` stripped `godot_ai` from `[editor_plugins] enabled=`; suite ran green, the diff
was caught and reverted before commit.
