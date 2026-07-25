# Adding new preferences

When a new workflow preference is established (user corrects approach, or user confirms an unusual approach worked):

1. **First — save to per-project memory** in `~/.claude/projects/<slug>/memory/`: one fact per file, descriptive kebab-case filename, frontmatter `metadata.type: feedback`, plus a one-line pointer in that project's `MEMORY.md`. This is the per-project layer, where it accumulates first.
2. **Later — propagate via `audit-godot-parity`** (pair 7: feedback memories ↔ this skill). The sync run handles translation from project-specific to generalized form.

If the preference is clearly generalizable from the start, you can write it here directly — but the curation discipline of "memory first, sync to skill" mirrors the gotcha pattern and is less error-prone.

Layout: a new preference = one new row in the SKILL.md index table + one new `preferences/N-<slug>.md` body file (N = the next preference number; slug = short kebab-case from the title). Body format: title + "When this applies" + "Preferred behavior" + "Why" + "How to apply" — match the existing entries' structure.

## Row budget

**Situation ≤ 110 chars, preferred behavior ≤ 320 chars.**

Deliberately looser than the gotchas index (140/60), because the two indexes do different jobs. A
gotcha row is a *pointer* — it answers "is my failure in here?" and you read the body for the fix.
A preference row is the *rule itself*: `SKILL.md` says the rows are the active rules and the body
is consulted only for edge cases. Compressing a preference row past the point where it still tells
you what to do would break the skill, not just slow it down.

So the budget caps paragraph-creep without gutting the instruction. Classification criteria, worked
examples and rationale go in the body; the row keeps the actionable directive.

This index is 10 rows and healthy today. The budget is written down because its sibling
(`godot-personal-gotchas`) grew from 8 rows to 78 in two months with rows growing in *length* too,
until compressing them was a project. Cheap to hold now, expensive to retrofit.

## Retiring a preference

Preferences go stale in a way gotchas don't: a workflow rule can be superseded by a *better* rule,
or made moot by tooling. Same mechanism as the gotchas skill —

- Add `**Status:** superseded-by #N — <what changed>` or `**Status:** retired <date> — <reason>`
  directly under the body's title heading. **Absent means live**; don't stamp the live ones.
- Collapse the index row to a one-line pointer that keeps the situation keywords searchable.
- Never renumber and never delete a body — the number is the index→body contract.

A preference retired because the user's practice changed is worth a note on *why*: the old rule
usually encodes a constraint that may come back.
