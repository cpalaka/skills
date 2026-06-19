# `cpalaka-claude-skills` Repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the `cpalaka-claude-skills` repo with the three authored Godot skills, a README that documents them plus a curated list of 3rd-party skills in use, an MIT license, and push it to a new public GitHub repo.

**Architecture:** Plain skills repo. Three top-level skill directories carry intact copies of the user's authored skills. `README.md`, `LICENSE`, and `.gitignore` at the root. `docs/` (already gitignored) holds this plan and the design spec, never committed.

**Tech Stack:** Plain markdown, shell (`cp`, `grep`, `jq`), `git`, `gh` CLI.

---

## Spec reference

Design spec: `docs/superpowers/specs/2026-05-26-skills-repo-design.md` (gitignored, local-only).

## Working directory

All paths in this plan are relative to:

```
/Users/chaipalaka/Code/github/cpalaka-claude-skills
```

Authoring source paths (where to copy *from*):

```
/Users/chaipalaka/.claude/skills/godot-personal-gotchas/
/Users/chaipalaka/.claude/skills/init-godot-claude-project/
/Users/chaipalaka/.claude/skills/sync-godot-skills/
```

Repo entry state when this plan starts:
- `.git/` initialised, branch `main`, no commits yet
- `.gitignore` exists on disk but untracked (ignores `.DS_Store` and `docs/`)
- `docs/superpowers/specs/2026-05-26-skills-repo-design.md` on disk, gitignored
- `docs/superpowers/plans/2026-05-26-skills-repo-implementation.md` (this file) on disk, gitignored

## File structure (final state of the public repo)

```
cpalaka-claude-skills/
├── .gitignore                            # created in Task 1
├── LICENSE                               # created in Task 2 (MIT)
├── README.md                             # created in Task 7
├── godot-personal-gotchas/
│   └── SKILL.md                          # copied in Task 3
├── init-godot-claude-project/
│   ├── SKILL.md                          # copied in Task 4
│   └── templates/                        # copied in Task 4
└── sync-godot-skills/
    └── SKILL.md                          # copied in Task 5
```

`docs/` exists on disk but is gitignored.

---

## Task 1: First commit — `.gitignore`

**Files:**
- Add: `.gitignore` (already on disk, untracked)

- [ ] **Step 1: Verify `.gitignore` content is correct**

Run:
```bash
cat .gitignore
```

Expected output (exactly):
```
.DS_Store
docs/
```

If different, overwrite with that exact content.

- [ ] **Step 2: Stage and commit**

Run:
```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
chore: add .gitignore

Ignore macOS .DS_Store noise and the local-only docs/ folder where
working specs and plans live.
EOF
)"
```

- [ ] **Step 3: Verify**

Run:
```bash
git log --oneline -1 && git status --short
```

Expected: one commit shown, working tree clean (no untracked or modified files reported except gitignored ones).

---

## Task 2: Add MIT `LICENSE`

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Write the LICENSE file**

Create `LICENSE` with this exact content (replace `cpalaka` only if a different attribution name is preferred — confirm with the user before changing):

```
MIT License

Copyright (c) 2026 cpalaka

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Verify**

Run:
```bash
head -3 LICENSE
```

Expected first three lines:
```
MIT License

Copyright (c) 2026 cpalaka
```

- [ ] **Step 3: Commit**

Run:
```bash
git add LICENSE
git commit -m "$(cat <<'EOF'
chore: add MIT license

Standard MIT, copyright 2026 cpalaka.
EOF
)"
```

---

## Task 3: Copy `godot-personal-gotchas`

**Files:**
- Create: `godot-personal-gotchas/SKILL.md` (copy of `/Users/chaipalaka/.claude/skills/godot-personal-gotchas/SKILL.md`)

- [ ] **Step 1: Copy the skill directory**

Run:
```bash
cp -R /Users/chaipalaka/.claude/skills/godot-personal-gotchas .
```

- [ ] **Step 2: Verify the file landed and is a regular file (not a symlink)**

Run:
```bash
ls -la godot-personal-gotchas/
file godot-personal-gotchas/SKILL.md
```

Expected: `SKILL.md` is listed; `file` reports `ASCII text` or `UTF-8 Unicode text` (NOT `symbolic link`).

- [ ] **Step 3: Verify frontmatter is intact**

Run:
```bash
head -5 godot-personal-gotchas/SKILL.md
```

Expected: the first line is `---`, followed by `name: godot-personal-gotchas`, then a `description:` field, then `---`.

- [ ] **Step 4: Scan for absolute paths that wouldn't be portable**

Run:
```bash
grep -rE "/Users/chaipalaka|^/home/" godot-personal-gotchas/ && echo "FOUND" || echo "CLEAN"
```

Expected output: `CLEAN`.

If `FOUND`, inspect each match. Generic references in prose are fine; hard-coded paths to user-specific resources are not — replace with relative or example placeholders.

- [ ] **Step 5: Commit**

Run:
```bash
git add godot-personal-gotchas
git commit -m "$(cat <<'EOF'
feat: add godot-personal-gotchas skill

