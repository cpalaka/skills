# `/tournament` Skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/tournament` skill — a personal Claude Code skill that authors a complete, self-contained **Workflow** script for a generate→judge→verify→synthesize tournament in any domain, persists the resolved spec for reuse, and (on approval) launches it.

**Architecture:** A *code-generator* skill (NOT a runtime library — Workflow scripts can't `import`). `SKILL.md` drives an interview that produces a `~/Claude/tournaments/<name>.spec.md`, then assembles a self-contained `wf_*.js` by composing slotted snippets from `reference/stages.md` under a fixed **binding contract**, lints it, smoke-runs it, and launches via the Workflow tool. Full design + rationale: **`tournament/DESIGN.md`** (read it before starting).

**Tech Stack:** Markdown skills (`SKILL.md` + `reference/`), the Claude Code Workflow runtime (`agent()`/`parallel()`/`pipeline()`/`phase()`/`log()`, JSON-Schema structured output), one dev-time Node ESM lint tool (`reference/lint.mjs`).

## Global Constraints

- The **generated** scripts run in the Workflow runtime: must begin with a literal `export const meta = {...}`; **no** `import`/`require`/filesystem/Node APIs; **no** `Date.now()`/`Math.random()`/argless `new Date()` (vary by index); `pipeline()` by default, `parallel()` only as a genuine barrier; every fan-out result `.filter(Boolean)`; `meta.phases` titles match `phase()` calls.
- The **skill's own** dev tooling (`lint.mjs`) is plain Node ESM and runs OUTSIDE the runtime — Node APIs are fine there.
- Skill location: `cpalaka-claude-skills/tournament/`, installed via symlink at `~/.claude/skills/tournament` (matches the other personal skills).
- Spec archive: `~/Claude/tournaments/<name>.spec.md`. Spec format: markdown + YAML frontmatter.
- This repo (`cpalaka-claude-skills`) is public — commit locally per task; **do not push** without the user's say-so.
- Verifiability: `node --check <file>` is a valid SYNTAX gate for generated scripts (it parses without executing, so the runtime globals being undefined doesn't matter).

## File Structure

| File | Responsibility |
|---|---|
| `tournament/DESIGN.md` | (exists) the approved design + decision log |
| `tournament/PLAN.md` | (this file) the build plan |
| `tournament/SKILL.md` | skill entrypoint: frontmatter, interview (3 depths), candidate-schema strategy, assembly process, lint/smoke/launch flow, budget, reuse |
| `tournament/reference/stages.md` | the stage catalog — one slotted, valid-JS snippet per stage, plus the binding contract |
| `tournament/reference/lint.mjs` | dev lint tool: node --check + forbidden-token + meta/phase checks |
| `tournament/reference/example-spec.md` | golden `.spec.md` example (the curry tournament) + spec-format reference |
| `tournament/reference/golden/` | snapshots of the 3 golden source scripts (catalog provenance) |
| `tournament/reference/fixtures/` | tiny good/bad scripts for testing `lint.mjs` |

## Binding Contract (the key to safe assembly)

Every stage snippet reads/writes these exact bindings, so composed stages wire together. Later tasks depend on these names being identical.

| Produced by | Binding | Type |
|---|---|---|
| domain block | `DOMAIN` | `string` |
| context stage | `briefs` | `Record<string,string>` |
| claim-verify stage | `verifiedDigest` | `string` |
| generate stage | `candidates` | `Candidate[]` |
| generate stage | `seedIndices` | `number[]` |
| render helpers | `renderConcept(c)`, `renderIndexed(idxs)` | fns → `string` |
| filter stage | `kept` | `number[]` (indices) |
| filter stage | `totals` | `Map<number,number>` |
| filter stage | `ranked` | `number[]` (indices, desc) |
| filter stage (bracket mode) | `bracket` | `number[]` (indices, seeded) |
| filter stage (scoreboard mode) | `shortlist` | `number[]` (indices) |
| tournament/bracket | `champion`, `runnerUp` | `number` (index) |
| tournament/bracket | `matchLog` | `object[]` |
| tournament/scoreboard | `board` | `{index,score,...}[]` (desc) |
| tournament/scoreboard | `winner` | `number` (index) |
| verify-champion | `skeptics` | `object[]` |
| verify-champion | `fatalCount` | `number` |
| synthesize | `report` (text mode) or `synth` (schema mode) | `string`/`object` |
| qa | `qa`, `patched` | `object`, `string` |

---

### Task 0: Scaffold + snapshot the golden scripts

**Files:**
- Create: `tournament/reference/golden/incremental-concept-tournament.js`, `tournament/reference/golden/moms-curry-tournament.js`, `tournament/reference/golden/skill-audit.js`
- Create: `tournament/reference/.gitkeep` for `fixtures/`

**Interfaces:** Produces the durable provenance baseline every catalog task reads.

- [ ] **Step 1: Create the directory tree**

```bash
cd /Users/chaipalaka/Code/github/cpalaka-claude-skills/tournament
mkdir -p reference/golden reference/fixtures
```

- [ ] **Step 2: Snapshot the three golden scripts** (their session-dir homes are ephemeral)

```bash
cp "/Users/chaipalaka/.claude/projects/-Users-chaipalaka-Claude-game-storming/083bdda3-075b-4e5c-bb94-bfdfeab16568/workflows/scripts/incremental-concept-tournament-wf_6b58e640-617.js" reference/golden/incremental-concept-tournament.js
cp "/Users/chaipalaka/.claude/projects/-Users-chaipalaka-Claude-misc-research/1e07761b-9101-4b6c-8b99-06c18baba2d7/workflows/scripts/moms-curry-tournament-wf_00bd1b8e-e68.js" reference/golden/moms-curry-tournament.js
cp "/Users/chaipalaka/.claude/projects/-Users-chaipalaka-Claude/4ae7ddb0-8497-4f7e-8971-ab5c2f874d0f/workflows/scripts/skill-audit-and-discovery-wf_eb4a97c9-d28.js" reference/golden/skill-audit.js
```

If any source path no longer exists, search: `find /Users/chaipalaka/.claude/projects -name '*tournament*.js' -o -name '*skill-audit*.js'` and copy the closest match; note the substitution in the commit message.

- [ ] **Step 3: Verify syntax of all three goldens**

Run: `for f in reference/golden/*.js; do node --check "$f" && echo "OK $f"; done`
Expected: `OK` for all three.

- [ ] **Step 4: Commit**

```bash
git add tournament/reference/golden
git commit -m "tournament: snapshot golden tournament scripts as catalog provenance"
```

---

### Task 1: The constraint-lint tool + its tests

**Files:**
- Create: `tournament/reference/lint.mjs`
- Create: `tournament/reference/fixtures/bad-daterandom.js`, `tournament/reference/fixtures/good-minimal.js`

**Interfaces:** Produces `lint.mjs <script>` → exit 0 (clean) / 1 (errors) / 2 (usage), printing `ERROR:`/`WARN:` lines. Consumed by Tasks 2–5 (snippet checks), 8 (acceptance), and by `SKILL.md`'s run flow.

- [ ] **Step 1: Write a failing test fixture (bad script) and a good one**

`reference/fixtures/bad-daterandom.js`:
```js
export const meta = { name: 'x', description: 'y', phases: [{ title: 'A' }] }
phase('A')
const t = Date.now()
const r = await parallel([() => agent('hi')])
return r
```

`reference/fixtures/good-minimal.js`:
```js
export const meta = { name: 'x', description: 'y', phases: [{ title: 'A' }] }
phase('A')
const r = (await parallel([() => agent('hi')])).filter(Boolean)
return r
```

- [ ] **Step 2: Write `lint.mjs`**

```js
#!/usr/bin/env node
// Dev tool (plain Node, runs OUTSIDE the Workflow runtime). Lints a generated
// tournament workflow script against the runtime's hard constraints.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const file = process.argv[2]
if (!file) { console.error('usage: lint.mjs <script.js>'); process.exit(2) }
const src = readFileSync(file, 'utf8')
const errors = [], warns = []

try { execFileSync('node', ['--check', file], { stdio: 'pipe' }) }
catch (e) { errors.push('node --check failed: ' + (e.stderr?.toString() || e.message)) }

const forbid = [
  [/\bDate\.now\s*\(/, 'Date.now() unavailable in runtime'],
  [/\bMath\.random\s*\(/, 'Math.random() unavailable in runtime'],
  [/\bnew\s+Date\s*\(\s*\)/, 'argless new Date() unavailable in runtime'],
  [/^\s*import\s+/m, 'import statements not allowed in workflow scripts'],
  [/\brequire\s*\(/, 'require() not allowed in workflow scripts'],
  [/\bnode:(fs|child_process|path|os)\b/, 'Node APIs not available in workflow scripts'],
]
for (const [re, msg] of forbid) if (re.test(src)) errors.push(msg)

if (!/export\s+const\s+meta\s*=\s*\{/.test(src)) errors.push('missing literal `export const meta = {`')

const pb = src.match(/phases\s*:\s*\[([\s\S]*?)\]/)
const metaPhases = pb ? [...pb[1].matchAll(/title\s*:\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]) : []
const called = [...src.matchAll(/\bphase\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map(m => m[1])
for (const p of new Set(called)) if (!metaPhases.includes(p)) warns.push(`phase("${p}") has no matching meta.phases entry`)

if (/await\s+parallel\(/.test(src) && !/\.filter\(Boolean\)/.test(src))
  warns.push('parallel() used but no .filter(Boolean) — guard against null agent results')

for (const w of warns) console.error('WARN: ' + w)
for (const e of errors) console.error('ERROR: ' + e)
process.exit(errors.length ? 1 : 0)
```

- [ ] **Step 3: Run lint on the BAD fixture — verify it fails**

Run: `node reference/lint.mjs reference/fixtures/bad-daterandom.js; echo "exit=$?"`
Expected: `ERROR: Date.now() unavailable...`, `WARN: parallel() used but no .filter(Boolean)...`, `exit=1`.

- [ ] **Step 4: Run lint on the GOOD fixture — verify it passes**

Run: `node reference/lint.mjs reference/fixtures/good-minimal.js; echo "exit=$?"`
Expected: no `ERROR:` lines, `exit=0`.

- [ ] **Step 5: Run lint on the three goldens — verify clean (warns ok)**

Run: `for f in reference/golden/*.js; do echo "== $f"; node reference/lint.mjs "$f"; done`
Expected: `exit 0` for each (the goldens already obey the constraints; WARN lines acceptable).

- [ ] **Step 6: Commit**

```bash
git add tournament/reference/lint.mjs tournament/reference/fixtures
git commit -m "tournament: add workflow-constraint lint tool + fixtures"
```

---

### Task 2: Stage catalog — binding contract, meta/schema-builders, render helpers

**Files:**
- Create: `tournament/reference/stages.md`

**Interfaces:** Produces the catalog header (binding contract from this plan) + the `meta`-builder, schema-builders (`candidate`, `KEEP`, `SCORES`, `MATCH`, `JUDGE`, `SKEPTIC`, `VERDICT`, `SYNTH`, `QA`), and `renderConcept`/`renderIndexed`. Each snippet is **valid JS with default slot values** (so it passes `node --check` standalone) marked with `// FILL:` comments. Consumed by Tasks 3–5.

- [ ] **Step 1: Write the catalog header + binding contract**

Copy the Binding Contract table from this plan into the top of `stages.md`, plus a one-paragraph rule: "Snippets are normalized from `reference/golden/`. Each is valid JS with default slot values; the skill replaces `// FILL:`-marked slots. Compose only the stages the spec needs, in pipeline order."

- [ ] **Step 2: Write the meta-builder + schema-builder snippets**

Normalize from `golden/incremental-concept-tournament.js:1-91` (the `meta` + `conceptProps`+`*_SCHEMA` blocks) and `golden/moms-curry-tournament.js:35-104` (richer schemas). Produce, as fenced ```js blocks with default slots:
- a `meta` literal template (slots: name/description/phases),
- `buildCandidateSchema(fields)` pattern shown as a concrete default (the `conceptProps`→`CONCEPTS_SCHEMA` shape),
- `KEEP_SCHEMA`, `SCORES_SCHEMA`, `MATCH_SCHEMA`, `JUDGE_SCHEMA`, `SKEPTIC_SCHEMA`, `VERDICT_SCHEMA`, `SYNTH_SCHEMA`, `QA_SCHEMA` verbatim-normalized.

- [ ] **Step 3: Write the render-helper snippet**

From `golden/incremental-concept-tournament.js:161-162`. Generalize `renderConcept(c)` to iterate the candidate's fields (so it works for any inferred schema, not just the 9 game fields) + keep `renderIndexed(idxs)`.

- [ ] **Step 4: Verify every ```js block in stages.md parses**

Run (extract each fenced js block to a temp file and check):
```bash
awk '/^```js$/{f=1;n++;next}/^```$/{f=0}f{print > ("/tmp/snip"n".js")}' reference/stages.md
for s in /tmp/snip*.js; do node --check "$s" && echo "OK $s"; done; rm -f /tmp/snip*.js
```
Expected: `OK` for every extracted block. (Blocks must be standalone-valid with their default slot values.)

- [ ] **Step 5: Commit**

```bash
git add tournament/reference/stages.md
git commit -m "tournament: catalog part 1 — binding contract, schemas, render helpers"
```

---

### Task 3: Stage catalog — context, claim-verify, generate, filter

**Files:**
- Modify: `tournament/reference/stages.md`

**Interfaces:** Consumes `DOMAIN`, schema/render snippets (Task 2). Produces `briefs`, `verifiedDigest`, `candidates`, `seedIndices`, `kept`, `totals`, `ranked`, and `bracket`|`shortlist` per the contract.

- [ ] **Step 1: Context/research snippet** — normalize from `incremental:93-107` (local-doc briefs) and `moms-curry:106-127` (web-research briefs). Two slot variants (local-file distillation / web-search), both writing `briefs`.
- [ ] **Step 2: Claim-verify snippet (optional stage)** — from `moms-curry:129-153`. Extract claims → 3-lens skeptic `parallel`-of-`parallel` → consensus → `verifiedDigest`.
- [ ] **Step 3: Generate snippet** — from `incremental:109-159`. Lens generators + guaranteed seeds → `candidates`, `seedIndices`.
- [ ] **Step 4: Filter snippet** — from `incremental:164-217`. Dedup/constraint-kill → axis screen → `totals`/`ranked` → `bracket` (bracket mode) or `shortlist` (scoreboard mode), seeds force-kept.
- [ ] **Step 5: Verify all js blocks parse** — rerun the Task 2 Step 4 extraction loop over the whole `stages.md`. Expected: `OK` for every block.
- [ ] **Step 6: Commit**

```bash
git add tournament/reference/stages.md
git commit -m "tournament: catalog part 2 — context, claim-verify, generate, filter"
```

---

### Task 4: Stage catalog — tournament (bracket + scoreboard)

**Files:**
- Modify: `tournament/reference/stages.md`

**Interfaces:** Consumes `candidates`, `bracket`|`shortlist`, `renderConcept`, judge schema. Produces bracket: `champion`/`runnerUp`/`matchLog`; scoreboard: `board`/`winner`.

- [ ] **Step 1: Bracket snippet** — from `incremental:219-270`. `runMatch(ai,bi,round)` 3-judge panel → majority (tie→higher seed) → `matchLog`; QF/SF/Final orchestration with pairing `1v8·4v5·3v6·2v7` (slot: bracket size).
- [ ] **Step 2: Scoreboard snippet** — from `moms-curry:155-191`. `pipeline(candidates, generate, judgePanel)` OR judge-existing-candidates → average panel score → `board` desc → `winner`. Slot: 0–N scale, panel personas.
- [ ] **Step 3: Verify all js blocks parse** — rerun extraction loop. Expected: `OK` for every block.
- [ ] **Step 4: Commit**

```bash
git add tournament/reference/stages.md
git commit -m "tournament: catalog part 3 — bracket + scoreboard tournament modes"
```

---

### Task 5: Stage catalog — verify-champion, synthesize, QA, result shape

**Files:**
- Modify: `tournament/reference/stages.md`

**Interfaces:** Consumes `champion`/`winner`, `matchLog`/`board`, `briefs`. Produces `skeptics`/`fatalCount`, `report`/`synth`, `qa`/`patched`, and the final `return {...}` shape.

- [ ] **Step 1: Verify-champion snippet** — from `incremental:272-294`. Skeptic lenses `parallel` → `fatalCount`; slot: refute threshold + swap-to-runner-up rule.
- [ ] **Step 2: Synthesize snippet** — from `incremental:296-324` (text report) and `moms-curry:193-196` (schema synth). Two variants; both graft winner + runner-up + skeptic fixes.
- [ ] **Step 3: QA snippet (optional stage)** — from `moms-curry:198-204`. Red-team → patch.
- [ ] **Step 4: Result-shape snippet** — from `incremental:326-335` / `moms-curry:206-225`. Return champion/winner + leaderboard/bracket + logs + skeptics + report.
- [ ] **Step 5: Verify all js blocks parse** — rerun extraction loop. Expected: `OK` for every block.
- [ ] **Step 6: Commit**

```bash
git add tournament/reference/stages.md
git commit -m "tournament: catalog part 4 — verify, synthesize, QA, result shape"
```

---

### Task 6: `SKILL.md` — the skill entrypoint

**Files:**
- Create: `tournament/SKILL.md`

**Interfaces:** Consumes `reference/stages.md`, `reference/lint.mjs`, `reference/example-spec.md`. Produces the user-facing `/tournament` behavior.

- [ ] **Step 1: Frontmatter** — `name: tournament`; `description:` with triggers ("run a tournament", "generate-and-judge", "pick the best X via fan-out", "bracket/scoreboard of candidates", "tournament workflow"). Keep ≤ the description budget.
- [ ] **Step 2: Body sections** (author per `DESIGN.md`, lean; defer detail to `reference/`):
  1. *When to use* + the invariant pipeline diagram.
  2. *Reuse model* — new vs reuse; spec path `~/Claude/tournaments/<name>.spec.md`; spec format (frontmatter + `##` sections).
  3. *Elicitation* — three depths (quick / brainstorm / +grill), posture replicated inline; escalation-suggest heuristic; reuse skips elicitation.
  4. *Candidate schema* — archetypes + infer-and-propose + coherence check.
  5. *Assembly* — read `reference/stages.md`; obey the binding contract; compose only needed stages; fill `// FILL:` slots; **never** hand-edit a generated script (edit the spec, regenerate).
  6. *Safety gate* — run `node reference/lint.mjs <script>`; on new/edited scripts, run a required tiny smoke-run (1 lens / 2 candidates / 1 judge / no web / low effort) before full scale; skip smoke on unchanged reuse.
  7. *Launch & relay* — show recap + phase outline + estimated agent-count/cost; on approval invoke the Workflow tool (background); relay results; write `~/Claude/tournaments/<name>.result-<date>.md`; note `resumeFromRunId`.
  8. *Budget* — explicit counts; budget-aware gate; opt-in `--scale-to-budget`.
- [ ] **Step 3: Verify frontmatter + references**

Run: `head -5 tournament/SKILL.md` (confirm valid `---` frontmatter with `name`/`description`); `grep -o 'reference/[a-z.-]*' tournament/SKILL.md | sort -u` (confirm every referenced file exists).
Expected: valid frontmatter; all referenced paths exist.

- [ ] **Step 4: Commit**

```bash
git add tournament/SKILL.md
git commit -m "tournament: add SKILL.md entrypoint (interview, assembly, safety, launch)"
```

---

### Task 7: `example-spec.md` — golden spec + format reference

**Files:**
- Create: `tournament/reference/example-spec.md`

**Interfaces:** A worked `.spec.md` (the curry tournament) reverse-derived from `golden/moms-curry-tournament.js`, demonstrating frontmatter + every `##` section. Consumed by Task 8 acceptance + by users as the format reference.

- [ ] **Step 1:** Write frontmatter: `name: moms-curry`, `domain: cooking`, `tags: [recipe]`, `mode: scoreboard`, `claimVerify: true`, `qa: true`, counts, lens/judge/axis keys.
- [ ] **Step 2:** Write the `##` sections: domain block (from `moms-curry:13-33` ORIGINAL+CONSTRAINTS), candidate fields, context/research briefs, claim-verify lenses, generation candidates, judges (3 personas+rubrics), synthesize spec, QA checklist.
- [ ] **Step 3: Verify** the spec exercises every feature SKILL.md describes: `grep -c '^## ' tournament/reference/example-spec.md` (≥ 6 sections); confirm frontmatter keys cover mode/toggles/counts.
- [ ] **Step 4: Commit**

```bash
git add tournament/reference/example-spec.md
git commit -m "tournament: add golden example spec + format reference"
```

---

### Task 8: Acceptance — golden reproduction (agent-driven)

**Files:** none created (verification task). May fix `stages.md`/`SKILL.md` if reproduction fails.

**Interfaces:** Proves the skill end-to-end against two structurally-different goldens.

- [ ] **Step 1: Scoreboard reproduction** — Invoke `/tournament` in *reuse* mode on `reference/example-spec.md`. Capture the emitted script to `/tmp/repro-curry.js`.
- [ ] **Step 2: Verify it** — Run `node reference/lint.mjs /tmp/repro-curry.js; echo exit=$?` → `exit=0`. Structurally diff stage graph vs `golden/moms-curry-tournament.js`: confirm presence of research → claim-verify → scoreboard(generate→judge) → synthesize → QA phases. Note any divergence.
- [ ] **Step 3: Bracket reproduction** — Write a minimal game-concept spec (or reuse one derived from `golden/incremental-concept-tournament.js`) and generate `/tmp/repro-bracket.js`. Run lint → `exit=0`; confirm context → generate → filter(bracket) → tournament(QF/SF/Final) → verify → synthesize phases.
- [ ] **Step 4:** If either reproduction fails lint or omits a required phase, fix the relevant `stages.md` snippet or `SKILL.md` assembly instruction; re-run. Commit fixes:

```bash
git add tournament/reference/stages.md tournament/SKILL.md
git commit -m "tournament: fixes from golden-reproduction acceptance"
```

---

### Task 9: Install + discoverability

**Files:** none in-repo (local symlink).

- [ ] **Step 1: Symlink the skill** (match the other personal skills' install)

```bash
ln -s /Users/chaipalaka/Code/github/cpalaka-claude-skills/tournament /Users/chaipalaka/.claude/skills/tournament
ls -la /Users/chaipalaka/.claude/skills/tournament
```
Expected: symlink resolves to the repo dir.

- [ ] **Step 2: Verify discoverability** — In a fresh Claude Code session (or `/reload-plugins`), confirm `tournament` appears in the skill list and `/tournament` is invocable. (Cannot be asserted from within the building session; note for the user to confirm.)

- [ ] **Step 3:** Report completion to the user with the full task checklist state. Do **not** push; the user decides when to push the public repo.

---

## Self-Review (completed against DESIGN.md)

- **Spec coverage:** reuse/persist (T6,T7) · central spec location (T6) · markdown+frontmatter (T7) · candidate archetypes+coherence (T6) · author→gate→launch (T6) · normalize-from-goldens+validate (T0,T2–5,T8) · 3 elicitation depths (T6) · lint-always + smoke-on-new (T1,T6) · explicit-counts+budget-gate (T6) · both modes + claim-verify + QA (T3–5) · risks/mitigations (binding contract T-header; lint T1; smoke T8). All covered.
- **Placeholder scan:** catalog tasks intentionally say "normalize from cited golden lines" — this is a *port*, not greenfield; the binding contract + exact source line ranges + per-block `node --check` make each step concrete and verifiable. The one greenfield tool (`lint.mjs`) has complete code.
- **Type/name consistency:** all cross-stage names come from the single Binding Contract table; `lint.mjs` signature consistent across T1/T6/T8.
