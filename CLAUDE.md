# CLAUDE.md — cpalaka-claude-skills

Operating notes for working **in this repo**. For *what each skill is* and how to install, see
[`README.md`](./README.md). For the domain vocabulary (Skill, Chunk, Template, Profile, Gotcha,
parity, propagate, …) read [`CONTEXT.md`](./CONTEXT.md) **first** — it is not auto-loaded. Consult
[`docs/adr/`](./docs/adr/) when a decision in your area may already be settled (chunk delivery, the
git-flow fork, the single init-project engine, gotcha single-source).

## What this repo is

The source of truth for personally hand-authored Claude Code and Codex skills, plus the machinery
that keeps them in step with the projects that use them (the `init-project` engine + Profiles, the
`chunks/` library, `audit-godot-parity`, `skill-updater`).

## Load-bearing facts (get these wrong and you break live skills)

- **Editing a file here is LIVE.** Selected `~/.claude/skills/<name>` and
  `~/.agents/skills/<name>` entries symlink *into* this repo, so a change to `<skill>/SKILL.md` or a
  host adapter changes the installed skill immediately — there is no install step. Verify a change
  in every affected host, not just by re-reading the file.
- **Personal skills are protected.** Everything here is hand-authored; `skill-updater` never rewrites
  it (it only refreshes *vendored* skills from the plugin / `~/.agents` channels). Don't treat a
  skill here as upstream-managed.
- **Rename/retire convention:** when renaming or retiring a skill / agent / template, update every
  **live** reference (other skills, README, CONTEXT.md, the init-project templates & profiles) and
  re-point its live `~/.claude/skills` and/or `~/.agents/skills` symlinks — but leave **historical
  records intact**: the dated design docs under `docs/superpowers/`, the `docs/adr/` entries, and the
  `tournament/reference/golden/` fixtures (recorded test data). Don't rewrite history to chase a
  rename.
- **A skill's lookup path and its maintenance protocol are different documents.** `SKILL.md` loads on
  every invocation; the filing/retirement protocol fires only when someone *edits* the catalog, which
  is rare by comparison. Keep the authoring procedure in a sibling `ADDING.md` behind a short stub —
  a third branch alongside `writing-great-skills`' by-invocation and by-sequence cuts, and the split
  `godot-personal-gotchas` and `godot-personal-preferences` both use. Corollary for any
  index-and-bodies skill: **give the index a written per-row character budget and a script that
  enforces it** (`godot-personal-gotchas/scripts/lint-index.sh`). Rows grow in length, not just count
  — that index reached 768 chars in a single table cell before anyone measured.
- **Chunk vs Template** (full detail in CONTEXT.md): a **Chunk** (`chunks/`) is single-source and
  referenced by Claude Code `@import` or a Codex `AGENTS.md` explicit-read directive — editing it
  updates every consumer at next launch. A **Template**
  (`init-project/profiles/<type>/templates/`) is *copied* into a project at init and thereafter kept
  aligned via a parity check. Know which you're editing.
- **The init-project engine is generic.** Adding a project TYPE means adding a `profiles/<type>.md`
  Profile, never editing the engine (ADR 0003).

## Workflow here

- Non-trivial changes get a spec + plan under `docs/superpowers/specs/` and `docs/superpowers/plans/`
  before implementation; record a load-bearing, surprising, hard-to-reverse decision as a
  `docs/adr/NNNN-slug.md` entry; keep `CONTEXT.md` current when the vocabulary shifts.
- Propagation of a project's learnings back into a skill is **project → skill only**, via
  `audit-godot-parity` (parity table → approval → surgical skill edits).
