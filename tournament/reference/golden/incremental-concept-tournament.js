export const meta = {
  name: 'incremental-concept-tournament',
  description: 'Generate-and-filter + tournament to pick a 2-month solo-dev visual incremental game concept',
  phases: [
    { title: 'Context', detail: 'distill research corpus + 320h feasibility extrapolation' },
    { title: 'Generate', detail: '6 lens generators x4 concepts + 2 seed developers' },
    { title: 'Filter', detail: 'dedup/constraint-kill, 4-axis screening, bracket selection' },
    { title: 'Tournament', detail: '8-slot bracket, 3-judge panels per match' },
    { title: 'Verify', detail: 'adversarial skeptics attack the champion' },
    { title: 'Synthesize', detail: 'final recommendation report' },
  ],
}

const ROOT = '/Users/chaipalaka/Claude/game-storming'

const HARD = `HARD CONSTRAINTS (every concept MUST satisfy ALL of these):
- Solo developer doing EVERYTHING (code, art, music, marketing), ~300-350 hours total over 2 months, Godot 4.6, strictly 2D.
- Genre/style: visual incremental in the style of The Gnorp Apologue. Price point $2.99-$4.99 on Steam.
- MUST-HAVE 1 — Visual spectacle of scale: thousands of particles/units/numbers on screen ARE the progression readout; you SEE your power grow, not just read it.
- MUST-HAVE 2 — Finite, compact game: ~4-8 hours to a real ending/credits, optional NG+/challenge modes. NOT an infinite prestige treadmill.
- MUST-HAVE 3 — Active hands-on moments: direct player input (clicking, aiming, dragging, steering) stays meaningful through the WHOLE game, not just the first hour.
- Heavy emphasis on game feel / juice: the moment-to-moment interaction must be intrinsically satisfying.
- ABSOLUTELY NO card games or deckbuilder mechanics of any kind (user explicitly hates them).
- The developer is a competent 2D artist (sprite work is a strength, not a risk).`

// ---------- schemas ----------
const conceptProps = {
  name: { type: 'string' },
  premise: { type: 'string', description: '1-2 sentence elevator pitch incl. theme/tone' },
  core_loop: { type: 'string', description: 'the moment-to-moment loop and how it evolves over the 4-8h arc' },
  active_input: { type: 'string', description: 'what the player physically DOES with mouse/keys and why it stays meaningful late-game' },
  spectacle: { type: 'string', description: 'what fills the screen at scale; how progression is READ visually' },
  finite_arc: { type: 'string', description: 'what the ending is and how ~4-8h structure works' },
  hook: { type: 'string', description: 'the single GIF-able moment + Steam tag/positioning' },
  scope_notes: { type: 'string', description: 'rough hour budget sanity: systems count, art load, balancing load' },
  risks: { type: 'string', description: 'top 2-3 ways this fails (design or scope)' },
}
const CONCEPTS_SCHEMA = {
  type: 'object',
  properties: {
    concepts: {
      type: 'array',
      items: { type: 'object', properties: conceptProps, required: Object.keys(conceptProps) },
    },
  },
  required: ['concepts'],
}
const KEEP_SCHEMA = {
  type: 'object',
  properties: {
    keep: { type: 'array', items: { type: 'integer' }, description: 'indices of concepts to keep' },
    notes: { type: 'string', description: 'what was merged/killed and why, briefly' },
  },
  required: ['keep', 'notes'],
}
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
const MATCH_SCHEMA = {
  type: 'object',
  properties: {
    winner: { type: 'string', enum: ['A', 'B'] },
    reason: { type: 'string', description: '2-3 sentences: the decisive factor, incl. any fatal flaw in the loser' },
  },
  required: ['winner', 'reason'],
}
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

// ---------- Phase 1: Context ----------
phase('Context')
log('Distilling research corpus into design briefs...')

const briefSpec = 'Return ONLY a dense, design-actionable brief of AT MOST 600 words: terse bullets, concrete numbers/examples preserved, no fluff or meta-commentary. Your final message IS the brief.'

