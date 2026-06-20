# tests/fixtures/fixture_missing_pin.gd — selftest fixture: EXPECTED_CHECKS is required.
# A test without the pin has no truncation guard; the base counts that as a failure.
# The runner must verdict FAIL.
extends "res://tests/scene_tree_test.gd"
func _run() -> void:
	_assert(true, "one passing check, but the required EXPECTED_CHECKS pin is missing")
