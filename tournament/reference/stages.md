# Stage Catalog

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

Snippets are normalized from `reference/golden/`. Each is valid JS with default slot values; the skill replaces `// FILL:`-marked slots. Compose only the stages the spec needs, in pipeline order.

---

## Meta Builder

```js
export const meta = {
  name: 'my-tournament', // FILL: tournament name (kebab-case slug)
  description: 'A generate-and-filter tournament', // FILL: one-sentence description of what is being decided
  phases: [
    { title: 'Context', detail: 'distill background research' }, // FILL: adjust or add phases as needed
    { title: 'Generate', detail: 'produce candidates' },
    { title: 'Filter', detail: 'dedup, screen, rank' },
    { title: 'Tournament', detail: 'bracket or scoreboard' },
    { title: 'Verify', detail: 'adversarial skeptic attack on champion' },
    { title: 'Synthesize', detail: 'final recommendation' },
  ],
}
```

---

## Schema Builders

### buildCandidateSchema — generalized from conceptProps → CONCEPTS_SCHEMA

The `fields` argument is a plain object mapping field name to `{ type, description }` (same shape as JSON Schema property definitions). The function returns a `CANDIDATE_SCHEMA`-equivalent (the golden uses `concepts` as the array key; this catalog normalizes it to `candidates` to match the binding contract) wrapping those fields in an array of objects.

```js
// buildCandidateSchema: generalized from incremental-concept-tournament.js conceptProps (lines 27-47)
// FILL: replace defaultFields with the field set appropriate for your domain
const defaultFields = {
  name: { type: 'string' },
  premise: { type: 'string', description: '1-2 sentence elevator pitch incl. theme/tone' }, // FILL: adjust description
  core_loop: { type: 'string', description: 'the moment-to-moment loop and how it evolves' }, // FILL: rename/remove if not applicable
  hook: { type: 'string', description: 'the single memorable moment + positioning' }, // FILL: adjust description
  scope_notes: { type: 'string', description: 'rough effort sanity check' }, // FILL: adjust description
  risks: { type: 'string', description: 'top 2-3 ways this fails' }, // FILL: adjust description
}

function buildCandidateSchema(fields) {
  return {
    type: 'object',
    properties: {
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          properties: fields,
          required: Object.keys(fields),
        },
      },
    },
    required: ['candidates'],
  }
}

const CANDIDATE_SCHEMA = buildCandidateSchema(defaultFields)
```

---

### KEEP_SCHEMA

Normalized verbatim from `incremental-concept-tournament.js` lines 48–55.

```js
const KEEP_SCHEMA = {
  type: 'object',
  properties: {
    keep: { type: 'array', items: { type: 'integer' }, description: 'indices of concepts to keep' },
    notes: { type: 'string', description: 'what was merged/killed and why, briefly' },
  },
  required: ['keep', 'notes'],
}
```

---

### SCORES_SCHEMA

Normalized verbatim from `incremental-concept-tournament.js` lines 56–73.

```js
const SCORES_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          score: { type: 'number', description: '0-10, use the full range' },
          reason: { type: 'string', description: 'one sentence' },
        },
        required: ['index', 'score', 'reason'],
      },
    },
  },
  required: ['scores'],
}
```

---

### MATCH_SCHEMA

Normalized verbatim from `incremental-concept-tournament.js` lines 74–81.

```js
const MATCH_SCHEMA = {
  type: 'object',
  properties: {
    winner: { type: 'string', enum: ['A', 'B'] },
    reason: { type: 'string', description: '2-3 sentences: the decisive factor, incl. any fatal flaw in the loser' },
  },
  required: ['winner', 'reason'],
}
```

---

### JUDGE_SCHEMA

Normalized from `moms-curry-tournament.js` lines 70–81. Curry-specific fields (`score_0_50`, `wouldCook`) retained as the base; FILL slots let you rename or swap for your domain's scoring axis.

```js
const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    persona: { type: 'string' },
    score: { type: 'number', description: '0-10 score from this judge\'s perspective' }, // FILL: adjust scale/name (curry golden uses score_0_50)
    breakdown: { type: 'string' },
    critique: { type: 'string' },
    mustFix: { type: 'string' }, // FILL: rename to match your domain's critical-issue label
    wouldChoose: { type: 'boolean' }, // FILL: rename/remove (curry golden: wouldCook)
  },
  required: ['persona', 'score', 'critique', 'mustFix', 'wouldChoose'],
}
```

