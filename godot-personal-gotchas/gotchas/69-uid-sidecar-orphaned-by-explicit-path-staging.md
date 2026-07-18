### 69. Explicit-path git staging orphans the `.uid` sidecar — the `.gd`/`.gdshader` gets committed, its `.uid` twin doesn't, and a fresh clone mints a mismatched `uid://`

**Symptom**
A new script or shader works fine locally and its `.tscn`/`.tres` references resolve — but a fresh clone (or another machine/CI) regenerates a *different* `uid://` for that file, silently breaking the `uid://` refs baked into tracked scenes/resources (missing-dependency errors, or a scene loading a *stale* resource). `git status` on the working repo shows the `.uid` file sitting untracked (`??`) next to its committed source. Nothing errors on the machine that authored it, because that machine already has the matching `.uid` on disk.

**Cause**
Godot 4.4+ writes a `.uid` sidecar per script/shader and bakes the `uid://` (not the file path) into `[ext_resource]` refs in scenes/resources. A disciplined staging habit — `git add <explicit file>`, never `git add <dir>/` (which exists to avoid sweeping in a concurrent session's strays / editor droppings) — names only the source file when you commit a newly-created `.gd`/`.gdshader`, so the auto-generated `.uid` twin never enters the commit. A clone that lacks the `.uid` has Godot generate a brand-new one on first import; it doesn't match the `uid://` the committed scenes still point at.

Distinct from #19 / #38, which are godot-ai *failing to serialize `uid=` into a `.tscn`* at save time (an MCP-writer timing bug where the sidecar doesn't exist yet). Here the `.uid` sidecar exists on disk and is correct — it just never got staged.

**Fix**
Stage the `.uid` sibling(s) alongside every new `.gd`/`.gdshader` in the same commit, by explicit path:
```sh
git add src/foo.gd src/foo.gd.uid src/bar.gdshader src/bar.gdshader.uid
```
To repair an already-orphaned set, commit the loose `.uid` files by path (they're plain one-line `uid://...` files, safe to add):
```sh
git status --porcelain '*.uid'        # list orphans
git add <each .uid by path> && git commit
```
The repo convention is to **track** `.uid` files (they carry the identity that scene refs depend on) — confirm the repo isn't gitignoring them before assuming they're meant to be loose.

**Detect proactively**
Before committing any change that adds a new script/shader, scan for orphaned twins:
```sh
git status --porcelain '*.uid'        # any '??' *.uid near your write paths → stage it
```
After creating a `.gd`/`.gdshader` (Write tool, godot-ai `create_script`, or the editor), stage its `.uid` in the same breath as the source. This is the git-staging counterpart to #19's "and `git add` the new `.uid`" note — that line fires even when the sidecar already exists on disk.

**Confirmed by**
2026-07-18 — space-miner-game: the LAB-C far-register port (`f1b9d64`, task-112) staged its `far_*.gdshader` / `.gd` / `.tres` sources by explicit path and left all 9 `far/…​.uid` twins untracked; they surfaced as loose `??` files days later and were swept into `fcf2049`. Sibling `.uid` files in the same folder were already tracked (145 `.uid` files tracked repo-wide), so the omission was a staging miss, not a policy choice. See #19 (uid-omission) and #38 (uid brand-new fswatcher) for the *serialization*-side counterparts.
