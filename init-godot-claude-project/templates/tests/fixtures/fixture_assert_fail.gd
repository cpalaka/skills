# tests/fixtures/fixture_assert_fail.gd — selftest fixture: a real assert failure.
# The runner must verdict FAIL (summary line reports 1 failure).
extends "res://tests/scene_tree_test.gd"
const EXPECTED_CHECKS := 2
func _run() -> void:
	_assert(true, "passes")
	_assert(false, "deliberately fails")
