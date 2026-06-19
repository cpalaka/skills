# Single `init-project` engine + declarative Profiles, not per-type init skills

**Status:** accepted

The per-type init skills (`init-backlog-project`, `init-godot-claude-project`) each
re-encoded the shared dev-process base and would multiply as new project types
appear. We collapse them into ONE `init-project` engine skill that consumes
declarative **Profiles** (a frontmatter manifest of chunks / git-flow fork /
templates / knobs + an optional bespoke imperative recipe); adding a project type
means adding a Profile, and the engine never changes.

**Considered options:** (a) keep separate per-type skills chained onto an
`init-dev-project` base — rejected because the owner expects many more project types
and prefers retiring the separate skills for a single, maximally-DRY engine;
(c) separate skills each re-listing the base — rejected (re-introduces the
duplication this effort removes).

**Consequences:** per-type *content* does not vanish — godot's Templates and their
stamp/parity lifecycle (`sync-godot-skills`) persist as Profile assets. The engine
centralizes generation *logic*, not the type-specific *data*.
