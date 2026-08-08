---
type: godot
imports: []                 # No UNCONDITIONAL imports beyond dev-base + the fork.
                            # backlog-core is CONDITIONAL (like blender-mcp-guide): the recipe's
                            # "Board (conditional)" step decides it at apply time and wires it
                            # (import line + knob block + init) — never the default knob pass.
fork: git-flow-squash       # The default (ADR-0002). git-flow-noff is the opt-in alternative.
                            # MIGRATION: pick the fork from the repo's REAL git history, not this
                            # default. Pre-chunk Godot bootstrapping prescribed NO git-flow
                            # model at all, so a pre-chunk Godot repo has whatever its history shows:
                            # linear / squash-merged history → git-flow-squash; genuine `--no-ff`
                            # merge commits → git-flow-noff. Never flip a project's integration model
                            # as a scaffolding side effect. (The `--no-ff` default was the old BACKLOG
                            # init template's model, NOT the godot one — ADR-0002.)

# Template assets under profiles/godot/templates/ are already copied in; this manifest enumerates
# the ones to STAMP, with DEST (engine step 3: copy src→dest, skip-if-exists unless refresh:true).
# The godot settings.local.json delta is NOT a template — it is the `settings:` field below,
# merged into .claude/settings.local.json by the engine (step 4). blender-mcp-guide.md is stamped
# CONDITIONALLY (only for Blender-pipeline projects) — see the recipe, not this list.
# Two stamps have a recipe ORDERING dependency: mcp.json and mcp/package.json both point into
# tools/mcp/, so the recipe's lockfile-freeze runs before either tree is used.
templates:
  # root
  - { src: mcp.json,              dest: .mcp.json }                    # stamped; launches servers from the frozen tools/mcp tree (freeze runs first — see Bespoke)
  # per-project reference docs (docs/) — always copy, skip-if-exists unless refresh
  - { src: godot-mcp-guide.md,    dest: docs/godot-mcp-guide.md }
  - { src: asset-pipeline.md,     dest: docs/asset-pipeline.md }
  - { src: godot-gotchas.md,      dest: docs/godot-gotchas.md }
  # headless test harness (tests/)
  - { src: tests/run_tests.sh,                          dest: tests/run_tests.sh }    # chmod +x in recipe
  - { src: tests/scene_tree_test.gd,                    dest: tests/scene_tree_test.gd }
  - { src: tests/fixtures/fixture_pass.gd,              dest: tests/fixtures/fixture_pass.gd }
  - { src: tests/fixtures/fixture_assert_fail.gd,       dest: tests/fixtures/fixture_assert_fail.gd }
  - { src: tests/fixtures/fixture_missing_pin.gd,       dest: tests/fixtures/fixture_missing_pin.gd }
  - { src: tests/fixtures/fixture_no_base.gd,           dest: tests/fixtures/fixture_no_base.gd }
  - { src: tests/fixtures/fixture_runtime_abort.gd,     dest: tests/fixtures/fixture_runtime_abort.gd }
  - { src: tests/fixtures/fixture_hang.gd,              dest: tests/fixtures/fixture_hang.gd }
  - { src: tests/fixtures/fixture_truncated_clean.gd,   dest: tests/fixtures/fixture_truncated_clean.gd }
  - { src: tests/fixtures/fixture_parse_error.gd.txt,   dest: tests/fixtures/fixture_parse_error.gd.txt }  # inert .gd.txt — never a live .gd
  # project-local subagents (.claude/agents/)
  - { src: agents/godot-export-verifier.md,  dest: .claude/agents/godot-export-verifier.md }
  # user-level helper (NOT in-repo; chmod +x in recipe)
  - { src: godot-mcp-clean,       dest: ~/.local/bin/godot-mcp-clean }   # user-level, once per machine; recipe chmod +x
  # CLAUDE.md handling (snippet OR full; engine Zone-3 insert, NOT a clobber stamp)
  - { src: CLAUDE.md.snippet,     dest: CLAUDE.md }   # bullets inserted into "Working in this repo" if CLAUDE.md exists (see Bespoke)
  - { src: CLAUDE.md.full,        dest: CLAUDE.md }   # used ONLY when CLAUDE.md is absent (minimal starter)
  # lockfile-freeze seed (engine step 6 mechanic, payload below)
  - { src: mcp/package.json,      dest: tools/mcp/package.json }   # pins both servers exactly; recipe runs the freeze

