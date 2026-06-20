# cpalaka-claude-skills — domain language

The shared vocabulary for this personal library of hand-authored Claude Code
skills and the machinery (updaters, sync, scaffolding) that keeps them in step
with the projects that use them. Grows lazily during grilling sessions — only
terms that have actually come up belong here.

## Language

### Skills

**Skill**:
A capability defined by a `SKILL.md` (plus any supporting files) that Claude
loads and follows — auto-triggered by matching context, or invoked as a
`/command`. How it was installed is orthogonal to what it is: hand-authored in
this repo, bundled in a Claude Code plugin, or installed via npx-skills — all
are Skills.
_Avoid_: plugin (a distribution *bundle* that delivers skills, hooks, and MCP
servers — the container, not a synonym for the skill inside it), agent-skill (a
Skill delivered through the npx-skills / `~/.agents` channel — same concept,
different install path), command / slash-command (the *invocation surface* of a
Skill, not the Skill itself).

**Personal skill**:
A Skill authored and owned by you. This repo is its source of truth;
`~/.claude/skills/*` symlink into it. Protected — `skill-updater` never rewrites
it.
_Avoid_: hand-authored (fine as an adjective, but the noun is "Personal skill"),
my skill.

**Vendored skill**:
A Skill sourced from upstream — a Claude Code plugin or the npx-skills channel —
and refreshable by `skill-updater`.
_Avoid_: third-party skill, installed skill, external skill.

**Ecosystem**:
One of the two parallel channels a Skill is installed and updated through —
**Claude Code plugins** (the `claude plugin` CLI) and **agent-skills** (`npx
skills`, living under `~/.agents`). `skill-updater` reconciles both; a Personal
skill belongs to neither (it is hand-authored, not installed).
_Avoid_: marketplace, registry; source (a *source* is a specific origin —
Anthropic, mattpocock — within an ecosystem, not the channel itself).

### Catalog content

**Gotcha**:
A non-obvious Godot 4.x failure observed first-hand and indexed by *symptom*,
not component — typically "I set X, no error fired, nothing changed." Many have
no error signal, so they must be recognised, not grepped. Body shape: Symptom /
Cause / Fix / Detect proactively / Confirmed by.
_Avoid_: known issue (a gotcha is a hard-won field observation, not a release
note), trap, edge case (an edge case is expected; a gotcha is surprising).

**Preference**:
A personal *workflow* rule — how you want to be assisted — that applies across
all your Godot projects. Sibling to Gotcha: a Gotcha is a quirk of the engine, a
Preference is a choice about how you work. An active rule, not reference
material; a direct user instruction overrides it. Body shape: When this applies
/ Preferred behavior / Why / How to apply.
_Avoid_: caveat (the older word for this; "Preference" is canonical), convention
(a project-specific decision — by rule it does not belong in a cross-project
skill).

**Split layout**:
The structure shared by the gotcha and preference skills: `SKILL.md` holds a
routing *index* (one row per entry), and each row points to a body file in a
subfolder (`gotchas/NN-<slug>.md`, `preferences/N-<slug>.md`). Keeps a large
catalog from bloating the skill's entry point.
_Avoid_: index (that names only the `SKILL.md` half, not the pattern).

### Sync & propagation

**Parity**:
The alignment between a Godot project's docs/memory and the source Skills that
seeded them. A *parity check* is the audit; a *parity table* is its output,
presented for approval before any write.
_Avoid_: equivalence, feature-parity.

**Drift**:
The mismatch a parity check surfaces — usually a project has learned something
(a new Gotcha, a Preference) that the source Skill doesn't yet carry.
_Avoid_: divergence, staleness.

**Propagate**:
To lift a project-discovered learning *up* into the source Skill. Strictly
one-directional: **project → skill, never skill → project** (the Skill may
already be ahead from other projects). Only *generalizable* knowledge
propagates; project-specific decisions stay in the project.
_Avoid_: sync (implies bidirectional — it is not), merge, backport.

**Re-anchor**:
To refresh the version/timestamp stamps in existing Gotcha bodies when a tool
version bumps (e.g. godot-ai v2.7.2 → v2.7.5), *preserving* the historical
"Confirmed by" anchors rather than rewriting history. Distinct from propagating
new content.
_Avoid_: rewrite, update (both too broad — Re-anchor preserves history).

