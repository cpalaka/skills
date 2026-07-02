export const meta = {
  name: 'skill-audit-and-discovery',
  description: 'Audit how effectively the user uses installed Claude Code skills (from real transcripts), then fan-out/adversarial/tournament search for popular online skills matching their usage patterns',
  phases: [
    { title: 'Audit: usage clusters' },
    { title: 'Audit: synthesis' },
    { title: 'Discover: multi-modal sweep' },
    { title: 'Score & dedup' },
    { title: 'Adversarial verify' },
    { title: 'Tournament & final report' },
  ],
}

// ---------------------------------------------------------------------------
// GROUND TRUTH gathered inline before launch (real, not inferred)
// ---------------------------------------------------------------------------
const PROFILE = `
USER PROFILE (Claude Code power user, solo creative technologist, macOS, June 2026):
- Work is ~85-90% terminal/local-bound. Godot game prototyping and /teach course-building CANNOT run in the cloud.
- PRIMARY uses: (1) Godot 4 game prototyping (many throwaway prototypes), (2) /teach course-building (music theory, music production/audio engineering, digital art/Krita, godot-gamedev, generative-art/VFX).
- SECONDARY: personal knowledge management (Obsidian zettelkasten, a goodreads project), MCP development (godot-mcp, blender-mcp, minimal-godot-mcp + feature wishlists), a personal website (chaipalaka.com), system/infra (Homebrew Intel->arm64 migration).
- POWER-USER SIGNALS: runs huge multi-agent Workflow orchestrations (dozens of wf_* runs, esp. in game-storming ideation); routinely uses /effort ultracode (xhigh + workflow orchestration), deep-research, subagent-driven-development, tournaments. Maintains CONTEXT.md glossaries + docs/adr/ ADRs per project, an improvements.md behavioral log, and file-based persistent memory. Authors and maintains OWN skills (cpalaka-claude-skills repo: godot-architecture-review, godot-personal-gotchas, godot-personal-preferences, init-godot-claude-project, init-backlog-project, skill-updater, sync-godot-skills).
- DISPOSITION (from global CLAUDE.md): wants blunt, no-praise, strongest-counterargument-first answers; explicit confidence levels; minimum-code surgical changes; assumption-surfacing; route-by-question-type not default-to-brainstorming.

INSTALLED SKILL SOURCES:
- Claude Code plugins: superpowers@6.0.2 (brainstorming, writing-plans, executing-plans, subagent-driven-development, TDD, systematic-debugging, worktrees, code-review, verification, finishing-a-branch, writing-skills, dispatching-parallel-agents), andrej-karpathy-skills (karpathy-guidelines), obsidian (defuddle, json-canvas, obsidian-bases, obsidian-cli, obsidian-markdown), security-guidance (security-review).
- npx-skills (~/.agents, vercel "skills" CLI): from mattpocock/skills (caveman, diagnose, grill-me, grill-with-docs, improve-codebase-architecture, prototype, tdd, to-issues, to-prd, triage, write-a-skill, zoom-out, handoff, teach), vercel-labs/agent-skills (react-best-practices, composition-patterns, react-view-transitions, web-design-guidelines, agent-browser) & vercel-labs/skills (find-skills), anthropics/skills (frontend-design, mcp-builder), wshobson/agents (architecture-patterns, godot-gdscript-patterns), thedivergentai/gd-agentic-skills (godot-animation-tree-mastery), softaworks/agent-toolkit (mermaid-diagrams), intellectronica/agent-skills (beautiful-mermaid), spillwavesolutions (design-doc-mermaid).
- Personal hand-authored: godot-architecture-review, godot-personal-gotchas, godot-personal-preferences, init-godot-claude-project, init-backlog-project, skill-updater, sync-godot-skills.
`

