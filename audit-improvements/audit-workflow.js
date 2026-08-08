// Incremental audit engine for ~/Claude/improvements.md.
// Launch via the Workflow tool with scriptPath pointing here, passing:
//   args = { filePath, sinceDate, mode }   // mode: 'incremental' (default) | 'full'
// Returns structured findings for the main agent to act on (annotate / promote / route).
// The main agent applies edits + gates active-config promotions — this engine only analyzes.
export const meta = {
  name: 'audit-improvements-incremental',
  description: 'Incremental audit of improvements.md: deep-audit entries newer than the watermark, cheap ref-rot sweep over ALL entries, flag promote/route candidates',
  phases: [
    { title: 'Extract', detail: 'parse entries; partition new-vs-old by watermark' },
    { title: 'Audit', detail: 'deep-audit new entries + cheap ref-rot sweep across all' },
    { title: 'Verify', detail: 'adversarially re-check flagged findings' },
  ],
}

const A = typeof args === 'string' ? JSON.parse(args) : (args && typeof args === 'object' ? args : {})
const FILE = A.filePath || '~/Claude/improvements.md'
const MODE = A.mode || 'incremental'         // 'full' also runs the heavy read/write evidence scan
// SINCE (the incremental boundary) is resolved AFTER extraction, preferring the in-file watermark
// banner over args — the watermark travels with the file, so it can't be lost to args plumbing.
const CONFIG = `Active config to compare against (read these): ~/.claude/CLAUDE.md, ~/.claude/projects/-Users-chaipalaka-Claude/memory/MEMORY.md, and installed skills (run: ls ~/.claude/skills 2>/dev/null; ls ~/.agents/skills 2>/dev/null).`
// Every agent() call pins `model: WORKHORSE` explicitly — the Multi-Agent Model Policy forbids
// silent inheritance (a scarce-tier main loop would otherwise spend ~900k of the weekly scarce
// budget per run). The ID is CONCRETE, never the `opus` alias: an alias can lag a release and keep
// serving the prior generation while every rule still reads correct (alias rule 2026-07-24).
// Probed 2026-08-08 via `claude -p --output-format json`: alias `opus` -> canonicalModel
// claude-opus-5. Re-probe and update this one line when a generation ships.
const WORKHORSE = 'claude-opus-5'

const EXTRACT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['entries', 'watermark'],
  properties: {
    watermark: { type: 'string', description: 'the YYYY-MM-DD date in the `<!-- audit-watermark: … -->` banner near the top, or "none" if absent' },
    entries: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['id', 'date', 'title', 'artifacts', 'already_annotated'],
    properties: {
      id: { type: 'string' }, date: { type: 'string' }, title: { type: 'string' },
      already_annotated: { type: 'boolean', description: 'true if the entry already carries a `_[YYYY-MM-DD audit: …]_` note or a `> **Superseded/…**` blockquote' },
      artifacts: { type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['ref', 'kind'],
        properties: { ref: { type: 'string' }, kind: { type: 'string', enum: ['path', 'skill', 'script', 'memory', 'convention', 'doc', 'permission', 'other'] } },
      } },
    } } },
  },
}
const AUDIT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['findings'],
  properties: { findings: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['id', 'title', 'status', 'evidence', 'disposition'],
    properties: {
      id: { type: 'string' }, title: { type: 'string' },
      status: { type: 'string', enum: ['current', 'stale', 'incorrect', 'superseded', 'redundant', 'partially-stale'] },
      evidence: { type: 'string', description: 'concrete commands run + results' },
      reversed_by: { type: 'string' }, redundant_with: { type: 'string' },
      disposition: { type: 'string', enum: ['leave', 'annotate-deadref', 'annotate-superseded', 'promote-crossproject', 'route-projectlocal'], description: 'what the main agent should do; promote/route are GATED on user approval' },
      promote_target: { type: 'string', description: 'for promote-crossproject: which CLAUDE.md section / skill / memory; for route-projectlocal: which project doc' },
    } } } },
}
const ROT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['dead_refs'],
  properties: { dead_refs: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['entry_id', 'ref', 'evidence'],
    properties: { entry_id: { type: 'string' }, ref: { type: 'string' }, evidence: { type: 'string' } },
  } } },
}
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['id', 'upheld', 'note'],
  properties: { id: { type: 'string' }, upheld: { type: 'boolean' }, note: { type: 'string' } },
}

// ---------- Extract ----------
phase('Extract')
const extracted = await agent(
  `Read ${FILE} IN FULL. It is a dated log of behavioral customizations, one "## YYYY-MM-DD — Title" section per entry. Extract EVERY entry: id (date+short slug), date, title, already_annotated (does it already carry a \`_[YYYY-MM-DD audit: …]_\` inline note or a \`> **Superseded/Generalized/Partly superseded …**\` blockquote?), and artifacts (every concrete referenceable thing that could rot: file paths, skill names, scripts, memory files, named conventions, docs, permission entries). Return via schema.`,
  { schema: EXTRACT_SCHEMA, phase: 'Extract', label: 'extract', model: WORKHORSE, effort: 'high' }
)
if (!extracted) return { error: 'extraction-failed' }
const all = extracted.entries
const SINCE = /^\d{4}-\d{2}-\d{2}$/.test(extracted.watermark || '') ? extracted.watermark : (A.sinceDate || '0000-00-00')
const fresh = all.filter(e => e.date > SINCE)   // YYYY-MM-DD lexical compare
log(`${all.length} entries total; ${fresh.length} newer than watermark ${SINCE}.`)

