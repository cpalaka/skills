# Adding new preferences

When a new workflow preference is established (user corrects approach, or user confirms an unusual approach worked):

1. **First — save to per-project memory** as `feedback_<slug>.md` in `~/.claude/projects/<slug>/memory/`. This is the per-project layer, where it accumulates first.
2. **Later — propagate via `audit-godot-parity`** (pair 7: feedback memories ↔ this skill). The sync run handles translation from project-specific to generalized form.

If the preference is clearly generalizable from the start, you can write it here directly — but the curation discipline of "memory first, sync to skill" mirrors the gotcha pattern and is less error-prone.

Layout: a new preference = one new row in the SKILL.md index table + one new `preferences/N-<slug>.md` body file (N = the next preference number; slug = short kebab-case from the title). Body format: title + "When this applies" + "Preferred behavior" + "Why" + "How to apply" — match the existing entries' structure.