const TALLY = `
DELIBERATE SKILL INVOCATIONS across 273 real main-session transcripts, last ~60 days (count - skill):
86 karpathy-guidelines | 82 godot-personal-preferences | 65 godot-personal-gotchas | 29 brainstorming | 28 handoff | 23 writing-plans | 20 godot-gdscript-patterns | 19 subagent-driven-development | 18 agent-browser | 12 grill-me | 12 godot-animation-tree-mastery | 12 deep-research | 10 finishing-a-development-branch | 9 tdd | 8 sync-godot-skills | 7 vercel-react-best-practices | 6 executing-plans | 5 update-config | 5 systematic-debugging | 5 skill-updater | 4 write-a-skill | 4 test-driven-development | 4 find-skills | 3 init-godot-claude-project | 3 frontend-design | 2 using-superpowers | 2 init-backlog-project | 2 improve-codebase-architecture | 2 diagnose | 2 beautiful-mermaid | 1 to-issues | 1 writing-skills | 1 using-git-worktrees | 1 mermaid-diagrams | 1 init | 1 fewer-permission-prompts
SLASH COMMANDS: 115 /clear | 86 /effort | 24 /mcp | 16 /teach | 14 /sync-godot-skills | 9 /init-godot-claude-project | 8 /model | 7 /goal | 4 /remote-control | 4 /config | 2 /workflows | 2 /handoff
INSTALLED BUT ~NEVER DELIBERATELY INVOKED (0): obsidian:defuddle, obsidian:json-canvas, obsidian:obsidian-bases, obsidian:obsidian-cli, obsidian:obsidian-markdown, security-review, caveman, zoom-out, to-prd, triage, vercel-composition-patterns, vercel-react-view-transitions, web-design-guidelines, architecture-patterns, design-doc-mermaid, mcp-builder, prototype, grill-with-docs, godot-architecture-review.
NOTE: obsidian suite unused despite an ACTIVE Obsidian zettelkasten vault; mcp-builder unused despite MCP-dev work; godot-architecture-review (their own skill) unused despite many Godot projects.
`

const INSTALLED_NAMES = "superpowers:brainstorming, writing-plans, executing-plans, subagent-driven-development, dispatching-parallel-agents, systematic-debugging, test-driven-development, writing-skills, using-git-worktrees, finishing-a-development-branch, requesting-code-review, receiving-code-review, verification-before-completion, karpathy-guidelines, obsidian defuddle/json-canvas/obsidian-bases/obsidian-cli/obsidian-markdown, security-review, caveman, diagnose, grill-me, grill-with-docs, improve-codebase-architecture, prototype, tdd, to-issues, to-prd, triage, write-a-skill, zoom-out, handoff, teach, vercel-react-best-practices, vercel-composition-patterns, vercel-react-view-transitions, web-design-guidelines, agent-browser, find-skills, frontend-design, mcp-builder, architecture-patterns, godot-gdscript-patterns, godot-animation-tree-mastery, mermaid-diagrams, beautiful-mermaid, design-doc-mermaid, godot-architecture-review, godot-personal-gotchas, godot-personal-preferences, init-godot-claude-project, init-backlog-project, skill-updater, sync-godot-skills"

const DOMAINS = "godot-gamedev | teaching-pedagogy | knowledge-management | claude-code-power-user | mcp-and-3d | web-frontend | general-productivity"
const PROJ = "/Users/chaipalaka/.claude/projects"