settings:                 # merged into .claude/settings.local.json by the engine (step 4)
  allow:
    - "Bash(pgrep -fl:*)"
    - "Bash(lsof -nP -iTCP:6550*)"
    - "Bash(lsof -nP -iTCP:8000*)"
    - "Bash(lsof -nP -iTCP:9500*)"
    - "Bash(mkdir -p:*)"
    - "Bash(chmod +x:*)"
    - "Bash(godot-mcp-clean)"
    - "mcp__godot__get_diagnostics"
    - "mcp__godot__clear_console_output"
    - "mcp__godot__get_console_output"
    - "mcp__godot__scan_workspace_diagnostics"
    - "mcp__godot-mcp__godot_scene"
    - "mcp__godot-mcp__godot_node"
    - "mcp__godot-mcp__godot_scene3d"
    - "mcp__godot-mcp__godot_editor"
    - "mcp__godot-mcp__godot_project"
    - "mcp__godot-mcp__godot_resource"
    - "mcp__godot-mcp__godot_docs"
    - "mcp__godot-mcp__godot_input"
    - "mcp__godot-mcp__godot_runtime_state"
    - "mcp__godot-ai__*"
  enabled_mcp_servers: [ godot-mcp, godot, godot-ai ]

knobs:
  backlog-core:             # CONDITIONAL — written ONLY when backlog-core is imported (board-driven
                            # project); skipped entirely for a board-less prototype.
    VERSION: "<pin the installed backlog CLI version>"
    PLANS_DIR: "docs/superpowers/plans/"
    VERIFY_EXAMPLES: "tests/run_tests.sh green via the headless runner; an in-editor F5 / interactive verification of the affected surface; a gotcha self-scan of the diff against the godot-personal-gotchas skill's Detect-proactively patterns"
    # Godot-flavored DoD — standing gates for every task, ending in the user-sign-off gate
    # (backlog-core requires the list end in sign-off). Stamped into backlog/config.yml at
    # task-create time; config changes don't back-propagate.
    DoD:
      - "Headless test suite green via tests/run_tests.sh (verdict from output, not $?)"
      - "Gotcha self-scan of the diff against the godot-personal-gotchas skill — clean, or each finding addressed"
      - "New gotchas filed (universal -> godot-personal-gotchas skill, project-local -> docs/godot-gotchas.md); load-bearing decisions recorded as docs/adr/ entries"
      - "Any debug/diagnostic scaffolding (autoload prints, temp scenes, profiler hooks) reverted"
      - "User sign-off received"
  verify-gate:
    # The godot verify gate's concrete command. The chunk's full sequence is
    # typecheck/test/build/smoke/secret-scan; for a Godot project the test step is the headless
    # runner, the "build" is a headless export (godot-export-verifier subagent, pre-push), and
    # the "smoke" is opening the project / F5 the affected scene.
    commands: "tests/run_tests.sh"
    paths: "tests/"
    secret_scan: "git grep -nE '(api[_-]?key|secret|password|token)\\s*=' -- ':!docs' ':!*.md'"
    env: "GODOT=<editor binary>  # $GODOT → /Applications/Godot.app/Contents/MacOS/Godot → godot on PATH"
  dev-practice:
    # test-roster: where the authoritative list of required-coverage modules lives.
    test_roster: "the project board (backlog) if present, else the design docs under docs/superpowers/; new gameplay systems with verifiable runtime behaviour get a tests/test_<topic>.gd before implementation"
    # spec-verify: the source surface a spec's [reuse] claims are checked against.
    spec_verify_src: "the project's GDScript/scene tree (res://) + addons/"
  parallel-work:
    # parallel-work rides dev-base (value-variant): the engine writes these into the project's
    # <!-- knobs:parallel-work --> block. Solo prototypes rarely fan out, but the chunk is always
    # imported via dev-base, so it needs values, not an empty block.
    worktree_path_prefix: "../<proj>-task-NNN-<slug>"   # where `git worktree add` puts each tree
    install: "npm ci --prefix tools/mcp (rehydrate the frozen MCP launcher tree), then import once (open the editor or `godot --headless --path . --import`) so the global class cache exists — else tests/run_tests.sh false-FAILs fixture_pass.gd"
---

## Bespoke setup

The heavy Godot recipe. The engine already owns the uniform steps — CLAUDE.md zones
(@imports + the tagged knob blocks above), the `.claude/settings.local.json` merge (the
godot allow-delta, union by exact-string dedup), plain Template stamping, the
lockfile-freeze MECHANIC, verify-after-write, and the handoff. Do **not** re-run those here.
This recipe supplies only what the manifest can't express: the MCP install, the `project.godot`
edits, the freeze PAYLOAD, and the load-bearing WHYs. Run the numbered steps in order.

