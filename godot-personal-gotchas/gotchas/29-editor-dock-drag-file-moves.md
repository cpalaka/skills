### 29. Directory reorgs: godot-ai has no file-move op — USER dock-drag rewrites `ext_resource` paths but NOT bare `preload()` strings

**Symptom**
A scripts/scenes reorganization needs files moved into new directories. godot-ai `filesystem_manage` exposes no move/rename op (on 3.1.3 its four ops are `read_file`/`write_file`/`reimport`/`scan_filesystem` — `search_filesystem` lives under the *project* handler, not this one; either way there is still no move), and moving files outside the editor (`mv`, Finder, Write-to-new-path + delete) leaves every `ext_resource` path, `.uid` sidecar, and `preload()` string pointing at the old location.

**Cause**
Dependency-safe moves are an editor FileSystem-dock operation — the dock's drag is what triggers the engine's dependency-rewrite pass. godot-ai simply has no verb for it, and out-of-editor moves bypass the rewrite entirely.

**Fix**
- Have the **USER drag the files in the editor FileSystem dock**. The drag auto-rewrites all uid-keyed `ext_resource` `path=` entries across `.tscn` + `.tres` (uids stay byte-identical), carries the `.uid` sidecars along, and re-points the `class_name` cache via the editor's own scan (no #13 brand-new-dir reimport trap — the editor creates the dirs itself).
- It does **NOT** rewrite bare `preload("res://…")` string paths — afterwards run `grep -rn 'preload(' scripts/ tests/` and hand-fix any stale paths.
- Benign side effect: the editor may re-serialize a touched `.tres` and drop optional `load_steps` hints — not corruption.

**Detect proactively**
Any task that says "move/reorganize files": plan a USER dock-drag step plus a post-move `preload(` grep up front; never reach for `mv` or Write-to-new-path on referenced files.

**Confirmed by**
2026-06-04 — `circle-combat-prototype` scripts/ reorg into system-map-mirrored subfolders (merge `7e857ae`, ADR-0019). The dock-drag rewrote all 14 uid-keyed `ext_resource` paths (main.tscn + library.tres, uids byte-identical); 26 bare `preload()` strings across 2 scripts + 10 test files needed hand-fixing; editor re-serialization dropped library.tres's optional `load_steps` hint. See memory `scripts-reorg-layout.md`.

2026-06-18 — re-confirmed on **Godot 4.7** (live): the actionable trap holds — a FileSystem-dock drag leaves bare `preload("res://…")` strings **unrewritten** (they break; `grep` + hand-fix), and the `.uid` sidecar moves with the file. The 4.7 move confirmation is a plain "Move 1 selected item to …" dialog (Cancel/OK) — no separate "update dependencies" prompt. (The uid-keyed `ext_resource` auto-rewrite half wasn't directly re-opened this pass, but the move proceeded normally and the uid carried.)
