# 106 — Re-vendoring an addon leaves the global class cache stale: the plugin's own script fails to parse and its AUTOLOAD fails to instantiate

## Symptom

You replace a vendored addon directory with a newer release — the installer prints
`Updated addon from 3.6.1 to 4.1.0`, every file is on disk, `plugin.cfg` reads the new version.
Then the very next headless run erupts:

```
SCRIPT ERROR: Parse Error: Identifier "MCPJoyNames" not declared in the current scope.
SCRIPT ERROR: Parse Error: Identifier "MCPKeyNames" not declared in the current scope.
SCRIPT ERROR: Parse Error: Identifier "MCPExecGuard" not declared in the current scope.
ERROR: Failed to load script "res://addons/<addon>/.../bridge.gd" with error "Parse error".
ERROR: Failed to instantiate an autoload, script '...bridge.gd' does not inherit from 'Node'.
```

The identifiers are real, the files defining them are right there in the tree, and nothing is
misspelled. The last line is the expensive one: **the addon's autoload is now dead**, so anything
depending on it silently stops working while the install reported success.

The knock-on that makes it look like a different bug: `Cannot infer the type of "x" variable
because the value doesn't have a set type` from the same files. Those are downstream of the
unresolved `class_name`, not separate defects — chasing them individually is wasted effort.

## Cause

`class_name` registrations live in the editor's **global class cache** under `.godot/`, not in the
scripts. The cache is populated by a filesystem scan. Dropping new files into `addons/` does not
scan them, so any `class_name` the new release introduced is unknown to the parser — and a script
referencing an unknown identifier fails to parse, which for an `[autoload]` entry means the engine
cannot instantiate it (hence the misleading "does not inherit from 'Node'": it never loaded at all).

**A BRANCH SWITCH REINTRODUCES IT, which is the part that catches you twice.** `.godot/` is
gitignored, so it does not move with the branch. Checking out a branch whose addon is a different
version leaves the cache describing the *other* version. Measured 2026-08-07: fixed once after the
upgrade, then `git checkout main` (older addon) and back re-broke it — 18 error lines from a tree
that had been green ten minutes earlier, with no file edited in between.

## Fix

```sh
godot --headless --path . --import      # rescans, repopulates the class cache
godot --headless --path . --check-only --quit    # re-verify: expect ZERO error lines
```

Then **derive the verdict from the output**, not the exit code — this stack's exit codes lie
(#27). Count the error lines explicitly:

```sh
"$GODOT" --headless --path . --check-only --quit 2>&1 \
  | grep -ciE "SCRIPT ERROR|Parse Error|Failed to (load|instantiate)"
```

Caveat in the other direction: a headless `--import` in a **vendor-less** tree (a worktree whose
gitignored addon was never copied in) *mutates* `project.godot`, stripping plugins from
`[editor_plugins]`. In the main checkout with the addon present it does not. Either way,
`git status --porcelain project.godot` after the import is the check, not an assumption.

## Detect proactively

- Immediately after ANY addon re-vendor / installer run / plugin update — before believing the
  installer's success message. The installer reports on files copied; it knows nothing about the
  class cache.
- After **checking out a branch that changes an addon's version**, in either direction. This is
  the sneaky one: no file you authored changed, so nothing prompts you to re-verify.
- Whenever `Identifier "X" not declared` names a symbol you can `grep` and find defined in the
  tree. That contradiction *is* the signature — a genuinely missing symbol is not greppable.
- **Applies to any tracked-or-vendored addon that registers `class_name`s**, not just MCP
  tooling — and the blast radius is worst when the addon owns an `[autoload]`, because the failure
  then leaves a *runtime* hole rather than an editor annoyance.
- Family: instruments and installs that report success while the thing is broken — #80 (channel
  green on process+port while the bridge is dead), #83, #92, #95.

## Confirmed by

space-miner-game, 2026-08-07, Godot 4.7-stable. godot-mcp re-vendored 3.6.1 → 4.1.0, which added
`MCPExecGuard`, `MCPKeyNames` and `MCPJoyNames`. First occurrence: straight after
`--install-addon`, 3 parse errors + the `MCPGameBridge` autoload failing to instantiate. Second
occurrence: after rebasing the upgrade branch onto a moved `main` — 18 error lines, cleared to 0
by a single `--import`, with `project.godot` unmodified both times.