const [genreBrief, feelBrief, marketBrief, seedsBrief, feasBrief] = await parallel([
  () => agent(`Read ${ROOT}/research/idle-incremental-genre.md (a verified deep-research report). Extract everything design-relevant to building a Gnorp-Apologue-style VISUAL incremental: what makes Gnorp work (structure, build variety, finite arc, spectacle), design principles for visual incrementals, the balancing-effort findings (balancing is reportedly 60-70% of such a project), monetization/pricing findings near $3-5, and known pitfalls. IGNORE deckbuilder-idler recommendations entirely (user refuses card mechanics). ${briefSpec}`, { model: 'opus', label: 'brief:genre', phase: 'Context' }),
  () => agent(`Read ${ROOT}/research/game-feel-collectibles.md and the notes ${ROOT}/research/notes/game-feel/recipes.md, ${ROOT}/research/notes/game-feel/theory.md, ${ROOT}/research/notes/game-feel/vacuum-suction.md, ${ROOT}/research/notes/game-feel/psychology.md. Extract a juice/game-feel cookbook applicable to a 2D incremental: concrete pickup/impact/feedback recipes (numbers: durations, curves, pitch ramps), the spring-reel/vacuum findings, spectacle-of-scale techniques, and the psychology of satisfying collection. ${briefSpec}`, { model: 'opus', label: 'brief:feel', phase: 'Context' }),
  () => agent(`Read ${ROOT}/research/indie-market-2025-2026.md and ${ROOT}/research/indie-marketing-playbook.md (skim ${ROOT}/research/notes/marketing/dive-dome-keeper.md and ${ROOT}/research/notes/marketing/sweep-steam-mechanics.md if useful). Extract what makes a $2.99-4.99 solo 2D incremental SELLABLE in 2026: hook/GIF-ability criteria, Steam tags and comparables (incl. Gnorp Apologue's own performance if covered), wishlist/Next Fest timing, what fails. ${briefSpec}`, { model: 'opus', label: 'brief:market', phase: 'Context' }),
  () => agent(`Read ${ROOT}/research/magic-systems.md and ${ROOT}/research/arcade-space-shooter-lineage.md. Extract raw material for two game-concept seeds: (1) a fantasy premise inspired by Brandon Sanderson magic systems where magic manifests as living crystals found in the ground that must be SQUISHED to retrieve power — pull the most game-mappable magic-system mechanics (costs, vulnerability windows, power-as-corruption, comprehension gates); (2) a 2D space MINING game with soft-RTS controls — pull the most unmined ideas from the Asteroids-lineage report relevant to mining/harvesting/swarm control rather than shooting. ${briefSpec}`, { model: 'opus', label: 'brief:seeds', phase: 'Context' }),
  () => agent(`You are a production planner for a SOLO game developer: ~300-350 hours over 2 months, Godot 4.6, 2D, doing code+art+music+marketing alone; competent 2D artist; first commercial release; target = Gnorp-Apologue-style visual incremental, 4-8h playtime, $2.99-4.99. Skim ${ROOT}/research/idle-incremental-genre.md for effort findings (balancing reportedly 60-70% of such projects) and ${ROOT}/research/indie-marketing-playbook.md for marketing time costs. Produce a FEASIBILITY YARDSTICK: hour-budget breakdown (systems code / content+art / audio / balancing+tuning / juice polish / marketing+store), a hard ceiling on number of distinct systems and art scope that fits, concrete examples of what does NOT fit in 320h, and 5 red-flag patterns that silently blow the budget. ${briefSpec}`, { model: 'opus', label: 'brief:feasibility', phase: 'Context' }),
])

const briefs = { genre: genreBrief || '', feel: feelBrief || '', market: marketBrief || '', seeds: seedsBrief || '', feas: feasBrief || '' }

// ---------- Phase 2: Generate ----------
phase('Generate')
log('Generating concepts across 6 lenses + developing the 2 user seeds...')

