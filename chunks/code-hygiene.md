<!-- chunk:code-hygiene | kind: invariant | single-source: skills/chunks/code-hygiene.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## Code hygiene — off-limits in code, and ask when unsure

These are invariant dev-hygiene rules: they hold in every project regardless of
language or stack. They are not the project's verify gate — they are the bar your
code must already meet *before* you reach it (the gate enforces them; see
`verify-gate`'s secret-scan step).

**No hardcoded secrets — anywhere.** API keys, tokens, passwords, connection
strings, or any other secret value never get written into source, config under
version control, or commit history. Read them from the environment or a secret
manager at runtime. The same applies to environment-specific server paths, hosts,
and IPs: keep them out of committed code and resolve them from config/DNS/SSH, not
literals. (The verify gate's repo-root secret-scan grep, expecting zero matches, is
the backstop — see `verify-gate`.)

**No debug logging left in production code.** Transient `console.log` / `print` /
logger-debug statements are fine *while* you are developing, but remove them before
you commit. Debug output left in shipped code paths is a hygiene failure, not a
feature.

**No undeclared top-level dependencies.** Every new top-level dependency must be
declared in the project's manifest (and lockfile) and justified in the change's
commit message or review handoff — never pulled in implicitly or left only in a
local install. An undeclared dependency is invisible to review and breaks on a
clean clone.

**When unsure, ask — and prefer small, reversible steps.** The cost of a clarifying
question is one round-trip; the cost of an unwanted destructive action or an
architectural drift a human has to unwind is much higher. Default to small,
reversible steps with checkpoints over large, speculative ones. (This is the
hygiene-side echo of the project's broader skill/planning discipline — see
`dev-practice`.)
