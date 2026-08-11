<!-- chunk:codegraph | kind: invariant | single-source: skills/chunks/codegraph.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## Code intelligence — CodeGraph (opt-in, self-gating, per-machine)

**Self-gates on `.codegraph/` — INERT when absent.** This chunk activates only when a
`.codegraph/` directory exists at the repo root. **If there is no `.codegraph/`, ignore
this chunk entirely** — do not mention CodeGraph, do not try to install it, do not change
how you locate code. The index, `.mcp.json`, and the install are all gitignored and
**per-machine**: a clone or a fresh worktree has *no* `.codegraph/` until someone runs the
init on that machine, so absence is the normal default, not a problem to fix.

**When present, query CodeGraph BEFORE grep/find/read.** To locate or understand code —
find a symbol, trace callers/callees, follow a flow — reach for CodeGraph first (the
`codegraph_*` MCP tools, or the `codegraph` shell CLI) rather than starting with grep,
find, or reading files. This is the same "use the more precise tool first" discipline that
governs skill invocation — see `dev-practice`. It wins clearly on
locate / callers / flow / behavior queries; for a whole-directory survey, grep is still
fine.

**Impact / affected OVER-REPORT — treat results as a superset, not the answer.**
`impact`, `affected`, and an explore call's blast-radius follow import/reference edges
*structurally*, giving an **upper bound**, not a semantic one. A flagged dependent may not
actually consume the symbol across its public interface (a UI wrapper can import a module
without the module's types crossing the wrapper's props). So treat impact output as a
**candidate set**: prune it by checking whether the symbol genuinely crosses each
dependent's interface. For this one question, grep-plus-read-the-interface can beat
CodeGraph — never ship an "affected by X" conclusion straight from the tool.

**MCP tools need a restart; the shell CLI is live.** Writing `.mcp.json` does not hot-load
into a running session — the `codegraph_*` MCP tools appear only after restarting Claude
Code. The `codegraph` shell subcommands (`query`, `node`, `callers`, `callees`, `impact`,
`affected`, `explore`, `files`, `status`) work immediately and return the same answers, so
prefer the CLI when the MCP tools are not yet loaded. (Note the verb skew: the shell
symbol-search subcommand is `query`, while the MCP tool is `codegraph_search`.)
