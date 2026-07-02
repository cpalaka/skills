export const meta = {
  name: 'moms-curry-tournament',
  description: "Improve the user's mom's simple chicken curry into a properly-spicy, leveled-up version: web-grounded research -> adversarial claim verification -> 4-candidate judged tournament -> synthesized final recipe + QA",
  phases: [
    { title: 'Research', detail: 'web-grounded research: heat science, Hyderabadi technique, bespoke garam, flavor-per-effort/meal-prep/sourcing' },
    { title: 'Verify', detail: 'adversarial skeptics (3 lenses each) refute/confirm every dubious claim before it reaches a recipe' },
    { title: 'Tournament', detail: '4 candidate recipes generated, each judged 0-50 by a 3-persona panel' },
    { title: 'Synthesize', detail: 'graft the winner + best verified ideas into the final recipe + garam blend + heat dial' },
    { title: 'QA', detail: 'red-team the final recipe for safety/heat/contradictions and patch' },
  ],
}

const ORIGINAL = `MOM'S CHICKEN CURRY (the simple staple to improve):
MARINADE (1.5 lb boneless skinless chicken thighs, 1-2 hrs): oil, yogurt, salt, red chili powder, turmeric, garam masala (currently PRE-GROUND), ginger-garlic paste.
TEMPERING / POPU (little oil, ~1 min): bay leaf, cloves, star anise, cinnamon, green cardamom, whole cumin (jeera).
BASE: green chili sauteed ~1 min -> onions + pinch salt cooked to transparent -> ginger-garlic paste ~2-3 min till raw smell gone.
CHICKEN: add marinated chicken + 2nd spice hit (red chili powder, turmeric, coriander powder) on LOW; cover, medium ~5 min; OPTIONAL chopped tomato +5 min; add 1/2-1 cup water, cover, low till done.
THICKENER: grind cashew + almond (~1/3 cup EACH) dry -> powder -> + ~1 cup water -> paste; stir in once chicken cooked.
FINISH: garam masala + red chili one last time; medium heat till gravy consistency right.
FLAVOR FINGERPRINT: rich nut-thickened, aromatic, MILD-TO-MEDIUM, NO souring agent, Hyderabadi/North-leaning (whole 'biryani' garam aromatics + cashew-almond paste). NOT a coastal-Andhra tangy kodi kura.
KNOWN PROBLEM: it never comes out actually spicy, and the cook doesn't know why.`;

const CONSTRAINTS = `COOK & CONSTRAINTS:
- Cook: competent Andhra/Telugu home cook in Seattle (Ballard). Doesn't need basic technique hand-holding, BUT South-Indian technique knowledge is genuinely lacking and the cook WANTS TO LEARN -- always explain the WHY behind a step.
- PRIMARY GOALS: (a) level up this simple staple with a FEW HIGH-IMPACT upgrades -- NOT a kitchen-sink of every technique; (b) make it ACTUALLY, SWEAT-INDUCINGLY spicy (current version reads mild and the cook can't figure out why).
- HEAT TARGET: sweat-inducing but LAYERED (not one-note brute chili powder). Include a per-portion 'heat finisher' so a single plate can be pushed hotter without over-spicing the whole batch.
- SACRED (must survive): the whole-garam aromatic POPU (bay / clove / star anise / cinnamon / green cardamom / cumin). Everything else is changeable.
- NEWLY ALLOWED (the cook did NOT protect these): a SUBTLE acid/souring brightener (NOT pulusu-level tang -- dish identity stays warm and non-tangy), restructuring garam-masala timing, and cutting/replacing the cashew-almond paste.
- GARAM MASALA: the cook WANTS a fresh-toasted-and-ground bespoke blend (loves doing this), tuned to this warm Hyderabadi profile.
- EQUIPMENT: NutriBullet (good for wet pastes + short-pulse dry spice grinding) + mortar & pestle. NO dedicated spice grinder.
- SOURCING (Seattle): Mayuri (Redmond) for Guntur/Kashmiri chili, gingelly oil, gasagasalu, curry leaf, jaggery; H Mart Ballard (WARNING: its sesame oil is TOASTED -- wrong for an Andhra base saute); Spice SPC (Capitol Hill). The cook has an 'extra hot' generic red chili powder but it's mild/uncalibrated -- they need a real HOT chili (Guntur/Sannam/cayenne) as the heat ENGINE and Kashmiri/paprika for COLOR only.
- MEAL PREP: cook ONE batch, eat over 3-4 dinners over plain white rice, cooking for one. Must hold / reheat / ideally improve over days (note: nut/dairy emulsions can split on reheat -- design around it).
- EFFORT BUDGET IS A HARD CONSTRAINT: 'a few high-impact upgrades only.' Penalize fussy multi-pan kitchen-sink complexity. (Bhuna was just ONE example of a welcome unlock, NOT required -- evaluate base-building techniques on merit; birista / fried-onion paste is likely more authentic to THIS Hyderabadi style than North-Indian bhuna.)`;

