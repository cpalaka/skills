---
type: web
# Beyond dev-base (which is always imported and recursively pulls the base
# chunks incl. verify-gate + superpowers-default). A web project is board-driven
# here, so it imports backlog-core; the fork below is imported explicitly too
# (a fork can never ride dev-base — @import cannot be undone).
imports:
  - backlog-core
fork: git-flow-squash      # the default (ADR-0002); git-flow-noff is the opt-in alternative.
templates: []              # none — backlog's claude-section.md is promoted into the
                           # backlog-core chunk, so no profile stamps it; web carries no Template assets.
knobs:
  # backlog-core is an explicit import; verify-gate + superpowers-default ride
  # dev-base. All three are value-variant, so the engine still writes a knob
  # block for each (knob values live in the project CLAUDE.md, never in a chunk).
  backlog-core:
    VERSION: "1.45.2"                         # chaipalaka's pin; confirm/derive at apply time
    PLANS_DIR: "docs/superpowers/plans/"      # specs in docs/superpowers/specs/; plans/ created lazily
    VERIFY_EXAMPLES: "typecheck/test/build green, dev smoke of the affected route, screenshot where visual"
    DoD:                                      # standing gates in backlog/config.yml; ALWAYS ends in sign-off
      - "Verify gate clean (typecheck/test/build/smoke + secret-scan)"
      - "Docs synced (PRD.md / CONTEXT.md / docs/adr/ for new language or decisions)"
      - "User sign-off received"
  verify-gate:
    # Web toolchain gate — exact commands the verify-gate chunk's invariant
    # sequence (typecheck → test → build → smoke → secret-scan) runs.
    dir: "web/"                               # gate commands run in web/, not repo root
    typecheck: "npm run typecheck"
    test: "npm run test"
    build: "npm run build"                    # also confirms the vite-react-ssg prerender
    build_check: "vite-react-ssg prerender produced the static output (build must say so, not just exit 0)"
    smoke: "npm run dev"                      # bring up, confirm the affected route renders, bring down
    secret_scan: "grep -rEn '<secret-leak pattern>' over the working tree from repo root — expect ZERO matches"
    env: "secrets live in /etc/chaipalaka.env on the server (deploy/SECRETS.md); never in the repo or web/ runtime"
  superpowers-default:
    test_roster: "PRD.md '### Modules with tests' section (the authoritative required-coverage roster)"
    spec_verify_src: "web/src"                # the source tree specs' [reuse] claims are grep/CodeGraph-verified against
---
## Bespoke setup

None beyond the engine's uniform steps. The engine's apply algorithm
(@imports + knob blocks, settings.local.json merge, verify-after-write, handoff)
fully covers a web project; there are no installs, no `init` CLI, no
`project.godot`-style edits, and no Templates to stamp.

**If this project needs a board** and `backlog/` is absent, run the board
setup from **`profiles/backlog.md`'s `## Bespoke setup`** (the `backlog init`
+ `config.yml` DoD seeding recipe) — do **not** duplicate those steps here.
Profiles do not compose; reference, don't copy. (The board CONVENTIONS still
arrive via the `backlog-core` @import regardless; only the one-time CLI
`init` is bespoke, and it lives in the backlog profile.)

**Web-specific concerns are INLINE-LEAF — NOT in this profile or any chunk.**
The engine never writes Zone 3; these are hand-authored in the project's own
`CLAUDE.md` and must not be baked into a manifest knob or a shared chunk:

- **Deploy** — the Hetzner box, `make deploy` / `deploy-web` / `deploy-api` /
  `assets-sync`, the `/etc/chaipalaka.env` secret store, the `/api/*`-only
  frontend boundary, anything under `deploy/` (Caddyfile, systemd). All
  human-gated; project-specific.
- **The framework skill list** — which React/framework skills to invoke
  proactively and their triggers (e.g. `vercel-react-best-practices` before any
  `.tsx`, `vercel-composition-patterns` for reusable component APIs,
  `vercel-react-view-transitions` for route/hero animations). The
  `superpowers-default` chunk explicitly leaves this list as inline-leaf, not a
  knob.
- **Exact toolchain / version pins** — `vite`, `react-router-dom`,
  `vite-react-ssg`, `react`/`react-dom`, `typescript` pinned by
  `vite-react-ssg`'s peer deps; the pin table + bump policy (`docs/process/toolchain-pins.md`).
