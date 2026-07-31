# Build plan: Codex migration review repairs

**Tracked by:** `docs/superpowers/specs/2026-07-31-codex-migration-review-repair-design.md`
**Relevant ADRs:** `0001` (Claude Chunk delivery), `0005` (Codex Chunk delivery)
**Date:** 2026-07-31
**Status:** complete

## Preservation boundary

Stage only the repair paths named below. Do not stage the existing gotcha #96 index/body changes
or the existing Workflow-input rule in `multi-agent-policy/SKILL.md`. Do not modify game repos.

## Steps

1. **Repair shared vocabulary and paths**
   - Extend the existing `CONTEXT.md` terms for both hosts and add `Host adapter`.
   - Restore `multi-agent-policy`'s real `~/Claude/improvements.md` pointer.
   - Correct all active `~/Codex/...` references in the user Codex instructions.

2. **Preserve Claude routing while adapting Codex**
   - Restore `ultracode.` to Phase 0 and Phase 1 canonical kickoff prompts.
   - Add `codex-skills/godot-architecture-review/SKILL.md` plus Codex metadata.
   - Repoint only Codex's user skill symlink to that adapter.

3. **Repair updater-safe explicit skill execution**
   - Add the `/skill-name` -> `$skill-name` vendored-source translation rule to global Codex
     instructions and the repository Codex entry point.
   - Leave `~/.agents/.skill-lock.json` and every updater-managed skill body byte-unchanged.

4. **Rebuild the audit instrument**
   - Expand the parity matrix to the required seven columns and all infrastructure surfaces.
   - Add an activation/evidence matrix distinguishing disk presence, discovery, catalog
     visibility, implicit eligibility, explicit invocation, and executable verification.
   - Correct the gotcha-row count to the clean Git-tree result and document dirty-state exclusion.
   - Record the review repairs and any remaining intentionally unmigrated surfaces.
   - Reconcile all user-root skills by ownership: lock-owned, personal symlink, or unlocked
     host-specific copy.

5. **Remove the misleading activity copy**
   - Verify the copied `Codex-activity` body points to absent data/generator paths and that the
     canonical Claude generator does not ingest `~/.codex/sessions`.
   - Move only `~/.agents/skills/claude-activity` to a recoverable temporary backup.
   - Record a real Codex activity generator as deferred; do not mutate the Claude activity project.

6. **Verify the exact prospective commit**
   - Run shell syntax and live hook probes.
   - Validate skill frontmatter and adapter metadata.
   - Run the gotcha 23-check self-test and index lint from a clean tree built from the staged index.
   - Start fresh ephemeral Codex tasks for architecture adapter, `grill-me`, and `wayfinder` probes.
   - Start fresh read-only Claude tasks for the restored architecture router and shared policy path.
   - Confirm vendored source directories and `.skill-lock.json` are unchanged.
   - Confirm the complete post-repair user skill root reconciles and a fresh Codex task omits the
     removed activity skill.
   - Run `git diff --cached --check` and inspect staged/unstaged boundaries.

7. **Commit**
   - Create one follow-up commit on `main`.
   - Leave the pre-existing user edits unstaged and do not push.
