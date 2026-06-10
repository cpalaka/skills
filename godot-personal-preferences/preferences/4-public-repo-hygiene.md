### 4. Public-repo hygiene audit before publishing

**When this applies**

A Godot project is being made public for the first time (open-sourced, deployed as a portfolio demo, pushed to a public GitHub repo, etc.) — OR an existing public Godot project is having new top-level files added.

**Preferred behavior**

Audit `.gitignore` for AI-workflow plumbing and process-scratch BEFORE the public push (not after). The default is: showcase the project, not the workflow.

**Gitignore by default (private):**
- `CLAUDE.md` — project workflow contract for Claude
- `.claude/` — subagents, settings.local.json, any other Claude-tooling files
- `docs/superpowers/{plans,specs}/` — mid-iteration plans and design specs
- One-shot frozen reference docs (session handoffs, authoring guides) under `docs/`
- `.superpowers/` — ephemeral session state

**Keep public (community-valuable):**
- `.mcp.json` — benign config listing which MCP servers
- `docs/godot-mcp-guide.md`, `docs/blender-mcp-guide.md` — useful to other Godot devs
- `docs/godot-gotchas.md` — useful to other Godot devs
- `addons/godot_mcp/` — vendored MCP plugin (standard practice to commit Godot addons)

**Why**

Going public raises the bar. The framing: "showcase the project, not the workflow." MCP guides and gotchas catalog stay because they have community value to other Godot devs; AI plumbing and process scratch is personal-workspace exposure that doesn't serve outside readers.

**How to apply**

When the user signals a public push is imminent ("let's publish this", "I'm pushing to a public repo", "set up the demo deploy") — proactively audit `.gitignore` and surface a punch list before they push. Don't wait for them to ask.

When adding a new top-level doc to an already-public Godot project, ask "should this be public?" before committing — default to private unless there's a clear community-value argument.
