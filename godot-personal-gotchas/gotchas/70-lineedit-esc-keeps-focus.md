# 70 — LineEdit keeps FOCUS after Esc (4.4+): a focus-owner input gate traps keys forever

**Symptom:** A dev-UI / input-routing gate of the form "while a text field has keyboard focus,
swallow app hotkeys" (`get_viewport().gui_get_focus_owner() is LineEdit` → return early from
`_input`) works while typing, but after the user presses Esc to leave the field EVERY hotkey
stays dead — the toggle key, Esc itself, all of them — until the user happens to click another
control. No error, no warning; the field doesn't even look focused anymore (caret gone).

**Cause:** Godot 4.4 split LineEdit *focus* from *editing* (`edit()`/`unedit()`/`is_editing()`,
`editing_toggled`). `ui_cancel` (Esc) and `ui_text_submit` exit **edit mode only — the control
KEEPS keyboard focus**. A focus-owner test therefore stays true after Esc, and the early-return
gate keeps swallowing every key indefinitely. (Pre-4.4 behavior — Esc releasing focus — is what
the intuition and older docs/examples encode.)

**Fix:** Gate on **editing**, not focus:

```gdscript
func has_text_focus() -> bool:
	var f := get_viewport().gui_get_focus_owner()
	var le := f as LineEdit
	return le != null and le.is_editing()
```

Bonus: because `Node._input` runs BEFORE GUI input, this yields the natural two-step Esc for
free — the first Esc reaches the still-editing field and exits editing; the second Esc reaches
the app's `_input` (the gate is now false) and does the app-level thing. Alternative when focus
itself must go: connect `editing_toggled` and `release_focus()` on the false edge.

**Detect proactively:** any `gui_get_focus_owner()` result used as an input-swallowing
condition without an `is_editing()` check (grep `gui_get_focus_owner`); any comment claiming
"Esc releases focus" for LineEdit/TextEdit in 4.4+ code.

**Note on synthetic events:** when testing this via `Input.parse_input_event`, set BOTH
`keycode` and `physical_keycode` on the `InputEventKey` — built-in `ui_*` actions match the
LOGICAL keycode, so a physical-only synthetic Esc never triggers `ui_cancel` and the field
appears to ignore it (a real keyboard always sets both).

**Confirmed by:** space-miner-game task-119 Lab Console (2026-07-21) — the Console's
backquote-inert-while-typing gate; docs check (LineEdit class ref, stable/4.7) + live MCP
game_eval verification of the two-step Esc.
