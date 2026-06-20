#!/usr/bin/env bash
# Bootstrap the Chunk library on a new macOS/Linux machine.
# Prereq: this repo (cpalaka-claude-skills) is already cloned. Run this script from the clone:
#   ./bootstrap.sh
# It symlinks ~/.claude/chunks -> <clone>/chunks so every project's @~/.claude/chunks/<name>.md
# imports resolve. Idempotent.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHUNKS="$REPO_DIR/chunks"
LINK="$HOME/.claude/chunks"

[ -d "$CHUNKS" ] || { echo "error: $CHUNKS not found — run this from the cpalaka-claude-skills clone." >&2; exit 1; }
mkdir -p "$HOME/.claude"

if [ -L "$LINK" ]; then
  cur="$(readlink "$LINK")"
  if [ "$cur" = "$CHUNKS" ]; then echo "ok: ~/.claude/chunks already -> $CHUNKS"; exit 0; fi
  echo "error: ~/.claude/chunks is a symlink to $cur (not $CHUNKS). Remove it and re-run." >&2; exit 1
elif [ -e "$LINK" ]; then
  echo "error: ~/.claude/chunks exists and is not a symlink. Move it aside and re-run." >&2; exit 1
fi

ln -s "$CHUNKS" "$LINK"
echo "linked ~/.claude/chunks -> $CHUNKS"
echo
echo "Per consuming project: approve the external-includes prompt once on first launch (then restart"
echo "so the imports load). Headless/automation runs must pass: --add-dir ~/.claude/chunks"
