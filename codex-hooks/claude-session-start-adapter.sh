#!/bin/bash
# Adapt a Claude Code SessionStart command to Codex's narrower documented JSON output shape.
# The source script remains canonical; this wrapper removes host-only fields such as watchPaths.

export LC_ALL=C
PATH=/usr/bin:/bin:/usr/sbin:/sbin
export PATH

source_hook=$1
[ -n "$source_hook" ] && [ -r "$source_hook" ] || exit 1

payload=$(cat)
output=$(printf '%s' "$payload" | /bin/bash "$source_hook")
source_status=$?
[ "$source_status" -eq 0 ] || exit "$source_status"
[ -n "$output" ] || exit 0

printf '%s' "$output" | /usr/bin/jq -c -e '
  .hookSpecificOutput.additionalContext as $context
  | {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: $context
      }
    }
' || exit 1
