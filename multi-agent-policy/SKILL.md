---
name: multi-agent-policy
description: Model/effort policy and orchestration procedure for multi-agent work. Use BEFORE launching any Workflow run, subagent fan-out, adversarial review, tournament, or orchestrator-delegate handoff, and for any fan-out → verify pipeline — covers per-stage model/effort pins, severity-tiered verification, fan-out verification discipline, heartbeat monitoring, and stale-cache gotchas.
---

# Multi-Agent Policy

Hard pins (mirrored in global `CLAUDE.md` — they hold even when this skill isn't loaded): **workhorse tier for all agent work; never the budget tier for correctness-bearing work; scarce tier opt-in only; >20 projected agents → announce the count in chat before launching.**

Rationale archive for everything below: `~/Claude/improvements.md` (2026-06-26 → 2026-07-14 entries).

## Tier roles

This skill names **tiers, not models** — model names churn faster than the rules do, and a stale name in a rule silently misroutes work. Three roles:

- **workhorse** — the strongest generally-available model. Default for all agent work.
- **budget** — cheaper/faster models. Non-correctness-bearing sweeps only, under the exception below.
- **scarce** — a rate-limited premium model. Opt-in per launch, one high-leverage slot.

**These roles are self-resolving — do not write a model name into any durable rule, here or in `CLAUDE.md`.** There is deliberately no role → model mapping line anywhere: a mapping is itself the staleness liability, and a stale one misroutes work silently instead of failing loudly.

This does **not** relax the per-stage pinning rule below. The split: durable rules name *roles*; a given run's script names a *concrete model ID*, resolved at authoring time and pinned explicitly per stage. Resolve that ID by probe rather than from memory or from an alias — the CLI's short tier aliases can lag a release and keep serving the prior generation while every rule reads correct (2026-07-24: the workhorse alias still resolved to the prior generation a day after the new one shipped).

Literal identifiers below (`opus-implementer`, the `fable` arg) are filenames and script parameters, not tier claims — renaming them breaks live pointers, so they stay verbatim.

## Model & effort pins

- **Never let workflow agents inherit model/effort silently** — set both explicitly per stage. Inheritance is silent-by-construction and effort tiers are not recoverable post-hoc, so a run's effort correctness rests entirely on explicit per-call pins.
- This applies to scripts you didn't author: before launching any saved workflow, grep it for per-stage `model:` pins — an unpinned stage silently inherits the session model.
- An ad-hoc Agent-tool spawn cannot pin effort (it exposes only `model`). When effort must be pinned, use the Workflow tool's `agent(prompt, {model, effort})` or a definition-backed agent type whose frontmatter pins both (`model:` + `effort:`, e.g. `opus-implementer` in `~/.claude/agents/`).
- Pin verification effort per review mode: modest = high, full = xhigh. Reference shape: space-miner's `.claude/workflows/adversarial-review.js`.

## Scarce-tier usage

- Opt-in per launch, never a default for subagents/workflows. It is usage-limited on a weekly window: confirm current headroom before committing it to a stage. If the window is about to expire with budget unspent, the scarcity guard inverts — spend it rather than let it lapse.
- Spend it mainly on the **completeness critic**, not spread across finders — its highest-leverage insight slot. A scarce-tier main loop via `/model` for high-ambiguity judgment sessions is sanctioned, not something to self-police.
- Home for the opt-in mechanics: the `fable` arg in saved adversarial-review workflows.

## Budget-tier exception — usage-constrained cheap fan-outs

When the user flags low weekly usage (or asks to conserve): non-correctness-bearing fan-outs — cataloging, extraction, doc-reading sweeps — may run on the budget tier with a SMALL agent count, de-risked by reading the dense sources yourself in the main loop and validating the cheap output. Correctness-bearing work (code review, load-bearing verification) stays on the workhorse tier, always. Announce the cheaper composition + the de-risk, and offer the cost trade-off before spending workhorse capacity on a big fan-out.

## Verification structure

- **Scope each verifier prompt** to the named files/lines/spec-refs it must check — an unscoped xhigh verifier roams the repo and misjudges.
- **Severity-tier the verification**: 3-vote panels only for HIGH findings; MEDIUM → 1 verifier escalating on uncertainty; LOW → main-loop judgment. Panels on vague findings amplify noise, not signal.
- **Always run a dedicated completeness critic** in a diff review — "what did the structured finders miss" — as a slot distinct from the finders, and concentrate premium effort there (scarce-tier at xhigh when opted in and headroom allows; otherwise workhorse at xhigh). One xhigh critic out-earns the same effort added to an Nth finder; verify is its own stage; synthesize is low-value for discovery.
- **Pair it with a counter-critic aimed at the REVIEW, not the subject** — same premium effort. The completeness critic hunts absence in the subject ("what did the finders miss"); the counter-critic hunts error in the method: category errors, speculative-generality remedies, stage-inappropriate standards, and absence claims whose refuting evidence sat outside the scope the finders were given. Verifiers can't substitute — scoping each to its finding's named files is right for checking a fact and structurally blind to a scope error. (space-miner 2026-07-25: the completeness critic missed that nine of ten lenses were never pointed at `backlog/`; the counter-critic caught it, killing four HIGH findings that restated live tickets.)
- **External vendor lenses on any reasonably-sized diff**: after the internal review pass, run Grok + Codex adversarial reviews framed for refutation — vendor-diverse review catches what same-family redundancy can't (kenney-26 2026-07-17: internal pass clean, both externals independently confirmed a HIGH data-loss defect). Adjudicate every finding against source (confirmed / refuted / judgment) before acting, and flag the conflict-of-interest when the implementing delegate reviews its own diff — the other vendor is the independent lens there. Pin each lens to the SHA it launched against and hold further fix commits until all lenses return — a lens launched before a mid-review commit re-reports already-fixed defects as live (kenney-26 2026-07-18).

## Fan-out → verify discipline

- **Reconcile items SENT vs verdicts RETURNED — not `survived` vs `refuted`.** A verifier error swallowed by `.catch(()=>null)`/`.filter(Boolean)` drops its item silently while survived+refuted still reconcile with each other. Have the script emit a `dropped`/`errored` bucket; if sent ≠ verdicts, recover each drop from the run's `agent-<id>.jsonl` and verify it yourself in the main loop.
- **This recurses to the vote level**: with N-skeptic panels, also reconcile `votesReturned` vs `votesSent` per finding — finding-level reconciliation can read clean while one dropped vote flips a refute-majority into a tie that "survives". Adjudicate in the main loop any survivor that passed on a tie or a missing vote.
- **Merge SEMANTICALLY between find and verify, and adjudicate defect-by-defect — never finding-by-finding.** The reconciliation rules above catch items a fan-out *dropped*; they are structurally blind to items it *duplicated*. In a multi-lane fan-out (one finder per surface or lens) two finders describe one defect in words sharing neither route target nor opening phrase, so a dedup key like `route + target + claim-prefix` merges **nothing** across lanes. The expensive part is not the duplication — **a refuter kill binds only the COPY it ran against**, so one copy can be correctly killed while its twin survives unrefuted at HIGH: the review simultaneously asserts and denies the same claim, and the surviving copy carries a false correction into a durable artifact under the authority of the very review that refuted it. Cluster by title+claim similarity (threshold tuned against the real corpus, never chosen — see the space-miner `adversarial-review-dedup-destroys-spec-claims` memory for the opposite failure, over-merging), give each defect ONE severity and ONE route owner before verification, and where a merge stage is impractical task the **counter-critic** with hunting duplicate clusters explicitly — it is the only slot positioned to see them. (space-miner 2026-07-30: 51 findings hid 8 duplicate clusters while sent-vs-returned read a perfect 7/7 readers and 6/6 verdicts throughout.)
- **A refuted finding about a protected invariant deserves a second look** (a11y/reduced-motion, security, data-loss, irreversibility). A refutation resting on one narrow structural premise can hold for the scenario the finder raised and fail for one they didn't — re-check the premise against other layouts/routes/settings/inputs before trusting the kill. The kill feeling authoritative is exactly when a wrong refutation ships.
- **A confirmed finding proves the defect, not the remedy.** Re-derive any fix against the real system model before pinning it — finder fix-hints are drive-by hypotheses, and adopting one unverified can trade the named bug for a worse one.

## Orchestrator-delegate procedure

When the main loop is on the scarce tier and the task is an implementation task (correctness-bearing code/data diff), orchestrate by default — see the CLAUDE.md pin for the shape and the `"solo"` / `"orchestrate"` toggles. Operationally:

- The main loop writes the per-phase execution spec; `opus-implementer` (or Workflow `agent()` with per-stage pins) writes the diffs; the main loop re-verifies every handoff itself and runs all gates (tests, typecheck, smoke, scans) in the main loop.
- **Persist the approved spec to the task's plan doc / board `--plan` before any fan-out** — orchestrator context bloating pre-fan-out is the pattern's known failure mode, and the spec must survive a restart or rewind.
- **Check `git status` after EVERY fan-out — subagents leave files in the repo.** Workflow and Agent-tool subagents write scratch probes and benchmarks into the working tree even when the prompt asks them to stay clean, and even when their report claims the repo was left clean. Sweep before any commit. **Inspect before deleting** — a stray sometimes holds a real measurement worth harvesting into the record, so blind `rm` loses evidence. This is also why staging is by explicit file path, never `git add <dir>/`: a stray interleaved with real files in the same directory is the expected case.
- **Verify a heartbeat's transcript key against one real journal line before reporting from it.** A monitor greping the wrong field reports `completed=0` indefinitely while agents finish normally — the status line then looks like a stall and invites killing healthy work. A monitor is an instrument, so the calibrate-before-trusting rule (global CLAUDE.md, Coding Discipline) applies to it too.
- **Injecting mid-run context: edit the SCRIPT for a resume, but reach live agents through the artifacts they were told to read.** A running workflow uses the script as loaded at launch, so edits take effect only on `resumeFromRunId`. Findings measured after dispatch reach in-flight agents only if the prompt already pointed them at a file you can append to (a board row, a plan doc) — which is a reason to point every agent at the task row rather than inlining the whole brief. Append only to the stages you intend to re-run, or the resume invalidates the cache for everything downstream of the edit.
- **Heartbeat**: any background delegate expected to exceed ~10 minutes gets a Monitor heartbeat — a `sleep 600` loop emitting one status line per tick (implementers: elapsed + `git log -1 --oneline` + `git status --porcelain | wc -l`; workflows: elapsed + `agent-*.jsonl` count in the transcript dir). Relay each tick as a one-line status. No growth AND no commit → one liveness probe (`find <scope> -mmin -12`) before declaring a hang — a static tree is also what a gate-run looks like. TaskStop the monitor the moment the delegate reports; re-arm per delegate; monitor timeout 3600s. Undelegated solo work and interactive work need no heartbeat.

## Stale-cache gotchas

- **After editing a `.claude/workflows/` script, launch via `scriptPath` — never by `name`.** By-name resolution can serve a session-start-cached copy, and the failure is silent (the run "succeeds" under the wrong config). Verify a run's configuration by grepping its `agent-*.jsonl` transcripts for `"model"` — per-agent spawn evidence beats a canary line the script prints itself.
- **Edited `.claude/agents/*.md` defs are NOT hot-loaded** — the Agent registry caches at session start. To validate a def changed this session, execute its documented procedure directly; defer literal agent dispatch to a fresh session.

## Doc-corpus consistency sweep

Before a planning/decision session that consumes a multi-session doc corpus, run a cheap workhorse-tier consistency sweep first: per-doc auditors + a cross-doc reconciler + a surviving-open-inventory agent; verify, then apply only provenance-derivable fixes — never resolve an `[open]`. The planning session should never be the thing that discovers doc rot; the inventory output doubles as the planning session's wall of items it must not silently resolve.
