#!/usr/bin/env bash
# precommit-scan.sh — the mechanized subset of the godot-personal-gotchas pre-commit scan.
#
# Runs the detection patterns from the gotcha bodies that are expressible as a grep /
# filesystem / git check. It does NOT replace the hand-scan: the entries with no runnable
# pattern (runtime-only, render-only, MCP-behavioral) still need a human/agent read of the
# diff against the index.
#
# Usage:
#   scripts/precommit-scan.sh                 # staged files (default)
#   scripts/precommit-scan.sh --worktree      # unstaged working-tree changes
#   scripts/precommit-scan.sh --all           # every tracked file
#   scripts/precommit-scan.sh --project DIR   # run against DIR instead of $PWD
#   scripts/precommit-scan.sh --selftest      # calibrate: verify each check fires on a known-bad fixture
#
# Verdict is the printed VERDICT line, not $? (house rule — see gotcha #27, exit codes lie).
# Exit code is provided as a convenience only: 0 clean, 1 findings, 2 scan error.

set -uo pipefail

MODE="staged"
PROJECT="$PWD"
SELFTEST=0
INCLUDE_VENDOR=0

while [ $# -gt 0 ]; do
  case "$1" in
    --staged)   MODE="staged" ;;
    --worktree) MODE="worktree" ;;
    --all)      MODE="all" ;;
    --project)  shift; PROJECT="${1:-}" ;;
    --selftest) SELFTEST=1 ;;
    --include-vendor) INCLUDE_VENDOR=1 ;;
    -h|--help)  sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

N_ERR=0; N_WARN=0; N_HEUR=0; N_RUN=0; N_SKIP=0
FIRED=""   # check ids that produced >=1 finding (used by --selftest)

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
if [ "$SELFTEST" -eq 1 ]; then exec bash "$(dirname "$SELF")/selftest.sh" "$SELF"; fi

# ---------------------------------------------------------------------------
# file list
# ---------------------------------------------------------------------------
collect_files() {
  cd "$PROJECT" 2>/dev/null || { echo "no such dir: $PROJECT" >&2; exit 2; }
  if [ ! -d .git ] && ! git rev-parse --git-dir >/dev/null 2>&1; then
    # not a repo (selftest fixtures) — just walk it
    find . -type f 2>/dev/null | sed 's|^\./||'
    return
  fi
  case "$MODE" in
    staged)   git diff --cached --name-only --diff-filter=ACM 2>/dev/null ;;
    worktree) git diff --name-only --diff-filter=ACM 2>/dev/null ;;
    all)      git ls-files 2>/dev/null ;;
  esac
}

FILES="$(collect_files)"

# Vendored / generated trees are not yours to fix — excluded unless --include-vendor.
is_vendored() {
  [ "$INCLUDE_VENDOR" -eq 1 ] && return 1
  case "$1" in
    addons/*|*/addons/*|.godot/*|*/.godot/*|build/*|*/build/*) return 0 ;;
    *) return 1 ;;
  esac
}

# GDScript comments routinely QUOTE a gotcha's own trigger text ("# gotcha #60: no %g").
# Matching those is a guaranteed false positive, so blank comment tails before grepping.
# Line numbering is preserved — only the commented span is emptied.
decomment() {
  case "$1" in
    *.gd|*.gdshader) sed 's/[[:space:]]#.*$//; s/^[[:space:]]*#.*$//' "$1" ;;
    *) cat "$1" ;;
  esac
}

# subset of FILES matching an extension/path regex, that still exist on disk.
# Memoized: 21 checks over a large tree otherwise re-walk the file list 21 times,
# which is what made an --all sweep take minutes.
files_matching() {
  local key; key="$(printf '%s' "$1" | tr -c '[:alnum:]' '_')"
  local cached; eval "cached=\${_FM_$key+set}"
  if [ "${cached:-}" = "set" ]; then eval "printf '%s' \"\$_FM_$key\""; return 0; fi
  local val; val="$(_files_matching_uncached "$1")"
  eval "_FM_$key=\$val"
  printf '%s' "$val"
}

_files_matching_uncached() {
  local re="$1" f out=""
  [ -z "$FILES" ] && return 0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    case "$f" in */) continue ;; esac
    is_vendored "$f" && continue
    if printf '%s' "$f" | grep -qE "$re"; then
      [ -f "$PROJECT/$f" ] && out="$out$f
"
    fi
  done <<EOF
$FILES
EOF
  printf '%s' "$out"
}