const RESEARCH_SCHEMA = {
  type:'object',
  properties:{
    summary:{type:'string'},
    findings:{type:'array', items:{type:'object', properties:{topic:{type:'string'},detail:{type:'string'},confidence:{type:'string'}}, required:['topic','detail','confidence']}},
    claimsToVerify:{type:'array', items:{type:'object', properties:{claim:{type:'string'},whyDubious:{type:'string'}}, required:['claim','whyDubious']}}
  },
  required:['summary','findings','claimsToVerify']
};

const VERDICT_SCHEMA = {
  type:'object',
  properties:{
    verdict:{type:'string', enum:['confirmed','refuted','partly','unknown']},
    reasoning:{type:'string'},
    correctedStatement:{type:'string'},
    keyEvidence:{type:'string'},
    confidence:{type:'string', enum:['high','moderate','low']}
  },
  required:['verdict','reasoning','correctedStatement','keyEvidence','confidence']
};

const CANDIDATE_SCHEMA = {
  type:'object',
  properties:{
    name:{type:'string'},
    thesis:{type:'string'},
    heatStrategy:{type:'string'},
    richnessStrategy:{type:'string'},
    changesFromOriginal:{type:'array', items:{type:'string'}},
    recipeMarkdown:{type:'string'}
  },
  required:['name','thesis','heatStrategy','richnessStrategy','changesFromOriginal','recipeMarkdown']
};

const JUDGE_SCHEMA = {
  type:'object',
  properties:{
    persona:{type:'string'},
    score_0_50:{type:'number'},
    breakdown:{type:'string'},
    critique:{type:'string'},
    mustFix:{type:'string'},
    wouldCook:{type:'boolean'}
  },
  required:['persona','score_0_50','critique','mustFix','wouldCook']
};

const SYNTH_SCHEMA = {
  type:'object',
  properties:{
    finalRecipeMarkdown:{type:'string'},
    garamBlendMarkdown:{type:'string'},
    heatDialMarkdown:{type:'string'},
    changeLog:{type:'array', items:{type:'object', properties:{change:{type:'string'},why:{type:'string'},verifiedBy:{type:'string'}}, required:['change','why']}},
    graftedFrom:{type:'array', items:{type:'string'}}
  },
  required:['finalRecipeMarkdown','garamBlendMarkdown','heatDialMarkdown','changeLog']
};

const QA_SCHEMA = {
  type:'object',
  properties:{
    foodSafetyOk:{type:'boolean'},
    heatWillDeliver:{type:'boolean'},
    issues:{type:'array', items:{type:'object', properties:{severity:{type:'string'},issue:{type:'string'},fix:{type:'string'}}, required:['severity','issue','fix']}},
    verdict:{type:'string'}
  },
  required:['foodSafetyOk','heatWillDeliver','issues','verdict']
};

