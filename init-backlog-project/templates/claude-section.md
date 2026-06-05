<!--
Template for the project CLAUDE.md "Task tracking" section.
Fill the {{...}} placeholders, drop these comments, and place the section
before the project's "Running"/build section.

Placeholders:
  {{VERSION}}            — pinned backlog.md version (e.g. 1.45.2)
  {{PLANS_DIR}}          — where multi-task plan docs live (e.g. docs/superpowers/plans/,
                           docs/plans/). Omit the plan-doc sentence entirely if the
                           project won't use plan docs.
  {{VERIFY_EXAMPLES}}    — the project's task-specific verification idioms
                           (Godot: "F5 checks, behavior pins" · web: "PR preview,
                           screenshot diffs, e2e green")
-->

## Task tracking (backlog.md)

The project board lives in `backlog/` (Backlog.md, pinned v{{VERSION}}, CLI-only — no MCP). Forward-looking work goes there, not in memory files or doc ledgers. `docs/adr/` stays the only decision system; design docs/plans stay in `docs/` (backlog's decisions/ and docs/ folders are unused).

- **Session start: check the board** — `backlog task list --plain` (or `backlog board`). Set the session's task to `In Progress`.
- **Always `--plain`** when listing/viewing tasks. All task operations via the `backlog` CLI — never hand-edit files in `backlog/` (the CLI owns IDs, naming, frontmatter).
- **Only the main session creates/edits tasks** — never parallel subagents/workflow agents (ID generation is max+1 scan; concurrent creation collides).
- **AC = task-specific verification** ({{VERIFY_EXAMPLES}}). Multi-task slices keep a plan doc in `{{PLANS_DIR}}` linked via `--doc`, and the plan doc carries a `Tracked by: task-NNN` header — **board status/AC is the single source of progress; plan checkboxes are in-session scratch** (completed plans carry a STATUS banner instead). Single-session tasks plan in-task via `--plan`. Standing gates live in Definition of Done defaults, not AC.
- **On completion**: `backlog task edit <id> --check-ac N … --notes "<summary + commit hash>" -s Done`; commit task-file changes with the code commit (`auto_commit` is false). **Done requires explicit user sign-off** — never set `-s Done` because AC/DoD pass; the sign-off DoD item is checked only on the user's word.
- **Milestones = phases**; **labels = free-form** (multiple per task/draft via `-l a,b`), added organically as themes emerge.
- **Drafts = ungrilled ideas** — `backlog draft create` to capture; promote at the end of a grilling/design session, writing AC at promotion time.
- Public repo: task files are repo content — same hygiene rules as code.
