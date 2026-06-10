### 2. F5 verification batching during subagent-driven plan execution

**When this applies**

Executing a multi-task plan via the `superpowers:subagent-driven-development` skill in a Godot project, where individual tasks would otherwise prompt for F5 manual verification. (Whether subagent-driven execution is the right mode at all is gated by preference #8 — plan specificity; this preference presumes that question already answered yes.)

**Preferred behavior**

- **Skip per-task verification scaffolds.** Don't add "USER ACTION: F5 and verify X" steps per-task in subagent dispatches. Don't add temp `print()` calls that get committed and reverted.
- **Add instrumentation working-tree-only.** If verification needs debug prints, overlays, or visualizers, add them in the working tree but DO NOT commit them. Note their existence so they can be reverted in one shot.
- **Batch verification at end-of-plan.** Present a single F5 verification checklist after all tasks complete. User runs through it once.
- **Revert instrumentation on confirmation.** Once user confirms verification passes, revert all working-tree-only instrumentation in a single revert before finalizing.

**Why**

Per-task F5 pauses break the subagent flow (user has to context-switch to the editor for every micro-step) and pollute commits with add-then-revert print noise that defeats the one-commit-per-task discipline. Batching preserves both: clean per-task commits AND single user-attention burst at the end.

**How to apply**

When dispatching subagents during a Godot plan execution:

1. Plan tasks as logical units (not verification gates).
2. If a task needs instrumentation to be verifiable, add it in the working tree without committing.
3. Maintain a running list of "things to verify at the end."
4. Final task: present the F5 checklist + the instrumentation-revert plan.
5. On user OK: revert instrumentation, commit any non-instrumentation residue, mark plan complete.