Personal index of Godot 4.x editor and engine gotchas — symptom-to-cause
lookup for silent failures.
EOF
)"
```

---

## Task 4: Copy `init-godot-claude-project`

**Files:**
- Create: `init-godot-claude-project/SKILL.md`
- Create: `init-godot-claude-project/templates/` (recursive copy)

- [ ] **Step 1: Copy the skill directory recursively**

Run:
```bash
cp -R /Users/chaipalaka/.claude/skills/init-godot-claude-project .
```

- [ ] **Step 2: Verify the templates subdir came along**

Run:
```bash
ls init-godot-claude-project/templates/
```

Expected: the list should include (at minimum):
```
agents
asset-pipeline.md
blender-mcp-guide.md
CLAUDE.md.full
CLAUDE.md.snippet
godot-gotchas.md
godot-mcp-clean
godot-mcp-guide.md
mcp.json
settings.local.json
```

If a directory like `agents` or `godot-mcp-clean` is missing, re-run the `cp -R` with the trailing slash carefully checked.

- [ ] **Step 3: Verify no broken symlinks**

Run:
```bash
find init-godot-claude-project -type l
```

Expected: no output (no symlinks). If any are listed, dereference them with `cp -L` for those files specifically, or replace with the underlying content.

- [ ] **Step 4: Verify frontmatter**

Run:
```bash
head -5 init-godot-claude-project/SKILL.md
```

Expected: starts `---`, has `name: init-godot-claude-project`, has a `description:` field, ends section with `---`.

- [ ] **Step 5: Scan for absolute paths**

Run:
```bash
grep -rE "/Users/chaipalaka|^/home/" init-godot-claude-project/ && echo "FOUND" || echo "CLEAN"
```

Expected: `CLEAN`. Treat any hits as in Task 3 Step 4.

- [ ] **Step 6: Commit**

Run:
```bash
git add init-godot-claude-project
git commit -m "$(cat <<'EOF'
feat: add init-godot-claude-project skill

Bootstraps a Godot 4.x project for Claude Code: godot-mcp and minimal-godot-mcp
MCP servers, the in-engine godot_mcp addon, per-project reference guides,
and the project Claude permission allowlist.
EOF
)"
```

---

## Task 5: Copy `sync-godot-skills`

**Files:**
- Create: `sync-godot-skills/SKILL.md`

- [ ] **Step 1: Copy the skill directory**

Run:
```bash
cp -R /Users/chaipalaka/.claude/skills/sync-godot-skills .
```

- [ ] **Step 2: Verify the file and frontmatter**

Run:
```bash
file sync-godot-skills/SKILL.md
head -5 sync-godot-skills/SKILL.md
```

Expected: regular text file; frontmatter has `name: sync-godot-skills` and a `description:` field.

- [ ] **Step 3: Scan for absolute paths**

Run:
```bash
grep -rE "/Users/chaipalaka|^/home/" sync-godot-skills/ && echo "FOUND" || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 4: Commit**

Run:
```bash
git add sync-godot-skills
git commit -m "$(cat <<'EOF'
feat: add sync-godot-skills skill

Audits a Godot project's docs/memory against the source skills
(init-godot-claude-project, godot-personal-gotchas) and applies
surgical updates to the skills only. Direction is always project → skill.
EOF
)"
```

---

## Task 6: Discover 3rd-party skill origins (no commit)

**Goal:** Produce a working list mapping every installed 3rd-party skill to: (a) its upstream repo URL, (b) the one-line description from its frontmatter. This populates Task 7's README section.

This task produces an intermediate scratchpad file at `docs/scratch/3p-skills.md` (gitignored, since `docs/` is ignored). It is NOT committed.

**Origin sources to query:**

