# Adding, retiring and restructuring gotchas

Procedure for changing the catalog. The lookup path (`SKILL.md`) deliberately does not carry
this — it loads on every invocation, and filing a gotcha is rare next to looking one up. Same
index/body split the catalog itself uses.

## Filing a new gotcha

**This skill is the SINGLE SOURCE for universal gotchas** — do not copy them into any project's
`docs/godot-gotchas.md`. Classify first:

- **Universal** — reproduces on any Godot project here given the same engine / tooling / addon
  (Godot, godot-ai, godot-mcp, GDScript, the headless harness, the dev machine, a third-party
  addon). **File it here** (steps below).
- **Project-local** — bound to one project's own code, scenes, assets, or param-tuning. File it in
  *that project's* `docs/godot-gotchas.md`, not here.
- A *convention* (axis-flip, naming, a design rule) is not a gotcha — record it as a `docs/adr/`
  entry, in neither catalog.

To file a universal gotcha here:

1. Append a row to the **Gotcha index** table, within the row budget below.
2. Create `gotchas/NN-<slug>.md` (NN = the new row number, zero-padded to 2 digits; slug = short
   kebab-case from the title) with **Symptom / Cause / Fix / Detect proactively / Confirmed by**
   subsections (same format as existing body files). A gotcha first hit in a specific project keeps
   its `Confirmed by: <project> <date>` anchor here — provenance lives in the skill.
3. Keep entries symptom-first — what you'd type into a search box at 11pm.
4. Do NOT renumber existing entries — the row number is the stable pointer from index to body file.
5. If the **Detect proactively** section can be expressed as a grep / filesystem / git test, add it
   to `scripts/precommit-scan.sh` AND plant a matching defect in `scripts/selftest.sh`. A check with
   no fixture is a check nobody has ever seen fire.
6. Add it to the right **Symptom families** grouping, or start a new one.

### Row budget (load-bearing — the index is a hot path)

Check it with `scripts/lint-index.sh` (add `--prefs` for the preferences index). It enforces
the budget, catches an orphaned row or a duplicate number, and trips the 120-row split
tripwire. A budget nobody measures is a suggestion.

**Symptom ≤ 140 chars, cause ≤ 60 chars.** The index is loaded on every invocation of this skill;
the bodies are not. A row exists to answer "is my failure in here?" — the full cause sentence, the
version anchors, and the fix all live in the body, which is read only on a match.

This budget is not cosmetic. The index grew from 8 rows to 78 in two months, and rows grew in
*length* as well as count until one was 768 characters — a paragraph inside a table cell. Without a
written budget that recurs.

- Lead with the error text or the exact call that fails. That is what gets searched.
- Cause is a *fragment*, not a sentence: "Variant-returning math globals", not an explanation.
- Cut version anchors, sibling refs, and measured figures from the row — the body keeps them, and
  siblings belong in **Symptom families**.

### When the index outgrows this shape

**At 120 rows, split the two largest tool-conditional clusters** — the godot-ai/godot-mcp bridge
entries and the headless-harness entries — into `gotchas/mcp-bridge.md` and `gotchas/headless.md`,
each fronted by a one-line index stub naming when to open it.

Deliberately *not* done at 78 rows: those clusters are ~39 entries, worth ~1k tokens compressed,
and both are load-bearing in most Godot sessions here — a session driving godot-ai or running the
headless suite would pay an extra read almost every time to save a fraction of what the compression
already recovered. The trade flips once the index is large enough that most of it is irrelevant to
any given session.

### Retiring an entry

An entry whose environment has gone away is dead weight in the hot path, and "never renumber" means
it stays there forever unless something removes it. See **[`gotchas/RETIRED.md`](gotchas/RETIRED.md)**
for the `**Status:**` field, the collapse procedure, and the standing rule that bodies and numbers
are never deleted. Absent Status means live — do not stamp the live entries.
