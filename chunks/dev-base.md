<!-- chunk:dev-base | kind: bundle | single-source: cpalaka-claude-skills/chunks/dev-base.md -->
<!-- The dev-process base every dev Profile imports. Recursively @imports the universal base chunks. -->
<!-- NOT here (they vary by Profile, and @import cannot be undone): the git-flow fork (git-flow-squash / git-flow-noff), backlog-core, and codegraph — a Profile imports exactly one fork + backlog-core explicitly, and codegraph only where a `.codegraph/` index actually exists. -->
<!-- codegraph left the bundle 2026-07-25: it self-gates on `.codegraph/` and was inert in every
     project but chaipalaka.com, so every other session paid ~380 words to be told "ignore this
     chunk entirely". Import it explicitly in a project once that project has an index. -->

@~/.claude/chunks/git-sync-branch-start.md
@~/.claude/chunks/git-commit-format.md
@~/.claude/chunks/git-confirm-destructive.md
@~/.claude/chunks/sandbox-auto.md
@~/.claude/chunks/parallel-work.md
@~/.claude/chunks/verify-gate.md
@~/.claude/chunks/dev-practice.md
@~/.claude/chunks/code-hygiene.md