1. **`~/.agents/skills/*`** — origins are in `~/.agents/.skill-lock.json`. Each skill entry has `sourceUrl`. Currently all entries source from `mattpocock/skills` (`https://github.com/mattpocock/skills`), but verify per skill rather than assuming.
2. **`superpowers:*`** — plugin path `~/.claude/plugins/cache/claude-plugins-official/superpowers/`. The upstream repo for the superpowers plugin is the official Anthropic claude plugins marketplace. Get the URL from `~/.claude/plugins/cache/claude-plugins-official/` git remotes if it's a git repo, or use `https://github.com/anthropics/claude-plugins` as a documented fallback — verify by checking the marketplace.json or by inspecting `.git/config` under that directory.
3. **`andrej-karpathy-skills:*`** — `~/.claude/plugins/cache/karpathy-skills/`. Owner is `forrestchang`. Verify the repo URL via `cd ~/.claude/plugins/cache/karpathy-skills && git remote get-url origin 2>/dev/null`. Likely `https://github.com/forrestchang/karpathy-skills`.
4. **`obsidian:*`** — `~/.claude/plugins/cache/obsidian-skills/`. Owner is "Steph Ango" (kepano). Verify the repo URL via `cd ~/.claude/plugins/cache/obsidian-skills && git remote get-url origin 2>/dev/null`. Likely `https://github.com/kepano/obsidian-skills`.
5. **Built-ins** (`init`, `review`, `security-review`, `code-review`, `claude-api`, `run`, `verify`, `loop`, `schedule`, `fewer-permission-prompts`, `update-config`, `keybindings-help`) — exclude from the README list. These ship with Claude Code itself.

- [ ] **Step 1: Create scratch directory**

Run:
```bash
mkdir -p docs/scratch
```

- [ ] **Step 2: Extract origins from `~/.agents/.skill-lock.json`**

Run:
```bash
jq -r '.skills | to_entries[] | "\(.key)\t\(.value.sourceUrl)\t\(.value.skillPath)"' \
  /Users/chaipalaka/.agents/.skill-lock.json
```

Expected output: one tab-separated line per skill with `name`, `sourceUrl`, and `skillPath`. Save the full output to scratch:

```bash
jq -r '.skills | to_entries[] | "\(.key)\t\(.value.sourceUrl)\t\(.value.skillPath)"' \
  /Users/chaipalaka/.agents/.skill-lock.json > docs/scratch/agents-skills.tsv
```

- [ ] **Step 3: Extract descriptions from each `~/.agents/skills/<name>/SKILL.md` frontmatter**

Run:
```bash
for d in /Users/chaipalaka/.agents/skills/*/; do
  name=$(basename "$d")
  desc=$(awk '/^description:/{sub(/^description: */,""); print; exit}' "$d/SKILL.md")
  printf "%s\t%s\n" "$name" "$desc"
done > docs/scratch/agents-descriptions.tsv
```

Sanity-check:
```bash
wc -l docs/scratch/agents-descriptions.tsv
head -3 docs/scratch/agents-descriptions.tsv
```

Expected: line count matches the number of subdirectories under `~/.agents/skills/`. Each line is `name<TAB>description`.

- [ ] **Step 4: Determine the plugin-namespaced source URLs**

Run:
```bash
for p in /Users/chaipalaka/.claude/plugins/cache/*/; do
  echo "--- $p ---"
  (cd "$p" && git remote get-url origin 2>/dev/null) || \
    find "$p" -maxdepth 4 -name "marketplace.json" -exec head -20 {} \;
done
```

For each of `claude-plugins-official/`, `karpathy-skills/`, `obsidian-skills/`: capture either the git remote URL or the marketplace JSON owner/name pair. Best-effort. If a remote URL cannot be confidently determined for a plugin, mark that plugin's entries with `_(source unknown)_` placeholder.

- [ ] **Step 5: Build the scratch list `docs/scratch/3p-skills.md`**

Group the skills into three sections:

1. **Plugin: superpowers** — list every `superpowers:*` skill from the available-skills system reminder, with description from `~/.claude/plugins/cache/claude-plugins-official/superpowers/*/skills/<name>/SKILL.md` if present.
2. **Plugin: andrej-karpathy-skills** — `karpathy-guidelines` and any others.
3. **Plugin: obsidian** — `defuddle`, `obsidian-cli`, `json-canvas`, `obsidian-bases`, `obsidian-markdown`.
4. **From the mattpocock/skills collection (`~/.agents/skills/`)** — every entry from Step 2's TSV.

For each entry write a markdown line in this exact shape:

```
- [skill-name](upstream-repo-url) — one-line description from frontmatter
```

