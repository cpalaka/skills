# tests/fixtures/fixture_runtime_abort.gd — selftest fixture: gotcha mode (b).
# A runtime error mid-_run aborts only _run; _initialize resumes. Without the pin this
# printed a truncated-but-green summary and exited 0. The runner must verdict FAIL
# (SCRIPT ERROR in output + pin mismatch reddens the summary).
extends "res://tests/scene_tree_test.gd"
const EXPECTED_CHECKS := 3
func _run() -> void:
	_assert(true, "reached before the abort")
	var v: Variant = RefCounted.new()
	v.no_such_method()  # runtime error: parses clean, aborts _run at runtime
	_assert(true, "never reached")
	_assert(true, "never reached either")
