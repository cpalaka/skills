<!-- chunk:verify-gate | kind: value-variant | single-source: skills/chunks/verify-gate.md -->
<!-- Delivered by @import via ~/.claude/chunks/. Edit here only — no per-project copies, no parity. -->

## Verify gate (run before any commit or handoff)

Before committing, opening a handoff, or claiming work done, run this project's
**verify gate** and confirm it from *fresh* evidence — not "should pass", not a
previous run. Evidence before assertions, always (the `dev-practice`
verification-before-completion rule): if you didn't run it in this turn, you can't
claim it passes. The gate is invariant; the exact commands are a knob.

**The sequence (run in order, all must pass).**

1. **typecheck** — the type/compile step.
2. **test** — the project's test suite.
3. **build** — a real production build (it catches what typecheck and tests miss;
   include any output/artifact sanity check the build is supposed to produce).
4. **smoke** — bring the app up and confirm the affected surface actually renders /
   responds, then bring it back down. A green build is not a working app.
5. **secret-scan** — grep the working tree for leaked credentials; expect **zero**
   matches before the change leaves your machine. Secrets are read from the environment
   or a secret manager at runtime, never written into source or committed config — and
   the same goes for environment-specific server paths, hosts and IPs, which resolve
   from config/DNS/SSH rather than literals.

The exact commands, the directory they run in, the build's output check, the
secret-scan grep pattern, and any env are project-specific — read them from the
`<!-- knobs:verify-gate -->` block in this project's `CLAUDE.md`, never hardcode
them here.

**Clean output, not just exit 0.** A run that exits 0 with new warnings or noise is
**not** a pass — investigate the warning rather than ignoring it. "Passing" means the
output is clean *and* the exit code is 0.

**Docs synced.** Before the commit, confirm the project's design docs (e.g.
`CONTEXT.md`, ADRs, any PRD/spec the project keeps) are updated for any new domain
language or load-bearing decision the change introduces. Synced docs are part of the
gate, not a follow-up.

Only after the full gate is clean do you commit (per `git-commit-format`) or hand off.