**Board (conditional):** backlog-core is NOT imported unconditionally — it actively instructs
board ops ("session start: check the board"), so it is not safe-when-unused. Decide at apply
time whether this project is board-driven: if `backlog/` already exists,
or the user wants a board (default **yes** for a real game project, **no** for a
prototype/sketch), then (a) add `@~/.claude/chunks/backlog-core.md` to the CLAUDE.md import
block, (b) write the `<!-- knobs:backlog-core -->` block from the manifest knobs, and (c) run
the board init + seeding from `profiles/backlog.md` → `## Bespoke setup` (seeding still needs an
explicit go-ahead per `backlog-core`). If board-less, skip all three — the project keeps its
task-tracking guidance as inline-leaf instead. Re-running init-project later with the board
enabled adds exactly this wiring (the engine is idempotent: import-line dedup + knob insert).

**Reference docs:** the engine always stamps `docs/godot-mcp-guide.md`, `docs/asset-pipeline.md`,
and `docs/godot-gotchas.md`. **Blender is opt-in** — only if the project uses a Blender→Godot
pipeline, also stamp `templates/blender-mcp-guide.md` → `docs/blender-mcp-guide.md`. Both MCP
guides are carried forward as-is and are **due a content-staleness audit at step 6** (they track
live MCP tool reality / Blender API drift).

### 1. User-level helpers (once per machine, idempotent — independent of this project)

- **`godot-mcp-clean`** — the manifest stamps it to `~/.local/bin/godot-mcp-clean`; here
  `chmod +x ~/.local/bin/godot-mcp-clean`, then confirm `~/.local/bin` is on PATH
  (`echo $PATH | tr ':' '\n' | grep -q '\.local/bin'`; if not, tell the user to add
  `export PATH="$HOME/.local/bin:$PATH"` to their shell rc). It encapsulates the single
  legitimate `kill` use case (orphan node MCP servers hogging the editor's single-client
  bridge slot) — which is **why `Bash(kill:*)` stays OFF the allowlist**. **Scope:** it reaps
  ONLY orphaned `node …godot-mcp` servers (not godot-ai's uv server, not minimal-godot), so its
  value tracks how often you actually hit the :6550 single-client lock — a break-glass helper,
  low-frequency by design (re-decided KEEP at step 6), not dead weight. If a project ever drops
  godot-mcp entirely (godot-ai-only), drop `godot-mcp-clean` AND its `Bash(godot-mcp-clean)`
  allowlist line together.
- **`godot-gdscript-patterns` skill** (global, idempotent):
  `test -d ~/.agents/skills/godot-gdscript-patterns && echo installed || npx -y skills add wshobson/agents@godot-gdscript-patterns -g -y`
- **`godot-animation-tree-mastery` skill** (global, idempotent — narrower, AnimationTree-only;
  pre-installing is cheap):
  `test -d ~/.agents/skills/godot-animation-tree-mastery && echo installed || npx -y skills add thedivergentai/gd-agentic-skills@godot-animation-tree-mastery -g -y`

### 2. Verify target is a Godot project

`test -f project.godot` — if absent, STOP and ask the user; do not create a Godot project
from scratch (ask them to run Godot first).

### 3. Install the in-engine addon (version-pinned to the server)

```
npx -y @satelliteoflove/godot-mcp@3.6.1 --install-addon .
```

Copies `addons/godot_mcp/` (the WebSocket bridge the servers connect to). **WHY @3.6.1:**
the addon version must match the server pin in `tools/mcp/package.json` — a 2.x-addon ↔
3.x-server split risks a bridge-protocol mismatch (connection fails / tools misbehave after
`/mcp`). Bump one → bump both. Then **verify both paths step 6 depends on** exist, or the
autoload registration silently references a missing file:

```
test -f addons/godot_mcp/plugin.cfg && \
  test -f addons/godot_mcp/game_bridge/mcp_game_bridge.gd && echo OK || echo "addon incomplete"
```

If either is missing, STOP and surface the error (version mismatch, no `node` on PATH, or the
upstream package restructured the addon layout) — do not proceed to step 6.

### 4. OPTIONAL — godot-ai writer plugin (skippable)

`godot-ai` (`hi-godot/godot-ai`, MIT) is the **primary writer** in the recommended setup
(scene/node/script/property creation, `input_map_manage`, `script_patch`, `project_run`,
`editor_screenshot`, `logs_read`). It writes most struct types correctly (why it is the writer)
but is **not** universal — the current quirk set lives in the `godot-personal-gotchas` skill:
#19 (first-save `uid=` omission, still live on godot-ai 3.1.3), #23/#25 (no Skeleton3D-bone or
AnimationTree authoring verbs — both re-probed 2026-08-08 and still true). Several once-live bridge
quirks are now FIXED upstream and retired — #24 `Vector2i` (2.8.0+), #40 `@tool` create gate,
#45 `input_map` list, #52 typed-`Array[T]` — see `gotchas/RETIRED.md` before citing any of them. godot-mcp stays as the read/test
complement. Skip this only if the project writes through godot-mcp (not recommended — godot-mcp
silently no-ops `Rect2`, gotcha #15).

1. **Vendor the addon (pinned + gitignored).** From a clone of `hi-godot/godot-ai`,
   `git checkout v2.8.4` (the current baseline) **before copying**, then copy the
   install-ready `addons/godot_ai/` (typically at `plugin/addons/godot_ai/`, not the repo
   root; a `src/godot_ai` copy is NOT the one to vendor) into the project's `addons/`.
   **WHY the tag is the pin:** the vendored `plugin.cfg` version drives which Python MCP
   server the dock fetches from PyPI via `uvx` (`uv` must be on PATH), and the `.mcp.json`
   HTTP URL carries no version — so the checked-out tag pins BOTH addon and server, stopping
   cross-project drift. **Gitignore the vendored copy** (append `/addons/godot_ai` to
   `.gitignore`, exact-string dedup): it is third-party payload, decoupled from any local
   clone. The plugin stays enabled via the committed `project.godot` `[editor_plugins]`; a
   fresh clone re-vendors the same tag (record in the handoff, step 7).
2. **Disable telemetry** (ON by default): set `GODOT_AI_DISABLE_TELEMETRY=true` before first
   launching the editor; the setting persists once written.
3. **Enable the plugin** at Project → Project Settings → Plugins after opening the editor.
4. The stamped `.mcp.json` and merged `settings.local.json` already carry the `godot-ai` HTTP
   entry (`http://127.0.0.1:8000/mcp`), `mcp__godot-ai__*` allow, and `"godot-ai"` enabled
   server. **The entry is INERT until the plugin is enabled AND the editor is running** — a
   fresh clone shows godot-ai as a disconnected MCP server in `/mcp`; expected, not a bug.

**If NOT using godot-ai:** remove the `godot-ai` block from `.mcp.json` and the
`mcp__godot-ai__*` allow + `"godot-ai"` enabled-server entry from `settings.local.json`, to
avoid a spurious connection error. (`uv` on PATH is a prerequisite when used — the dock
auto-starts a uv-managed Python server on `:8000` + `:9500`.)

### 5. Lockfile-freeze PAYLOAD (the engine mechanic, godot's package set)

The engine's step-6 mechanic (install once → commit the lock, not the modules → gitignore the
tree → record the rehydrate command) runs against THIS payload:

1. `tools/mcp/package.json` is already stamped (pins `@satelliteoflove/godot-mcp@3.6.1` and
   `@ryanmazzolini/minimal-godot-mcp@0.1.6` exactly — no `^`/`~`).
2. `npm install --prefix tools/mcp --no-audit --no-fund` → writes `tools/mcp/package-lock.json`
   (lockfileVersion 3, sha512 per package) and materializes `tools/mcp/node_modules/`.
   **Commit the lockfile + package.json, NOT `node_modules/`.**
3. Stop Godot import-scanning the tree: create an **empty** `tools/.gdignore`
   (**NOT** `.godotignore` — the wrong name silently does nothing; gotcha #7 in the
   `godot-personal-gotchas` skill).
4. Append `tools/mcp/node_modules/` to `.gitignore` (create if absent; exact-string dedup).

**WHY freeze:** `.mcp.json` launches the two npm servers on *every* editor/Claude session.
`npx -y <pkg>@<ver>` re-resolves the **unpinned transitive tree** from the registry on each
cold start and runs install lifecycle scripts — a recurring arbitrary-code-execution surface
on the dev machine and on every clone that approves the MCP prompt. Pinning the top-level
version does NOT freeze the transitive tree; launching from a committed lock does. (Distinct
from step 3's `--install-addon`: that is a one-time pinned fetch whose committed result
isn't a recurring runtime exposure.)

### 6. Write `.mcp.json` from the frozen tree, then edit `project.godot`

`.mcp.json` (the stamped `mcp.json`) launches the two servers via `node tools/mcp/node_modules/…`
(NOT `npx -y`) — **which is why the freeze (step 5) must run first**: otherwise it points at a
`node_modules/` that doesn't exist yet.

Then read `project.godot` and make three edits (sections are top-level INI-style; Godot
reorders cleanly on next save):

- **Edit A — `[editor_plugins]`.** Add `"res://addons/godot_mcp/plugin.cfg"` to
  `enabled=PackedStringArray(...)`. If the section/key is absent, create it; **always use the
  `PackedStringArray("...")` wrapper even for a single path** (a bare `enabled=res://...` is
  invalid). If the array exists, parse the quoted paths between the parens and add the entry
  only if not already present (exact-string match); preserve existing paths.
- **Edit B — `[autoload]`.** Add `MCPGameBridge="res://addons/godot_mcp/game_bridge/mcp_game_bridge.gd"`
  if not already present; don't disturb other autoloads.
- **Do NOT hand-write a `[godot_mcp]` section** — Godot auto-writes its default settings
  (`bind_mode`, `port_override`, …) on the first import/editor-open (Edit C below). Your
  hand-edits happen before that; leave that section to be auto-created.
- **Edit C — import to populate the class cache, then re-verify the harness:**
  ```
  godot --headless --path . --import        # editor-build-only flag; writes .godot/global_script_class_cache.cfg, then quits
  grep -c MCPFrameProfiler .godot/global_script_class_cache.cfg   # must be > 0
  tests/run_tests.sh --selftest             # must end with: selftest: 8/8 verdicts correct
  ```
  **WHY:** the `MCPGameBridge` autoload references the addon's `class_name` types
  (`MCPFrameProfiler`, `MCPRuntimeStateSampler`, `MCPLog`, …), which resolve only from
  `.godot/global_script_class_cache.cfg`. A never-opened project hasn't written it, so the
  autoload fails to parse during project init. Because `tests/run_tests.sh` runs
  `godot --headless --path .` (instantiating autoloads every test), those parse errors get
  prepended to every test's output and trip the runner's `SCRIPT ERROR` / `Failed to load
  script` greps — a **false FAIL** on the green `fixture_pass.gd`. A plain `--script` run never
  builds the cache, so the harness can't self-heal; only an editor-lifecycle pass (`--import`
  or opening the editor) writes it. **This post-import 8/8 — not any earlier selftest — is the
  authoritative harness verification.** If only an export-template/headless-server Godot is
  reachable (no `--import`), defer Edit C to the handoff (opening the editor has the same
  effect). The import also auto-writes the `[godot_mcp]` settings section — expected; leave it.

  **WHY the runner verdicts from output, not `$?`:** headless `--script` exit codes lie — a
  parse failure and a mid-run runtime abort both exit 0, so a bare `godot --script` run can
  look green having run nothing. The runner greps the captured output (summary-line +
  `SCRIPT ERROR` / `Failed to load script` + a perl-alarm timeout) and each test pins
  `const EXPECTED_CHECKS := <N>` so silent truncation becomes a counted failure.