---

### SKEPTIC_SCHEMA

Normalized verbatim from `incremental-concept-tournament.js` lines 82–91.

```js
const SKEPTIC_SCHEMA = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean', description: 'true if the concept has a FATAL flaw through your lens' },
    severity: { type: 'string', enum: ['fatal', 'serious', 'minor'] },
    concerns: { type: 'array', items: { type: 'string' } },
    fixes: { type: 'array', items: { type: 'string' }, description: 'concrete mitigations if any' },
  },
  required: ['refuted', 'severity', 'concerns', 'fixes'],
}
```

---

### VERDICT_SCHEMA

Normalized verbatim from `moms-curry-tournament.js` lines 45–55. Used in claim-verify stage to produce `verifiedDigest`.

```js
const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'refuted', 'partly', 'unknown'] },
    reasoning: { type: 'string' },
    correctedStatement: { type: 'string' },
    keyEvidence: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'moderate', 'low'] },
  },
  required: ['verdict', 'reasoning', 'correctedStatement', 'keyEvidence', 'confidence'],
}
```

---

### SYNTH_SCHEMA

Constructed: moms-curry golden (lines 83–93) has curry-specific fields (`finalRecipeMarkdown`, `garamBlendMarkdown`, `heatDialMarkdown`). Generalized to a domain-neutral synthesis output consistent with the binding contract (`synth` → synthesize output object). Shape derived from the curry golden's structural pattern: a primary output field, domain-specific dial/parameter fields (FILL slots), a changelog, and sources.

```js
const SYNTH_SCHEMA = {
  type: 'object',
  properties: {
    summaryMarkdown: { type: 'string', description: 'the final synthesized recommendation or output' }, // FILL: rename to match your domain (curry golden: finalRecipeMarkdown)
    parametersMarkdown: { type: 'string', description: 'key tunable parameters or dials for the output' }, // FILL: rename/remove (curry golden: garamBlendMarkdown + heatDialMarkdown)
    changeLog: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          change: { type: 'string' },
          why: { type: 'string' },
          verifiedBy: { type: 'string' },
        },
        required: ['change', 'why'],
      },
    },
    graftedFrom: { type: 'array', items: { type: 'string' } }, // FILL: remove if not applicable
  },
  required: ['summaryMarkdown', 'changeLog'],
}
```

---

### QA_SCHEMA

Constructed: moms-curry golden (lines 95–104) has curry-specific boolean gates (`foodSafetyOk`, `heatWillDeliver`). Generalized to a domain-neutral QA shape consistent with the binding contract (`qa` → object). Structural pattern preserved: domain gate booleans (FILL slots), an issues list with severity/issue/fix, and a verdict string.

```js
const QA_SCHEMA = {
  type: 'object',
  properties: {
    gatesPassed: { type: 'boolean', description: 'true if all domain-specific hard gates pass' }, // FILL: expand to named gates for your domain (curry golden: foodSafetyOk, heatWillDeliver)
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string' },
          issue: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'issue', 'fix'],
      },
    },
    verdict: { type: 'string' },
  },
  required: ['gatesPassed', 'issues', 'verdict'],
}
```

---

## Render Helpers

Generalized from `incremental-concept-tournament.js` lines 161–162. The golden `renderConcept` was hardcoded to 9 named fields (`c.name`, `c.premise`, etc.). This version iterates `Object.entries(c)` so it works for any candidate schema without modification.

```js
// renderConcept: generalized from incremental-concept-tournament.js line 161
// Golden was hardcoded to 9 game-concept fields; this iterates any candidate's fields.
const candidates = [] // STANDALONE PARSE ONLY — DELETE this line at assembly; the generate stage declares candidates

const renderConcept = (c) =>
  Object.entries(c)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

// renderIndexed: normalized verbatim from incremental-concept-tournament.js line 162
const renderIndexed = (idxs) => idxs.map(i => `[${i}] ${renderConcept(candidates[i])}`).join('\n\n')
```

---

## Context Stage

Normalized from `incremental-concept-tournament.js` lines 93–107 (local-file variant) and `moms-curry-tournament.js` lines 106–127 (web-search variant). Pick ONE slot variant; both produce `briefs` (`Record<string,string>`).

### Variant A — Local-file distillation

Each brief key calls `agent()` to read local research files and distill them. Slot values are from the incremental-concept golden; replace all `// FILL:` items for your domain.