// ---------------- PHASE 1: RESEARCH ----------------
phase('Research');
const researchBriefs = [
  { key:'heat-science', prompt:`You are a food-science researcher. GOAL: figure out why a rich, nut-and-dairy-thickened Hyderabadi-style chicken curry never tastes actually spicy, and how to make it genuinely SWEAT-INDUCING and LAYERED. Use WebSearch/WebFetch (first run ToolSearch with query "select:WebSearch,WebFetch" to load the schemas) to ground your answers in real sources. Investigate: (1) HOW fat and casein (yogurt, dairy, nuts, oil) buffer/strip capsaicin and lower PERCEIVED heat -- mechanism (capsaicin lipophilicity, casein binding) and rough magnitude; (2) does blooming chili powder in hot oil/ghee meaningfully raise perceived heat & color vs dumping it into a watery braise? (3) does long-cooking GREEN chili actually lose heat -- capsaicin is famously thermostable, so separate myth from fact (what really changes when chili cooks long: volatiles? concentration? perception?); (4) piperine (black pepper) vs capsaicin: same TRPV1 receptor? is the perceived-heat 'synergy' real or overstated folk wisdom? (5) does acidity make heat read sharper/brighter? (6) TRPV1 thermal sensitization -- does serving food piping hot increase perceived heat? (7) the most effective PRACTICAL levers to build sweat-inducing LAYERED heat (multiple vectors, raw/late additions, finishing tadka, per-portion finisher). Return concrete findings (with confidence) and flag your most load-bearing or dubious claims for adversarial verification.` },
  { key:'hyderabadi-technique', prompt:`You are an expert in Telugu/Hyderabadi home cooking. The dish: a mother's nut-thickened, whole-garam, NON-tangy chicken curry (Hyderabadi/North-leaning -- NOT a coastal tamarind kodi kura). Use WebSearch/WebFetch (load via ToolSearch "select:WebSearch,WebFetch") to ground claims. Research the highest-leverage AUTHENTIC technique upgrades: (1) BIRISTA (deep-fried golden onion paste) vs North-Indian BHUNA vs plain raw-onion base -- which gives the best authentic body/sweetness/richness for THIS style, and can birista let us CUT the cashew/almond paste while keeping a luscious gravy? (2) correct onion-browning depth/color and why it matters; (3) yogurt marinade -- does it genuinely tenderize chicken (lactic acid / enzymes), ideal marinate time, and the over-marinate / mushiness risk for boneless thigh; (4) the popu/tadka logic and whether a SECOND, finishing tadka is authentic to this cuisine; (5) what an authentic bespoke garam masala for this warm Hyderabadi profile contains, and how it should relate to the WHOLE spices already in the popu (avoid double-counting); (6) HONEST authenticity flags -- call out anything that would drift this into generic North-Indian restaurant korma or coastal pulusu. Return findings (with confidence) + dubious claims to verify.` },
  { key:'garam-blend', prompt:`You are a master spice blender. Design a bespoke FRESH-TOASTED-AND-GROUND garam masala for a warm, Hyderabadi-leaning chicken curry whose POPU already tempers whole bay leaf / cloves / star anise / cinnamon / green cardamom / cumin. Use WebSearch/WebFetch (load via ToolSearch "select:WebSearch,WebFetch") to ground ratios and method. Deliver: exact whole spices + ratios (give BOTH spoons and grams for a small jar), a toast-and-grind method achievable with a NutriBullet (short pulses, cool spices first, break cassia small) + mortar/pestle and NO dedicated spice grinder, storage/shelf-life, and how much to use in the MARINADE vs the FINISH. Evaluate (justify each include/exclude, avoid redundancy with the popu): black cardamom, mace, nutmeg, black peppercorn (doubles as a heat vector), shahi jeera, fennel, stone flower/kalpasi, dried red chili. Return findings (with confidence) + dubious claims to verify (e.g. fresh-ground vs pre-ground potency; is toasting necessary/beneficial; grinding cassia in a bullet blender).` },
  { key:'effort-mealprep', prompt:`You are a recipe developer optimizing FLAVOR-PER-EFFORT under a strict 'a few high-impact upgrades only' budget, for a cook meal-prepping ONE batch over 3-4 dinners over rice in Seattle. Use WebSearch/WebFetch (load via ToolSearch "select:WebSearch,WebFetch") where useful. Deliver: (1) a RANKED list of candidate upgrades by flavor impact per unit effort -- fresh-ground garam, deep onion browning / birista, chili-bloom + finishing tadka, hot-chili-as-engine, black pepper, late/raw green chili, a touch of acid, marinade tweaks, stock-vs-water; (2) how each change BEHAVES ON REHEAT over 3-4 days -- does the curry improve? does a nut/dairy emulsion split, and exactly how to prevent it (stop loose? fat cap? add cream/nut late?); (3) how to engineer a per-portion 'HEAT FINISHER' so a single plate can be pushed hotter (chili-ghee tadka jar? dry chili-salt-pepper gunpowder? fresh green chili?) -- give a concrete buildable option; (4) chili SOURCING in Seattle: the HOT engine (Guntur/Sannam/cayenne -- rough Scoville) vs COLOR chilies (Kashmiri/Byadgi/paprika), what to actually buy at Mayuri. Return findings (with confidence) + dubious claims to verify.` },
];
const research = (await parallel(researchBriefs.map(b => () =>
  agent(b.prompt, { model: 'opus', label:`research:${b.key}`, phase:'Research', schema: RESEARCH_SCHEMA, effort:'high' })
))).filter(Boolean);