report() { # id severity file:line fix
  local id="$1" sev="$2" loc="$3" fix="$4"
  printf '  %-5s %-52s -> #%-3s %s\n' "$sev" "$loc" "$id" "$fix"
  case "$sev" in
    ERROR) N_ERR=$((N_ERR+1)) ;;
    WARN)  N_WARN=$((N_WARN+1)) ;;
    HEUR)  N_HEUR=$((N_HEUR+1)) ;;
  esac
  case " $FIRED " in *" $id "*) ;; *) FIRED="$FIRED $id" ;; esac
}

# grep-based check: id severity file-regex pattern fix-msg
check() {
  local id="$1" sev="$2" filere="$3" pat="$4" fix="$5"
  N_RUN=$((N_RUN+1))
  local targets; targets="$(files_matching "$filere")"
  if [ -z "$targets" ]; then N_SKIP=$((N_SKIP+1)); return 0; fi
  local f line
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      report "$id" "$sev" "$f:${line%%:*}" "$fix"
    done <<EOF
$(decomment "$PROJECT/$f" | grep -nE "$pat" 2>/dev/null | cut -d: -f1 | sed 's/$/:/')
EOF
  done <<EOF
$targets
EOF
}

echo "godot-gotcha scan — mode=$MODE project=$PROJECT"
echo

# ---------------------------------------------------------------------------
# GDScript source checks
# ---------------------------------------------------------------------------
check 2  ERROR '\.gd$' \
  ':=[[:space:]]*(clamp|min|max|abs|sign|floor|ceil|round)[[:space:]]*\(' \
  'Variant-returning math global under := — use the *f/*i variant or annotate the local'

check 12 ERROR '\.gd$' \
  '\b(expf|sqrtf|sinf|cosf|tanf|powf|logf|asinf|acosf|atanf|atan2f|smoothstepf|move_towardf|easef)[[:space:]]*\(' \
  'no such identifier in Godot 4 — only a narrow compare/round whitelist has *f forms'

check 20 ERROR '\.gd$' \
  'TEXTURE_FILTER_INHERIT' \
  'does not exist on CanvasItem — the inherit value is TEXTURE_FILTER_PARENT_NODE (load-time error)'

check 44 ERROR '\.(gd)$' \
  ':=[[:space:]]*\[[^]]*\][[:space:]]*\[' \
  'indexing an untyped array literal yields Variant — := cannot infer (load-time, --check-only blind)'

# The spec must sit INSIDE a string literal: a bare `%` is the modulo operator, and
# `x % e.cadence` otherwise reads as a `%e` format spec (real false positive, gmtk-26).
check 60 ERROR '\.gd$' \
  "[\"'][^\"']*%[-+0-9.]*[geG]" \
  'GDScript String % has no %g/%e — runtime throw on every execution of this line'

check 1  WARN  '\.gd$' \
  'window_set_mode|get_window\(\)\.mode[[:space:]]*=' \
  'silently no-ops when running embedded in the editor Game tab — read the mode back to confirm'

check 17 WARN  '\.gd$' \
  'basis\.z' \
  'confirm this is negated (-basis.z) — Godot convention is local -Z forward'

check 18 WARN  '\.(gd)$' \
  '\.[a-z_]+[[:space:]]*=[[:space:]]*\[[^]]' \
  'if the target is a typed Array[T] property, an array literal is untyped and throws at runtime'

check 28 ERROR '\.gd$' \
  'can_instantiate\(\)' \
  'reports COMPILED, not instantiable — returns true for @abstract; an is-abstract assertion here is inverted'

check 39 ERROR '\.gd$' \
  'assert_eq\([^,]+,[[:space:]]*(Vector[234]i?|Rect2i?|AABB|Plane|Basis|Quaternion|Transform[23]D|Projection|Color)[[:space:]]*\(' \
  'Dictionary-vs-struct compare false-passes — add assert_true(x is <Type>) first'

check 32 WARN  '\.gd$' \
  'get_global_mouse_position' \
  'reads the OS cursor, not the injected event position — misbehaves under MCP-injected clicks'

# A Transform3D/Basis spelled as a flat run of numeric literals is a hand-transcribed matrix, and
# the usual source is a .tscn — whose twelve floats are the basis ROWS while the constructor takes
# COLUMNS, so the copy is transposed. The vector forms Basis(x, y, z) / Basis(axis, angle) and
# Transform3D(basis, origin) are the correct spellings and carry no bare numeric run, so they do
# not match. Requires 6+ literals to clear Vector3(1, 0, 0)-style neighbours.
check 97 WARN  '\.gd$' \
  '(Transform3D|Basis)\([[:space:]]*-?[0-9.]+[[:space:]]*,([[:space:]]*-?[0-9.]+[[:space:]]*,){4}' \
  'a basis transcribed as flat literals — .tscn writes basis ROWS, the constructor takes COLUMNS (transposed)'