// ---------------------------------------------------------------------------
// PHASE 1 — Audit usage by workspace cluster (read REAL transcripts, sampled)
// ---------------------------------------------------------------------------
const CLUSTERS = [
  { key:'godot-proto', label:'Godot game prototyping', dirs:['-Users-chaipalaka-gamedev-godot-*'],
    note:'Biggest cluster: circle-combat (66 transcripts), 2d-movement (37), 3d-proto (13), mcp-test (12), space-miner (9), arm-control/juice-tests/godsquish (5 each), food-galaga/maw (3), godot-skill-test (2).' },
  { key:'teach', label:'/teach course-building', dirs:['-Users-chaipalaka-Claude-music-learning','-Users-chaipalaka-Claude-music-production','-Users-chaipalaka-Claude-godot-gamedev-teach','-Users-chaipalaka-Claude-gen-art-vfx-teach'],
    note:'/teach skill from mattpocock/skills. music-learning has 6 transcripts incl. 24MB of activity.' },
  { key:'ideation', label:'Game ideation / brainstorming (orchestration-heavy)', dirs:['-Users-chaipalaka-Claude-game-storming'],
    note:'15 main transcripts but DOZENS of wf_* multi-agent Workflow runs nested inside. This is where the user runs the heaviest orchestration.' },
  { key:'pkm', label:'Personal knowledge management', dirs:['-Users-chaipalaka-Claude-zettelkasten','-Users-chaipalaka-Claude-goodreads'],
    note:'zettelkasten is an Obsidian vault (.obsidian present) yet the obsidian skill suite shows 0 invocations. Investigate why.' },
  { key:'skilldev', label:'Skill & MCP development', dirs:['-Users-chaipalaka-Code-github-cpalaka-claude-skills','-Users-chaipalaka-Claude-claude-skill-auto-updater','-Users-chaipalaka-Code-github-godot-mcp','-Users-chaipalaka-Code-blender-mcp','-Users-chaipalaka-Code-github-minimal-godot-mcp','-Users-chaipalaka-Code-github'],
    note:'User authors/maintains own skills and does MCP server work. mcp-builder shows 0 invocations despite this.' },
  { key:'web', label:'Personal website (chaipalaka.com)', dirs:['-Users-chaipalaka-Code-chaipalaka-com'],
    note:'14 transcripts. The only place vercel-react/web skills are relevant.' },
  { key:'misc', label:'Misc research, base sessions, scheduled tasks, infra', dirs:['-Users-chaipalaka-Claude-misc-research','-Users-chaipalaka-Claude','-Users-chaipalaka','-Users-chaipalaka-Code-cp-task-*','-Users-chaipalaka-homebrew-migration'],
    note:'misc-research includes a prior godot-mcp-tournament. cp-task-* are likely scheduled/remote agent runs.' },
]

const CLUSTER_FINDING = { type:'object', additionalProperties:false, properties:{
  cluster:{type:'string'},
  what_user_does:{type:'string'},
  skills_invoked:{type:'array', items:{type:'string'}},
  well_used:{type:'array', items:{type:'string'}},
  misuse_or_mistiming:{type:'array', items:{type:'object', additionalProperties:false, properties:{ skill:{type:'string'}, issue:{type:'string'}, evidence:{type:'string'} }, required:['skill','issue','evidence'] }},
  fit_gaps:{type:'array', items:{type:'object', additionalProperties:false, properties:{ installed_skill:{type:'string'}, should_have_used_when:{type:'string'}, evidence:{type:'string'} }, required:['installed_skill','should_have_used_when','evidence'] }},
  friction_patterns:{type:'array', items:{type:'string'}},
  capability_gaps:{type:'array', items:{type:'string'}},
}, required:['cluster','what_user_does','skills_invoked','well_used','misuse_or_mistiming','fit_gaps','friction_patterns','capability_gaps'] }

