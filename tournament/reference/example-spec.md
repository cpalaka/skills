---
name: moms-curry
domain: cooking
tags: [recipe]
mode: scoreboard
claimVerify: true
qa: true

# counts
candidateCount: 4
judgeCount: 3
researchBriefCount: 4
claimVerifyLensCount: 3

# keys (lens, judge, axis)
researchBriefKeys: [heat-science, hyderabadi-technique, garam-blend, effort-mealprep]
judgeKeys: [authenticity, heatscience, mealprep]
axisKeys: [authenticity, heatscience, mealprep]
candidateNames: [Lean & Fierce, "Rich, Punch-Through", Balanced All-Rounder, Control (Mom + Minimal)]
---

# Mom's Curry Tournament

Improve a mother's simple nut-thickened Hyderabadi-style chicken curry into a properly-spicy, leveled-up version. Full pipeline: web-grounded research → adversarial claim verification (3 lenses per claim) → 4-candidate scoreboard tournament (3-judge panel, 0–50 each) → synthesis grafting winner + best runner-up ideas → QA red-team + patch.

## Domain Block

**ORIGINAL recipe (the staple to improve):**

MARINADE (1.5 lb boneless skinless chicken thighs, 1–2 hrs): oil, yogurt, salt, red chili powder, turmeric, garam masala (currently PRE-GROUND), ginger-garlic paste.

TEMPERING / POPU (little oil, ~1 min): bay leaf, cloves, star anise, cinnamon, green cardamom, whole cumin (jeera).

BASE: green chili sautéed ~1 min → onions + pinch salt cooked to transparent → ginger-garlic paste ~2–3 min till raw smell gone.

CHICKEN: add marinated chicken + 2nd spice hit (red chili powder, turmeric, coriander powder) on LOW; cover, medium ~5 min; OPTIONAL chopped tomato +5 min; add 1/2–1 cup water, cover, low till done.

THICKENER: grind cashew + almond (~1/3 cup EACH) dry → powder → + ~1 cup water → paste; stir in once chicken cooked.

FINISH: garam masala + red chili one last time; medium heat till gravy consistency right.

FLAVOR FINGERPRINT: rich nut-thickened, aromatic, MILD-TO-MEDIUM, NO souring agent, Hyderabadi/North-leaning (whole 'biryani' garam aromatics + cashew-almond paste). NOT a coastal-Andhra tangy kodi kura.

KNOWN PROBLEM: it never comes out actually spicy, and the cook doesn't know why.

**COOK & CONSTRAINTS:**

