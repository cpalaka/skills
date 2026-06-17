#!/bin/bash
# tests/run_tests.sh — the headless suite runner.
#
# Verdicts NEVER trust $? from a godot --script run (docs/godot-gotchas.md "exit codes
# lie"): a parse failure exits 0 having run nothing, and a mid-_run abort exits per the
# truncated summary. A file PASSES iff, in its captured output:
#   - the "N/M checks passed, K failures" summary line is present, with K == 0
#   - no line STARTING with "SCRIPT ERROR" (parse or runtime abort) — anchored to ^ on purpose:
#     --path . loads project autoloads, whose output is prepended to every run; a benign autoload
#     print() containing the substring "SCRIPT ERROR" would false-FAIL an unanchored grep. Godot
#     always emits real errors at column 0, so ^ still catches every genuine failure.
#   - no line starting with "Failed to load script" (same ^-anchoring rationale)
#   - and the run finished before the per-file timeout (perl alarm; macOS has no timeout)
# The EXPECTED_CHECKS pin inside each test (see tests/scene_tree_test.gd) covers what
# output greps cannot: silent truncation with no error text.
#
# Usage:
#   tests/run_tests.sh              # whole suite (tests/test_*.gd)
#   tests/run_tests.sh player       # subset: tests/test_*player*.gd
#   tests/run_tests.sh --selftest   # verify the runner's verdicts against tests/fixtures/
# Env: GODOT (binary override), TEST_TIMEOUT (seconds per file, default 30)
set -u
cd "$(dirname "$0")/.." || exit 2

GODOT="${GODOT:-/Applications/Godot.app/Contents/MacOS/Godot}"
if [ ! -x "$GODOT" ]; then GODOT="$(command -v godot 2>/dev/null || true)"; fi
{ [ -n "${GODOT:-}" ] && [ -x "$GODOT" ]; } || { echo "FATAL: godot binary not found — set GODOT" >&2; exit 2; }
TIMEOUT="${TEST_TIMEOUT:-30}"

# verdict <res://path> — echoes "PASS|FAIL|TIMEOUT <detail>"; returns 0 only on PASS.
verdict() {
	local res="$1" out code summary
	out="/tmp/$(basename "$res").out"
	perl -e 'alarm shift; exec @ARGV' "$TIMEOUT" "$GODOT" --headless --path . --script "$res" >"$out" 2>&1
	code=$?
	summary="$(grep -E '^[0-9]+/[0-9]+ checks passed, [0-9]+ failures$' "$out" | tail -1)"
	if [ "$code" -eq 142 ] && [ -z "$summary" ]; then echo "TIMEOUT after ${TIMEOUT}s — $out"; return 1; fi
	if grep -qE '^SCRIPT ERROR' "$out"; then echo "FAIL SCRIPT ERROR in output — $out"; return 1; fi
	if grep -qE '^(ERROR: )?Failed to load script' "$out"; then echo "FAIL script failed to load — $out"; return 1; fi
	if [ -z "$summary" ]; then echo "FAIL no summary line — $out"; return 1; fi
	# pin-mechanism enforcement: a file not on the test base prints a valid summary but no
	# pin-check line — it must not pass silently (the requiredness lives in the base, so a
	# file that drops off the base would otherwise escape it)
	if ! grep -q 'EXPECTED_CHECKS' "$out"; then
		echo "FAIL no pin-check line (not on the test base?) — $out"; return 1
	fi
	case "$summary" in
		*", 0 failures") echo "PASS $summary"; return 0 ;;
		*)               echo "FAIL $summary — $out"; return 1 ;;
	esac
}

# --- selftest: the runner's own tests, against the deliberately-defective fixtures ---
selftest_fails=0
expect_verdict() {  # <want> <res://path> [timeout-override]
	local want="$1" res="$2" t="${3:-$TIMEOUT}" saved line got
	saved="$TIMEOUT"; TIMEOUT="$t"
	line="$(verdict "$res")" || true
	TIMEOUT="$saved"
	got="${line%% *}"
	if [ "$got" = "$want" ]; then
		printf '  ok   %-32s -> %s\n' "$(basename "$res")" "$got"
	else
		printf '  BAD  %-32s -> %s (wanted %s)  [%s]\n' "$(basename "$res")" "$got" "$want" "$line"
		selftest_fails=$((selftest_fails + 1))
	fi
}

if [ "${1:-}" = "--selftest" ]; then
	echo "runner selftest (verdicts against tests/fixtures/):"
	expect_verdict PASS    res://tests/fixtures/fixture_pass.gd
	expect_verdict FAIL    res://tests/fixtures/fixture_assert_fail.gd
	expect_verdict FAIL    res://tests/fixtures/fixture_runtime_abort.gd
	expect_verdict FAIL    res://tests/fixtures/fixture_truncated_clean.gd
	expect_verdict FAIL    res://tests/fixtures/fixture_missing_pin.gd
	expect_verdict FAIL    res://tests/fixtures/fixture_no_base.gd
	expect_verdict TIMEOUT res://tests/fixtures/fixture_hang.gd 5
	# mode (a) lives inert as .txt; stage it transiently so the repo always parses clean
	staged="tests/fixtures/_staged_parse_error.gd"
	trap 'rm -f "$staged" "$staged.uid"' EXIT
	cp tests/fixtures/fixture_parse_error.gd.txt "$staged"
	expect_verdict FAIL    "res://tests/fixtures/_staged_parse_error.gd"
	echo
	if [ "$selftest_fails" -eq 0 ]; then echo "selftest: 8/8 verdicts correct"; exit 0
	else echo "selftest: $selftest_fails BAD verdict(s)"; exit 1; fi
fi

# --- suite mode ---
pattern="${1:-}"
if [ -n "$pattern" ]; then files=(tests/test_*"$pattern"*.gd); else files=(tests/test_*.gd); fi
pass_files=0 total_files=0 sum_passed=0 sum_total=0 failed=""
for f in "${files[@]}"; do
	[ -e "$f" ] || { echo "no tests match: $f" >&2; exit 2; }
	total_files=$((total_files + 1))
	name="$(basename "$f")"
	if line="$(verdict "res://tests/$name")"; then pass_files=$((pass_files + 1)); else failed="$failed $name"; fi
	printf '%-8s %-34s %s\n' "${line%% *}" "$name" "${line#* }"
	s="$(grep -E '^[0-9]+/[0-9]+ checks passed' "/tmp/$name.out" 2>/dev/null | tail -1)"
	if [ -n "$s" ]; then
		sum_passed=$((sum_passed + ${s%%/*}))
		rest="${s#*/}"; sum_total=$((sum_total + ${rest%% *}))
	fi
done
echo
echo "files: $pass_files/$total_files passed; checks: $sum_passed/$sum_total"
if [ -n "$failed" ]; then
	for name in $failed; do
		echo; echo "--- tail of /tmp/$name.out:"
		tail -15 "/tmp/$name.out"
	done
	exit 1
fi
exit 0