```js
// Context stage — local-file distillation variant
// Normalized from incremental-concept-tournament.js lines 93-107
// FILL: replace briefSpec, parallel entries, and briefs key names for your domain
const briefSpec = 'Return ONLY a dense, design-actionable brief of AT MOST 600 words: terse bullets, concrete numbers/examples preserved, no fluff or meta-commentary. Your final message IS the brief.' // FILL: adjust word-count and style instructions

const DOMAIN = 'your domain here' // FILL: one-phrase description of what is being decided (used in prompts)
const ROOT = '/path/to/research' // FILL: absolute path to the research corpus root

const briefResults = await parallel([
  () => agent(`Read ${ROOT}/research/topic-a.md. Extract everything relevant to ${DOMAIN}. ${briefSpec}`, { label: 'brief:topic-a', phase: 'Context' }), // FILL: replace file path, topic, and extraction goal
  () => agent(`Read ${ROOT}/research/topic-b.md. Extract everything relevant to ${DOMAIN}. ${briefSpec}`, { label: 'brief:topic-b', phase: 'Context' }), // FILL: replace file path, topic, and extraction goal
])

const briefs = { // FILL: key names must match what downstream generate/filter stages reference
  topicA: briefResults[0] || '',
  topicB: briefResults[1] || '',
}
```

### Variant B — Web-search research

Each brief key calls `agent()` with web-search instructions to ground findings in live sources. Slot values are from the moms-curry golden; replace all `// FILL:` items for your domain.

```js
// Context stage — web-search research variant
// Normalized from moms-curry-tournament.js lines 106-127
// FILL: replace researchBriefs entries and briefs key names for your domain
const DOMAIN = 'your domain here' // FILL: one-phrase description of what is being decided

const researchBriefs = [
  { key: 'subtopic-a', prompt: `You are an expert in ${DOMAIN}. Use WebSearch/WebFetch (first run ToolSearch with query "select:WebSearch,WebFetch" to load the schemas) to research subtopic A. Return concrete findings (with confidence levels) and flag your most load-bearing or dubious claims for adversarial verification.` }, // FILL: replace subtopic-a and prompt body
  { key: 'subtopic-b', prompt: `You are an expert in ${DOMAIN}. Use WebSearch/WebFetch (first run ToolSearch with query "select:WebSearch,WebFetch" to load the schemas) to research subtopic B. Return concrete findings (with confidence levels) and flag your most load-bearing or dubious claims for adversarial verification.` }, // FILL: replace subtopic-b and prompt body
]

const researchResults = (await parallel(researchBriefs.map(b => () =>
  agent(b.prompt, { label: `research:${b.key}`, phase: 'Context', effort: 'high' })
))).filter(Boolean)

const briefs = Object.fromEntries( // FILL: key names must match what downstream stages reference
  researchBriefs.map((b, i) => {
    const r = researchResults[i]
    if (!r) return [b.key, '']
    // Serialize each research object to readable markdown, mirroring the golden's researchDigest construction
    // (moms-curry-tournament.js lines 118-120): summary as heading + findings as bullet list
    // FILL: r.summary and r.findings match RESEARCH_SCHEMA; if you rename those fields, update here too
    const heading = `### ${r.summary || '(no summary)'}`
    const bullets = Array.isArray(r.findings)
      ? r.findings.map(f => `- (${f.confidence}) ${f.topic}: ${f.detail}`).join('\n')
      : ''
    return [b.key, bullets ? `${heading}\n${bullets}` : heading]
  })
)
```

---

## Claim-Verify Stage (optional)

Normalized from `moms-curry-tournament.js` lines 129–153. Run this only when the context stage uses web-search and returns `claimsToVerify` arrays. Consumes `researchResults` (from the web-search context variant). Produces `verifiedDigest` (`string`).

```js
// Claim-verify stage (optional — use with web-search context variant only)
// Normalized from moms-curry-tournament.js lines 129-153
// FILL: replace LENSES if your domain calls for different skeptic perspectives
const VERIFY_LENSES = [
  'peer-reviewed literature or authoritative primary sources (cite real findings)', // FILL: adjust for your domain's primary-evidence type
  'a practitioner giving a real-world reality-check',
  'a skeptical myth-buster actively hunting for overstatement, folk wisdom, or hidden nuance that makes the naive claim wrong',
]

