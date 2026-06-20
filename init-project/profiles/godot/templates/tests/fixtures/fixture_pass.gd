# tests/fixtures/fixture_pass.gd — selftest fixture: the runner must verdict PASS.
extends "res://tests/scene_tree_test.gd"
const EXPECTED_CHECKS := 2
func _run() -> void:
	_assert(true, "first check")
	_assert(true, "second check")