// ---------- Audit: deep (new only) + cheap rot-sweep (all) ----------
phase('Audit')
function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }

const deepThunks = chunk(fresh, 6).map((b, i) => () => agent(
  `Deep-audit these NEW entries (added since the last audit) from ${FILE}. First read the FULL file (a later entry may reverse an earlier one) and ${CONFIG}
For EACH entry: verify referenced artifacts exist (ls/test/grep); check if a later entry reversed it; judge redundancy with active config; check factual correctness today. If one of THESE new entries reverses/generalizes/obsoletes an OLDER entry in the file, ALSO emit an annotate-superseded finding for that older entry (use the older entry's id; set reversed_by to the new entry).
Classify status, then set disposition:
- leave (current, nothing to do)
- annotate-deadref (a referenced skill/path/memory no longer exists, or a factual claim is now wrong)
- annotate-superseded (a later entry reversed/generalized it)
- promote-crossproject (a still-true lesson that generalizes across projects and is NOT yet in active config — set promote_target to the CLAUDE.md section/skill/memory). GATED: the main agent will ask before applying.
- route-projectlocal (a project-specific one-off — set promote_target to the owning project's docs). Keep the historical entry; do NOT delete.
NEVER recommend deleting an entry. Give concrete evidence (commands + results).
ENTRIES:\n${JSON.stringify(b, null, 1)}`,
  { schema: AUDIT_SCHEMA, phase: 'Audit', label: `deep:batch${i + 1}`, model: WORKHORSE, effort: 'xhigh' }
))

const rotThunk = agent(
  `Cheap rot-sweep across ALL entries of ${FILE}: for every artifact below, check ONLY whether it still exists (ls/test for paths/scripts/docs/memory; \`ls ~/.claude/skills/<name>\` or \`ls ~/.agents/skills/<name>\` for skills). Report only the DEAD ones (referenced thing is gone) with the entry_id, the ref, and the command output. Skip 'convention'/'permission'/'other' kinds. Do NOT judge redundancy or supersession — existence only. Paths may be RELATIVE to a workspace root (e.g. \`mcp-test/docs/x.md\` lives under ~/gamedev/godot, NOT ~/Claude), so for any non-absolute, non-~ ref search broadly before concluding it's gone: \`find ~/Claude ~/gamedev ~/Code ~/.claude ~/.agents -path '*<ref>*' 2>/dev/null | head\`; report DEAD only if it exists under NONE of those roots. Before reporting a dead ref, read its entry in ${FILE} and SKIP it if the entry's own text marks that ref as removed/deleted/renamed/retired/archived/orphaned/superseded, or the entry already carries an \`_[… audit: …]_\` note about it — those are intentional removals on record, not broken live pointers.
ARTIFACTS:\n${JSON.stringify(all.flatMap(e => e.artifacts.filter(a => ['path', 'skill', 'script', 'memory', 'doc'].includes(a.kind)).map(a => ({ entry_id: e.id, ...a }))), null, 1)}`,
  { schema: ROT_SCHEMA, phase: 'Audit', label: 'rot-sweep', model: WORKHORSE, effort: 'high' }
)

const [deepRaw, rot] = await Promise.all([parallel(deepThunks), rotThunk])
const deep = deepRaw.filter(Boolean).flatMap(d => d.findings || [])

// ---------- Verify flagged ----------
phase('Verify')
const flagged = deep.filter(f => f.disposition !== 'leave')
const verified = await parallel(flagged.map(f => () =>
  agent(`Adversarially RE-VERIFY this audit finding about ${FILE}; DEFAULT TO REFUTING it. Re-run the existence/reversal/redundancy checks yourself. If the artifact still exists or the reversal/redundancy is not real, upheld=false. Put real command output in note.\nFINDING:\n${JSON.stringify(f, null, 1)}`,
    { schema: VERDICT_SCHEMA, phase: 'Verify', label: `verify:${f.id}`, model: WORKHORSE, effort: 'xhigh' }
  ).then(v => v ? { ...v, finding: f } : null)
))
const verdicts = {}
for (const v of verified.filter(Boolean)) verdicts[v.finding.id] = v.upheld
const confirmed = deep.filter(f => f.disposition === 'leave' || verdicts[f.id] !== false)

// ---------- Optional heavy evidence scan (full mode only) ----------
let evidence = null
if (MODE === 'full') {
  phase('Extract')
  evidence = await agent(
    `Empirically measure whether sessions READ vs only WRITE ${FILE}. Scan ~/.claude/projects/**/*.jsonl. Count ONLY genuine tool_use events targeting the file (Read tool with that file_path; Bash reading it; Edit/Write/append). EXCLUDE the CLAUDE.md-injection false positives (the filename appears in most transcripts purely because CLAUDE.md cites it). Report read count, write count, and whether the read-to-append pattern still holds.`,
    { schema: { type: 'object', additionalProperties: false, required: ['summary'], properties: { summary: { type: 'string' } } }, phase: 'Extract', label: 'evidence-full', model: WORKHORSE, effort: 'high' }
  )
}

return {
  watermark: SINCE,
  total_entries: all.length,
  new_entries: fresh.length,
  deadrefs: rot ? rot.dead_refs : [],
  findings: confirmed,
  promote_candidates: confirmed.filter(f => f.disposition === 'promote-crossproject'),
  route_candidates: confirmed.filter(f => f.disposition === 'route-projectlocal'),
  nothing_new: fresh.length === 0,
  evidence,
}
