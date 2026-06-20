---
name: init-project
description: The single engine that scaffolds (or migrates) a dev project onto the Chunk library — writes the chunk @imports, knob blocks, stamps Templates, merges settings.local.json, and runs a project-type Profile's bespoke recipe. Use when setting up a new dev project, adopting the chunk library in an existing one, or adding a new project type. Consumes a declarative Profile from profiles/<type>.md; the engine never changes as types grow — adding a type means adding a Profile.
---

# init-project — the Chunk-library scaffolding engine

ONE engine, many **Profiles**. The engine is a uniform apply-algorithm; a Profile
(`profiles/<type>.md`) is the *data* for one project type. Adding a project type = adding
a Profile. The engine and `dev-base` bundle are stable; only Profiles grow. (ADR-0003.)

This replaces the per-type init skills (`init-backlog-project`, `init-godot-claude-project`),
which are retired only after a real backlog project and a real godot project are migrated
and signed off (build-plan step 7). Until then, do not delete them.

## What a Profile is (the manifest contract)

A Profile is `profiles/<type>.md`: a YAML frontmatter **manifest** + an optional
`## Bespoke setup` recipe. The manifest fields the engine reads:

```yaml
---
type: <name>
imports:            # chunk ids to @import BEYOND dev-base (dev-base is always imported)
  - backlog-core    # e.g.
fork: git-flow-squash      # exactly one git-flow variant. squash is the DEFAULT (ADR-0002);
                           # git-flow-noff is the opt-in. The fork is imported explicitly,
                           # never via dev-base (@import cannot be undone).
templates: []              # parity-tracked Template assets to stamp: [{src, dest, refresh?}]
  settings:                  # optional: this type's settings.local.json delta, merged in step 4
    allow: []                #   extra permissions.allow globs (unioned by exact-string dedup)
    enabled_mcp_servers: []  #   added to enabledMcpjsonServers
knobs:                     # per value-variant chunk → the values to write into its knob block
  backlog-core:
    VERSION: "..."
    PLANS_DIR: "..."
    VERIFY_EXAMPLES: "..."
    DoD: ["...", "User sign-off received"]
  verify-gate: { commands: "...", paths: "...", secret_scan: "...", env: "..." }
  superpowers-default: { test_roster: "...", spec_verify_src: "..." }
---
## Bespoke setup
<imperative steps the manifest can't express, or "None.">
```

Knob *values* that are project-specific are filled at apply time (prompt the user or derive
from the repo); the manifest carries defaults/shape. Pure-invariant chunks (git-*, codegraph,
code-hygiene, sandbox-auto) have no knob block.

## The apply algorithm (uniform — this is `init-scaffold-core`)

Idempotent and re-runnable: every step inventories first and **merges or skips**, never
blind-overwrites. Re-running with an updated Profile updates only what changed.

**0. Preconditions + inventory.** Confirm the chunks symlink exists
(`readlink ~/.claude/chunks` → the skills repo's `chunks/`; if missing, run `bootstrap.sh` /
`bootstrap.ps1`). Inventory the target: `ls CLAUDE.md .claude/settings.local.json` + any paths
the Profile's `templates`/recipe touch. For each thing that exists, plan to merge/skip — not
overwrite.

**1. Write the project `CLAUDE.md` — three zones, only the first two engine-owned.**
- **Zone 1 — chunk @imports.** Emit, in order: `@~/.claude/chunks/dev-base.md`, then the
  `fork` (`@~/.claude/chunks/<fork>.md`), then each `imports` entry. If `CLAUDE.md` exists,
  merge into the existing import block with **exact-line dedup**; never duplicate or reorder
  hand-placed imports; never clobber the file.