**Template**:
A Skill-owned file **copied** into a *new* project at init time
(`init-project/profiles/godot/templates/` → the project's `docs/` and `CLAUDE.md`),
thereafter kept aligned with the Skill via parity checks — the
*copied-and-customized* delivery mechanism, contrast **Chunk** (referenced,
single-source). Reserved for artifacts a project genuinely edits after copy
(godot `mcp.json`, the gotcha-catalog seed, the `settings.local.json` permission
delta).
_Avoid_: scaffold, boilerplate; Chunk (the referenced, single-source mechanism — they coexist).

### Chunks & composition

The vocabulary for the `@import`-from-home Chunk layer: reusable, single-source
dev-process instruction files that projects reference rather than copy.

**Chunk**:
A single-source, invariant dev-process instruction file committed in
`cpalaka-claude-skills/chunks/`, delivered to a project by `@import` (reference,
not copy). Because exactly one copy exists, a Chunk has **no parity/propagate
lifecycle** — editing it updates every importing project at next launch. Holds
invariant content only; per-project variation is handled by knobs, fork
selection, or inline-leaf, never by editing the Chunk. Discriminator vs
**Template**: does the project edit the bytes after delivery? No → Chunk
(referenced); yes → Template (copied + parity).
_Avoid_: Template (the copied, parity-aligned mechanism — they coexist),
snippet, include, partial, fragment.

**dev-base**:
The bundle Chunk every dev Profile imports: a single `chunks/dev-base.md` that
recursively `@import`s the nine universal base Chunks (git-sync-branch-start,
git-commit-format, git-confirm-destructive, sandbox-auto, parallel-work,
verify-gate, superpowers-default, codegraph, code-hygiene). The git-flow fork and
backlog-core are deliberately NOT in it — they vary by Profile, and `@import` cannot
be undone. (Two earlier-listed members are not separate chunks: the settings-merge
contract folded into `sandbox-auto`, and `init-scaffold-core` lives in the
`init-project` skill — so neither rides dev-base.)
_Avoid_: base chunk (it is a *bundle* of Chunks), boilerplate.

**Profile**:
The declarative recipe for a project TYPE — which Chunks it imports (always
**dev-base** plus its extras), which git-flow fork it selects, which Templates it
stamps, and its per-project knob / inline-leaf prompts. Data consumed by the
single `init-project` generator skill, not a skill itself. Adding a new project
type = adding a Profile; the generator never changes.
_Avoid_: project type (a Profile is the *recipe* for a type), generator (that is
`init-project`; the Profile is its input), Template.

**knob**:
A per-project value for a *value-variant* Chunk (e.g. backlog version, plans dir,
AC verify examples, DoD items), written by the `init-project` engine into a tagged
inline block (`<!-- knobs:<chunk> --> … <!-- /knobs:<chunk> -->`) in the project's
`CLAUDE.md` — never into the Chunk itself. Tagged so a generator re-run updates just
that block idempotently. Pure-invariant Chunks have no knob block.
_Avoid_: placeholder (`{{…}}` is the copied-Template substitution; a knob is an
engine-written inline block beside a *referenced* Chunk), variable, config.

**inline-leaf**:
Free-form, hand-authored content in a project's `CLAUDE.md` that is genuinely
specific to that one project and is never extracted into a Chunk (chaipalaka's
Hetzner deploy, its React skill list, exact toolchain pins). The third zone of a
generated project file, alongside Chunk `@import`s and engine-written knob blocks.
_Avoid_: leaf (fine as shorthand), project section, custom.

### MCP tooling

**Write-side server**:
The one MCP server that performs all writes to a running Godot editor — godot-ai
(scene/node/script/property writes, `project_run`, `logs_read`). There is
exactly **one writer per editor instance** (both servers drive the same
`EditorInterface`; a second editor — e.g. on a worktree — is a second writer).
_Avoid_: godot-mcp / Read-side server (it silently no-ops writes — see Gotcha
#15, #24).

**Read-side server**:
The MCP server used only for reads and tests against a running editor — godot-mcp
(runtime-state probes, `godot_docs` [EXCLUSIVE], editor log/stack reads). Never
write through it.
_Avoid_: godot-ai / Write-side server; minimal-godot (a separate local-only
diagnostics server — `get_diagnostics`).
