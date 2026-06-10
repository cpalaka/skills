# tests/fixtures/fixture_no_base.gd — selftest fixture: a green-looking test that does NOT
# extend the test base (own harness, valid summary, no pin-check line). The runner must
# verdict FAIL — otherwise a file silently dropping off the base escapes the required pin
# (empirically observed: a revert regressed one test to its old self-contained harness and
# the suite stayed green, one check short).
extends SceneTree
var _checks := 0
var _failures := 0
func _initialize() -> void:
	_run(); print("\n%d/%d checks passed, %d failures" % [_checks - _failures, _checks, _failures]); quit(1 if _failures > 0 else 0)
func _run() -> void:
	_assert(true, "looks green but bypasses the base")
func _assert(c: bool, msg: String) -> void:
	_checks += 1
	if c: print("  PASS: ", msg)
	else: _failures += 1; print("  FAIL: ", msg)
