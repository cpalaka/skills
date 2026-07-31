#!/bin/bash
# Single Codex SessionStart entry point: combine domain context and Godot channel state.

export LC_ALL=C
PATH=/usr/bin:/bin:/usr/sbin:/sbin
export PATH

payload=$(cat)
session_cwd=$(printf '%s' "$payload" | /usr/bin/jq -r '.cwd // empty' 2>/dev/null)
domain_adapter=/Users/chaipalaka/Code/github/cpalaka-claude-skills/codex-hooks/claude-session-start-adapter.sh
domain_source=/Users/chaipalaka/.claude/hooks/context-md-adr-inject.sh
godot_source=/Users/chaipalaka/.claude/hooks/godot-ai-channel-check.sh

domain_context=''
if [ -r "$domain_adapter" ] && [ -r "$domain_source" ]; then
    domain_json=$(printf '%s' "$payload" | /bin/bash "$domain_adapter" "$domain_source")
    if [ -n "$domain_json" ]; then
        domain_context=$(printf '%s' "$domain_json" | /usr/bin/jq -r '.hookSpecificOutput.additionalContext // empty')
    fi
fi

godot_context=''
if [ -r "$godot_source" ] && [ -d "$session_cwd" ]; then
    godot_state=$(cd "$session_cwd" && /bin/bash "$godot_source" --check)
    case "$godot_state" in
        "godot-ai: DEGRADED"*|"godot-ai: ABSENT"*)
            godot_context="[Godot AI SessionStart check]
${godot_state}
Visual/runtime verification needs the editor channel. Open the editor and start a new Codex task before claiming that surface verified."
            ;;
    esac
fi

combined_context=$domain_context
if [ -n "$godot_context" ]; then
    if [ -n "$combined_context" ]; then
        combined_context="${combined_context}

${godot_context}"
    else
        combined_context=$godot_context
    fi
fi

[ -n "$combined_context" ] || exit 0

/usr/bin/jq -n -c --arg context "$combined_context" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $context
  }
}'