let claims = []
// ASSEMBLY NOTE: researchResults must be in scope from the web-search context variant (Variant B). Do NOT add a standalone const here; do NOT rename researchResults.
researchResults.forEach((r, ri) => (r && r.claimsToVerify || []).forEach((c, ci) =>
  claims.push({ id: `R${ri}-${ci}`, claim: c.claim, whyDubious: c.whyDubious })
))
claims = claims.slice(0, 12) // FILL: raise/lower cap as budget allows

const verified = (await parallel(claims.map(c => () =>
  parallel(VERIFY_LENSES.map((lens, li) => () =>
    agent(
      `A research agent (working on: ${DOMAIN}) asserted this claim:\n"${c.claim}"\nWhy it was flagged as dubious: ${c.whyDubious}\n\nVERIFY IT THROUGH THIS LENS: ${lens}. Use WebSearch/WebFetch (load via ToolSearch "select:WebSearch,WebFetch") to ground your check in real sources where you can. Be ADVERSARIAL — actively try to refute the claim or surface the nuance that makes it misleading. If evidence is thin, default to skepticism. Then give your verdict (confirmed / refuted / partly / unknown), a corrected precise statement of what is actually true, and your single strongest piece of evidence.`,
      { label: `verify:${c.id}:${li}`, phase: 'Verify', schema: VERDICT_SCHEMA, effort: 'medium' }
    )
  )).then(vs => {
    const v = vs.filter(Boolean)
    const count = k => v.filter(x => x.verdict === k).length
    const consensus = count('refuted') >= 2 ? 'REFUTED' : count('confirmed') >= 2 ? 'CONFIRMED' : 'NUANCED'
    return { id: c.id, claim: c.claim, consensus, verdicts: v }
  })
))).filter(Boolean)

const verifiedDigest = verified.map(x => {
  const corrected = x.verdicts.map(d => d.correctedStatement).filter(Boolean)
  const ev = x.verdicts.map(d => d.keyEvidence).filter(Boolean).join(' | ')
  return `[${x.consensus}] CLAIM: ${x.claim}\n   TRUTH: ${corrected.join(' / ').slice(0, 600)}\n   EVIDENCE: ${ev.slice(0, 500)}`
}).join('\n\n')
```

---

## Generate Stage

Normalized from `incremental-concept-tournament.js` lines 109–159. Produces `candidates` (`Candidate[]`) and `seedIndices` (`number[]`). The golden called this array `concepts`; it is renamed to `candidates` here to match the binding contract. The `// FILL:` slots cover: domain context strings, LENSES array, per-lens prompt body, and seed prompts.

```js
// Generate stage
// Normalized from incremental-concept-tournament.js lines 109-159
// FILL: replace DOMAIN, genContext, LENSES, lens prompts, seedPrompts for your domain
// DOMAIN is declared in the context stage; reference it here directly.

const genContext = `${DOMAIN}

` + Object.entries(briefs).map(([k, v]) => `${k.toUpperCase()} BRIEF:\n${v}`).join('\n\n') // FILL: adjust key labels if brief keys have non-obvious names

const LENSES = [ // FILL: replace lens keys and prompts for your domain
  { key: 'lens-a', prompt: 'Lens: DIMENSION A. [Describe the creative angle through which candidates should be generated through this lens.]' }, // FILL: replace
  { key: 'lens-b', prompt: 'Lens: DIMENSION B. [Describe the creative angle for this lens.]' }, // FILL: replace
]

const genResults = await parallel(LENSES.map(l => () =>
  agent(
    `You are an expert generating candidates for a tournament deciding: ${DOMAIN}. ${l.prompt}\n\n${genContext}\n\nGenerate exactly 4 DISTINCT candidates through your lens. Each must satisfy all hard constraints and have one undeniably strong differentiator.`, // FILL: adjust count and constraint framing
    { label: `gen:${l.key}`, phase: 'Generate', schema: CANDIDATE_SCHEMA }
  )
))

// FILL: add seed prompts below — one entry per user-supplied seed idea; delete this block if no seeds
const seedPrompts = [
  `You are an expert. Develop this user-supplied seed idea into its STRONGEST single tournament-ready candidate for: ${DOMAIN}.\n\nSEED: [describe the seed idea here]\n\n${genContext}\n\nReturn exactly 1 candidate.`, // FILL: replace seed description
]
const seedDevs = await parallel(seedPrompts.map((prompt, si) => () =>
  agent(prompt, { label: `gen:seed-${si}`, phase: 'Generate', schema: CANDIDATE_SCHEMA })
))

const candidates = []
const seedIndices = []
for (const r of genResults.filter(Boolean)) for (const c of (r.candidates || [])) candidates.push(c) // FILL: r.candidates must match the top-level array key in CANDIDATE_SCHEMA; if you rename that key, update this access
for (const r of seedDevs.filter(Boolean)) for (const c of (r.candidates || [])) { seedIndices.push(candidates.length); candidates.push(c) }
```

