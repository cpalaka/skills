---
name: init-godot-claude-project
description: Use when bootstrapping a Godot project to work with Claude Code via the godot-mcp tools, or adding the MCP scaffolding (`.mcp.json`, `addons/godot_mcp/`, `docs/godot-mcp-guide.md`, `docs/blender-mcp-guide.md`, `docs/asset-pipeline.md`, project Claude perms) to an existing Godot project that lacks them. Symptoms include: a Godot project without `.mcp.json`, "godot-mcp tools aren't loading", user says "set up godot for claude" / "add godot-mcp to this project" / "init godot project".
---

# Initialize a Godot Project for Claude Code

Bootstraps a Godot 4.x project with the `@satelliteoflove/godot-mcp` + `@ryanmazzolini/minimal-godot-mcp` MCP servers (plus the optional `godot-ai` writer plugin), the in-engine `godot_mcp` addon, the per-project reference guides (Godot MCP, Blender MCP, asset pipeline), and the project-level Claude permission allowlist.

## When to use

- New Godot project that should be Claude-driveable through the MCP tools.
- Existing Godot project missing some/all of: `.mcp.json`, `addons/godot_mcp/`, `docs/godot-mcp-guide.md`, `docs/blender-mcp-guide.md`, `docs/asset-pipeline.md`, project-level Claude perms.
- User asks "set up godot for claude" / "init godot mcp" / similar.

## When NOT to use

- Not a Godot project (no `project.godot` in target directory). Don't create a Godot project from scratch — ask the user to run Godot first.
- Project is already fully set up. Verify with the check in step 2; if everything exists, exit with a note.
- User wants a non-standard MCP server or addon — ask first; this skill installs the specific pair documented above.

## Prerequisites

- Target directory contains `project.godot` (Godot 4.x).
- `node` / `npm` / `npx` on PATH (npm + node for the frozen MCP launchers; npx for the one-time addon install).
- Claude Code running in the target project directory.

## Process

### 0. Install user-level helpers (once per machine, idempotent)

Both helpers below are user-level — install once per machine and reuse across every Godot project.

#### 0A. `godot-mcp-clean` cleanup script