function clusterPrompt(c){ return `You are auditing how EFFECTIVELY this Claude Code user employs their installed skills, for ONE workspace cluster: "${c.label}".
Context note: ${c.note}

${PROFILE}
${TALLY}

TRANSCRIPTS: main session transcripts (*.jsonl) live directly under project dirs matching these globs in ${PROJ}/:
${c.dirs.map(d=>'  '+PROJ+'/'+d+'/*.jsonl').join('\n')}

EFFICIENT METHOD (do NOT read whole multi-MB transcripts):
1. Enumerate the transcript files for this cluster (ls/find the globs above).
2. Use bash grep to extract signal cheaply: deliberate skill invocations = grep -hao 'Launching skill: [^"\\\\]*'  ;  slash commands = grep -hao '<command-name>[^<]*</command-name>'  ;  user intents = sample first user-turn text per session (grep '"type":"user"' then look at early lines, or jq if available).
3. Read at MOST 3-4 representative transcripts in TARGETED excerpts (Read with offset/limit), preferring the largest/most-active sessions, to judge sequence and quality of skill use.

DETERMINE, with concrete evidence (quote a short snippet or name the file+pattern):
- what_user_does: the real task types in this cluster.
- skills_invoked: which skills they actually invoked here.
- well_used: skills invoked at the right time / correctly.
- misuse_or_mistiming: skills invoked at the wrong time, redundantly, or skipped mid-flow.
- fit_gaps: INSTALLED skills that clearly SHOULD have been used here but were NOT (e.g. obsidian suite in the zettelkasten, mcp-builder in MCP work, godot-architecture-review in Godot projects, grill-with-docs where they maintain CONTEXT.md/ADRs). Be specific about the trigger moment.
- friction_patterns: repeated manual toil a skill (existing or not) could remove.
- capability_gaps: needs in this cluster where NO installed skill exists (feeds the online search).
Be blunt and evidence-based. If skills are used well here, say so plainly. Return the structured object.` }

phase('Audit: usage clusters')
const clusterFindings = (await parallel(CLUSTERS.map(c => () =>
  agent(clusterPrompt(c), { model: 'opus', label:`audit:${c.key}`, phase:'Audit: usage clusters', agentType:'Explore', schema:CLUSTER_FINDING, effort:'medium' })
))).filter(Boolean)
log(`Audit complete for ${clusterFindings.length}/${CLUSTERS.length} clusters`)

// ---------------------------------------------------------------------------
// PHASE 2 — Audit synthesis -> report half + gap-driven discovery queries
// ---------------------------------------------------------------------------
const AUDIT_SYNTH = { type:'object', additionalProperties:false, properties:{
  report_markdown:{type:'string'},
  underused_skills:{type:'array', items:{type:'object', additionalProperties:false, properties:{ skill:{type:'string'}, why_underused:{type:'string'}, fix:{type:'string'}, verdict:{type:'string', enum:['adopt','drop','keep-situational']} }, required:['skill','why_underused','fix','verdict'] }},
  behavioral_fixes:{type:'array', items:{type:'string'}},
  capability_gaps:{type:'array', items:{type:'object', additionalProperties:false, properties:{ gap:{type:'string'}, domain:{type:'string'} }, required:['gap','domain'] }},
  discovery_queries:{type:'array', items:{type:'string'}},
}, required:['report_markdown','underused_skills','behavioral_fixes','capability_gaps','discovery_queries'] }

phase('Audit: synthesis')
const audit = await agent(
`Synthesize a blunt EFFECTIVENESS AUDIT of this user's Claude Code skill usage from the per-cluster findings below.

${PROFILE}
${TALLY}

PER-CLUSTER FINDINGS (JSON):
${JSON.stringify(clusterFindings)}

Produce:
1. report_markdown: a tight markdown section titled "## Part 1 — Are you using your installed skills effectively?" covering:
   - Headline verdict (are they? where strong, where weak) with an explicit confidence level.
   - "Working well" — skills genuinely well-used (cite the tally / clusters).
   - "Underused or mis-fit" — the most important installed-but-unused skills, WHY (genuine non-fit vs. forgotten-trigger vs. friction), and whether to ADOPT a trigger, DROP it, or KEEP situational. Address specifically: the obsidian suite vs. the active zettelkasten; mcp-builder vs. MCP work; godot-architecture-review (their own skill) vs. many Godot projects; grill-with-docs vs. their CONTEXT.md/ADR discipline; the dormant web/vercel skills; caveman/zoom-out/to-prd/triage.
   - "Behavioral fixes" — concrete, low-effort changes (e.g. a hook to auto-surface a skill at a trigger moment, a CLAUDE.md line, a habit) that would raise effectiveness. Be specific and minimal.
   Do not pad. The user dislikes praise and validation.
2. underused_skills: structured list with verdict each.
3. behavioral_fixes: the actionable list.
4. capability_gaps: real needs where NO installed skill exists, tagged with one DOMAIN of: ${DOMAINS}.
5. discovery_queries: 6-10 SPECIFIC search queries (gap-driven) to feed the online-skill hunt — phrase them as things to search for, targeted at the real gaps you found (not generic).
Return the structured object.`,
  { model: 'opus', label:'audit:synthesis', phase:'Audit: synthesis', schema:AUDIT_SYNTH, effort:'high' })

