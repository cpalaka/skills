---
name: godot-architecture-review
description: Convergent, re-runnable architecture review and refactor campaign for Godot projects using deep-module, depth-as-value, and Godot-specific guardrails. Use for whole-project architecture campaigns, shallow-module audits, and systematic deepening work.
---

# Godot Architecture Review — Codex adapter

This is a thin **Host adapter** for the canonical Claude Code skill at
[`../../godot-architecture-review/SKILL.md`](../../godot-architecture-review/SKILL.md). Read that
file and every supporting file it routes to completely, then follow the canonical process with
these substitutions:

- In `PHASES.md`, treat a leading `ultracode.` as Claude Code's host router, not prompt content.
  Omit it in Codex and dispatch the explicitly requested parallel exploration through Codex
  subagents after loading `$multi-agent-policy`.
- Invoke installed skills with Codex `$skill-name` syntax. If canonical source uses a Claude
  `/skill-name` reference, load the corresponding Codex skill instead of sending the slash form.
- Use Codex-native collaboration, bounded waits, and commentary updates. Do not assume Claude's
  Workflow or Monitor surfaces.

All phase boundaries, Godot guardrails, artifact formats, convergence criteria, write gates, and
solo deep-dive rules remain canonical in the source skill. Do not copy them into this adapter.