const researchDigest = research.map(r =>
  `### ${r.summary}\n` + r.findings.map(f => `- (${f.confidence}) ${f.topic}: ${f.detail}`).join('\n')
).join('\n\n');

let claims = [];
research.forEach((r, ri) => (r.claimsToVerify || []).forEach((c, ci) =>
  claims.push({ id:`R${ri}-${ci}`, claim:c.claim, whyDubious:c.whyDubious })
));
claims = claims.slice(0, 12);
log(`Extracted ${claims.length} claims to adversarially verify across 3 lenses each (${claims.length*3} skeptics).`);

// ---------------- PHASE 2: ADVERSARIAL VERIFY ----------------
phase('Verify');
const LENSES = [
  'peer-reviewed food-science / chemistry literature (cite real findings)',
  'an experienced cook giving a practical kitchen reality-check',
  'a skeptical myth-buster actively hunting for overstatement, folk wisdom, or a hidden nuance that makes the naive claim wrong',
];
const verified = (await parallel(claims.map(c => () =>
  parallel(LENSES.map((lens, li) => () =>
    agent(`A research agent (improving a chicken curry) asserted this claim:\n"${c.claim}"\nWhy it was flagged as dubious: ${c.whyDubious}\n\nVERIFY IT THROUGH THIS LENS: ${lens}. Use WebSearch/WebFetch (load via ToolSearch "select:WebSearch,WebFetch") to ground your check in real sources where you can. Be ADVERSARIAL -- actively try to refute the claim or surface the nuance that makes it misleading. If evidence is thin, default to skepticism. Then give your verdict (confirmed / refuted / partly / unknown), a corrected precise statement of what's actually true, and your single strongest piece of evidence.`,
      { model: 'opus', label:`verify:${c.id}:${li}`, phase:'Verify', schema: VERDICT_SCHEMA, effort:'medium' })
  )).then(vs => {
    const v = vs.filter(Boolean);
    const dropped = vs.length - v.length; // verify lenses that errored/returned null
    const count = k => v.filter(x => x.verdict === k).length;
    const consensus = count('refuted') >= 2 ? 'REFUTED' : count('confirmed') >= 2 ? 'CONFIRMED' : 'NUANCED';
    // reconcile SENT vs RETURNED (improvements 2026-06-28): a dropped lens can flip a real quorum
    if (dropped > 0) log(`⚠ claim ${c.id}: ${dropped}/${vs.length} verify lens(es) dropped — consensus "${consensus}" on a short panel; flag for adjudication`);
    return { id:c.id, claim:c.claim, consensus, verdicts:v, votesSent:vs.length, votesReturned:v.length, dropped, needsAdjudication: dropped > 0 };
  })
))).filter(Boolean);

const verifiedDigest = verified.map(x => {
  const corrected = x.verdicts.map(d => d.correctedStatement).filter(Boolean);
  const ev = x.verdicts.map(d => d.keyEvidence).filter(Boolean).join(' | ');
  return `[${x.consensus}] CLAIM: ${x.claim}\n   TRUTH: ${corrected.join(' / ').slice(0,600)}\n   EVIDENCE: ${ev.slice(0,500)}`;
}).join('\n\n');
log(`Verification done: ${verified.filter(v=>v.consensus==='REFUTED').length} refuted, ${verified.filter(v=>v.consensus==='CONFIRMED').length} confirmed, ${verified.filter(v=>v.consensus==='NUANCED').length} nuanced.`);