// ---------------------------------------------------------------------------
// PHASE 3 — Multi-modal discovery sweep (LIVE web; it is June 2026)
// ---------------------------------------------------------------------------
const CANDIDATES = { type:'object', additionalProperties:false, properties:{ candidates:{type:'array', items:{type:'object', additionalProperties:false, properties:{
  name:{type:'string'}, source:{type:'string'}, install_command:{type:'string'}, what_it_does:{type:'string'},
  domain:{type:'string'}, install_count:{type:'string'}, stars:{type:'string'}, last_updated:{type:'string'},
  already_installed:{type:'boolean'}, maturity:{type:'string', enum:['established','emerging','experimental','unknown']}, url:{type:'string'},
}, required:['name','source','install_command','what_it_does','domain','already_installed','maturity'] }} }, required:['candidates'] }

const WEB = `IT IS JUNE 2026 and your training cutoff is older, so you MUST use LIVE web tools for anything "currently popular". Use WebSearch + WebFetch (load them via ToolSearch "select:WebSearch,WebFetch" first if not already available). Also TRY (best-effort, may lack network) bash: \`npx -y skills find <query>\` and \`gh search repos\`/\`gh api\`. The canonical registry is https://skills.sh/ (leaderboard ranks by installs); skills also ship as Claude Code plugins via marketplaces and as raw GitHub repos. For each candidate capture: exact name, source (owner/repo or marketplace), a concrete install command (\`npx skills add owner/repo@skill -g -y\` OR \`claude plugin install ...\`), what it does, install_count and/or GitHub stars and last-updated date if findable, and maturity. Map each to ONE domain of: ${DOMAINS}. Set already_installed=true if it matches anything the user already has: ${INSTALLED_NAMES}. EXCLUDE pure dependencies/forks. Prefer quality signal over volume, but be thorough.`

const ANGLES = [
  { key:'known-repos-new', brief:`Enumerate skills the user does NOT yet have inside the repos they ALREADY track: mattpocock/skills, vercel-labs/agent-skills, vercel-labs/skills, anthropics/skills, wshobson/agents, thedivergentai/gd-agentic-skills, intellectronica/agent-skills, softaworks/agent-toolkit. List every notable skill in each that is NOT already installed. Highest-yield angle — same trusted sources, just newer/uninstalled items.` },
  { key:'skillssh-leaderboard', brief:`The skills.sh leaderboard / most-installed skills overall right now. Capture the current top ~25 by installs and flag which fit a Godot+teaching+PKM+orchestration user.` },
  { key:'godot-gamedev', brief:`Godot 4 / game-dev / game-design agent skills (GDScript, scene architecture, shaders, juice/gamefeel, level design, procedural generation, 2D/3D, gameplay systems). Search GitHub + skills.sh + awesome lists.` },
  { key:'teaching-pedagogy', brief:`Teaching / pedagogy / curriculum / course-authoring / spaced-repetition / Anki / tutoring / explanation skills (the user runs many /teach courses across music, art, gamedev). Anything that improves lesson generation, knowledge-checks, or learner modeling.` },
  { key:'knowledge-mgmt', brief:`Personal knowledge management: Obsidian, zettelkasten, note-linking, writing/essay, research-capture, reading/book-notes skills. The user has an Obsidian vault and a reading project.` },
  { key:'cc-power-user', brief:`Claude Code POWER-USER skills: multi-agent orchestration, planning, context/memory management, prompt/skill engineering, workflow patterns, repo onboarding, self-improvement loops. The user is a heavy Workflow orchestrator.` },
  { key:'mcp-3d', brief:`MCP server building, Blender automation, 3D / asset-pipeline, procedural 3D, texture/model generation skills. The user builds godot-mcp and blender-mcp.` },
  { key:'curated-and-trending', brief:`Curated lists (e.g. ComposioHQ/awesome-claude-skills and similar "awesome-claude-skills"/"awesome-agent-skills" repos) AND brand-new / trending / low-install-but-promising repos from the last ~2 months. EXPERIMENTAL finds are explicitly wanted — mark maturity 'experimental' and note they are unvetted.` },
  { key:'marketplaces', brief:`Claude Code PLUGIN marketplaces: the official anthropic marketplace plus notable community marketplaces. Which plugins/skills there fit this user and are not installed? Capture \`claude plugin\` install commands.` },
]

