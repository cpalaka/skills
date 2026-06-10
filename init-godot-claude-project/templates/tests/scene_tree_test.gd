# tests/scene_tree_test.gd
# Shared base for the headless suite. Deliberately NOT named test_*.gd —
# the runner (tests/run_tests.sh) globs tests/test_*.gd and must never collect the base.
# Path-extends, no class_name: resolves with zero global-class-cache involvement, so a
# fresh copy of tests/ into an empty project runs headless with no reimport dance.
#
# A test file is:
#   extends "res://tests/scene_tree_test.gd"
#   const EXPECTED_CHECKS := <N>     # REQUIRED — pins the _assert count of the test body
#   func _run() -> void:             # the test body; call _assert(cond, msg)
#
# EXPECTED_CHECKS exists because exit codes lie (docs/godot-gotchas.md): a runtime error
# mid-_run aborts only _run — _initialize resumes and would print a truncated-but-green
# summary. The pin turns truncation (and silent early-returns) into a counted failure.
# The pin check itself runs through _assert, so it is visible and counted in the summary:
# a green file prints EXPECTED_CHECKS + 1 total checks.
@abstract
extends SceneTree

var _checks := 0
var _failures := 0

@abstract func _run() -> void

func _initialize() -> void:
	_run()
	_check_pin()
	print("\n%d/%d checks passed, %d failures" % [_checks - _failures, _checks, _failures])
	quit(1 if _failures > 0 else 0)

func _assert(c: bool, msg: String) -> void:
	_checks += 1
	if c: print("  PASS: ", msg)
	else: _failures += 1; print("  FAIL: ", msg)

func _check_pin() -> void:
	var pin: Variant = get_script().get_script_constant_map().get("EXPECTED_CHECKS")
	if typeof(pin) != TYPE_INT or pin <= 0:
		_assert(false, "EXPECTED_CHECKS const missing or not a positive int (required by scene_tree_test.gd)")
	else:
		_assert(_checks == pin, "ran exactly EXPECTED_CHECKS (%d) checks%s" % [pin,
			"" if _checks == pin else " — ran %d: truncated run or unpinned coverage change" % _checks])