const genContext = `${HARD}

GENRE BRIEF:\n${briefs.genre}\n\nGAME-FEEL BRIEF:\n${briefs.feel}\n\nMARKET BRIEF:\n${briefs.market}\n\nFEASIBILITY YARDSTICK:\n${briefs.feas}`

const LENSES = [
  { key: 'substance', prompt: 'Lens: SUBSTANCE & DESTRUCTION. Concepts built around physical material at mass scale — sand, fluid, debris, crumbling structures, shattering, erosion. The spectacle is matter responding to the player.' },
  { key: 'flow', prompt: 'Lens: ECONOMY OF MOTION. Concepts built around visible flow and routing — streams of resources/units physically moving through space the player shapes (orbits, currents, paths, swarm herding). NOT factory-builder scope; one screen or a small camera space.' },
  { key: 'ecosystem', prompt: 'Lens: LIVING SYSTEMS. Concepts where the growing mass is ALIVE — creatures multiplying, colonies, symbiosis, predation, growth. The player tends/directs/harvests the living spectacle.' },
  { key: 'toy', prompt: 'Lens: TOY FIRST. Start from one intrinsically delicious physical interaction (squish, fling, vacuum, slice, pop, stretch, stomp) that would be fun in a 10-second toy with zero progression, then grow the incremental around making that toy bigger and weirder.' },
  { key: 'excavation', prompt: 'Lens: SPATIAL EXPANSION. Concepts where progress is carved into space — digging deeper, clearing territory, pushing back a frontier, hollowing out a world. The map itself is the progress bar.' },
  { key: 'weird', prompt: 'Lens: WEIRD PREMISE. Gnorp won partly on absurdist deadpan tone. Concepts with an unexpected, funny, or slightly wrong premise that makes people screenshot the store page. Mechanics can borrow from any lens; the premise does the marketing.' },
]

const genResults = await parallel(LENSES.map(l => () =>
  agent(`You are a senior game designer generating concepts for a tournament. ${l.prompt}

${genContext}

Generate exactly 4 DISTINCT game concepts through your lens. Each must satisfy every hard constraint, be buildable by this solo dev in ~320 hours INCLUDING balancing (which historically eats 60-70% of incremental projects), and have one undeniable GIF moment. Favor one-screen or small-camera-space designs over sprawling maps. Be specific about the active input and why it stays meaningful at hour 6. Do not propose card/deck mechanics in any disguise.`, { model: 'opus', label: `gen:${l.key}`, phase: 'Generate', schema: CONCEPTS_SCHEMA })
))

const seedDevs = await parallel([
  () => agent(`You are a senior game designer. Develop the user's own seed idea into its STRONGEST single tournament-ready form (1 concept):

SEED: A 2D space MINING incremental with soft RTS mechanics/controls — the player directs mining units/drones around asteroids/space matter; Gnorp-style visual incremental presentation. The "soft RTS" control feel (selecting, directing, herding) should be the active input.

SEED MATERIAL FROM RESEARCH:\n${briefs.seeds}

${genContext}

Resolve the seed's open questions in the most compelling, scope-safe way. Return exactly 1 concept.`, { model: 'opus', label: 'gen:seed-space-mining', phase: 'Generate', schema: CONCEPTS_SCHEMA }),
  () => agent(`You are a senior game designer. Develop the user's own seed idea into its STRONGEST single tournament-ready form (1 concept):

SEED: A fantasy premise inspired by Brandon Sanderson magic systems. The world's magic manifests as CRYSTALS found in the ground; they are almost alive and must be SQUISHED to retrieve their power. The squishing should be the deliciously juicy active input. Gameplay mechanics beyond that are open — design them.

SEED MATERIAL FROM RESEARCH:\n${briefs.seeds}

${genContext}

Resolve the seed's open questions in the most compelling, scope-safe way (e.g. what squishing feeds into, what the finite arc is, what fills the screen at scale). Return exactly 1 concept.`, { model: 'opus', label: 'gen:seed-crystal-squish', phase: 'Generate', schema: CONCEPTS_SCHEMA }),
])