phase('Discover: multi-modal sweep')
const dynAngles = (audit && audit.discovery_queries ? audit.discovery_queries : []).map((q,i)=>({ key:`gap-${i+1}`, brief:`GAP-DRIVEN (from the audit): search specifically for skills that address — ${q}` }))
const allAngles = ANGLES.concat(dynAngles)
const discovered = (await parallel(allAngles.map(a => () =>
  agent(`Discover currently-popular agent skills for this user. SEARCH ANGLE: ${a.brief}\n\n${PROFILE}\n\n${WEB}\n\nReturn 5-20 candidate skills for THIS angle as the structured object. Be specific and current; do not invent skills — every candidate must be a real, locatable skill with a source.`,
    { model: 'opus', label:`discover:${a.key}`, phase:'Discover: multi-modal sweep', agentType:'general-purpose', schema:CANDIDATES, effort:'medium' })
))).filter(Boolean)
const allCandidates = discovered.flatMap(d => (d && d.candidates) ? d.candidates : [])
log(`Discovered ${allCandidates.length} raw candidates across ${allAngles.length} angles`)

// ---------------------------------------------------------------------------
// PHASE 4 — Dedup + score -> shortlist (needs ALL candidates: single triage agent)
// ---------------------------------------------------------------------------
const SHORTLIST = { type:'object', additionalProperties:false, properties:{
  shortlist:{type:'array', items:{type:'object', additionalProperties:false, properties:{
    name:{type:'string'}, source:{type:'string'}, install_command:{type:'string'}, what_it_does:{type:'string'},
    domain:{type:'string'}, maturity:{type:'string'}, url:{type:'string'}, install_count:{type:'string'}, stars:{type:'string'},
    relevance:{type:'number'}, quality:{type:'number'}, maintenance:{type:'number'}, redundancy:{type:'number'}, net_score:{type:'number'},
    rationale:{type:'string'},
  }, required:['name','source','install_command','what_it_does','domain','net_score','rationale'] }},
  dropped_already_installed:{type:'array', items:{type:'string'}},
  dropped_redundant:{type:'array', items:{type:'object', additionalProperties:false, properties:{ name:{type:'string'}, redundant_with:{type:'string'} }, required:['name','redundant_with'] }},
}, required:['shortlist','dropped_already_installed','dropped_redundant'] }

