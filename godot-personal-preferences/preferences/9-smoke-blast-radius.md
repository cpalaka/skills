# 9 — Scope a verification smoke to the CHANGE's blast radius, not the obvious surface

## When this applies

A task flips a **project-wide or global setting** — a render/physics mode (`physics_interpolation`,
MSAA, a `project.godot` rendering/physics key), a feature flag, a display/quality toggle — and you
are about to F5 / smoke-verify it. Distinct from a local feature change whose surface is exactly
what you built.

## Preferred behavior

Before the F5, **enumerate the setting's blast radius**: every node-type and subsystem the setting
affects, not just the feature you were building. Then aim the smoke at ALL of them. If you can't
easily enumerate it, that itself is the signal to look wider (docs, a grep for the affected pattern).

## Why

A global setting's blast radius is **wider than the feature under construction**. A smoke aimed only
at the feature's obvious surface gives false confidence while a *different* subsystem silently
regresses — and the headless suite is frequently **structurally blind** to render-time settings (the
dummy renderer never interpolates/rasterizes), so the human F5 is often the ONLY non-blind gate. If
that gate is mis-aimed, a real regression signs off clean.

## How to apply

- Ask "what does this setting touch?" and list it (node types, movers, materials, UI, the camera)
  before F5.
- Aim the F5 at each affected surface, not just the primary one.
- Treat a green headless suite as *no evidence* about a render-time setting — it can't see it.

Observed: space-miner-prototype task-022 (2026-07-07) — a `physics_interpolation` flip was F5'd at
the player/camera + a spawn streak and signed off clean, but the flag also juddered every
`_process`-driven asteroid/debris (`godot-personal-gotchas` #56); the headless suite (359/359) was
blind and only an adversarial review caught it.