const concepts = []
const seedIndices = []
for (const r of genResults.filter(Boolean)) for (const c of (r.concepts || [])) concepts.push(c)
for (const r of seedDevs.filter(Boolean)) for (const c of (r.concepts || [])) { seedIndices.push(concepts.length); concepts.push(c) }
log(`${concepts.length} concepts generated (${seedIndices.length} from user seeds)`)

const renderConcept = (c) => `### ${c.name}\nPremise: ${c.premise}\nCore loop: ${c.core_loop}\nActive input: ${c.active_input}\nSpectacle: ${c.spectacle}\nFinite arc: ${c.finite_arc}\nHook: ${c.hook}\nScope: ${c.scope_notes}\nRisks: ${c.risks}`
const renderIndexed = (idxs) => idxs.map(i => `[${i}] ${renderConcept(concepts[i])}`).join('\n\n')

// ---------- Phase 3: Filter ----------
phase('Filter')
log('Dedup + constraint kill, then 4-axis screening...')

const allIdx = concepts.map((_, i) => i)
const dedup = await agent(`You are the gatekeeper for a game-concept tournament. Below are ${concepts.length} concepts, each with an index.

${HARD}

TASKS:
1. KILL any concept that violates a hard constraint (disguised card/deck mechanics, no real active input late-game, infinite treadmill instead of a finite arc, spectacle that is just numbers in menus, or scope that is obviously not solo-buildable in ~320h).
2. MERGE near-duplicates: when two concepts share the same core fantasy + loop, keep only the better-articulated one.
3. Indices ${JSON.stringify(seedIndices)} are the user's own seed ideas — they MUST be kept regardless (flag concerns in notes instead of killing).

Return the indices to keep. Be ruthless; a kept field of 12-18 strong distinct concepts is ideal.

${renderIndexed(allIdx)}`, { model: 'opus', label: 'filter:dedup', phase: 'Filter', schema: KEEP_SCHEMA })

let kept = (dedup && dedup.keep ? dedup.keep : allIdx).filter(i => i >= 0 && i < concepts.length)
for (const s of seedIndices) if (!kept.includes(s)) kept.push(s)
kept = [...new Set(kept)]
log(`${kept.length} concepts survive the gate. Notes: ${dedup ? dedup.notes : 'n/a'}`)

const AXES = [
  { key: 'feel', brief: briefs.feel, instr: 'GAME FEEL & FUN: how intrinsically satisfying is the moment-to-moment interaction, how juicy can it get, does the active input stay fun at hour 6, is the toy fun before any progression?' },
  { key: 'feasibility', brief: briefs.feas, instr: 'FEASIBILITY: can THIS solo dev ship it polished in ~320h including the balancing tax? Punish hidden scope (simulation complexity, content treadmills, AI/pathfinding rabbit holes, multi-biome art loads).' },
  { key: 'market', brief: briefs.market, instr: 'MARKET: GIF-ability, store-page hook strength, Steam tag/comparable fit at $2.99-4.99, would the incremental-game audience that bought Gnorp wishlist this from one screenshot?' },
  { key: 'essence', brief: briefs.genre, instr: 'GNORP ESSENCE & ORIGINALITY: spectacle-of-scale as the progression readout, finite satisfying arc, build/strategy depth, and distinctiveness — is this its own game or a reskin of Gnorp/an existing hit?' },
]

const screeningResults = await parallel(AXES.map(a => () =>
  agent(`You are a tournament screener scoring game concepts on ONE axis: ${a.instr}

CONTEXT: solo dev, ~320h over 2 months, Godot 4.6, 2D, everything done alone, competent 2D artist, $2.99-4.99, Gnorp-style visual incremental. Must-haves: spectacle of scale, finite 4-8h arc, meaningful active input throughout.

REFERENCE BRIEF:\n${a.brief}

Score EVERY concept below 0-10 on your axis ONLY. Use the full range — be a harsh discriminator, no clustering at 7. One sentence of reasoning each.

${renderIndexed(kept)}`, { model: 'opus', label: `screen:${a.key}`, phase: 'Filter', schema: SCORES_SCHEMA })
))