- **Zone 2 — knob blocks.** For each chunk in `knobs` **that is actually imported** (it rides
  dev-base, it's the chosen `fork`, or it's in `imports`), write a tagged block
  `<!-- knobs:<id> -->` … `<!-- /knobs:<id> -->` carrying that chunk's values. On re-run,
  replace *only* the content between the tags (idempotent); insert the block if absent. Never
  write knob values into a chunk file — they live in the project `CLAUDE.md`. **A chunk listed
  in `knobs` but NOT imported** — a CONDITIONAL import, e.g. the godot profile's `backlog-core`
  (imported only for board-driven projects) — gets its knob block written by the Profile's
  conditional recipe step at the moment it adds the import, never by this default pass; a
  board-less project must not be left with a dangling `<!-- knobs:backlog-core -->` block.
- **Zone 3 — inline-leaf.** Hand-authored, project-specific (deploy, framework skill lists,
  toolchain pins). The engine **never** writes or edits this zone.

**2. Enable external @imports (load-bearing — see ADR-0001 + the pilot finding).**
External `@~/.claude/chunks/…` imports require a **one-time, per-project interactive approval**
("trust external includes"). It is granted at first launch (you are present at init) and then
persists for that project. **Headless runs** (`claude -p`, `/goal` headless, cron) do *not*
honor that approval and refuse external imports — they must pass **`--add-dir ~/.claude/chunks`**
or the chunks load empty. The engine records both in the handoff (step 8); it does **not**
auto-edit `~/.claude.json` unless the user explicitly opts in.

**3. Stamp Templates.** For each `templates` entry, copy `src` → `dest`, **skip if the dest
exists** unless `refresh: true`. Templates are *copied + parity-tracked* (unlike chunks); their
source of truth is the Profile asset, kept aligned by a parity check, never hand-merged.

**4. Merge `.claude/settings.local.json` (the merge contract from `sandbox-auto`).** Apply the
Profile's `settings` delta (if any): union its `allow` globs into `permissions.allow`, and add
its `enabled_mcp_servers` to `enabledMcpjsonServers`. If the target file is absent, create it
from the sandbox-auto baseline
(`{"permissions":{"defaultMode":"auto"},"sandbox":{"enabled":true}}`) plus that delta. If present: **union `permissions.allow` by strict exact-string
dedup** (do not semantically merge overlapping `Bash(...)` patterns — keep both); set
`enabledMcpjsonServers` as the Profile requires; **preserve every other top-level key**; write
back. Never clobber. Keep destructive/`gh`-write globs OFF the allowlist (`sandbox-auto` hygiene).

**5. Run the Profile's `## Bespoke setup` recipe.** The escape hatch for what a manifest can't
express (a CLI `init`, editing `project.godot`, a pinned tool install). Empty for simple types.

**6. Lockfile-freeze (when the recipe declares pinned installs).** The mechanic lives here; the
*payload* (which packages, which versions) is Profile-leaf. Install once into a local tree,
**commit the lockfile, not the modules**, gitignore the module tree (append with exact-string
dedup), and record the fresh-clone rehydrate command in the handoff. (Currently only the godot
Profile needs this; promote nothing until a second type does.)

**7. Verify-after-write.** Re-inventory the expected outputs; confirm each `@import` path
resolves through the symlink; if the Profile sets a `verify-gate`, run it. Surface any gap;
do not report success without the inventory passing (the `verify-gate` discipline).

**8. Handoff.** Tell the user: (a) on first launch, **approve the external-includes prompt
once** (then restart so the imports load); (b) headless/automation runs need
`--add-dir ~/.claude/chunks`; (c) any fresh-clone rehydrate command from step 6; (d) anything
the Profile recipe defers to an interactive editor step.

## Profiles

- `profiles/backlog.md` — a board-driven dev project (dev-base + git-flow fork + backlog-core).
- `profiles/web.md` — a chaipalaka-shaped web project.
- `profiles/godot.md` — a Godot project; carries the heavy bespoke recipe (MCP install,
  `project.godot` edits, lockfile-freeze) and owns its Template assets.

## Extensibility

New project type → add `profiles/<type>.md`. New cross-cutting rule → add `chunks/<name>.md`
(+ `dev-base.md` if universal). The engine never changes.