---

## Filter Stage

Normalized from `incremental-concept-tournament.js` lines 164–217. Consumes `candidates`, `seedIndices`, `briefs`, `renderIndexed`. Produces `kept` (`number[]`), `totals` (`Map<number,number>`), `ranked` (`number[]` desc), and either `bracket` (`number[]` seeded, bracket mode) **or** `shortlist` (`number[]`, scoreboard mode). Seeds are force-kept in both modes.

### Bracket mode (select a fixed-size bracket for head-to-head tournament)

```js
// Filter stage — bracket mode
// Normalized from incremental-concept-tournament.js lines 164-217
// FILL: replace AXES, DOMAIN, HARD, bracket size (default 8), and prompt bodies
const DOMAIN = 'your domain here' // FILL: one-phrase description (already declared at assembly; here for standalone parse)
const candidates = [] // STANDALONE PARSE ONLY — DELETE at assembly
const seedIndices = [] // STANDALONE PARSE ONLY — DELETE at assembly
const briefs = {} // STANDALONE PARSE ONLY — DELETE at assembly
const renderIndexed = (idxs) => idxs.map(i => `[${i}] ${JSON.stringify(candidates[i])}`).join('\n\n') // STANDALONE PARSE ONLY — DELETE at assembly

const HARD = `HARD CONSTRAINTS for ${DOMAIN}: [list must-satisfy constraints here]` // FILL: replace with your domain's hard constraints

const allIdx = candidates.map((_, i) => i)
const dedup = await agent(
  `You are the gatekeeper for a tournament deciding: ${DOMAIN}. Below are ${candidates.length} candidates, each with an index.\n\n${HARD}\n\nTASKS:\n1. KILL any candidate that violates a hard constraint.\n2. MERGE near-duplicates: when two candidates share the same core idea, keep only the better-articulated one.\n3. Indices ${JSON.stringify(seedIndices)} are the user's own seed ideas — they MUST be kept regardless (flag concerns in notes instead of killing).\n\nReturn the indices to keep.\n\n${renderIndexed(allIdx)}`,
  { label: 'filter:dedup', phase: 'Filter', schema: KEEP_SCHEMA }
)

let kept = (dedup && dedup.keep ? dedup.keep : allIdx).filter(i => i >= 0 && i < candidates.length)
for (const s of seedIndices) if (!kept.includes(s)) kept.push(s)
kept = [...new Set(kept)]

const AXES = [ // FILL: replace axes for your domain; each axis has key, brief (context string), and instr (scoring instruction)
  { key: 'axis-a', brief: briefs.topicA || '', instr: 'AXIS A: [describe what to score on this axis]' }, // FILL: replace
  { key: 'axis-b', brief: briefs.topicB || '', instr: 'AXIS B: [describe what to score on this axis]' }, // FILL: replace
]

const screeningResults = await parallel(AXES.map(a => () =>
  agent(
    `You are a tournament screener scoring candidates on ONE axis: ${a.instr}\n\nCONTEXT: ${DOMAIN}\n\nREFERENCE BRIEF:\n${a.brief}\n\nScore EVERY candidate below 0-10 on your axis ONLY. Use the full range — be a harsh discriminator, no clustering at 7. One sentence of reasoning each.\n\n${renderIndexed(kept)}`,
    { label: `screen:${a.key}`, phase: 'Filter', schema: SCORES_SCHEMA }
  )
))

const totals = new Map(kept.map(i => [i, 0]))
for (const res of screeningResults.filter(Boolean)) for (const s of (res.scores || [])) {
  if (totals.has(s.index)) totals.set(s.index, totals.get(s.index) + s.score)
}
const ranked = [...kept].sort((x, y) => totals.get(y) - totals.get(x))

