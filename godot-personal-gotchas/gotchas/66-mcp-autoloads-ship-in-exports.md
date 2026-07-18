# 66 — MCP autoloads ship in non-dev exports despite excluding `addons/`

## Symptom

A non-dev export (a release/demo preset whose `exclude_filter` drops `addons/`) boots spamming
`Failed to instantiate an autoload` SCRIPT ERRORs — the MCP game-side autoloads
(`MCPGameBridge` from godot-mcp, `_mcp_game_helper` from godot-ai) are in the shipped build,
broken. The export command itself exits clean and reports success; dev builds (which carry the
addons) run fine, so the breakage only surfaces when someone boots the shipping artifact.

## Cause

Two behaviors stack:

1. **The plugins force-re-add their autoloads.** The vendored godot-mcp / godot-ai editor
   plugins write their game-side autoloads into `project.godot` on every editor-enable
   (`_ensure_game_helper_autoload`, `[godot-mcp] Added MCPGameBridge autoload`) — AND
   mid-`--export`, because a headless export runs on the editor binary, which re-initializes
   every enabled plugin. Deleting the autoload lines before exporting is not enough on its own.
2. **Godot force-includes autoload scripts in every export**, regardless of the preset's
   resource filter. So a preset that merely excludes `addons/` ships the bridge script
   WITHOUT its filtered-out class dependencies — a dangling autoload that fails to
   instantiate at boot.

## Fix

Route non-dev exports through a wrapper script that, for the duration of the export:

1. copies `project.godot` aside,
2. strips the two MCP autoload lines from `[autoload]` **and** the
   `res://addons/godot_mcp/...` / `godot_ai` entries from `[editor_plugins] enabled=`
   (stripping the plugin enable is what stops the mid-export re-add),
3. runs `godot --headless --export-<mode> "<preset>" <path>`,
4. restores the original `project.godot` (also on error — trap it).

Dev builds intentionally keep the tooling — give the wrapper a `--keep-mcp` flag that skips
the strip. Reference implementation: space-miner-game `tools/build/export.sh`
(`export.sh <debug|release> "<preset>" <output> [--keep-mcp]`).

## Detect proactively

- Any export preset that relies on `exclude_filter` alone to drop `addons/` from a shipping
  build, in a project with godot-mcp / godot-ai enabled.
- A raw `godot --export-release` invocation in a build script or agent (should be the wrapper).
- Verification: boot the exported artifact (or scan the `.pck` contents) and check for the MCP
  scripts / `Failed to instantiate an autoload` — a clean export log proves nothing.

## Confirmed by

space-miner-game GD-01 (2026-07), recorded in the project's `docs/adr/0004` and
`tools/build/export.sh` header: a release preset excluding `addons/` shipped boot-time
autoload errors; after `export.sh` stripping, the release `.pck` boots clean with MCP scripts
and autoloads absent. Godot 4.7 / godot-mcp 3.6.1 / godot-ai 2.8.x.
