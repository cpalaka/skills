# Handling cross-cutting MCP action changes

A renamed/removed MCP action (or a version-scoped behavior change) is NOT a single-pair diff — the stale token is scattered across the MCP guide, every agent definition, the personal-gotchas/preferences skills, and any tool-selection matrix/preamble. Handle it as a sweep, in this order:

1. **Fix the canonical source first.** Update the project's `docs/godot-mcp-guide.md` (and any memory that downstream content cites — e.g. an A/B verdict or tooling-research memory) before touching templates/skills. Downstream files quote these; fixing them first stops you copying the error forward.
2. **Propagate to templates AND personal skills together** — not one pair at a time. A half-applied rename leaves contradictory guidance live in a session.
3. **Re-verify by grepping every skill + template file for the OLD token** (e.g. `grep -rn 'get_errors\|mcp__godot-mcp__editor[^_]' …`). Expected residue: only "X was removed / does not exist" notes and dated "Confirmed by" historical anchors.

Distinguish **active guidance** (update to the new action) from **historical anchors** ("Confirmed by: <date> … surfaced via <old tool>") and **deprecation notes** ("`get_errors` was removed in v3.6.1") — the latter two are preserved or version-scoped, not blindly renamed. An active *recommendation* to use the old action is a miss; a "was removed" note is correct.
