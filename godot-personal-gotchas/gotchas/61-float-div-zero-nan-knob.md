# 61 — Zeroed frequency/divisor knob silently NaN-poisons spring math (float ÷ 0 is silent)

## Symptom

A node driven by spring/second-order/filter math (bank/pitch rig, camera lag, smoothing
channel) suddenly stops tracking — frozen at its last pose, or the model outright vanishes —
after a knob tweak. **No error or warning anywhere**: not in the Output panel, not at
`--check-only`, not in tests. The rest of the sim runs normally. The trigger was an exported
float knob (a frequency `f`, a time constant, any divisor) landing at `0.0` — via an Inspector
drag, a clear-override writing a zeroed line into the `.tscn` (sibling of #3), or a hand-edit.

## Cause

GDScript **float** division by zero is silent IEEE arithmetic: `x / 0.0` → `inf`,
`0.0 / 0.0` → `NaN` — only **integer** division by zero raises a runtime error. Constant
derivations like the t3ssel8r second-order `_k1 = zeta / (PI * f)`, `_k2 = 1/(2π·f)²` produce
`inf`, then the first `update()` mixes `inf * 0.0` → `NaN`, and the channel outputs NaN
forever. A NaN component in a Node2D/Node3D transform invalidates the whole transform — the
node stops rendering/moving with zero error signal. Frequency knobs invert the "0 = off"
intuition: `f` is a speed, so 0 means "infinitely slow", not "disabled".

## Fix

- Restore the knob to a positive value (recover a clobbered `.tscn` via `git checkout -- <file>`
  — but close the editor's stale tab first, #55).
- In owned code, floor divisor knobs at the consumption site: `var pi_f := PI * maxf(f, 0.01)`
  in the `set_constants`-equivalent. To *disable* a channel, expose a gain/amplitude knob
  (`k_* = 0`, `*_gain = 0` are safe) — never re-purpose the frequency as the off-switch.

## Detect proactively

- Any `@export` float consumed as a divisor with no positive floor between Inspector and the
  division — grep the diff for `/ f`, `/(2.0 * pi_f)`, `1.0 / (`-style expressions fed by
  exports.
- `.tscn` diffs: an override line landing at exactly `0.0` on a frequency-named property
  (`*_f`, `*_freq`, `*_hz`, `*_seconds` used as divisor) — same scan slot as #3's `= null`.
- Runtime tell: `is_nan(channel.value())` after one update is a one-line assert in a lab HUD.

## Confirmed by

space-miner-game 2026-07-12 (task-101 lab tuning): Inspector interaction wrote
`roll_f = 0.0` / `pitch_f = 0.0` overrides into `look3d_lab.tscn`; the 3D ship proxy froze
with clean output. `second_order.gd` `set_constants` divides by `PI * f` with no floor; guard
deferred to its graduation into `src/` (pinned on task-105.19).