// ---------------- PHASE 3+4: TOURNAMENT (generate -> judge, pipelined) ----------------
phase('Tournament');
const SHARED = `${ORIGINAL}\n\n${CONSTRAINTS}\n\nVERIFIED SCIENCE & TECHNIQUE (rely ONLY on these; treat anything marked [REFUTED] as a myth to avoid, and respect [NUANCED] caveats):\n${verifiedDigest}\n\nADDITIONAL RESEARCH DIGEST (supporting detail):\n${researchDigest}`;

const CANDIDATES = [
  { name:'Lean & Fierce', brief:`Strip the heat buffer to the bone. Cut the cashew/almond paste hard (cashew-only and minimal, or none) and build luscious body from DEEPLY browned onion / birista instead. Go for maximum LAYERED heat: a real hot chili bloomed in oil, black pepper, a late raw or charred green chili, and a finishing chili-ghee tadka, plus a small acid brightener (a squeeze of lime or a little tomato). Keep the sacred whole-garam popu and a fresh-ground garam. This is the most coastal-leaning, savory, fiery candidate -- prove a leaner gravy reads hotter.` },
  { name:'Rich, Punch-Through', brief:`Preserve the lush korma SOUL -- keep a real (but reduced and smartly-timed) creamy body (cashew-forward paste and/or birista, added late so it stays smooth and doesn't split on reheat) -- and ENGINEER heat to punch THROUGH the richness: more capsaicin than feels intuitive, bloomed in oil; black pepper; a late green chili; a finishing tadka; serve piping hot; and an essential per-portion heat finisher. Prove you can have mom's creamy richness AND sweat-inducing heat at once.` },
  { name:'Balanced All-Rounder', brief:`The middle path and likely meal-prep champion. Moderate cashew (drop the almond if it only adds bulk), serious base-building (birista or deep bhuna -- whichever the verified research favors for this Hyderabadi style), fresh-ground garam, medium-HIGH layered heat that intensifies pleasantly over 3-4 days, optional tomato for body + a whisper of acid. Optimize for robustness, reheatability, and flavor-per-effort within the 'few high-impact upgrades' budget.` },
  { name:'Control (Mom + Minimal)', brief:`A disciplined CONTROL that honors 'a few high-impact upgrades only' to the letter. Keep mom's EXACT structure, ingredient list, and the full cashew+almond paste. Change ONLY: (1) swap pre-ground garam for fresh-toasted-and-ground; (2) use a real HOT chili dosed properly AND bloom it in the oil; (3) add black pepper + a late green chili for layered heat; (4) serve hot + a simple per-portion finisher. NO birista, NO acid, NO nut reduction, NO re-architecting. This baseline tests whether the bolder candidates actually EARN their added complexity -- if the control wins, that's the honest answer.` },
];

const JUDGES = [
  { key:'authenticity', persona:'Hyderabadi/Telugu home-cooking authenticity guardian', rubric:`You care that it still tastes like a Telugu/Hyderabadi HOME chicken curry in this mother's lineage: the whole-garam popu intact and meaningful, correct spice logic, richness achieved AUTHENTICALLY (birista is on-profile; drifting into a generic North-Indian restaurant korma OR a coastal tamarind pulusu is a FAIL). Reward authentic depth and correct order-of-operations; penalize gimmicks, inauthentic shortcuts, or losing the dish's soul.` },
  { key:'heatscience', persona:'Flavor & heat-science engineer', rubric:`You care ONLY whether it will be genuinely SWEAT-INDUCING and LAYERED, and whether the heat technique is mechanically sound per the verified science: real hot chili dosed correctly, bloomed in oil, multiple pungency vectors, the fat/dairy/nut BUFFER actively managed, acid/salt/serve-hot levers used, and a working per-portion finisher. Penalize muted heat OR one-note brute-powder heat. Do not be fooled by a recipe that LOOKS spicy but whose buffer will mute it.` },
  { key:'mealprep', persona:'Meal-prep-for-one pragmatist', rubric:`You care about: holds / reheats / ideally IMPROVES over 3-4 days over rice; equipment-realistic (NutriBullet + mortar, no spice grinder); Seattle-sourceable; nut/dairy emulsion reheat behavior explicitly handled (split risk); and whether it RESPECTS the 'a few high-impact upgrades only' budget -- heavily penalize fussy, multi-pan, kitchen-sink complexity. Reward robustness and flavor-per-effort.` },
];