check 9  HEUR  '\.gd$' \
  'func[[:space:]]*\([^)]*\)[[:space:]]*:.*[^=!<>]=[^=]' \
  'heuristic: lambda reassigning a captured outer scalar mutates a private copy (capture-by-value)'

# ---------------------------------------------------------------------------
# scene / resource checks
# ---------------------------------------------------------------------------
check 3  WARN  '\.tscn$' \
  '=[[:space:]]*null[[:space:]]*$' \
  'Inspector clear-override artifact — typed @export floats silently load as 0.0'

check 8  WARN  '\.tscn$' \
  'AnimationNodeStateMachineTransition' \
  'every transition with advance_condition/expression needs advance_mode = 2, else it is travel()-only'

check 15 WARN  '\.tscn$' \
  'region_rect' \
  'never write Rect2 through godot-mcp (silent no-op) — confirm the on-disk value, not get_properties'

# #100 — an animation keyframe committed as a Dictionary instead of a typed Variant. godot-ai's
# add_property_track stores values as received and JSON has no Quaternion/Vector/Color, so an
# {x,y,z,w} payload serialises as `"values": [{` and drives the property not at all. The scene saves
# and animation_manage validate reports the track VALID (it only checks that paths resolve).
check 100 WARN '\.tscn$' \
  '"values": \[[{]' \
  'animation keys are Dictionaries, not typed Variants — the track drives nothing; re-derive them with a @tool pass'

# ---------------------------------------------------------------------------
# non-grep checks
# ---------------------------------------------------------------------------

# #69 — a new .gd/.gdshader staged without its .uid twin
check_69() {
  N_RUN=$((N_RUN+1))
  local src; src="$(files_matching '\.(gd|gdshader)$')"
  if [ -z "$src" ]; then N_SKIP=$((N_SKIP+1)); return 0; fi
  ( cd "$PROJECT" && git rev-parse --git-dir >/dev/null 2>&1 ) || { N_SKIP=$((N_SKIP+1)); return 0; }
  local f
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ -f "$PROJECT/$f.uid" ] || continue          # no sidecar on disk yet — not this gotcha
    if ! ( cd "$PROJECT" && git ls-files --error-unmatch "$f.uid" >/dev/null 2>&1 ); then
      report 69 ERROR "$f.uid" 'sidecar exists on disk but is UNTRACKED — a fresh clone mints a different uid://'
    fi
  done <<EOF
$src
EOF
}

# #58 — .tres/.tscn whose first non-empty line is not the [gd_*] header
check_58() {
  N_RUN=$((N_RUN+1))
  local res; res="$(files_matching '\.(tres|tscn)$')"
  if [ -z "$res" ]; then N_SKIP=$((N_SKIP+1)); return 0; fi
  local f first
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    first="$(grep -m1 -v '^[[:space:]]*$' "$PROJECT/$f" 2>/dev/null)"
    case "$first" in
      \[gd_*) ;;
      "") ;;
      *) report 58 ERROR "$f:1" 'first token must be [gd_resource/[gd_scene — a leading # breaks the parser (use ;)' ;;
    esac
  done <<EOF
$res
EOF
}

# #7 — importable asset under a docs/notes folder with no .gdignore
check_7() {
  N_RUN=$((N_RUN+1))
  local assets; assets="$(files_matching '(docs|notes|design)/.*\.(svg|png|jpg|jpeg|glb|gltf|obj|ogg|wav)$')"
  if [ -z "$assets" ]; then N_SKIP=$((N_SKIP+1)); return 0; fi
  local f d
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    d="$(dirname "$PROJECT/$f")"
    [ -f "$d/.gdignore" ] || report 7 WARN "$f" 'docs-folder asset with no .gdignore — Godot will import it as a packageable resource'
  done <<EOF
$assets
EOF
}

# #76 — project.godot diff that removes an entry from [editor_plugins] enabled=
check_76() {
  N_RUN=$((N_RUN+1))
  case "$FILES" in *project.godot*) ;; *) N_SKIP=$((N_SKIP+1)); return 0 ;; esac
  ( cd "$PROJECT" && git rev-parse --git-dir >/dev/null 2>&1 ) || { N_SKIP=$((N_SKIP+1)); return 0; }
  local dargs="--cached"; [ "$MODE" = "worktree" ] && dargs=""
  local removed
  removed="$( cd "$PROJECT" && git diff $dargs -U0 -- project.godot 2>/dev/null | grep -E '^-.*res://addons/' | head -3 )"
  if [ -n "$removed" ]; then
    report 76 ERROR "project.godot" 'diff DROPS an enabled editor plugin — headless --import strips absent addons; git checkout -- project.godot'
  fi
}

