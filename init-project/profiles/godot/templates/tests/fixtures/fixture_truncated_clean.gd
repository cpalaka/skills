# tests/fixtures/fixture_truncated_clean.gd — selftest fixture: SILENT truncation.
# An early return skips asserts with no error at all — no SCRIPT ERROR, nothing for the
# runner to grep. Only the EXPECTED_CHECKS pin catches this mode. Verdict must be FAIL.
extends "res://tests/scene_tree_test.gd"
const EXPECTED_CHECKS := 3
func _run() -> void:
	_assert(true, "reached")
	var bail := true
	if bail: return  # deliberate silent truncation
	_assert(true, "never reached")
	_assert(true, "never reached either")