// bracket: seeds guaranteed + top-scoring others fill remaining slots
const BRACKET_SIZE = 8 // FILL: adjust bracket size (must be a power of 2 for standard single-elimination)
const bracket = []
for (const s of seedIndices) bracket.push(s)
for (const i of ranked) { if (bracket.length >= BRACKET_SIZE) break; if (!bracket.includes(i)) bracket.push(i) }
bracket.sort((x, y) => totals.get(y) - totals.get(x))
```

### Scoreboard mode (rank all survivors for a scoring-panel tournament)

```js
// Filter stage — scoreboard mode
// Normalized from incremental-concept-tournament.js lines 164-210 (dedup + screening identical to bracket mode)
// FILL: same slots as bracket mode above; delete bracket block, add shortlist
const DOMAIN = 'your domain here' // FILL: one-phrase description (already declared at assembly; here for standalone parse)
const candidates = [] // STANDALONE PARSE ONLY — DELETE at assembly
const seedIndices = [] // STANDALONE PARSE ONLY — DELETE at assembly
const briefs = {} // STANDALONE PARSE ONLY — DELETE at assembly
const renderIndexed = (idxs) => idxs.map(i => `[${i}] ${JSON.stringify(candidates[i])}`).join('\n\n') // STANDALONE PARSE ONLY — DELETE at assembly

const HARD_SB = `HARD CONSTRAINTS for ${DOMAIN}: [list must-satisfy constraints here]` // FILL: replace (renamed to HARD_SB to avoid collision in standalone parse)

const allIdxSB = candidates.map((_, i) => i)
const dedupSB = await agent(
  `You are the gatekeeper for a tournament deciding: ${DOMAIN}. Below are ${candidates.length} candidates, each with an index.\n\n${HARD_SB}\n\nTASKS:\n1. KILL any candidate that violates a hard constraint.\n2. MERGE near-duplicates: keep only the better-articulated one.\n3. Indices ${JSON.stringify(seedIndices)} are user seeds — keep regardless.\n\nReturn the indices to keep.\n\n${renderIndexed(allIdxSB)}`,
  { label: 'filter:dedup', phase: 'Filter', schema: KEEP_SCHEMA }
)

let keptSB = (dedupSB && dedupSB.keep ? dedupSB.keep : allIdxSB).filter(i => i >= 0 && i < candidates.length)
for (const s of seedIndices) if (!keptSB.includes(s)) keptSB.push(s)
keptSB = [...new Set(keptSB)]

const AXES_SB = [ // FILL: replace axes for your domain
  { key: 'axis-a', brief: briefs.topicA || '', instr: 'AXIS A: [describe what to score on this axis]' },
  { key: 'axis-b', brief: briefs.topicB || '', instr: 'AXIS B: [describe what to score on this axis]' },
]

const screeningResultsSB = await parallel(AXES_SB.map(a => () =>
  agent(
    `You are a tournament screener scoring candidates on ONE axis: ${a.instr}\n\nCONTEXT: ${DOMAIN}\n\nREFERENCE BRIEF:\n${a.brief}\n\nScore EVERY candidate below 0-10 on your axis ONLY. Use the full range — no clustering at 7. One sentence of reasoning each.\n\n${renderIndexed(keptSB)}`,
    { label: `screen:${a.key}`, phase: 'Filter', schema: SCORES_SCHEMA }
  )
))

const totalsSB = new Map(keptSB.map(i => [i, 0]))
for (const res of screeningResultsSB.filter(Boolean)) for (const s of (res.scores || [])) {
  if (totalsSB.has(s.index)) totalsSB.set(s.index, totalsSB.get(s.index) + s.score)
}
const rankedSB = [...keptSB].sort((x, y) => totalsSB.get(y) - totalsSB.get(x))

// Export scoreboard-mode bindings (alias to contract names for assembly)
const kept = keptSB
const totals = totalsSB
const ranked = rankedSB

