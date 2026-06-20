# tests/fixtures/fixture_hang.gd — selftest fixture: a hang (e.g. an abort inside
# _initialize itself never reaches quit()). The runner's perl-alarm must kill it and
# verdict TIMEOUT. Selftest runs this one with TEST_TIMEOUT=5 to stay fast.
extends "res://tests/scene_tree_test.gd"
const EXPECTED_CHECKS := 1
func _run() -> void:
	_assert(true, "reached before the hang")
	while true:
		pass  # deliberate busy-hang
