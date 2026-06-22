# 4. Gotcha catalog is single-source in the godot-personal-gotchas skill

## Status
Accepted — 2026-06-21.

## Context
The Godot gotcha catalog was copied in full into every project's `docs/godot-gotchas.md` (8
projects) and also held in the per-machine `godot-personal-gotchas` skill. ~95% of entries are
universal; copying them per-project is what makes projects diverge, and the `gotcha-curator` agent
actively re-created the divergence by filing each new gotcha into the project doc as "the source
of truth."

## Decision
Universal gotchas live ONLY in the `godot-personal-gotchas` skill (the single source, auto-loaded).
Each project's `docs/godot-gotchas.md` shrinks to project-local entries + a pointer; the
init-project template becomes a thin starter. New gotchas are classified at discovery (universal ->
skill, project-local -> doc, convention -> ADR). `sync-godot-skills` gains a parity-table-gated
doc-shrink (body-level dedup, provenance KEEP-by-default) and a leak-audit; the `gotcha-curator`
and `godot-gotcha-reviewer` agents are retired into the skill's procedures. Rollout: space-miner
now; the other 7 lazy-migrate on next touch.

## Consequences
Single source for universal knowledge; future projects auto-correct via the thin-starter template.
Same per-machine property as Chunks — a fresh clone elsewhere lacks the skill; handled by
snapshot-on-going-public (documented, not built). Design: `docs/superpowers/specs/2026-06-21-gotcha-catalog-single-source-design.md`.
