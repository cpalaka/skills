# ADR 0005: Codex chunks use explicit read directives

**Status:** Accepted

Codex project instructions will name shared chunk files with explicit read directives, while `~/.codex/chunks` is a symlink to this repository's canonical `chunks/` directory. Codex's current `AGENTS.md` documentation does not define Claude Code's recursive `@path` import syntax, so keeping those imports in Codex instructions would look configured while silently omitting their content; flattening or copying chunks would instead create a second source of truth.
