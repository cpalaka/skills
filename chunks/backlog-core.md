<!-- chunk:backlog-core | kind: value-variant | single-source: cpalaka-claude-skills/chunks/backlog-core.md -->
<!-- Delivered by Claude @import or a Codex AGENTS.md explicit read through the host's chunk symlink.
     Edit here only — no per-project copies, no parity. -->

## Task tracking (backlog.md)

The project board (Backlog.md, under `backlog/`) is the **single source of progress** for
all forward-looking work — not memory files, doc ledgers, or an external issue tracker.
`docs/adr/` stays the only decision system; design docs/specs/plans stay in `docs/`
(backlog's own `decisions/` and `docs/` folders are unused). Per-project values — pinned
backlog **VERSION**, the plan-doc directory (**PLANS_DIR**), the **VERIFY_EXAMPLES** that
illustrate AC, and the standing **DoD items** — live in this project's `<!-- knobs:backlog-core -->`
block, not in this chunk.

**Session start: check the board, set your task In Progress.** At the start of a session, list
the board (`backlog task list --plain`, or `backlog board`) to orient, then move the task you
are about to work on to **In Progress** (`backlog task edit <id> -s "In Progress"`). Because the
board is the single source of progress, this status transition is part of the process, not
optional — a task silently worked while still "To Do" is invisible to the board.

**CLI-only, `--plain`, NO MCP, no generated agent instructions.** Drive the board through the
`backlog` CLI exclusively; the MCP server resolves repo root once at startup and writes task
files to the wrong repo from a worktree, so it is off. Backlog's generated agent-instruction
files are off too — these chunks are the agent's instructions, not a backlog-emitted guide.
Always pass `--plain` when listing/viewing. Never hand-edit files
under `backlog/` — the CLI owns IDs, naming, and frontmatter. (`backlog/config.yml` is the
one file fine to hand-edit; `backlog config set` does not expose `definition_of_done`.)

**`task create` is main-session-only, and seeding needs an explicit go.**

- Only the **main session** creates or edits tasks — never parallel subagents or workflow
  agents. ID generation is a max+1 scan, so concurrent creation collides. (A solo
  interactive worktree session is the main session *for its own task*, so its `task edit`
  writes are fine; only `task create` stays main-repo-only — see `parallel-work`.)
- **Create from a fresh board view — a feature branch is a stale board.** `backlog draft create`
  and `task create` assign IDs by a max+1 scan of the **current branch's** `backlog/`, so creating
  on a branch is blind to items added on `main` (or a sibling branch) since it diverged → a
  colliding ID that a later merge keeps as a silent **duplicate** (the two files have different
  name-slugs, so nothing flags a textual conflict). Prefer doing board grooming on `main`; if you
  do create on a branch, re-sync it with `main` **first** so the scan sees every existing ID, and
  re-check IDs right before the merge if `main`'s board moved meanwhile.
  **The same hazard owns EVERY hand-numbered sequence in the repo, not just task ids** — ADRs
  (`docs/adr/NNNN-slug.md`), migrations, numbered gotchas. All are max+1-by-eye against the current
  branch, and two same-numbered files with different slugs merge with **no textual conflict at
  all**, so the duplicate is silent in exactly the same way. Before minting one on a branch, check
  the number against `main` *and* any sibling worktree; if a concurrent session already took it,
  renumber **yours** when theirs is committed or already cited anywhere outside its own branch (a
  note, a doc, a memory referencing the number) — a live reference is far more expensive to chase
  than a rename.
- **Populating/seeding the board, and any task decomposition, require an explicit
  go-ahead in chat before the first `backlog task create` runs.** Propose the list
  (titles + one-liners) and wait for a yes. A spec that says "decompose this into tasks"
  names the eventual work; it does not pre-approve a particular decomposition at this
  moment. A standing CLI authorization removes per-call permission clicks on mechanics — it
  does not transfer decision authority over board scope/structure. A checkpoint announced
  in a plan is binding; never drop it mid-task because permissions make proceeding possible.

**AC vs DoD — AC is the Done-GATE, DoD ends in a sign-off gate.**

- **AC (acceptance criteria) = task-specific verification** — the per-task Done-gate (e.g.
  the project's VERIFY_EXAMPLES). Check each criterion (`--check-ac N`) only as it is
  empirically proven; never pre-check a criterion that needs the user's eyes. Lean on
  `verify-gate` for what the verification pass actually runs.
- **DoD (definition of done) = standing gates that apply to every task** — held in
  `backlog/config.yml`, separate from per-task AC, stamped at task-creation time (config
  changes do not back-propagate; `task edit --check-dod`/`--dod` can retrofit). The DoD list
  **always ends in an explicit user sign-off item.**
- **Done requires explicit user sign-off — never auto-close on AC/DoD pass.** The
  sign-off DoD item is checked only on the user's word. Human-in-the-loop at all four gates:
  task pick → plan approval (before code) → verification → final sign-off.
- **Retiring one criterion? SUPERSEDE IT IN PLACE — `--remove-ac` renumbers everything below
  it, silently.** A task's own notes, and sibling tasks' notes, routinely cite criteria by
  index ("READ BEFORE TESTING AC#6", "only AC#5 is blocked"). Removing #5 shifts #6→#5, #7→#6,
  and every one of those references now points at the wrong criterion, with no error anywhere
  and nothing that validates the link. So when a criterion becomes unreachable, rewrite it as a
  superseded marker (`SUPERSEDED by task-NNN — was: '<original text>'. <why it can no longer be
  observed>.`) rather than deleting it. If you must genuinely renumber, remove indices in
  **DESCENDING** order (each removal renumbers what follows) and then re-add in order:

  ```sh
  backlog task edit NNN --remove-ac 8 --remove-ac 7 --remove-ac 6 --remove-ac 5   # descending
  backlog task edit NNN --ac "<new #5>" --ac "<old #6>" --ac "<old #7>" --ac "<old #8>"
  ```

  Do **not** reach for `--acceptance-criteria` to rewrite the list wholesale: despite reading
  as a setter ("set acceptance criteria"), it **APPENDS** and silently swallows near-duplicates
  — measured on 1.45.2, feeding back 8 criteria with one reworded yielded **9**. Task files are
  git-tracked, so check `git status --porcelain` on the file first and recover any misfire with
  `git checkout -- "backlog/tasks/task-NNN - ….md"`. (Same replace-vs-append trap family as
  `--desc`/`--notes` below.)

**Mark Done ON THE BRANCH, before the merge.** After the user signs off on the diff, on the
feature branch run `backlog task edit <id> --check-ac N … --check-dod 1 … -s Done` and
commit the task-file change there (`auto_commit` stays false so the edit batches with code,
one task-file change per code commit). Whether the `--notes` summary carries a commit SHA is
**a merge-model decision — follow your imported git-flow variant's notes-SHA policy**
(`git-flow-squash` vs `git-flow-noff`); this chunk states no SHA rule of its own. Merging
never auto-closes a task — Done is set by `task edit` only, after sign-off. The task↔commit
link is the commit subject's **`<area>/task-NNN`** scope (the slice/subsystem `<area>` plus the
owning task id) and a **`Refs task-NNN`** footer — together `git log --grep "task-NNN"` resolves
task↔commit. Always put the owning task in the scope so it shows on every `git log --oneline`
line; **zero-pad the task id to 3 digits everywhere it appears — scope and footer alike
(`task-019`, never `task-19`)**. (Subject/footer mechanics: `git-commit-format`.)

**Board grooming not owned by one task takes a plain area scope.** Pure board maintenance that
no single task owns — new milestones, drafts, cross-task guardrail pins — uses a plain
`chore(backlog): …` subject with **no `task-NNN`**; batch such grooming into one commit rather
than one commit per edit.

**Propagate downstream findings onto the board.** When a task — especially a spike or any
decision-bearing task — produces a result that constrains or informs *other* tasks, do not
leave the finding only in an ADR / spec / spike doc. As part of the producing task's own
completion (before marking it Done), **pin it onto each dependent task**: a hard requirement
becomes an `--ac` on the dependent task (a Done-gate); a pointer becomes an
`--append-notes` reference. Name the source task and doc in the text. Use `--ac` /
`--append-notes` — **never `--desc` / `--notes`, which replace the whole field.** (Same trap
one level up: `task edit --dep` and `--doc` REPLACE their entire list — pass the complete
set; `--ac` appends.) The
dependent task's own AC/description is what a future session reads first; an ADR it might
never open is not enough.

**`dependencies:` is INERT DOCUMENTATION, not an enforced gate — never design a control on
it.** Backlog defines exactly three statuses (`To Do` / `In Progress` / `Done`), has no
`Blocked` state, computes no blocked set, and prints no blocked marker in `task list --plain`;
the field is echoed by `task view` and otherwise unread. So a dep edge records *intended
sequencing* only — a task whose blockers are all open is fully claimable, and closing a blocker
sets it `Done`, which **satisfies** dependents rather than severing them (measured on
space-miner 2026-07-30: 96 edges already pointed at `Done` rows, 0 dangling). Two consequences.
(a) Any "frontier = unblocked" or "this un-gates that" reasoning is a **convention the humans
and agents must honour**, not something the tracker enforces — write the sequencing intent into
the AC text where a session will read it. (b) A row that is **archived** rather than closed
leaves its dependents pointing at an id that no longer resolves *and* frees that id for silent
reuse, so prefer close-in-place over archive whenever anything depends on the row.

**The pin target must be a TASK — an AC that pins a finding onto a DRAFT is unsatisfiable by
construction.** Drafts have no edit verb at all (`backlog draft` is `list|create|archive|
promote|view`), and `backlog task edit draft-NNN --append-notes …` is refused outright with
`Task draft-NNN not found` — while this chunk separately forbids hand-editing files under
`backlog/`, so there is no legal escape hatch. The trap is the *timing*: the criterion reads
as ordinary board hygiene when written, and is discovered to be impossible only at CLOSE
time, after all the work it gated is already done. So before writing "pin X onto draft-NNN"
into an `--ac`, either `draft promote` it first (which mints a fresh task id and makes the
pin reachable) or name in the AC's own text where the pin will actually land — the owning
ADR, or the producing task's notes. Same discipline as `--desc`/`--notes` above: know which
verb actually exists before you commit a future session to using it.

**Plan docs are scratch; the board is truth.** Multi-task slices keep a plan doc under
PLANS_DIR linked via `--doc`, with a `Tracked by: task-NNN` header — but **board status/AC
is the single source of progress; plan-doc checkboxes are in-session scratch.** A completed
plan gets a STATUS banner (executed/merged, refs) instead of trusting ticks. Single-session
tasks plan in-task via `--plan`. Standing gates live in DoD defaults, not AC.

**Drafts, labels, milestones.**

- **Drafts = ungrilled ideas** — `backlog draft create` captures a phase-head; promote to a
  task only once acceptance criteria are written (at the end of a grilling/design session).
  Drafts have **no CLI edit verb** (create/archive/promote/view only), so set labels at
  `draft create -l` time — they cannot be retrofitted later.
- **Labels = free-form**, multiple per item via `-l a,b`, added organically as themes
  emerge (the config `labels:` list is suggestions, not a closed vocabulary). Note
  `backlog task list` has no label filter — label-slicing is web-UI / grep territory.
- **Provenance: every task/draft created through Claude carries `claude-generated`**, set in
  `-l` at create time — the discriminator is creation *mechanism*, not idea origin. Items
  the user enters directly (web UI) stay unlabeled.
- **Milestones = phases** (`-m <phase>`, auto-created on first use).

**Public repo:** task files are repo content — same hygiene rules as code.