The cleanup script solves the most common MCP failure mode (orphan node MCP servers hogging the editor's single-client bridge slot).

Check whether it's already there:

```
test -x ~/.local/bin/godot-mcp-clean && echo "already installed" || echo "needs install"
```

If it needs install:

```
mkdir -p ~/.local/bin
cp templates/godot-mcp-clean ~/.local/bin/godot-mcp-clean
chmod +x ~/.local/bin/godot-mcp-clean
```

Confirm `~/.local/bin` is on the user's PATH (`echo $PATH | tr ':' '\n' | grep -q "\.local/bin" && echo OK`). If not, tell the user to add it to their shell rc (`export PATH="$HOME/.local/bin:$PATH"`).

#### 0B. `godot-gdscript-patterns` skill

GDScript work in this project should lean on the `godot-gdscript-patterns` skill (Godot 4.x idioms — state machines, signals, autoloads, resource-based data, object pooling, static typing, allocation-free hot paths, and worked examples like health/damage, hitbox/hurtbox, async scene loading). Install it globally so every session — in this project or any other — has it available:

```
test -d ~/.agents/skills/godot-gdscript-patterns && echo "already installed" || npx -y skills add wshobson/agents@godot-gdscript-patterns -g -y
```

The install is idempotent — re-running on an already-installed skill no-ops.

#### 0C. `godot-animation-tree-mastery` skill

AnimationTree work (3D character animation, state-machine-driven blending) should lean on the `godot-animation-tree-mastery` skill (StateMachine transitions, BlendSpace1D/2D/Blend2, parameter path discipline, sync groups, TimeScale, root motion, advance expressions, AnimationTree vs AnimationPlayer conflicts, cutscene interruption). Narrower than 0B — only fires when the agent detects AnimationTree context — but cheap to pre-install:

```
test -d ~/.agents/skills/godot-animation-tree-mastery && echo "already installed" || npx -y skills add thedivergentai/gd-agentic-skills@godot-animation-tree-mastery -g -y
```

The install is idempotent. Skip this step if the project explicitly targets 2D or otherwise won't use Godot's animation blending system — though pre-installing won't hurt either way.

### 1. Verify target

From the project root:

```
test -f project.godot && echo "godot project OK" || echo "NOT a godot project"
```

If not a Godot project, stop and ask the user.

### 2. Inventory what's already there

```
ls -d .mcp.json addons/godot_mcp docs/godot-mcp-guide.md docs/blender-mcp-guide.md docs/asset-pipeline.md CLAUDE.md .claude/settings.local.json 2>/dev/null
```

For each file/dir that exists, do NOT overwrite blindly:
- `.mcp.json` exists → read it; if the servers (godot-mcp, godot, and godot-ai if used) are already present, skip step 4.
- `addons/godot_mcp/` exists → skip step 3 (addon already installed).
- `docs/godot-mcp-guide.md`, `docs/blender-mcp-guide.md`, `docs/asset-pipeline.md` → each is handled independently in step 5 (skip the file that exists unless the user wants a refresh; copy the missing ones).
- `CLAUDE.md` exists → APPEND the snippet (step 6), don't overwrite.
- `.claude/settings.local.json` exists → MERGE the allowlist (step 7), don't overwrite.

### 3. Install the in-engine addon

```
npx -y @satelliteoflove/godot-mcp@3.6.1 --install-addon .
```

Copies `addons/godot_mcp/` into the project. The addon contains the WebSocket bridge that the MCP servers connect to. **The version is pinned to `@3.6.1` to match the server pin in `templates/mcp.json`** — an unpinned install grabs the latest addon, and a 2.x-addon ↔ 3.x-server split risks bridge-protocol mismatch (connection fails / tools misbehave after `/mcp`). If you bump one, bump both.

**Verify it actually installed** before continuing. Step 8 references TWO paths inside the addon (`plugin.cfg` and `game_bridge/mcp_game_bridge.gd`) — both must exist or the autoload registration in step 8B will silently reference a missing file:

```
test -f addons/godot_mcp/plugin.cfg && \
  test -f addons/godot_mcp/game_bridge/mcp_game_bridge.gd && \
  echo OK || echo "addon install failed or incomplete"
```

If either file is missing, the install command likely failed (package version mismatch, no `node` on PATH, network issue, or the upstream package restructured the addon layout). Stop and surface the error to the user — don't proceed to step 8.

### 3B. (Optional but recommended) Install the godot-ai writer plugin

`godot-ai` (`hi-godot/godot-ai`, MIT) is the **primary writer** in the recommended setup — scene/node/script/property creation, `input_map_manage`, `script_patch`, `project_run`, `editor_screenshot`, `logs_read`. It writes every struct type correctly; godot-mcp stays as the read/test complement. Skip this only if the project will write through godot-mcp (not recommended — godot-mcp silently no-ops `Rect2`).

Prerequisite: `uv` on PATH (the godot-ai dock auto-starts a uv-managed Python server on `:8000` + `:9500`).

1. **Vendor the addon.** Obtain `addons/godot_ai/` from the `hi-godot/godot-ai` project per its current README and copy it into the project's `addons/`. The HTTP URL is not version-pinned, so the addon version *is* the pin — record it (this guide was validated against **v2.5.10**).
2. **Disable telemetry** (ON by default): set `GODOT_AI_DISABLE_TELEMETRY=true` in the environment before first launching the editor; the setting persists once written.
3. **Enable the plugin** at Project → Project Settings → Plugins after opening the editor.
4. The `.mcp.json` written in step 4 already carries the `godot-ai` HTTP entry (`http://127.0.0.1:8000/mcp`), and `settings.local.json` (step 7) allows `mcp__godot-ai__*` + enables the server. **The entry is INERT until the plugin is enabled AND the editor is running** — a fresh clone with the entry but no plugin will show godot-ai as a disconnected MCP server in `/mcp`; that is expected, not a bug.

**If the project will NOT use godot-ai**, remove the `godot-ai` block from `.mcp.json` and the `mcp__godot-ai__*` allow + `"godot-ai"` enabled-server entry from `settings.local.json`, to avoid a spurious connection error.

### 3C. Freeze the MCP server launchers (supply-chain hardening)

`.mcp.json` launches the two npm-distributed servers (`godot-mcp`, `minimal-godot-mcp`) on **every** editor/Claude session. Launching them via `npx -y <pkg>@<ver>` re-resolves the **unpinned transitive dependency tree** from the registry on each cold start and runs install lifecycle scripts — a recurring arbitrary-code-execution surface on the dev machine, and on every machine that clones the repo and approves the MCP prompt. Pinning the top-level version does NOT freeze the transitive tree. Fix: install both servers once into a lockfile-frozen local tree and launch from that.

(Distinct from step 3's `--install-addon`: that is a **one-time, version-pinned** fetch whose result — `addons/godot_mcp/` — is committed, not a recurring runtime exposure, so it stays as-is.)

If `tools/mcp/package-lock.json` already exists, the freeze is in place — skip to step 4. Otherwise, from the project root:

1. Create `tools/mcp/` and copy `templates/mcp/package.json` into it (pins both servers to exact versions — no `^`/`~` ranges).
2. Generate the integrity-locked tree:
   ```
   npm install --prefix tools/mcp --no-audit --no-fund
   ```
   This writes `tools/mcp/package-lock.json` (lockfileVersion 3, sha512 integrity per package) and materializes `tools/mcp/node_modules/`. **Commit the lockfile + `package.json`, NOT `node_modules/`.**
3. Stop Godot import-scanning `node_modules/`: create an **empty** file `tools/.gdignore` (NOT `.godotignore` — the wrong name silently does nothing; see the gotcha catalog).
4. Ignore the materialized tree in git: ensure `.gitignore` contains `tools/mcp/node_modules/` (create `.gitignore` if absent; append with exact-string dedup if present).

The freeze is per-project and runs at init, so a freshly-bootstrapped project has `node_modules/` already materialized. **A later fresh clone must run `npm ci --prefix tools/mcp` once** (integrity-verified against the committed lock) before the godot-mcp/minimal tools will load — called out in the handoff (step 9).

### 4. Write `.mcp.json`

Copy `templates/mcp.json` from this skill's directory to the project root as `.mcp.json` (note the leading dot). **The template launches the two npm servers from the lockfile-frozen `tools/mcp/` install via `node …` (not `npx -y`), so step 3C must run first** — otherwise `.mcp.json` points at a `node_modules/` that doesn't exist yet.

### 5. Write the per-project reference docs

Create `docs/` if missing. Copy three files from this skill's `templates/` directory:

- `templates/godot-mcp-guide.md` → `docs/godot-mcp-guide.md` — Godot MCP tool reference + gotchas. Always copy.
- `templates/blender-mcp-guide.md` → `docs/blender-mcp-guide.md` — Blender MCP tool reference + Blender 5.x API drift + Blender→Godot pipeline notes. Always copy (cheap insurance — projects often discover later they want a Blender pipeline).
- `templates/asset-pipeline.md` → `docs/asset-pipeline.md` — Directory layout (parallel-vs-nested), naming discipline, PBR material survival mapping, multi-material slot ordering, bone-attached props, inherited-scene pattern for rigged characters. Always copy.

For each: if the destination already exists, skip it unless the user has asked for a refresh (in which case overwrite). Don't merge — the source-of-truth for these docs lives in the skill template; partial updates would risk drift.

### 6. Update or create `CLAUDE.md`

`templates/CLAUDE.md.snippet` is a short list of markdown bullets (starts with `- **For any work involving the Godot MCP tools...`). Treat it as a bullet list, not a section.

If `CLAUDE.md` exists at project root:
- Read it.
- Find the `## Working in this repo` section (or any near-equivalent: "Workflow", "Development notes", etc.).
- Insert the snippet's bullets at the TOP of that section (so they're read first), preserving their order.
- If no equivalent section exists, create `## Working in this repo` with the snippet's bullets as its content, placed after the project's introductory sections (after `## Project` or similar, before `## Running` or similar).
- If the project's CLAUDE.md is heavily customized and you're not sure where to slot it, stop and ask the user.

If `CLAUDE.md` does NOT exist:
- Create it from `templates/CLAUDE.md.full` (a minimal starter that already includes the godot-mcp-guide pointer).

### 7. Write or merge `.claude/settings.local.json`

If `.claude/settings.local.json` does NOT exist:
- Create `.claude/` if missing.
- Copy `templates/settings.local.json` to `.claude/settings.local.json`.

If it DOES exist:
- Read it.
- Union the `permissions.allow` arrays using **strict exact-string dedup** — do NOT try to semantically merge overlapping Bash patterns. Example: if existing has `"Bash(lsof -nP -iTCP -sTCP:LISTEN)"` and template has `"Bash(lsof -nP -iTCP:6550*)"`, keep BOTH. They're different commands; collapsing them changes the permission surface.
- Ensure `enabledMcpjsonServers` contains `"godot-mcp"`, `"godot"`, and (if the project uses the godot-ai writer plugin) `"godot-ai"` (add if missing).
- Preserve all other top-level keys (model, theme, hooks, etc.) untouched.
- Write the merged result back.

### 7.5. Copy project-local subagents

Four project-local subagents in `.claude/agents/` extend the bootstrap with reusable helpers that offload heavy reference docs from main context. They're independent of `settings.local.json` and are filed in their own directory.

Create `.claude/agents/` if missing. Copy four files from this skill's `templates/agents/` directory:

- `templates/agents/godot-gotcha-reviewer.md` → `.claude/agents/godot-gotcha-reviewer.md` — read-only diff scan against the project's gotcha catalog. Use before commits or after live-Inspector tuning.
- `templates/agents/gotcha-curator.md` → `.claude/agents/gotcha-curator.md` — files a new gotcha consistently across `docs/godot-gotchas.md` + memory + `MEMORY.md`.
- `templates/agents/godot-mcp-operator.md` → `.claude/agents/godot-mcp-operator.md` — multi-step godot-mcp operator that internalizes `docs/godot-mcp-guide.md`.
- `templates/agents/godot-export-verifier.md` → `.claude/agents/godot-export-verifier.md` — pre-push smoke-tester that runs all platform exports headlessly and surfaces PASS/FAIL plus interactive-verification commands. Use before pushing to `main` or any branch wired to a deploy workflow.

For each: if the destination already exists, skip it unless the user has asked for a refresh. The source-of-truth for these agent definitions lives in the skill template; partial updates would risk drift.

These subagents reference structures (`docs/godot-gotchas.md`, `docs/godot-mcp-guide.md`, the `gotcha_*.md` memory pattern, `MEMORY.md`) that earlier steps create, so they're inert until those exist.

### 8. Enable the addon + register the autoload in `project.godot`

Read `project.godot`. Two edits.

**Edit A — `[editor_plugins]` section:**

The plugin enable looks like `enabled=PackedStringArray("res://addons/foo/plugin.cfg", "res://addons/bar/plugin.cfg")`. PackedStringArray contents are comma-separated quoted strings inside parentheses.

- If `[editor_plugins]` section doesn't exist → add the whole section:
  ```
  [editor_plugins]

  enabled=PackedStringArray("res://addons/godot_mcp/plugin.cfg")
  ```
- If section exists but `enabled=` key doesn't → add `enabled=PackedStringArray("res://addons/godot_mcp/plugin.cfg")`. **Always use the `PackedStringArray("...")` wrapper, even for a single path** — a bare `enabled=res://...` is not valid Godot syntax.
- If `enabled=PackedStringArray(...)` exists → parse the list of paths between the parens, add `"res://addons/godot_mcp/plugin.cfg"` if not already present (exact string match), write back with the same comma-separated quoted format. Preserve existing paths.

**Edit B — `[autoload]` section:**

- If section doesn't exist → add:
  ```
  [autoload]

  MCPGameBridge="res://addons/godot_mcp/game_bridge/mcp_game_bridge.gd"
  ```
- If section exists, add the `MCPGameBridge=` line if not already present. Don't disturb other autoloads.

**Do NOT manually write a `[godot_mcp]` section.** When the user opens the editor with the plugin enabled (step 9), Godot writes default values for the addon's project settings (`bind_mode`, `port_override`, etc.) into `project.godot` automatically. Your edit happens before that — leave the section to be auto-created.

Sections in `project.godot` are top-level INI-style. When creating new sections, match Godot's existing alphabetical-ish ordering: `[application]` first, then `[autoload]`, `[editor_plugins]`, `[input]`, `[physics]`, `[rendering]`, etc. Godot will reorder cleanly on next save anyway.

### 9. Hand off to the user

Tell the user:

1. Open the project in the Godot 4.x editor (or restart the editor if it was already open — needed to pick up the new addon + autoload).
2. Confirm the `godot_mcp` plugin (and the `godot_ai` plugin, if installed) is enabled at Project → Project Settings → Plugins.
3. In Claude Code, run `/mcp` to (re)connect the MCP servers to the now-running bridge.
4. Verify with: `mcp__godot-mcp__godot_project addon_status` — should return `connected: true`.

**If this project was set up by cloning an already-bootstrapped repo** (rather than a fresh init), first run `npm ci --prefix tools/mcp` to materialize the lockfile-frozen MCP launchers — `node_modules/` is gitignored. Also note `.mcp.json` changes only take effect after a Claude Code restart.

If the user's `~/.claude/settings.json` (user-level) does NOT already allow the godot-mcp tools, also mention they may get permission prompts until those are added. The user-level perms are out of scope for this skill — it only sets project-level perms.

## Verification

After bootstrap, run from the project directory:

```
ls .mcp.json addons/godot_mcp/plugin.cfg docs/godot-mcp-guide.md docs/blender-mcp-guide.md docs/asset-pipeline.md .claude/settings.local.json 2>/dev/null && \
  grep -q "MCPGameBridge" project.godot && echo "autoload OK" && \
  grep -q "addons/godot_mcp/plugin.cfg" project.godot && echo "plugin OK" && \
  test -d ~/.agents/skills/godot-gdscript-patterns && echo "gdscript-patterns skill OK" && \
  test -d ~/.agents/skills/godot-animation-tree-mastery && echo "animation-tree-mastery skill OK" && \
  test -f tools/mcp/package-lock.json && echo "mcp lockfile OK" && \
  test -d tools/mcp/node_modules && echo "mcp launchers materialized OK"
```

All files listed + both grep echoes = green.

## Common gotchas

- **Don't pre-allow `Bash(kill:*)`** in `.claude/settings.local.json`. The `godot-mcp-clean` script (`~/.local/bin/godot-mcp-clean`, user-level) encapsulates the legitimate kill use case.
- **`npx --install-addon` failures** usually mean the package version doesn't support that flag. Fallback: copy `addons/godot_mcp/` from a known-good source project, or check the package's README for the current install command.
- **Single-client MCP bridge:** if the user has multiple Claude sessions open, only one can hold the slot. Surface this if they hit "Another MCP server connected and replaced this one" — recommend `godot-mcp-clean` then `/mcp`.
- **Hand-editing `project.godot`** is fragile. After your edits, ask the user to open the editor and check the Project → Project Settings UI to make sure the plugin shows enabled and the autoload appears — Godot will rewrite the file cleanly on save.
- **If `CLAUDE.md` is heavily customized**, ask the user where to slot the godot-mcp-guide pointer rather than guessing.
- **Fresh clone, godot-mcp/minimal tools won't load:** `tools/mcp/node_modules/` is gitignored, so a clone has only the lockfile. Run `npm ci --prefix tools/mcp` once (integrity-verified against the committed lock) to materialize the frozen launchers, then `/mcp`. Expected, not a bug.

## After running

This skill leaves a marker by virtue of file presence — there's no separate state file. To re-run safely, the inventory check in step 2 makes the process idempotent: existing files are merged or skipped, not overwritten.