const judged = (await pipeline(
  CANDIDATES,
  (c) => agent(`${SHARED}\n\nYou are developing ONE tournament candidate recipe.\nCANDIDATE: ${c.name}\nBRIEF: ${c.brief}\n\nProduce a COMPLETE, COOKABLE recipe for 1.5 lb boneless skinless chicken thighs (meal-prep for one over 3-4 dinners over rice). It MUST include: a bespoke fresh-toasted-and-ground garam masala (exact whole spices + spoon AND gram amounts + a NutriBullet/mortar grind method), the SACRED whole-garam popu, the full step-by-step method with the WHY behind each high-impact change (teach the cook), the LAYERED heat system with specific chili types/amounts, a per-portion HEAT FINISHER, meal-prep/reheat guidance, and an explicit bulleted list of changes vs mom's original. Respect the 'a few high-impact upgrades only' budget. Put the full formatted recipe in recipeMarkdown.`,
      { model: 'opus', label:`gen:${c.name}`, phase:'Tournament', schema: CANDIDATE_SCHEMA, effort:'high' }),
  (recipe, c) => {
    if (!recipe) throw new Error('generation failed');
    return parallel(JUDGES.map(j => () =>
      agent(`${SHARED}\n\nYou are judging a tournament candidate. YOUR ROLE: ${j.persona}.\n${j.rubric}\n\nCANDIDATE NAME: ${c.name}\nRECIPE UNDER REVIEW:\n${recipe.recipeMarkdown}\n\nScore it 0-50 through YOUR lens only. Be tough, specific, and do NOT inflate. Give a breakdown, a sharp critique, the single most important fix (mustFix), and whether YOU personally would cook it.`,
        { model: 'opus', label:`judge:${c.name}:${j.key}`, phase:'Tournament', schema: JUDGE_SCHEMA, effort:'high' })
    )).then(js => {
      const jj = js.filter(Boolean);
      const judgesDropped = js.length - jj.length; // judges that errored/returned null
      const score = jj.length ? jj.reduce((s,x) => s + (x.score_0_50||0), 0) / jj.length : 0;
      // reconcile SENT vs RETURNED (improvements 2026-06-28): a candidate scored on a short judge panel isn't comparable to a full-panel one
      if (judgesDropped > 0) log(`⚠ ${c.name}: ${judgesDropped}/${js.length} judge(s) dropped — score ${score.toFixed(1)} rests on a short panel`);
      return { name:c.name, thesis:recipe.thesis, recipe, judges:jj, score, judgesSent:js.length, judgesReturned:jj.length, judgesDropped };
    });
  }
)).filter(Boolean);

const candidatesDropped = CANDIDATES.length - judged.length; // candidates that failed generation/judging entirely (excluded from the board)
if (candidatesDropped > 0) log(`⚠ scoreboard: ${candidatesDropped}/${CANDIDATES.length} candidate(s) dropped before scoring — leaderboard incomplete; flag for main-loop review`);
const board = judged.sort((a,b) => b.score - a.score);
const winner = board[0];
log(`Leaderboard: ${board.map(b => `${b.name} ${b.score.toFixed(1)}`).join(' | ')}. Winner: ${winner.name}.`);