// shortlist: seeds guaranteed + all ranked survivors (scoreboard tournament needs all)
const shortlist = [...new Set([...seedIndices, ...ranked])]
```

---

## Tournament Stage

### Bracket mode (single-elimination, 8-slot default)

```js
// Tournament stage — bracket mode
// Normalized from incremental-concept-tournament.js lines 219-270
// Consumes: candidates (Candidate[]), bracket (number[], seeded desc), renderConcept, MATCH_SCHEMA
// Produces: champion (number/index), runnerUp (number/index), matchLog (object[])
// FILL: replace JUDGE_LENSES with judge lenses appropriate for your domain; each lens has key/brief/instr
const candidates = [] // STANDALONE PARSE ONLY — DELETE at assembly
const bracket = [] // STANDALONE PARSE ONLY — DELETE at assembly
const renderConcept = (c) => JSON.stringify(c) // STANDALONE PARSE ONLY — DELETE at assembly
const MATCH_SCHEMA = { type: 'object', properties: { winner: { type: 'string', enum: ['A','B'] }, reason: { type: 'string' } }, required: ['winner','reason'] } // STANDALONE PARSE ONLY — DELETE at assembly
const agent = async () => null // STANDALONE PARSE ONLY — DELETE at assembly
const parallel = async (fns) => Promise.all(fns.map(f => f())) // STANDALONE PARSE ONLY — DELETE at assembly
const log = () => {} // STANDALONE PARSE ONLY — DELETE at assembly

const DOMAIN = 'your domain here' // FILL: one-phrase description (already declared at assembly; here for standalone parse)
const HARD = `HARD CONSTRAINTS for ${DOMAIN}: [list must-satisfy constraints here]` // FILL: replace with your hard constraints (already declared at assembly; here for standalone parse)
const briefs = {} // STANDALONE PARSE ONLY — DELETE at assembly

const JUDGE_LENSES = [ // FILL: replace with lenses for your domain
  { key: 'lens-a', brief: () => briefs.topicA || '', instr: 'LENS A: [describe what this judge evaluates above all]' },
  { key: 'lens-b', brief: () => briefs.topicB || '', instr: 'LENS B: [describe what this judge evaluates above all]' },
  { key: 'lens-c', brief: () => briefs.topicC || '', instr: 'LENS C: [describe what this judge evaluates above all]' },
]

const matchLog = []
const runMatch = async (ai, bi, round) => {
  const a = candidates[ai], b = candidates[bi]
  const votes = await parallel(JUDGE_LENSES.map(j => () =>
    agent(
      `You are one of three judges in a single-elimination tournament deciding: ${DOMAIN}.\n\n${HARD}\n\n${j.instr} The other must-haves are hard pass/fail criteria — a candidate that fails one loses regardless of your lens.\n\nREFERENCE BRIEF:\n${j.brief()}\n\nCANDIDATE A:\n${renderConcept(a)}\n\nCANDIDATE B:\n${renderConcept(b)}\n\nBe adversarial: hunt for the fatal flaw in each before weighing strengths. Pick the better CHOICE, not the more impressive idea on paper.`,
      { label: `judge:${round}:${j.key}`, phase: 'Tournament', schema: MATCH_SCHEMA }
    )
  ))
  const valid = votes.filter(Boolean)
  const aVotes = valid.filter(v => v.winner === 'A').length
  const winner = aVotes * 2 >= valid.length ? ai : bi // tie or majority-A → higher seed (A)
  matchLog.push({
    round,
    a: a.name,
    b: b.name,
    winner: candidates[winner].name,
    votes: JUDGE_LENSES.map((j, k) => votes[k]
      ? `${j.key}: ${votes[k].winner === 'A' ? a.name : b.name} — ${votes[k].reason}`
      : `${j.key}: (no vote)`)
  })
  log(`${round}: ${a.name} vs ${b.name} → ${candidates[winner].name} (${aVotes}/${valid.length} for A)`)
  return winner
}

