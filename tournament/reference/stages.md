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

The `fields` argument is a plain object mapping field name to `{ type, description }` (same shape as JSON Schema property definitions). The function returns a CONCEPTS_SCHEMA-equivalent wrapping those fields in an array of objects.

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
const candidates = [] // FILL: replaced at runtime by the generate stage

const renderConcept = (c) =>
  Object.entries(c)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

// renderIndexed: normalized verbatim from incremental-concept-tournament.js line 162
const renderIndexed = (idxs) => idxs.map(i => `[${i}] ${renderConcept(candidates[i])}`).join('\n\n')
```
