# Design: `cpalaka-claude-skills` Public Repo

**Date:** 2026-05-26
**Author:** @cpalaka (with Claude)
**Status:** Approved — ready for implementation plan

## Goal

Publish a public GitHub repo that:

1. Hosts the Claude Code skills authored by @cpalaka so others can install and use them.
2. Tracks the 3rd-party Claude Code skills @cpalaka uses, with attribution and brief notes.

The repo doubles as a portfolio of authored work and a curated index of what
the author actually reaches for.

## Scope

### In scope (v1)

- Three authored skills, copied into the repo as top-level directories:
  - `godot-personal-gotchas/`
  - `init-godot-claude-project/` (with its existing `templates/` subtree)
  - `sync-godot-skills/`
- A `README.md` covering: tagline, install snippet, authored skills, 3rd-party skills, license link.
- `LICENSE` (MIT).
- `.gitignore` (macOS noise only).
- This design document, committed under `docs/superpowers/specs/`.

### Out of scope (v1)

- Claude Code plugin packaging (`plugin.json`, `marketplace.json`).
- Any automation / scripts to refresh the 3rd-party list.
- CI, GitHub Actions, badges.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates, PR templates.
- A `CHANGELOG`.
- Built-in Claude Code skills (`init`, `review`, `security-review`, `code-review`, etc.) — they ship with the tool and aren't really 3rd-party.

## Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Distribution model | Plain skills repo (no plugin metadata) | Simplest. Users symlink into `~/.claude/skills/`. Upgrading to a plugin later is additive. |
| Layout | Flat: each skill is a top-level directory | Makes symlinks trivial: `ln -s <repo>/<skill> ~/.claude/skills/<skill>`. No need for a `skills/` wrapper given the small set. |
| Repo name | `cpalaka-claude-skills` | Personal namespace, topic-agnostic. Future-proofs adding non-Godot skills. |
| License | MIT | Most permissive, standard for personal collections. |
| 3rd-party detail | Name + link + one-line note | Useful for both future-self and visitors without becoming a maintenance burden. |
| 3rd-party initial population | All currently installed | Easy to start; prune later. Captures everything for credit. |
| 3rd-party maintenance | Hand-maintained markdown | Zero machinery; one-line edits when adopting/dropping a skill. Upgrading to a script later is straightforward. |

## File tree

```
cpalaka-claude-skills/
├── README.md
├── LICENSE                         # MIT
├── .gitignore                      # .DS_Store
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-26-skills-repo-design.md   # this file
├── godot-personal-gotchas/
│   └── SKILL.md
├── init-godot-claude-project/
│   ├── SKILL.md
│   └── templates/                  # carried over as-is
└── sync-godot-skills/
    └── SKILL.md
```

## README.md structure

Top to bottom:

1. **Title + 1-sentence tagline.** Example: "Personal collection of Claude Code skills authored by @cpalaka, plus a tracker of 3rd-party skills I use."
2. **Install.** One short snippet showing the symlink pattern, generalisable to any skill in the repo:
   ```bash
   git clone https://github.com/<you>/cpalaka-claude-skills.git
   ln -s "$PWD/cpalaka-claude-skills/godot-personal-gotchas" \
     ~/.claude/skills/godot-personal-gotchas
   ```
3. **Skills I've authored.** One subsection per skill, in this shape:
   ```markdown
   ### <skill-name>

   <one-paragraph description, lifted from the SKILL.md frontmatter and
   lightly edited for prose flow>

   **When to use:** <1–2 bullets>

   [`SKILL.md`](./<skill-name>/SKILL.md)
   ```
   The frontmatter `description` field in each `SKILL.md` is the source of truth; the README may lightly rewrite for readability but the frontmatter is not edited.
4. **3rd-party skills I use.** Flat alphabetical list, lightly grouped by origin:
   - **From plugins** — namespaced skills like `superpowers:*`, `obsidian:*`, `andrej-karpathy-skills:*`. Link points to the plugin's repo.
   - **From `~/.agents/skills/` collection** — unnamespaced skills installed from that location. Link points to the upstream repo for that collection.
   - Each entry: `- [skill-name](upstream-link) — one-line note (from the skill's own description)`.
   - If an origin can't be confidently determined during implementation, the entry is marked `_(source unknown)_` rather than guessed at.
   - Built-in Claude Code skills are omitted.
5. **License.** One line linking to `LICENSE`.

No badges, no TOC, no CONTRIBUTING section in v1.

## Authored skill content

Each authored skill directory is a faithful copy of its current
`~/.claude/skills/<name>/` contents (real directory, not the symlinked
ones). Specifically:

- `godot-personal-gotchas/SKILL.md` — copy as-is.
- `init-godot-claude-project/SKILL.md` + `templates/` subtree — copy as-is.
- `sync-godot-skills/SKILL.md` — copy as-is.

The implementation plan will verify that copying preserves intra-skill
references and that no skill embeds absolute machine-specific paths.

## Initial 3rd-party population

Implementation will:

1. Enumerate currently installed 3rd-party skills from:
   - `~/.agents/skills/` (real directories the user's `~/.claude/skills/` symlinks into).
   - Plugin caches: `~/.claude/plugins/cache/` for namespaced plugins.
2. For each, read its `SKILL.md` frontmatter and capture the `name` and `description`.
3. Determine origin:
   - Namespaced (`<plugin>:<skill>`) → look up the plugin's source repo in `~/.claude/plugins/cache/.../`.
   - Unnamespaced under `~/.agents/skills/` → identify the single upstream collection (likely one repo) by reading any `README` / `.git` config present, or by checking a representative skill's metadata.
4. Render the entries grouped and alphabetised as described above.

Built-ins (`init`, `review`, `security-review`, `code-review`, and any others that ship with Claude Code itself) are excluded.

## License

MIT, single-file `LICENSE`, copyright "© 2026 cpalaka" (placeholder — adjust during implementation if a different attribution name is preferred).

## Risks and open questions

- **Origin discovery for 3rd-party skills may be imperfect.** Mitigation: `_(source unknown)_` placeholder is acceptable; the design does not block on perfect attribution.
- **Authored-skill paths may need touch-up.** If any `SKILL.md` references absolute paths or symlinks, those need to be normalised to be portable. The implementation plan should add a verification step.
- **GitHub username placeholder.** The install snippet uses `<you>` as a placeholder; the implementation step that writes the README will substitute the user's real GitHub handle once confirmed.

## Success criteria

- Repo can be cloned and any authored skill symlinked into `~/.claude/skills/` and immediately invoked by Claude Code without modification.
- README's 3rd-party section lists every currently installed non-built-in skill exactly once, with a working upstream link and a 1-line note.
- `LICENSE` and `.gitignore` are present and standard.
- Repo has zero build steps, zero CI, zero unused files.