If multiple skills share the same `sourceUrl`, the link points to the repo root (not deep-linked to the skill file). Truncate descriptions over ~200 characters with an ellipsis.

Built-ins (see list above) are excluded — do not write them into the scratch file.

- [ ] **Step 6: Sanity-check the scratch list**

Run:
```bash
wc -l docs/scratch/3p-skills.md
grep -cE "^- \[" docs/scratch/3p-skills.md
```

Expected: ≥ 25 entries (the user's installed 3rd-party set). If the count is suspiciously low, re-check Steps 2–5.

No commit. The scratch file lives in gitignored `docs/`.

---

## Task 7: Write `README.md`

**Files:**
- Create: `README.md`

- [ ] **Step 1: Read the canonical descriptions for the three authored skills**

Run:
```bash
for d in godot-personal-gotchas init-godot-claude-project sync-godot-skills; do
  echo "=== $d ==="
  awk '/^description:/{sub(/^description: */,""); print; exit}' "$d/SKILL.md"
done
```

Keep this output in hand for Step 3. The README's per-skill paragraph is derived from each `description` field; lightly rewrite for prose flow if needed (do not edit the SKILL.md frontmatter).

- [ ] **Step 2: Write the README skeleton**

Create `README.md` with this exact starting content (the bracketed slots are filled in subsequent steps):

```markdown
# cpalaka-claude-skills

Personal collection of [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) skills authored by [@cpalaka](https://github.com/cpalaka), plus a tracker of the 3rd-party skills I use.

## Install

Clone the repo, then symlink any skill into your user skills directory:

```bash
git clone https://github.com/cpalaka/cpalaka-claude-skills.git
ln -s "$PWD/cpalaka-claude-skills/godot-personal-gotchas" \
  ~/.claude/skills/godot-personal-gotchas
```

Replace `godot-personal-gotchas` with whichever skill you want.

## Skills I've authored

<!-- TASK7-AUTHORED-START -->
<!-- TASK7-AUTHORED-END -->

## 3rd-party skills I use

Skills I have installed locally and use as part of my workflow. Grouped by upstream source.

<!-- TASK7-3P-START -->
<!-- TASK7-3P-END -->

## License

MIT. See [LICENSE](./LICENSE).
```

Note: if the user's GitHub handle is not `cpalaka`, replace the two occurrences in the clone URL and the "@cpalaka" link before continuing. Confirm with the user if unsure.

- [ ] **Step 3: Fill in the authored-skills section**

Replace the `<!-- TASK7-AUTHORED-START -->` / `<!-- TASK7-AUTHORED-END -->` block with three subsections — one per skill — using this template:

```markdown
### godot-personal-gotchas

Personal index of Godot 4.x editor and engine gotchas. Maps symptoms — silent failures, settings that don't take effect, mode setters that no-op, panels showing stale state — to a known cause and fix.

**When to use:** working on a Godot project where an operation behaves unexpectedly, especially when calls succeed silently but produce no visible effect.

[`SKILL.md`](./godot-personal-gotchas/SKILL.md)

### init-godot-claude-project

Bootstraps a Godot 4.x project to work with Claude Code via the `godot-mcp` and `minimal-godot-mcp` MCP servers. Installs the in-engine `godot_mcp` addon, the per-project reference guides (Godot MCP, Blender MCP, asset pipeline), and the project-level Claude permission allowlist.

**When to use:** setting up a new Godot project for Claude Code, or adding the MCP scaffolding to an existing Godot project that lacks it.

[`SKILL.md`](./init-godot-claude-project/SKILL.md)

### sync-godot-skills

Audits a Godot project's per-project docs and memory against the source skills (`init-godot-claude-project`, `godot-personal-gotchas`). Identifies drift, presents a parity table for approval, and applies surgical updates **to the skill files only** — never to the project. Direction is always project → skill.

**When to use:** running a parity check between project docs/memory and the upstream skills, or propagating newly-learned Godot gotchas back into the source skill.

[`SKILL.md`](./sync-godot-skills/SKILL.md)
```

The phrasing above is a starting point lifted from the spec. If Step 1's descriptions differ meaningfully, prefer the wording in Step 1's output (lightly rewritten for prose).

- [ ] **Step 4: Fill in the 3rd-party section**

Paste the content of `docs/scratch/3p-skills.md` (built in Task 6) between the `<!-- TASK7-3P-START -->` and `<!-- TASK7-3P-END -->` markers. The content should already be grouped into 4 subsections (superpowers, andrej-karpathy-skills, obsidian, mattpocock/skills) with bullet entries per the format established in Task 6 Step 5.

Add a short intro sentence to each subsection if not already present, like:

```markdown
### From [superpowers](https://github.com/anthropics/claude-plugins) (plugin)

- [brainstorming](https://github.com/...) — explores user intent before implementation
- ...
```

- [ ] **Step 5: Verify the README**

Run:
```bash
# Check section headers
grep -E "^##? " README.md

# Check no leftover markers
grep -E "TASK7-(AUTHORED|3P)-(START|END)" README.md && echo "MARKER LEFTOVER" || echo "CLEAN MARKERS"

# Check no leftover placeholders
grep -E "TBD|TODO|<your handle>|<replace>" README.md && echo "PLACEHOLDER LEFTOVER" || echo "CLEAN PLACEHOLDERS"

# Sanity: every internal link target exists
for path in $(grep -oE "\(\.\/[^)]+\)" README.md | tr -d "()" ); do
  [ -e "$path" ] || echo "MISSING: $path"
done
```

Expected:
- Section headers include `# cpalaka-claude-skills`, `## Install`, `## Skills I've authored`, `## 3rd-party skills I use`, `## License`.
- No marker leftover, no placeholder leftover.
- No `MISSING:` lines (every `./...` link resolves on disk).

Fix any failing check inline.

- [ ] **Step 6: Commit**

Run:
```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: add README

Cover authored skills (godot-personal-gotchas, init-godot-claude-project,
sync-godot-skills), an install snippet, and a hand-curated list of the
3rd-party skills currently installed.
EOF
)"
```

---

## Task 8: Push to GitHub (CONFIRMATION CHECKPOINT)

**Files:** none modified locally. This task creates a public GitHub repo and pushes to it.

⚠️ **STOP — confirm with the user before running these steps.** Creating a public repo is hard to reverse (search engines, archives may index even short-lived public repos). Verify:

1. The repo name on GitHub: `cpalaka-claude-skills`.
2. The owner / GitHub account.
3. That every commit so far should be public (`git log --oneline` for the user to skim).
4. That visibility is public (not private).

Only proceed after the user explicitly approves all four.

- [ ] **Step 1: Confirm the local history is what the user wants public**

Run:
```bash
git log --oneline
git ls-files
```

Expected `git ls-files` output (alphabetical):
```
.gitignore
LICENSE
README.md
godot-personal-gotchas/SKILL.md
init-godot-claude-project/SKILL.md
init-godot-claude-project/templates/...    # multiple files
sync-godot-skills/SKILL.md
```

No `docs/` paths anywhere. No `.DS_Store` anywhere.

If `docs/` or `.DS_Store` appears: STOP. Something is wrong with `.gitignore` or an earlier commit. Investigate and fix before continuing.

- [ ] **Step 2: User approval gate**

Stop here and ask the user:

> "About to create `https://github.com/<your-handle>/cpalaka-claude-skills` as a **public** repo and push the current local history (run `git log --oneline` to review). Confirm to proceed."

Do not proceed without an explicit "yes" or equivalent.

- [ ] **Step 3: Create the GitHub repo and push**

Run (replace `<your-handle>` with the user's actual GitHub handle if `gh` doesn't auto-detect):

```bash
gh repo create cpalaka-claude-skills --public --source=. --remote=origin --push --description "Personal collection of Claude Code skills (Godot-focused) plus a tracker of 3rd-party skills in use."
```

Expected: command prints the new repo URL and reports the push succeeded.

- [ ] **Step 4: Verify**

Run:
```bash
gh repo view --web 2>/dev/null || gh repo view
git remote -v
git log --oneline @{u}.. && echo "AHEAD" || echo "IN SYNC"
```

Expected:
- Repo view shows the README rendered.
- `git remote -v` shows `origin` pointing at the new GitHub URL.
- Last command reports `IN SYNC` (local matches remote).

---

## Success criteria

(From spec, restated here for fresh-eyes verification:)

- [ ] Cloning the repo from GitHub and running the install snippet for any of the three authored skills produces a working skill in `~/.claude/skills/`.
- [ ] README's 3rd-party section lists every currently installed non-built-in skill exactly once, with a working upstream link and a 1-line note.
- [ ] `LICENSE` is present and is standard MIT text.
- [ ] `.gitignore` is present.
- [ ] No build steps, no CI, no `CONTRIBUTING.md`, no `CHANGELOG.md`, no badges.
- [ ] `git ls-files` shows no `docs/` paths and no `.DS_Store`.
