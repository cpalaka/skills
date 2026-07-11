# 10 — Framebuffer self-check before handing a visual change to the user

## When this applies

About to hand a visual or feel change to the user for an F5 reaction round — a new toggle,
lighting/shader work, a compositing change, palette/LUT work, anything whose acceptance is
"look at it". Especially when tests and headless boots are green (they are structurally blind
to this defect class).

## Preferred behavior

Before the handoff, capture engine-side framebuffer screenshots yourself and eyeball the A/B:

1. Give the lab/scene a cmdline hook: on a `--shot=/abs/path.png` user arg, wait a settle
   timer, then `get_viewport().get_texture().get_image().save_png(path)` and quit. Pair it
   with state flags (`--feature-on`, `--lut-off`, exaggerated-parameter flags) so each variant
   is one CLI launch.
2. Launch from the CLI (real window required — dummy headless renders nothing; sandbox off per
   gotcha #47), then Read the PNGs and compare.
3. Only hand to the user once the change visibly reads in your own shots — or hand it over
   with the honest finding that it doesn't and why.

## Why

The space-miner light-twins toggle (task-105.06, 2026-07-11) shipped logically correct but
visually invisible at default energy — a compositing-order asymmetry (CanvasModulate multiplies
composites; 2D light adds) that no test, parse check, or headless boot could catch. The user's
"pressing O doesn't seem to change anything" round-trip was avoidable: three CLI framebuffer
shots diagnosed it in minutes (construction was fine, energy scale was the bug) and calibrated
the fix. Exaggerated-parameter shots (e.g. 60× energy) cheaply separate "not working at all"
from "working but too subtle".

## How to apply

- OS `screencapture` does NOT work for this — a background-launched game window has no focus
  and the capture grabs whatever is frontmost. MCP `editor_screenshot source="game"` fails on
  embedded runs (gotcha #43). The engine-side `--shot` hook is the reliable path.
- Keep the flags committed as lab tooling — they make every future visual round self-verifiable.
- A discriminator shot that hides the feature entirely (e.g. `--mode2d`) identifies which
  screen elements the feature even owns before judging its effect.
