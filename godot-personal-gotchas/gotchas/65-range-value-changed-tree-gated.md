# 65 — Range.value_changed never emits for an out-of-tree slider (headless tests)

## Symptom

In a headless `extends SceneTree --script` test, setting `.value` on an `HSlider` / `VSlider` /
`SpinBox` (any `Range`) that has **not** been added to the SceneTree updates `.value` — it reads
back changed — but the connected `value_changed` handler **never fires**. No error, no warning:
the test's `fired` counter stays 0 while the assertion on the value itself passes, so the
setter→signal wiring under test looks broken (or, worse, a buggy handler looks untested-but-green
if the test only asserts the value). `CheckBox.toggled` and `Button.pressed` are **not** gated —
they emit fine out-of-tree, which makes the Range silence easy to misdiagnose as a test bug.

## Cause

`Range` routes its notification through a tree-dependent change pipeline, so an out-of-tree
setter mutates the value silently. Combined with gotcha #51 (during `SceneTree._initialize` the
root Window isn't in the tree yet, so `add_child` doesn't produce a working `get_tree()`), a
headless test cannot simply attach the control to escape the gate.

## Fix

Emit the signal directly in the test — `slider.value_changed.emit(55.0)` — which is exactly the
signature an in-tree drag fires, so the handler under test is exercised identically. (If the test
genuinely needs the setter path, restructure onto a deferred/processed frame with the node in the
tree — usually not worth it for a wiring test.)

## Detect proactively

Any headless test that connects to a `Range` signal and then drives it via the property setter:
`grep -l 'value_changed' tests/*.gd` and check whether the node is ever inside the live tree at
set time. If not, the test must `emit()` the signal, not set `.value`.

## Confirmed by

space-miner-game task-111 (LAB-B KnobPanel), 2026-07-14 — `tests/test_knob_panel.gd` drives its
slider rows via `value_changed.emit()`; verified `fired=0` with a plain `.value = 55.0` set while
the value read back 55.0 (Godot 4.7.stable, headless).