# #86 — a `--check-only` invocation with no `--script`: parses nothing, just boots the main scene
check_86() {
  N_RUN=$((N_RUN+1))
  local sh; sh="$(files_matching '\.(sh|bash|zsh|yml|yaml)$')"
  if [ -z "$sh" ]; then N_SKIP=$((N_SKIP+1)); return 0; fi
  local f n
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    while IFS= read -r n; do
      [ -z "$n" ] && continue
      report 86 ERROR "$f:$n" '`--check-only` without `--script` parses NOTHING — it only boots run/main_scene'
    done <<EOF
$(grep -nE '\-\-check-only' "$PROJECT/$f" 2>/dev/null \
   | grep -vE '\-\-script' \
   | cut -d: -f1)
EOF
  done <<EOF
$sh
EOF
}

# #72 — a godot invocation passing custom flags with no -- separator
check_72() {
  N_RUN=$((N_RUN+1))
  local sh; sh="$(files_matching '\.(sh|bash|zsh)$')"
  if [ -z "$sh" ]; then N_SKIP=$((N_SKIP+1)); return 0; fi
  local f n
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    while IFS= read -r n; do
      [ -z "$n" ] && continue
      report 72 WARN "$f:$n" 'godot run with custom flags and no `--` separator — get_cmdline_user_args() returns []'
    done <<EOF
$(grep -nE '(godot|GODOT)[^|;#]*--(headless|path)[^|;#]*' "$PROJECT/$f" 2>/dev/null \
   | grep -vE '\-\-[[:space:]]' \
   | grep -E '\-\-[a-z-]+=|\-\-(shot|selftest|my-)' \
   | cut -d: -f1)
EOF
  done <<EOF
$sh
EOF
}

# #81 — an AnimatableBody2D driven with sync_to_physics that assigns position/
# global_position. Those setters are silently swallowed (node AND server stay at
# identity) while `rotation` still applies, so the symptom reads as broken physics.
check_81() {
  N_RUN=$((N_RUN+1))
  local gd; gd="$(files_matching '\.gd$')"
  if [ -z "$gd" ]; then N_SKIP=$((N_SKIP+1)); return 0; fi
  local f n
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    grep -qE 'sync_to_physics[[:space:]]*=[[:space:]]*true' "$PROJECT/$f" 2>/dev/null || continue
    n="$(grep -nE '^[^#]*\b(global_position|position)[[:space:]]*=[^=]' "$PROJECT/$f" 2>/dev/null \
         | head -1 | cut -d: -f1)"
    [ -n "$n" ] && report 81 ERROR "$f:$n" 'sync_to_physics body assigns position/global_position — silently swallowed; set global_transform inside _physics_process'
  done < <(printf '%s\n' "$gd")
}

# #26/#51 — add_child (or a group/tree call) INSIDE SceneTree._initialize().
# Keyed on the call site inside the function body, not on the mere presence of
# _initialize — every headless test defines one, so that reads as pure noise.
check_26() {
  N_RUN=$((N_RUN+1))
  local gd; gd="$(files_matching '\.gd$')"
  if [ -z "$gd" ]; then N_SKIP=$((N_SKIP+1)); return 0; fi
  local f n
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    while IFS= read -r n; do
      [ -z "$n" ] && continue
      report 26 WARN "$f:$n" 'call inside _initialize() — _ready has not fired and get_tree() is null there (#26/#51)'
    done <<EOF
$(decomment "$PROJECT/$f" | awk '
  /^[[:space:]]*func[[:space:]]+_initialize[[:space:]]*\(/ {
      inz=1
      if ($0 ~ /add_child|add_to_group|get_nodes_in_group|get_tree\(\)/) print NR   # inline body
      next
  }
  /^[[:space:]]*func[[:space:]]/                            { inz=0 }
  inz && /add_child|add_to_group|get_nodes_in_group|get_tree\(\)/ { print NR }
')
EOF
  done <<EOF
$gd
EOF
}

check_69; check_58; check_7; check_76; check_72; check_86; check_26; check_81

# ---------------------------------------------------------------------------
# verdict
# ---------------------------------------------------------------------------
TOTAL=$((N_ERR + N_WARN + N_HEUR))
echo
if [ "$TOTAL" -eq 0 ]; then
  echo "  (no findings)"
  echo
fi
echo "  $N_RUN checks run, $N_SKIP skipped (no matching files in scope)"
echo "  findings: $N_ERR error, $N_WARN warn, $N_HEUR heuristic"
if [ "$TOTAL" -eq 0 ]; then
  echo "VERDICT: CLEAN"
else
  echo "VERDICT: FINDINGS $TOTAL"
fi
echo
echo "  NOT covered by this script: the runtime-only, render-only and MCP-behavioral entries."
echo "  Hand-scan the diff against the index for those before committing."

[ "$N_ERR" -gt 0 ] && exit 1
exit 0