phase('Score & dedup')
const triage = await agent(
`Dedup, filter, and SCORE these discovered skill candidates for the user. Output a ranked shortlist.

${PROFILE}

AUDIT capability gaps + underused findings (so you favor things that fill REAL gaps and avoid things redundant with what they already underuse):
${JSON.stringify({ capability_gaps: audit && audit.capability_gaps, underused: audit && audit.underused_skills })}

ALREADY INSTALLED (drop any candidate matching these): ${INSTALLED_NAMES}

RAW CANDIDATES (JSON, ${allCandidates.length} items, may contain dupes/near-dupes/already-installed):
${JSON.stringify(allCandidates)}

Steps:
1. Drop anything already installed -> list in dropped_already_installed.
2. Merge duplicates/near-duplicates (same skill from multiple angles); keep the best-sourced instance.
3. Drop anything clearly redundant with an installed skill -> dropped_redundant with what it duplicates.
4. Score each survivor 0-5 on: relevance (to THIS user's real work), quality (source reputation + evident craft), maintenance (recency/activity), and redundancy (0=novel, 5=overlaps installed). net_score = relevance*2 + quality + maintenance - redundancy.
5. Return the shortlist sorted by net_score DESC. Keep up to 20. Each needs a one-line rationale tying it to the user's actual usage. Preserve install_command/source/url/maturity/counts.
Be skeptical of low-install experimental repos but DO keep the strongest experimental ones (user opted in) — just score maintenance/quality honestly.`,
  { model: 'opus', label:'triage', phase:'Score & dedup', schema:SHORTLIST, effort:'high' })
const shortlist = ((triage && triage.shortlist) ? triage.shortlist : []).slice(0, 16)
log(`Shortlist: ${shortlist.length} candidates after dedup/scoring`)

// ---------------------------------------------------------------------------
// PHASE 5 — Adversarial verification: 3 distinct skeptic lenses per candidate
// ---------------------------------------------------------------------------
const VERDICT = { type:'object', additionalProperties:false, properties:{
  lens:{type:'string'}, refuted:{type:'boolean'}, confidence:{type:'string', enum:['high','moderate','low']},
  reasoning:{type:'string'}, corrected_info:{type:'string'},
}, required:['lens','refuted','confidence','reasoning'] }

const LENSES = [
  { key:'redundancy', brief:`REDUNDANCY skeptic: argue this skill is redundant with something the user already has installed (${INSTALLED_NAMES}) or with their own hand-authored skills. refuted=true if it meaningfully duplicates existing capability and adds little. Default toward refuted if overlap is high.` },
  { key:'quality-maint', brief:`QUALITY/MAINTENANCE skeptic: verify the skill is real, decently built, and maintained. Use WebSearch/WebFetch to check the repo: stars, last commit, open issues, whether SKILL.md is substantive vs. a stub. refuted=true if it is abandoned, a thin stub, low-quality, or you cannot confirm it exists.` },
  { key:'real-fit', brief:`FIT skeptic: argue this does NOT actually fit a ~85-90% terminal/local-bound Godot-prototyping + /teach-course-building + PKM workflow on macOS. refuted=true if it only helps work the user doesn't really do (e.g. heavy cloud/web-app/enterprise-backend stuff) or assumes a stack they don't use.` },
]

phase('Adversarial verify')
const verified = await parallel(shortlist.map(s => () =>
  parallel(LENSES.map(l => () =>
    agent(`Adversarially evaluate ONE skill through a single lens. Be a genuine skeptic; do not be charitable.\n\nLENS: ${l.brief}\n\nCANDIDATE (JSON):\n${JSON.stringify(s)}\n\n${PROFILE}\n\nUse live web tools if the lens requires verifying repo facts (load via ToolSearch "select:WebSearch,WebFetch"). Return your verdict for THIS lens only. (resumed pass)`,
      { model: 'opus', label:`verify:${s.name}:${l.key}`, phase:'Adversarial verify', agentType:'general-purpose', schema:VERDICT, effort:'high' })
  )).then(vs => {
    const v = vs.filter(Boolean)
    const refutes = v.filter(x => x.refuted).length
    return Object.assign({}, s, { verdicts:v, refutes, survives: refutes < 2 })
  })
))
const survivors = verified.filter(Boolean).filter(s => s.survives)
const killed = verified.filter(Boolean).filter(s => !s.survives)
log(`${survivors.length}/${shortlist.length} survived adversarial verification; ${killed.length} killed`)

