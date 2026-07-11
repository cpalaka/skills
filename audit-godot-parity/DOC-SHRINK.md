# Gotcha-doc shrink (single-source migration)

Universal gotchas are single-source in the `godot-personal-gotchas` skill; a project's
`docs/godot-gotchas.md` should hold only project-local entries + a pointer. When a project doc
still mirrors the skill (a pre-migration full copy), offer to shrink it. The shrink DELETES
project-doc entries, so it is gated and **content-unidirectional** — it removes redundant project
copies; it never pushes skill content into the project.

Rails (all four hold; a shrink that can't satisfy them is not proposed):

1. **Removal only for verified BODY-level duplicates.** Propose deleting a doc entry only when its
   body is materially equivalent to a `gotchas/NN-<slug>.md` entry; show the matching entry + a
   `diff` in the parity table. A same-symptom entry whose FIX diverges is NOT a duplicate.
2. **Provenance/locality is KEEP-by-default.** A doc entry with a project `Confirmed by:` anchor, a
   project file path, param-tuned values, or a divergent fix is auto-classified KEEP and never
   auto-proposed for removal — surface it separately for a manual call. Before deleting a
   universal-bodied entry that carried an anchor, verify the anchor is captured in the skill entry
   first; if a divergence is a universal improvement, propagate it UP to the skill before removing
   the copy.
3. **Conservative default:** uncertain → keep + flag, never propose removal.
4. **Demarcate the project-write half** of the parity table from the skills-only half, so "this run
   will delete project-doc lines" is unmissable.

After approval: edit the project doc to the thin shape (project-local entries + the skill pointer,
matching `init-project/profiles/godot/templates/godot-gotchas.md`); re-grep to confirm only
project-local + pointer remain.