// pairings avoid top seeds meeting early: 1v8, 4v5, 3v6, 2v7 (bracket is sorted desc by score = seed 1 at index 0)
log('Quarterfinals...')
const [qf1, qf2, qf3, qf4] = await parallel([
  () => runMatch(bracket[0], bracket[7], 'QF1'),
  () => runMatch(bracket[3], bracket[4], 'QF2'),
  () => runMatch(bracket[2], bracket[5], 'QF3'),
  () => runMatch(bracket[1], bracket[6], 'QF4'),
])
log('Semifinals...')
const [sf1, sf2] = await parallel([
  () => runMatch(qf1, qf2, 'SF1'),
  () => runMatch(qf3, qf4, 'SF2'),
])
log('Final...')
const champion = await runMatch(sf1, sf2, 'FINAL')
const runnerUp = champion === sf1 ? sf2 : sf1
log(`CHAMPION: ${candidates[champion].name}`)
```

---

### Scoreboard mode (generate → judge panel → average score → ranked board)

```js
// Tournament stage — scoreboard mode
// Normalized from moms-curry-tournament.js lines 155-191
// Consumes: candidates (Candidate[]), shortlist (number[], indices), renderConcept, JUDGE_SCHEMA
// Produces: board ({index,score,...}[], sorted desc), winner (number/index = board[0].index)
// FILL: replace JUDGES with judge personas/rubrics for your domain; adjust score scale comment
// NOTE: pipeline(items, stage1, stage2, ...) passes every stage callback (prevResult, originalItem, index).
// So pipeline(shortlist, genFn, judgeFn) gives each stage the candidate index as originalItem — no outer map needed.
const candidates = [] // STANDALONE PARSE ONLY — DELETE at assembly
const shortlist = [] // STANDALONE PARSE ONLY — DELETE at assembly
const renderConcept = (c) => JSON.stringify(c) // STANDALONE PARSE ONLY — DELETE at assembly
const JUDGE_SCHEMA = { type: 'object', properties: { persona: { type: 'string' }, score: { type: 'number' }, breakdown: { type: 'string' }, critique: { type: 'string' }, mustFix: { type: 'string' }, wouldChoose: { type: 'boolean' } }, required: ['persona','score','critique','mustFix','wouldChoose'] } // STANDALONE PARSE ONLY — DELETE at assembly
const agent = async () => null // STANDALONE PARSE ONLY — DELETE at assembly
const parallel = async (fns) => Promise.all(fns.map(f => f())) // STANDALONE PARSE ONLY — DELETE at assembly
const log = () => {} // STANDALONE PARSE ONLY — DELETE at assembly

const DOMAIN_SB = 'your domain here' // FILL: one-phrase description (already declared at assembly as DOMAIN; rename at assembly)
const SHARED_SB = `[shared background context for ${DOMAIN_SB}]` // FILL: compose from briefs/verifiedDigest/researchDigest at assembly

const JUDGES = [ // FILL: replace with judge personas + rubrics for your domain
  { key: 'judge-a', persona: '[Judge A role]', rubric: 'AXIS A: [what this judge scores on, 0–10]' }, // FILL: adjust scale (curry golden uses 0-50; normalized to 0-10 per JUDGE_SCHEMA)
  { key: 'judge-b', persona: '[Judge B role]', rubric: 'AXIS B: [what this judge scores on, 0–10]' },
  { key: 'judge-c', persona: '[Judge C role]', rubric: 'AXIS C: [what this judge scores on, 0–10]' },
]

const judged = (await pipeline(
  shortlist,
  (idx) => {
    const c = candidates[idx]
    return agent(
      `${SHARED_SB}\n\nYou are developing ONE tournament candidate.\nCANDIDATE: ${c.name}\n\nProduce a complete, detailed output for this candidate. Put full content in the appropriate schema fields.`, // FILL: tailor prompt for your domain
      { label: `gen:${c.name}`, phase: 'Tournament', schema: { type: 'object', properties: { candidates: { type: 'array', items: { type: 'object' } } }, required: ['candidates'] }, effort: 'high' } // FILL: replace inline schema with your domain's generation schema (e.g. CANDIDATE_SCHEMA)
    )
  },
  (generated, idx) => {
    const c = candidates[idx]
    if (!generated) throw new Error('generation failed for candidate ' + idx)
    return parallel(JUDGES.map(j => () =>
      agent(
        `${SHARED_SB}\n\nYou are judging a tournament candidate. YOUR ROLE: ${j.persona}.\n${j.rubric}\n\nCANDIDATE NAME: ${c.name}\nCANDIDATE OUTPUT:\n${renderConcept(generated)}\n\nScore it 0-10 through YOUR lens only. Be tough, specific, and do NOT inflate. Give a breakdown, a sharp critique, the single most important fix (mustFix), and whether YOU personally would choose it.`, // FILL: adjust score scale in prompt to match JUDGE_SCHEMA (0-10)
        { label: `judge:${c.name}:${j.key}`, phase: 'Tournament', schema: JUDGE_SCHEMA, effort: 'high' }
      )
    )).then(js => {
      const jj = js.filter(Boolean)
      const score = jj.length ? jj.reduce((s, x) => s + (x.score || 0), 0) / jj.length : 0
      return { index: idx, name: c.name, generated, judges: jj, score }
    })
  }
)).filter(Boolean)

const board = judged.sort((a, b) => b.score - a.score)
const winner = board[0].index
log(`Leaderboard: ${board.map(b => `${b.name} ${b.score.toFixed(1)}`).join(' | ')}. Winner: ${board[0].name}.`)
```