- Cook: competent Andhra/Telugu home cook in Seattle (Ballard). Doesn't need basic technique hand-holding, BUT South-Indian technique knowledge is genuinely lacking and the cook WANTS TO LEARN — always explain the WHY behind a step.
- PRIMARY GOALS: (a) level up this simple staple with a FEW HIGH-IMPACT upgrades — NOT a kitchen-sink of every technique; (b) make it ACTUALLY, SWEAT-INDUCINGLY spicy (current version reads mild and the cook can't figure out why).
- HEAT TARGET: sweat-inducing but LAYERED (not one-note brute chili powder). Include a per-portion 'heat finisher' so a single plate can be pushed hotter without over-spicing the whole batch.
- SACRED (must survive): the whole-garam aromatic POPU (bay / clove / star anise / cinnamon / green cardamom / cumin). Everything else is changeable.
- NEWLY ALLOWED (the cook did NOT protect these): a SUBTLE acid/souring brightener (NOT pulusu-level tang — dish identity stays warm and non-tangy), restructuring garam-masala timing, and cutting/replacing the cashew-almond paste.
- GARAM MASALA: the cook WANTS a fresh-toasted-and-ground bespoke blend (loves doing this), tuned to this warm Hyderabadi profile.
- EQUIPMENT: NutriBullet (good for wet pastes + short-pulse dry spice grinding) + mortar & pestle. NO dedicated spice grinder.
- SOURCING (Seattle): Mayuri (Redmond) for Guntur/Kashmiri chili, gingelly oil, gasagasalu, curry leaf, jaggery; H Mart Ballard (WARNING: its sesame oil is TOASTED — wrong for an Andhra base sauté); Spice SPC (Capitol Hill). The cook has an 'extra hot' generic red chili powder but it's mild/uncalibrated — they need a real HOT chili (Guntur/Sannam/cayenne) as the heat ENGINE and Kashmiri/paprika for COLOR only.
- MEAL PREP: cook ONE batch, eat over 3–4 dinners over plain white rice, cooking for one. Must hold / reheat / ideally improve over days (note: nut/dairy emulsions can split on reheat — design around it).
- EFFORT BUDGET IS A HARD CONSTRAINT: 'a few high-impact upgrades only.' Penalize fussy multi-pan kitchen-sink complexity. (Bhuna was just ONE example of a welcome unlock, NOT required — evaluate base-building techniques on merit; birista / fried-onion paste is likely more authentic to THIS Hyderabadi style than North-Indian bhuna.)

## Candidate Fields

Each candidate is structured with the following fields (the `procedure/recipe` archetype):

- **name** (string) — short label for leaderboard display (e.g. "Lean & Fierce")
- **thesis** (string) — one-sentence framing of the candidate's core design bet
- **heatStrategy** (string) — how the candidate builds sweat-inducing layered heat: which chili types, bloom timing, finishing tadka, per-portion finisher
- **richnessStrategy** (string) — how the candidate achieves gravy body and richness: birista / cashew paste / bhuna / combination; reheat-safety approach
- **changesFromOriginal** (string array) — explicit bulleted diff vs. mom's original recipe; every departure called out
- **recipeMarkdown** (string) — a complete, cookable recipe in markdown: bespoke garam masala (whole spices, spoon + gram amounts, NutriBullet/mortar grind method), the SACRED whole-garam popu, full step-by-step with the WHY behind each high-impact move, layered heat system, per-portion heat finisher, meal-prep/reheat guidance

All candidate fields are required. The `recipeMarkdown` is the rich freeform body; the others are structured comparables used by the judges to locate the key design decisions quickly.

Coherence note: every judge axis (authenticity → whole-garam popu + technique; heatscience → chili dose + buffer management; mealprep → reheat-safety + effort) maps directly to `heatStrategy`, `richnessStrategy`, or `changesFromOriginal`.

## Context and Research Briefs

Four parallel web-grounded research agents, each returning `{summary, findings[], claimsToVerify[]}`:

**heat-science** — food-science researcher. Goal: explain why a rich nut-and-dairy-thickened Hyderabadi curry never tastes spicy, and how to fix it. Investigate: (1) how fat and casein (yogurt, dairy, nuts, oil) buffer/strip capsaicin — mechanism (capsaicin lipophilicity, casein binding) and rough magnitude; (2) whether blooming chili powder in hot oil/ghee meaningfully raises perceived heat vs dumping into a watery braise; (3) whether long-cooking green chili loses heat — separate myth from fact (capsaicin is thermostable; what really changes is volatiles, concentration, perception); (4) piperine (black pepper) vs capsaicin — same TRPV1 receptor? is perceived-heat synergy real or folk wisdom? (5) does acidity make heat read sharper/brighter? (6) TRPV1 thermal sensitization — does serving piping hot increase perceived heat? (7) the most effective practical levers to build LAYERED sweat-inducing heat (multiple vectors, raw/late additions, finishing tadka, per-portion finisher). Return findings with confidence levels; flag load-bearing or dubious claims for adversarial verification.

**hyderabadi-technique** — expert in Telugu/Hyderabadi home cooking. Research the highest-leverage authentic technique upgrades: (1) birista (deep-fried golden onion paste) vs North-Indian bhuna vs plain raw-onion base — which gives the best authentic body/sweetness/richness for THIS style; can birista let us cut the cashew/almond paste? (2) correct onion-browning depth/color and why it matters; (3) yogurt marinade — does it genuinely tenderize chicken (lactic acid/enzymes), ideal marinate time, over-marinate/mushiness risk for boneless thigh; (4) popu/tadka logic and whether a finishing tadka is authentic to this cuisine; (5) what an authentic bespoke garam masala for this warm Hyderabadi profile contains, and how it relates to the WHOLE spices already in the popu (avoid double-counting); (6) HONEST authenticity flags — anything that would drift into generic North-Indian restaurant korma or coastal pulusu. Return findings with confidence + dubious claims.

**garam-blend** — master spice blender. Design a fresh-toasted-and-ground garam masala for a warm Hyderabadi-leaning chicken curry whose POPU already tempers whole bay leaf / cloves / star anise / cinnamon / green cardamom / cumin. Deliver: exact whole spices + ratios (spoons AND grams for a small jar), toast-and-grind method achievable with NutriBullet (short pulses, cool spices first, break cassia small) + mortar/pestle and NO dedicated spice grinder, storage/shelf-life, and how much to use in MARINADE vs FINISH. Evaluate with justification: black cardamom, mace, nutmeg, black peppercorn (doubles as heat vector), shahi jeera, fennel, stone flower/kalpasi, dried red chili. Return findings + dubious claims (fresh-ground vs pre-ground potency; is toasting necessary; grinding cassia in a bullet blender).

**effort-mealprep** — recipe developer optimizing flavor-per-effort under 'a few high-impact upgrades only' budget, for a cook meal-prepping ONE batch over 3–4 dinners over rice in Seattle. Deliver: (1) RANKED list of candidate upgrades by flavor impact per unit effort — fresh-ground garam, deep onion browning/birista, chili-bloom + finishing tadka, hot-chili-as-engine, black pepper, late/raw green chili, touch of acid, marinade tweaks, stock-vs-water; (2) how each change BEHAVES ON REHEAT over 3–4 days — does the curry improve? does a nut/dairy emulsion split, and exactly how to prevent it; (3) how to engineer a per-portion 'HEAT FINISHER' so a single plate can be pushed hotter — give a concrete buildable option (chili-ghee tadka jar? dry chili-salt-pepper gunpowder? fresh green chili?); (4) chili SOURCING in Seattle: HOT engine (Guntur/Sannam/cayenne — rough Scoville) vs COLOR chilies (Kashmiri/Byadgi/paprika), what to actually buy at Mayuri. Return findings + dubious claims.

All four run in parallel at `effort: high`. Claims from all four research agents are extracted and deduplicated, capped at 12 for the verify stage.

## Claim-Verify Lenses

Three adversarial lenses run in parallel against every extracted dubious claim. Each lens returns `{verdict: confirmed|refuted|partly|unknown, reasoning, correctedStatement, keyEvidence, confidence: high|moderate|low}`. Consensus: if ≥2 verdicts are `refuted` → REFUTED; if ≥2 are `confirmed` → CONFIRMED; otherwise NUANCED.

1. **peer-reviewed food-science / chemistry literature** — cite real findings. Ground the check in actual research; be adversarial and actively try to refute the claim or surface nuance that makes it misleading. If evidence is thin, default to skepticism.

2. **an experienced cook giving a practical kitchen reality-check** — test the claim against real-kitchen lived experience. Does this actually work the way the food-science framing implies? What do practitioners observe that lab results miss?

3. **a skeptical myth-buster actively hunting for overstatement, folk wisdom, or a hidden nuance that makes the naive claim wrong** — the most adversarial lens. Assume the claim is probably wrong; look for the hidden variable or popular-food-media exaggeration.

Verified digest is passed to every downstream stage (generate, synthesize, QA). Claims marked `[REFUTED]` are explicitly flagged as myths to avoid in every generation prompt. Claims marked `[NUANCED]` carry their caveats forward.

## Generation Candidates

Four candidates generated in a pipelined scoreboard (generate → judge in sequence per candidate, all four in parallel). Each uses the full shared context: original recipe + constraints + verified science digest + additional research digest.

**Lean & Fierce** — Strip the heat buffer to the bone. Cut the cashew/almond paste hard (cashew-only and minimal, or none) and build luscious body from DEEPLY browned onion/birista instead. Go for maximum layered heat: a real hot chili bloomed in oil, black pepper, a late raw or charred green chili, and a finishing chili-ghee tadka, plus a small acid brightener (lime squeeze or a little tomato). Keep the sacred whole-garam popu and a fresh-ground garam. Most coastal-leaning, savory, fiery candidate — proves a leaner gravy reads hotter.

**Rich, Punch-Through** — Preserve the lush korma soul — keep a real (but reduced and smartly-timed) creamy body (cashew-forward paste and/or birista, added late so it stays smooth and doesn't split on reheat) — and engineer heat to punch THROUGH the richness: more capsaicin than feels intuitive, bloomed in oil; black pepper; late green chili; finishing tadka; serve piping hot; a working per-portion heat finisher. Proves you can have mom's creamy richness AND sweat-inducing heat at once.

**Balanced All-Rounder** — The middle path and likely meal-prep champion. Moderate cashew (drop the almond if it only adds bulk), serious base-building (birista or deep bhuna — whichever verified research favors for this Hyderabadi style), fresh-ground garam, medium-HIGH layered heat that intensifies pleasantly over 3–4 days, optional tomato for body + a whisper of acid. Optimize for robustness, reheatability, and flavor-per-effort within the 'few high-impact upgrades' budget.

**Control (Mom + Minimal)** — A disciplined CONTROL that honors 'a few high-impact upgrades only' to the letter. Keep mom's EXACT structure, ingredient list, and the full cashew+almond paste. Change ONLY: (1) swap pre-ground garam for fresh-toasted-and-ground; (2) use a real HOT chili dosed properly AND bloom it in the oil; (3) add black pepper + late green chili for layered heat; (4) serve hot + a simple per-portion finisher. NO birista, NO acid, NO nut reduction, NO re-architecting. This baseline tests whether the bolder candidates EARN their added complexity — if the control wins, that's the honest answer.

Each generation agent runs at `effort: high`. Output is the full CANDIDATE_SCHEMA: `{name, thesis, heatStrategy, richnessStrategy, changesFromOriginal, recipeMarkdown}`.

## Judges

Three judges score each candidate 0–50 through their lens only. All three run in parallel per candidate. Final candidate score = mean of the three judge scores. Scoreboard sorted descending; winner = highest mean score.

**Judge: authenticity** (`key: authenticity`)
Persona: Hyderabadi/Telugu home-cooking authenticity guardian.
Rubric: Cares that it still tastes like a Telugu/Hyderabadi HOME chicken curry in this mother's lineage — the whole-garam popu intact and meaningful, correct spice logic, richness achieved authentically (birista is on-profile; drifting into a generic North-Indian restaurant korma OR a coastal tamarind pulusu is a FAIL). Rewards authentic depth and correct order-of-operations. Penalizes gimmicks, inauthentic shortcuts, or losing the dish's soul.

**Judge: heatscience** (`key: heatscience`)
Persona: Flavor & heat-science engineer.
Rubric: Cares ONLY whether it will be genuinely sweat-inducing and LAYERED, and whether the heat technique is mechanically sound per the verified science: real hot chili dosed correctly, bloomed in oil, multiple pungency vectors, the fat/dairy/nut BUFFER actively managed, acid/salt/serve-hot levers used, and a working per-portion finisher. Penalizes muted heat OR one-note brute-powder heat. Will not be fooled by a recipe that LOOKS spicy but whose buffer will mute it.

**Judge: mealprep** (`key: mealprep`)
Persona: Meal-prep-for-one pragmatist.
Rubric: Cares about: holds/reheats/ideally IMPROVES over 3–4 days over rice; equipment-realistic (NutriBullet + mortar, no spice grinder); Seattle-sourceable; nut/dairy emulsion reheat behavior explicitly handled (split risk); and whether it RESPECTS the 'a few high-impact upgrades only' budget — heavily penalizes fussy, multi-pan, kitchen-sink complexity. Rewards robustness and flavor-per-effort.

Judge schema output: `{persona, score_0_50, breakdown, critique, mustFix, wouldCook}`. All fields required except `breakdown`. Judges use the shared context (original + constraints + verified science) plus the candidate's `recipeMarkdown`.

## Synthesize Spec

Input: all four judged candidates sorted best-to-worst; winner's `recipeMarkdown`; full shared context including verified science.

Task: Start from the WINNER, GRAFT IN the best verified ideas from the other candidates, and resolve EVERY judge `mustFix`. The final recipe MUST: deliver genuinely sweat-inducing, layered heat while honestly accounting for the fat/dairy/nut buffer (per verified science); keep the SACRED whole-garam popu; use a fresh-toasted-and-ground bespoke garam; stay within 'a few high-impact upgrades only'; and meal-prep cleanly over 3–4 days for one. Teach the cook the WHY of each move; where a step rests on a verified finding, say so briefly.

Output schema `SYNTH_SCHEMA`:
- `finalRecipeMarkdown` — complete, beautifully-formatted, cookable recipe with amounts, the popu, the full heat system, meal-prep notes, and a "what changed vs. mom's & why" section
- `garamBlendMarkdown` — standalone blend spec (spices, spoon+gram amounts, grind method, storage, how to use)
- `heatDialMarkdown` — how to tune heat per batch AND the per-portion finisher
- `changeLog` — array of `{change, why, verifiedBy}` tracing each departure back to a verified finding
- `graftedFrom` — list of candidate names that contributed grafted ideas

Runs at `effort: max` as the single most important agent in the pipeline.

## QA Checklist

A two-step red-team + patch stage, both agents run sequentially after synthesis.

**Red-team agent** (`effort: high`) — Check HARD for:
1. Food safety: does chicken reach 74°C/165°F? Is marinade handling safe?
2. Will it ACTUALLY be sweat-inducing given the buffering, or is heat still under-dosed/over-buffered?
3. Any spice dose that is inedibly high OR, conversely, still mild.
4. Internal contradictions, missing quantities, or uncookable/ambiguous steps.
5. Seattle sourcing + NutriBullet/mortar realism — anything called for that can't be sourced or executed with the stated equipment.
6. Meal-prep/reheat claims — will the nut/dairy emulsion split? Is the reheat guidance realistic?
7. Does the final recipe OVERSHOOT the 'a few high-impact upgrades only' budget?

Output schema `QA_SCHEMA`: `{foodSafetyOk, heatWillDeliver, issues[], verdict}`. Each issue: `{severity, issue, fix}`.

**Patch agent** (`effort: medium`) — Apply QA fixes to the final recipe, changing as LITTLE as possible and preserving structure, formatting, and teaching voice. Returns only the corrected full recipe markdown.

The patched recipe replaces `finalRecipeMarkdown` in the result object. The unpatched version is preserved as `finalRecipeUnpatched` for diffing.
