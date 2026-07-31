---
name: refresh-context
description: Build or refresh a project's CONTEXT.md domain glossary and any warranted ADRs through a docs-aware interview. Use only when explicitly invoked with $refresh-context.
---

# Refresh Context — Codex adapter

This is a thin Codex adapter for the canonical Claude Code skill at
[`../../refresh-context/SKILL.md`](../../refresh-context/SKILL.md). Read that file completely, then
follow its process with these host substitutions:

- Invoke installed skills with Codex syntax (`$grilling`, `$domain-modeling`) rather than Claude
  Code slash commands.
- Treat `AGENTS.md` as Codex's project instruction entry point. If the project also has a
  `CLAUDE.md`, preserve it and keep shared domain pointers consistent rather than copying either
  instruction file wholesale into the other.
- Use Codex-native tools for read-only exploration and file edits. Do not assume Claude Code's
  Workflow tool, settings files, hook schema, or memory directory exists.

All interview, write-gate, no-change, glossary-format, and ADR criteria remain canonical in the
source skill. Do not copy them into this adapter.