// ---------------- PHASE 5: SYNTHESIZE ----------------
phase('Synthesize');
const synth = await agent(`${SHARED}\n\nTOURNAMENT RESULTS (best first):\n${board.map(b => `- ${b.name}: ${b.score.toFixed(1)}/50 | thesis: ${b.thesis}\n   judges: ${b.judges.map(j => `[${j.persona}] score ${j.score_0_50}, critique: ${j.critique} (mustFix: ${j.mustFix})`).join('  ||  ')}`).join('\n')}\n\nWINNER: ${winner.name}\nWINNER RECIPE:\n${winner.recipe.recipeMarkdown}\n\nALL CANDIDATE RECIPES (for grafting the best ideas):\n${board.map(b => `\n===== ${b.name} (${b.score.toFixed(1)}/50) =====\n${b.recipe.recipeMarkdown}`).join('\n')}\n\nNow produce the FINAL recipe. Start from the WINNER, GRAFT IN the best verified ideas from the other candidates, and resolve EVERY judge 'mustFix'. The final recipe MUST: deliver genuinely SWEAT-INDUCING, LAYERED heat while honestly accounting for the fat/dairy/nut buffer (per the verified science); keep the SACRED whole-garam popu; use a fresh-toasted-and-ground bespoke garam; stay within 'a few high-impact upgrades only'; and meal-prep cleanly over 3-4 days for one. Teach the cook the WHY of each move, and where a step rests on a verified finding, say so briefly. Output: finalRecipeMarkdown (a complete, beautifully-formatted, cookable recipe with amounts, the popu, the heat system, meal-prep notes, and a 'what changed vs mom's & why' section), garamBlendMarkdown (the standalone blend spec), heatDialMarkdown (how to tune heat per batch AND the per-portion finisher), changeLog, and graftedFrom.`,
  { model: 'opus', label:'synthesize', phase:'Synthesize', schema: SYNTH_SCHEMA, effort:'max' });

// ---------------- PHASE 6: QA RED-TEAM + PATCH ----------------
phase('QA');
const qa = await agent(`Red-team this FINAL chicken-curry recipe BEFORE it ships to the cook. Be ruthless.\nCONSTRAINTS:\n${CONSTRAINTS}\n\nVERIFIED SCIENCE:\n${verifiedDigest}\n\nFINAL RECIPE:\n${synth.finalRecipeMarkdown}\n\nGARAM BLEND:\n${synth.garamBlendMarkdown}\n\nHEAT DIAL:\n${synth.heatDialMarkdown}\n\nCheck HARD for: (1) food safety (chicken reaches 74C/165F; safe marinade handling); (2) will it ACTUALLY be sweat-inducing given the buffering, or is the heat STILL under-dosed/over-buffered? (3) any spice dose that's inedibly high OR, conversely, still mild; (4) internal contradictions, missing quantities, or uncookable/ambiguous steps; (5) Seattle sourcing + NutriBullet/mortar realism; (6) meal-prep/reheat claims (will a nut/dairy emulsion split?); (7) does it OVERSHOOT the 'a few high-impact upgrades only' budget? List every issue with a concrete fix.`,
  { model: 'opus', label:'qa-redteam', phase:'QA', schema: QA_SCHEMA, effort:'high' });

const patched = await agent(`Apply these QA fixes to the recipe, changing as LITTLE as possible and preserving its structure, formatting, and teaching voice. Return ONLY the corrected full recipe markdown (no preamble).\n\nQA VERDICT: ${qa.verdict}\nQA ISSUES:\n${JSON.stringify(qa.issues, null, 2)}\n\nCURRENT FINAL RECIPE:\n${synth.finalRecipeMarkdown}`,
  { model: 'opus', label:'qa-patch', phase:'QA', effort:'medium' });

return {
  leaderboard: board.map(b => ({ name:b.name, score:Number(b.score.toFixed(1)), thesis:b.thesis })),
  winner: winner.name,
  candidates: board.map(b => ({
    name:b.name, score:Number(b.score.toFixed(1)), thesis:b.thesis,
    recipeMarkdown:b.recipe.recipeMarkdown,
    judges:b.judges.map(j => ({ persona:j.persona, score:j.score_0_50, critique:j.critique, mustFix:j.mustFix, wouldCook:j.wouldCook })),
  })),
  verifiedClaims: verified.map(v => ({
    claim:v.claim, consensus:v.consensus,
    verdicts:v.verdicts.map(d => ({ verdict:d.verdict, corrected:d.correctedStatement, evidence:d.keyEvidence, confidence:d.confidence })),
  })),
  finalRecipeMarkdown: patched,
  finalRecipeUnpatched: synth.finalRecipeMarkdown,
  garamBlendMarkdown: synth.garamBlendMarkdown,
  heatDialMarkdown: synth.heatDialMarkdown,
  changeLog: synth.changeLog,
  graftedFrom: synth.graftedFrom,
  qa,
};