const totals = new Map(kept.map(i => [i, 0]))
for (const res of screeningResults.filter(Boolean)) for (const s of (res.scores || [])) {
  if (totals.has(s.index)) totals.set(s.index, totals.get(s.index) + s.score)
}
const ranked = [...kept].sort((x, y) => totals.get(y) - totals.get(x))

// bracket: 2 user seeds guaranteed + top-scoring others to fill 8 slots
const bracket = []
for (const s of seedIndices) bracket.push(s)
for (const i of ranked) { if (bracket.length >= 8) break; if (!bracket.includes(i)) bracket.push(i) }
bracket.sort((x, y) => totals.get(y) - totals.get(x)) // seed positions by score
log(`Bracket of 8: ${bracket.map(i => `${concepts[i].name} (${totals.get(i).toFixed(1)})`).join(' | ')}`)

// ---------- Phase 4: Tournament ----------
phase('Tournament')

const JUDGE_LENSES = [
  { key: 'feel', brief: () => briefs.feel, instr: 'You judge GAME FEEL & FUN above all: which concept has the more intrinsically satisfying, juicier, more durable moment-to-moment interaction?' },
  { key: 'feasibility', brief: () => briefs.feas, instr: 'You judge FEASIBILITY & SCOPE above all: which concept more safely ships POLISHED in ~320 solo hours including the balancing tax? A brilliant concept that cannot ship loses.' },
  { key: 'market', brief: () => briefs.market, instr: 'You judge MARKET & HOOK above all: which concept sells more copies at $2.99-4.99 — stronger GIF, clearer store-page promise, better tag/comparable fit?' },
]

const matchLog = []
const runMatch = async (ai, bi, round) => {
  const a = concepts[ai], b = concepts[bi]
  const votes = await parallel(JUDGE_LENSES.map(j => () =>
    agent(`You are one of three judges in a single-elimination tournament picking ONE game concept for a solo developer to build.

${HARD}

${j.instr} The other must-haves are hard pass/fail criteria — a concept that fakes one of them loses regardless of your lens.

REFERENCE BRIEF:\n${j.brief()}

CONCEPT A:\n${renderConcept(a)}

CONCEPT B:\n${renderConcept(b)}

Be adversarial: hunt for the fatal flaw in each before weighing strengths. Pick the better CHOICE TO BUILD, not the cooler idea on paper.`, { model: 'opus', label: `judge:${round}:${j.key}`, phase: 'Tournament', schema: MATCH_SCHEMA })
  ))
  const valid = votes.filter(Boolean)
  const aVotes = valid.filter(v => v.winner === 'A').length
  const winner = aVotes * 2 >= valid.length ? ai : bi // tie or majority-A -> higher seed (A)
  matchLog.push({ round, a: a.name, b: b.name, winner: concepts[winner].name, votes: JUDGE_LENSES.map((j, k) => votes[k] ? `${j.key}: ${votes[k].winner === 'A' ? a.name : b.name} — ${votes[k].reason}` : `${j.key}: (no vote)`) })
  log(`${round}: ${a.name} vs ${b.name} → ${concepts[winner].name} (${aVotes}/${valid.length} for A)`)
  return winner
}

// pairings avoid top seeds meeting early: 1v8, 4v5, 3v6, 2v7
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
log(`CHAMPION: ${concepts[champion].name}`)

// ---------- Phase 5: Verify ----------
phase('Verify')
log(`Adversarial verification of "${concepts[champion].name}"...`)