### 7. Handoff additions (beyond the engine's standard handoff)

Tell the user, in addition to the engine's external-includes-approval and
`--add-dir ~/.claude/chunks` notes:

1. Open (or restart) the Godot 4.x editor to pick up the new addon + autoload.
2. Confirm the `godot_mcp` plugin (and `godot_ai`, if installed) is enabled at
   Project → Project Settings → Plugins.
3. In Claude Code, `/mcp` to (re)connect the servers to the now-running bridge; verify with
   `mcp__godot-mcp__godot_project addon_status` → `connected: true`. **Single-client bridge:**
   only one Claude session can hold the slot — if they hit "Another MCP server connected and
   replaced this one", run `godot-mcp-clean` then `/mcp`.
4. **Fresh-clone rehydrate** (the lockfile-freeze clone gap): `node_modules/` and `.godot/`
   are both gitignored, so a clone must (a) `npm ci --prefix tools/mcp` once
   (integrity-verified against the committed lock) before the godot-mcp/minimal tools load,
   (b) import once — open the editor or `godot --headless --path . --import` — or
   `tests/run_tests.sh` false-FAILs `fixture_pass.gd` with `SCRIPT ERROR` (class cache empty),
   and (c) if the project uses godot-ai, re-vendor `addons/godot_ai/` at the pinned tag
   (the vendored copy is gitignored — step 4.1).
   `.mcp.json` changes only take effect after a Claude Code restart.
5. If `~/.claude/settings.json` (user-level) doesn't already allow the godot-mcp tools, the
   user may get permission prompts — user-level perms are out of scope here (this profile sets
   project-level perms only).
