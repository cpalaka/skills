# Gotcha-catalog single-source migration — design

**Date:** 2026-06-21
**Status:** Approved (brainstorm + docs-aware grill complete; ready for implementation plan)
**Repos:** `cpalaka-claude-skills` (source of gravity) + `space-miner-prototype` (first application)

---

## 1. Problem

The Godot gotcha catalog is **copied in full into every project** as `docs/godot-gotchas.md`,
and is *also* held — in a different shape — in the per-machine `godot-personal-gotchas` skill
(split layout: `SKILL.md` index + `gotchas/NN-<slug>.md` bodies). The catalog is ~95 % **universal**
(Godot / godot-ai / godot-mcp / GDScript / headless-harness / dev-machine / addon behavior) and
~5 % **project-local** (a project's own param-tuned quirk, scene/asset-bound gotcha, provenance).

Copying the universal 95 % into each project is what makes projects diverge: eight projects
(`2d-movement-prototype`, `arm-control`, `circle-combat-prototype`, `food-galaga`,
`godsquish-prototype`, `juice-tests`, `maw-prototype`, `space-miner-prototype`) each carry a
full-copy catalog, and the machinery actively re-creates the divergence — the retired
`gotcha-curator` agent filed every new gotcha into the project doc as "the ONLY full copy / source
of truth," and the retired `godot-gotcha-reviewer` agent hardcoded a frozen subset of the catalog's
detection patterns. Same disease, several layers.

## 2. Decision

**Universal gotchas live ONLY in the `godot-personal-gotchas` skill (the single source).** It is
per-machine, auto-loaded by context, and already referenced by every project's `CLAUDE.md`. A new
universal gotcha is written there once → every project (and every future project) benefits; nothing
to diverge because there are no copies. Each project's `docs/godot-gotchas.md` **shrinks to its
project-local entries + a pointer** to the skill. The init-project template becomes a **thin
starter** (pointer + empty project-local section), so new projects don't re-introduce divergence on
day one.

This is the same move already in force for dev-process **Chunks** (single-source in
`cpalaka-claude-skills/chunks`, referenced not copied). The "a fresh clone elsewhere won't have the
skill" property is identical to the existing Chunk model and already accepted; it is handled by the
**snapshot-on-going-public** principle (§9), not by maintaining a live per-project copy.

## 3. The classifier (one definition, reused everywhere)

The universal-vs-local test drives **three** consumers: the filing procedures (at discovery), the
`sync-godot-skills` shrink, and the `sync-godot-skills` leak-audit. One definition:

- **Universal → skill.** Reproducible on *another* project here given the same engine/tooling:
  anything about Godot, godot-ai, godot-mcp, GDScript, the headless harness, the dev machine — **and
  third-party addon behavior** (Rapier, etc.). Engine-class facts, not project quirks. *(Precedent:
  the Rapier-Fluid2D entry #33 already lives in the skill — addon gotchas are skill content, because
  keeping them project-local would lose reusable knowledge when a prototype is archived.)*
- **Project-local → thin doc.** Bound to *this* project's own code, scenes, assets, or param-tuning,
  such that it would not reproduce elsewhere. In practice a **narrow residue**.
- **Neither — conventions** (axis-flip, naming, game-design rules) are not gotchas → `docs/adr/` +
  `CONTEXT.md`, never the catalog. Matches `CONTEXT.md`'s own `Gotcha` vs `convention` distinction
  and `sync`'s existing "DO NOT propagate conventions."
- **Provenance:** a universal gotcha first confirmed in a project lives in the skill **carrying** its
  `Confirmed by: <project>` anchor (the skill already accumulates these). The project doc keeps
  **no** copy — provenance is preserved up in the skill, not stranded in the doc.

## 4. Component changes

### 4.1 `godot-personal-gotchas` skill (the single source)
- Harden the **"Adding new gotchas"** section: prepend the **classify step** (universal → here via
  the split layout; project-local → the project's `docs/godot-gotchas.md`) and keep the split-layout
  discipline (append an index row, create `gotchas/NN-<slug>.md`, don't renumber). This is where the
  retired curator's format discipline now lives.
- Add a short **"proactive pre-commit diff-scan"** usage note: before committing, scan the diff
  against each entry's *Detect proactively* pattern. This is the single source for the detection
  patterns the retired reviewer used to hardcode.
- Add a standing **migration-trigger note**: *"Universal gotchas live ONLY here. A project's
  `docs/godot-gotchas.md` should hold only project-local entries; if it duplicates this index it
  predates the migration — offer `/sync-godot-skills` to shrink it under approval."* Because the
  skill auto-loads in every Godot context, this fires in each un-migrated project until it is shrunk.

### 4.2 The project doc + thin starter
- End-state `docs/godot-gotchas.md` = (1) a one-line pointer to the skill as the universal source,
  (2) a project-local section (often empty), (3) a rewritten "adding" note (*universal → skill;
  project-local → append here*). **Keep the thin file even when the local section is empty** —
  consistent location, a ready home, a path `CLAUDE.md`/verify-gate can always cite.
- The init-project template `godot-gotchas.md` becomes this exact shape with an empty local section.

### 4.3 `sync-godot-skills` remodel
- **Content flow stays strictly unidirectional (project → skill).** The skill never pushes content
  into a project. *Amendment:* the prior "Do NOT modify any project file" constraint is relaxed for
  **one** operation only — the **doc-shrink** (deletion of verified-duplicate universal entries from
  a project doc), gated by the existing parity-table approval. This is project-side *cleanup of
  redundant copies*, not skill→project content flow, so unidirectionality of content is preserved.
- New **leak-audit**: on any run, diff each project doc against the skill and flag universal entries
  that leaked into the doc (recommend removal); a full-mirror doc is flagged as un-migrated.
- The pair-6 "promote project→skill" path largely retires (the filing procedure now writes universal
  gotchas straight to the skill at discovery). Sync's residual gotcha roles: **leak-audit**,
  **re-anchor** (version stamps), and the gated **shrink**.

### 4.4 Retire `gotcha-curator`
- Delete the template (`init-project/profiles/godot/templates/agents/gotcha-curator.md`) and
  space-miner's copy (`.claude/agents/gotcha-curator.md`); remove its stamp entry from the godot
  profile recipe. Its job folds into §4.1's hardened "Adding new gotchas" (universal) and §4.2's
  thin-doc "adding" note (project-local). The main agent — which holds the debugging context — files
  directly. *(Rationale: the migration removes the curator's core justification, the dual-write.)*

### 4.5 Retire `godot-gotcha-reviewer`
- Delete the template and space-miner's copy; remove its stamp entry. Fold a **skill-sourced gotcha
  self-scan** into the **verify-gate** (a per-project knob line: *"gotcha-scan: scan the diff against
  the `godot-personal-gotchas` skill's Detect-proactively patterns"*). The patterns stay
  single-source in the skill (§4.1). *(Rationale: its hardcoded check list was itself a drifting
  partial copy of the catalog — the exact disease; it could not survive unchanged.)*
- **`godot-export-verifier` is out of scope and untouched** — it is a pre-push export gate, not
  gotcha machinery.

### 4.6 `CLAUDE.md` pointers
- Source side (fixes future projects): godot profile **`CLAUDE.md.full`** lines 17 ("cloning
  benefits" / "catalog"), 24 ("add it to BOTH"), 27 (sync "after adding entries to
  docs/godot-gotchas.md"), 28 (agent list — drop curator/reviewer, keep export-verifier). The
  `CLAUDE.md.snippet` carries no gotcha guidance → untouched.
- space-miner now: **`CLAUDE.md`** lines 77, 84, 87, 88 (same four edits).

### 4.7 Profile recipe `godot.md`
- Remove the two agent stamp entries (lines 47–48). The doc stamp (line 34) stays (now the thin
  starter). DoD/VERIFY_EXAMPLES that reference the reviewer (lines 88, 94) → the skill-sourced
  verify-gate scan; DoD line 95 ("New gotchas filed in `docs/godot-gotchas.md`") → "universal →
  skill, project-local → doc."

### 4.8 `CONTEXT.md` glossary (apply *with* the migration, not ahead of it)
Sharpen the `Gotcha` entry to encode the canonical vocabulary (the `Template` entry's "gotcha-catalog
**seed**" survives untouched — the thin seed genuinely is a Template):

```markdown
**Gotcha**:
A non-obvious Godot 4.x failure observed first-hand and indexed by *symptom*,
not component — typically "I set X, no error fired, nothing changed." Many have
no error signal, so they must be recognised, not grepped. Body shape: Symptom /
Cause / Fix / Detect proactively / Confirmed by. A gotcha is either **universal**
— reproducible on any project here given the same engine / tooling / addon, so it
lives *only* in the `godot-personal-gotchas` skill (the single source) — or
**project-local** — bound to this project's own code, scenes, assets, or tuning,
so it lives in the project's `docs/godot-gotchas.md`. (A *convention* — axis-flip,
naming — is not a gotcha; it belongs in an ADR.)
_Avoid_: known issue (a gotcha is a hard-won field observation, not a release
note), trap, edge case (an edge case is expected; a gotcha is surprising);
mirroring the universal catalog into a project doc (single-source — the skill is
authoritative; the project doc holds only project-local entries).
```

### 4.9 ADRs
- **System ADR** → skills-repo `docs/adr/0004-gotcha-catalog-single-source.md` (durable decision;
  hard-to-reverse, surprising-without-context, real trade-off — same class as 0001/0003).
- **Application ADR** → space-miner `docs/adr/0002-gotcha-catalog-single-source.md`, pointing at
  0004 (discoverable *in* the project).

## 5. The rails (sync's gated shrink must never lose content)

1. **Removal only for verified skill-duplicates — at BODY/fix level, not symptom level.** An entry
   is proposed for deletion only when its body is materially equivalent to a `gotchas/NN` entry; the
   parity table shows the matching entry **+ a diff**. A same-symptom entry whose *fix* diverges
   (project tuned it, extra caveat) is **not** a duplicate.
2. **Provenance/locality is KEEP-by-default.** Any doc entry carrying a project `Confirmed by:`
   anchor, a project file path, param-tuned values, **or a divergent fix** is auto-classified *keep*
   and never auto-proposed for removal — surfaced separately for a manual call. Before deleting a
   universal-bodied entry that also had an anchor, sync verifies the anchor is captured in the skill
   entry first. If a divergence is actually a universal improvement, it is propagated **up into the
   skill** before the doc copy is removed.
3. **Conservative default:** when classification is uncertain, keep + flag — never propose removal.
4. **The project-write half is visually demarcated** in the parity table from the skills-only half,
   so "this run will delete project-doc lines" is unmissable.

## 6. Rollout

- **space-miner now** (reference application): classification audit → propagate any universal-missing
  up → shrink `docs/godot-gotchas.md` → delete its two agent copies → `CLAUDE.md` pointers → ADR 0002.
- **The other 7: lazy-migrate on next touch.** No edits now. The skill's migration-trigger note
  (§4.1) + sync's leak-audit (§4.3) make each un-migrated project self-announce; the shrink is a
  one-command `/sync-godot-skills` (gated). Dead prototypes simply stay as-is (frozen, harmless).
- **Source-side fixes happen once** and auto-correct every *future* project via the templates.

## 7. Verification

- **Classification audit** before any deletion: match each space-miner doc entry against the skill's
  42 entries; label *universal-verified-in-skill* / *universal-missing-from-skill* / *project-local*
  / *convention(→ADR)*. **Propagate every universal-missing entry up to the skill first** — the
  shrink never drops knowledge. This *is* the rail-#1 parity table.
- **Post-shrink checks:** re-grep the doc → only project-local + pointer remain; the skill carries
  every universal entry with provenance anchors intact; `CLAUDE.md`/verify-gate/profile all point at
  the right layer; run the verify-gate gotcha-scan once to confirm it loads the skill as its source.
- **Workflow fan-out** (execution-phase orchestration): classify the ~40 entries in parallel against
  the skill, each agent returning `{entry, verdict, evidence}`; the same harness replays per-project
  for the lazy-7 later.

## 8. Execution order

1. **Skills-repo source-side edits** (once): skill hardening (§4.1) → thin-starter template (§4.2) →
   `sync-godot-skills` remodel (§4.3) → retire both agents (§4.4, §4.5) → `CLAUDE.md.full` (§4.6) →
   profile recipe (§4.7) → `CONTEXT.md` (§4.8) → ADR 0004.
2. **space-miner application** (reference impl): §6 + ADR 0002.

## 9. Non-goals & preserved principles

- **Content stays unidirectional (project → skill).** The shrink is gated project-side cleanup, not
  skill→project content flow. Skill→project sync remains ad-hoc agent reasoning, **not codified**.
- **Provenance is preserved** (rail #2): project `Confirmed by:` anchors are intentional kept
  divergence, never scrubbed; the template de-identified form is never pushed over a real anchor.
- **Snapshot-on-going-public is documented, not built (YAGNI).** If a project ever goes public or
  shared, do a one-time snapshot export of the gotchas it relies on into the repo *at that moment* —
  do not maintain a live per-project copy. No mechanism is built now.
- **`godot-export-verifier` untouched** — different subsystem.
- **No convention-vs-gotcha reclassification during the shrink** — if a doc entry looks like a
  convention, flag it for a manual ADR move; the shrink does not relitigate it.