// ---------------------------------------------------------------------------
// PHASE 6 — Per-domain tournament ranking, then final combined report
// ---------------------------------------------------------------------------
const DOMAIN_RANK = { type:'object', additionalProperties:false, properties:{
  domain:{type:'string'},
  ranked:{type:'array', items:{type:'object', additionalProperties:false, properties:{
    rank:{type:'number'}, name:{type:'string'}, source:{type:'string'}, install_command:{type:'string'},
    tier:{type:'string', enum:['must-install','recommended','try','watch-experimental']},
    one_liner:{type:'string'}, why_for_user:{type:'string'},
  }, required:['rank','name','source','install_command','tier','one_liner','why_for_user'] }},
}, required:['domain','ranked'] }

phase('Tournament & final report')
const domainSet = []
for (const s of survivors){ if (domainSet.indexOf(s.domain) === -1) domainSet.push(s.domain) }
const rankings = (await parallel(domainSet.map(d => () =>
  agent(`Run a head-to-head TOURNAMENT to rank the surviving skills in ONE domain: "${d}". Compare them against each other, not in isolation — if two overlap, the weaker loses. Assign tiers: must-install / recommended / try / watch-experimental.\n\n${PROFILE}\n\nSURVIVORS in this domain (JSON, incl. their adversarial verdicts):\n${JSON.stringify(survivors.filter(s => s.domain === d))}\n\nReturn the ranked list for this domain. why_for_user must tie to the user's ACTUAL work and reference the gap it fills.`,
    { model: 'opus', label:`rank:${d}`, phase:'Tournament & final report', schema:DOMAIN_RANK, effort:'high' })
))).filter(Boolean)

const FINAL = { type:'object', additionalProperties:false, properties:{
  combined_markdown:{type:'string'},
  install_plan:{type:'array', items:{type:'object', additionalProperties:false, properties:{
    name:{type:'string'}, command:{type:'string'}, tier:{type:'string'}, why:{type:'string'},
  }, required:['name','command','tier','why'] }},
}, required:['combined_markdown','install_plan'] }

const final = await agent(
`Write the FINAL combined report for the user. Audience: a blunt power user who dislikes praise/filler and wants strongest-counterargument-first, explicit confidence levels.

PART 1 source (effectiveness audit) — reuse and tighten this markdown:
${audit ? audit.report_markdown : '(audit unavailable)'}
Audit structured extras: ${JSON.stringify({ underused: audit && audit.underused_skills, behavioral_fixes: audit && audit.behavioral_fixes, gaps: audit && audit.capability_gaps })}

PART 2 source (online recommendations) — per-domain tournament rankings (JSON):
${JSON.stringify(rankings)}
Killed-in-verification (mention briefly as "considered & rejected" with one-line reasons): ${JSON.stringify(killed.map(k => ({ name:k.name, source:k.source, refutes:k.refutes })))}

${PROFILE}

Produce combined_markdown with exactly these sections:
"## Part 1 — Are you using your installed skills effectively?" (verdict + working-well + underused/mis-fit with adopt/drop/keep verdicts + behavioral fixes; concise, evidence-based)
"## Part 2 — Skills worth adding" (grouped by domain; within each, ordered by tier; each item: name, one-liner, why-for-YOU, exact install command, maturity/quality note. Clearly flag experimental/unvetted ones.)
"## Recommended install plan" (a short tiered shortlist: what to install now vs. try vs. watch.)
"## Considered & rejected" (brief.)
Keep it scannable with tables/bullets. State confidence levels. No praise, no filler.
Also return install_plan: the concrete ordered list of skills to offer to install (name, command, tier, why).`,
  { model: 'opus', label:'final-report', phase:'Tournament & final report', schema:FINAL, effort:'xhigh' })

return final