const SKEPTIC_LENSES = [
  { key: 'feasibility', brief: () => briefs.feas, instr: 'Attack FEASIBILITY: find the hidden scope, the balancing tax, the simulation rabbit hole, the art/content treadmill that blows 320 solo hours. Estimate where the budget actually lands.' },
  { key: 'fun', brief: () => briefs.feel, instr: 'Attack FUN DURABILITY: argue the active input gets boring by hour 2, the spectacle plateaus, the build decisions are fake. Find the hour-4 boredom failure mode.' },
  { key: 'market', brief: () => briefs.market, instr: 'Attack MARKETABILITY: argue the GIF is weaker than it looks, the comparable is wrong, the audience overlap with Gnorp buyers is smaller than assumed, the premise reads generic on a store page.' },
]
const skepticResults = await parallel(SKEPTIC_LENSES.map(s => () =>
  agent(`You are a professional skeptic. Your job is to REFUTE this game concept before a solo developer commits 2 months to it. Default to refuted=true only for genuinely FATAL flaws; use severity for the rest. Always propose concrete fixes where they exist.

${HARD}

${s.instr}

REFERENCE BRIEF:\n${s.brief()}

THE CHAMPION CONCEPT:\n${renderConcept(concepts[champion])}`, { model: 'opus', label: `skeptic:${s.key}`, phase: 'Verify', schema: SKEPTIC_SCHEMA })
))
const skeptics = SKEPTIC_LENSES.map((s, k) => ({ lens: s.key, result: skepticResults[k] })).filter(x => x.result)
const fatalCount = skeptics.filter(x => x.result.refuted).length
log(`Skeptic verdicts: ${skeptics.map(x => `${x.lens}=${x.result.severity}${x.result.refuted ? ' (REFUTED)' : ''}`).join(', ')}`)

// ---------- Phase 6: Synthesize ----------
phase('Synthesize')
log('Writing final recommendation...')

const semifinalists = [qf1, qf2, qf3, qf4].filter(i => i !== sf1 && i !== sf2)
const report = await agent(`You are the synthesis lead for a concept-selection tournament. Write the FINAL RECOMMENDATION REPORT in markdown. Your final message IS the report — no meta-commentary.

${HARD}

CHAMPION:\n${renderConcept(concepts[champion])}\n(user-seed concept: ${seedIndices.includes(champion)})

RUNNER-UP:\n${renderConcept(concepts[runnerUp])}\n(user-seed concept: ${seedIndices.includes(runnerUp)})

SEMIFINALISTS:\n${semifinalists.map(i => renderConcept(concepts[i])).join('\n\n')}

FULL MATCH LOG (judge reasoning):\n${JSON.stringify(matchLog, null, 1)}

ADVERSARIAL SKEPTIC FINDINGS ON CHAMPION (${fatalCount}/3 voted fatal):\n${JSON.stringify(skeptics, null, 1)}

FEASIBILITY YARDSTICK:\n${briefs.feas}

Write these sections:
1. **Recommendation** — the concept to build and the one-paragraph case. If 2+ skeptics voted fatal, recommend the runner-up instead and say why.
2. **The concept in full** — refined pitch incorporating skeptic FIXES and the best grafts from runner-up/semifinalists (name each graft and its source concept).
3. **Why it beat the field** — the decisive judge arguments, honestly including close calls.
4. **Skeptic findings & mitigations** — every serious+ concern with its concrete mitigation.
5. **2-month scope sketch** — week-by-week milestone outline against the ~320h yardstick, with the balancing tax explicitly budgeted.
6. **Kill criteria** — 3 testable conditions in the first 2 weeks of prototyping that should kill/pivot the project.
7. **The full bracket** — one-line results of every match.`, { model: 'opus', label: 'synthesis', phase: 'Synthesize' })

return {
  champion: concepts[champion],
  championIsUserSeed: seedIndices.includes(champion),
  runnerUp: concepts[runnerUp].name,
  bracket: bracket.map(i => ({ name: concepts[i].name, screenScore: totals.get(i), isSeed: seedIndices.includes(i) })),
  matchLog,
  skeptics,
  fatalCount,
  report,
}