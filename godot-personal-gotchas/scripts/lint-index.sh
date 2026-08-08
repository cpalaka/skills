#!/usr/bin/env bash
# lint-index.sh — enforce the index row budget and index<->body integrity.
#
# The budget in ADDING.md is the whole defence against the index regrowing into the
# 768-char rows it had before. A budget nobody measures is a suggestion, so this makes
# it checkable in one command. Run it after editing the table.
#
#   scripts/lint-index.sh            # gotchas index (140/60) + body budget + retirement integrity
#   scripts/lint-index.sh --prefs    # preferences index (110/320)

set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--prefs" ]; then
  SK="$HERE/../../godot-personal-preferences/SKILL.md"; MAX_A=110; MAX_B=320; WHAT="preference"
else
  SK="$HERE/../SKILL.md"; MAX_A=140; MAX_B=60; WHAT="gotcha"
fi
[ -f "$SK" ] || { echo "no SKILL.md at $SK"; exit 2; }

FAIL=0

# 1. row budget
while IFS= read -r line; do
  n=$(printf '%s' "$line"  | awk -F'|' '{gsub(/ /,"",$2); print $2}')
  a=$(printf '%s' "$line"  | awk -F'|' '{gsub(/^ +| +$/,"",$3); print length($3)}')
  b=$(printf '%s' "$line"  | awk -F'|' '{gsub(/^ +| +$/,"",$4); print length($4)}')
  if [ "$a" -gt "$MAX_A" ] || [ "$b" -gt "$MAX_B" ]; then
    printf '  OVER  %s #%-3s  col1=%s/%s  col2=%s/%s\n' "$WHAT" "$n" "$a" "$MAX_A" "$b" "$MAX_B"
    FAIL=1
  fi
done < <(grep -E '^\| [0-9]+ \|' "$SK")

# 2. every row resolves to a body file (gotchas only — preferences bodies are N-slug, unpadded)
if [ "${1:-}" != "--prefs" ]; then
  for n in $(grep -oE '^\| [0-9]+ \|' "$SK" | tr -d '| '); do
    ls "$HERE/../gotchas/$(printf '%02d' "$n")-"*.md >/dev/null 2>&1 || { echo "  ORPHAN row $n has no body file"; FAIL=1; }
  done
  # 3. no duplicate row numbers
  dupes=$(grep -oE '^\| [0-9]+ \|' "$SK" | tr -d '| ' | sort -n | uniq -d)
  [ -n "$dupes" ] && { echo "  DUPLICATE row numbers: $dupes"; FAIL=1; }
  # 4. split tripwire
  rows=$(grep -cE '^\| [0-9]+ \|' "$SK")
  if [ "$rows" -ge 120 ]; then
    echo "  TRIPWIRE: $rows rows — ADDING.md says split the mcp-bridge and headless clusters now"
    FAIL=1
  fi

  # 5. body budget (ADDING.md: 4 KB) — a RATCHET, not a flat gate.
  #    26 live bodies predate the budget and are grandfathered; failing on all of them would make the
  #    check unrunnable and therefore ignored. Instead the count may only ever go DOWN: a new
  #    over-budget body fails, and every one you trim lowers the baseline below.
  BODY_MAX=4096
  BODY_BASELINE=26          # measured 2026-08-08 post-prune; lower this whenever you trim one, never raise it
  over=$(find "$HERE/../gotchas" -maxdepth 1 -name '*.md' ! -name 'RETIRED.md' -size +${BODY_MAX}c | wc -l | tr -d ' ')
  if [ "$over" -gt "$BODY_BASELINE" ]; then
    echo "  BODY BUDGET: $over bodies over ${BODY_MAX}B (baseline $BODY_BASELINE) — a new one breached it:"
    find "$HERE/../gotchas" -maxdepth 1 -name '*.md' ! -name 'RETIRED.md' -size +${BODY_MAX}c -exec ls -S {} + \
      | head -3 | while read -r f; do echo "    $(wc -c < "$f" | tr -d ' ')B  $(basename "$f")"; done
    FAIL=1
  elif [ "$over" -lt "$BODY_BASELINE" ]; then
    echo "  BODY BUDGET: $over over ${BODY_MAX}B — below baseline $BODY_BASELINE, lower BODY_BASELINE to $over"
  fi

  # 6. retirement integrity — the check that #45/#52 needed and did not have.
  #    A body that announces itself as retired/superseded/fixed-upstream MUST have a collapsed
  #    index row, or the hot path keeps routing to a Fix section that is stale (and for #52 was
  #    actively harmful: it prescribed a .tscn hand-edit to dodge a bug that no longer existed).
  for f in "$HERE"/../gotchas/*.md; do   # maxdepth 1 by glob — ARCHIVE/ is deliberately not scanned
    case "$(basename "$f")" in RETIRED.md) continue ;; esac
    grep -qiE '^\*\*Status:\*\*|FIXED upstream' "$f" || continue
    n=$(basename "$f" | cut -d- -f1 | sed 's/^0*//')
    row=$(grep -E "^\| $n \|" "$SK")
    printf '%s' "$row" | grep -qiE '_\((retired|superseded|fixed)' || {
      echo "  UNRETIRED  #$n body says retired/superseded/fixed, index row does not — collapse the row + add a RETIRED.md line"
      FAIL=1
    }
  done
fi

tok=$(( $(wc -c < "$SK") / 4 ))
rows=$(grep -cE '^\| [0-9]+ \|' "$SK")
echo "  $rows rows, SKILL.md ~$tok tok"
if [ "$FAIL" -eq 0 ]; then echo "VERDICT: CLEAN"; else echo "VERDICT: BUDGET VIOLATIONS"; fi
exit $FAIL
