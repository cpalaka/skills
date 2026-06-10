### 7. `docs/` folder auto-imports non-code files as game resources

**Symptom**
- Drop an `.svg`, `.png`, `.glb`, or other importable file into a documentation folder (e.g. `docs/architecture.svg`).
- Godot generates a sibling `architecture.svg.import` file the next time the editor scans.
- The file appears in the FileSystem dock as if it were a game asset.
- The file would get packaged into game exports.

**Cause**
Godot scans the entire project root (everything under `res://`) for importable files. There is no special-casing for `docs/`, `notes/`, `README/`, etc. — any folder is fair game.

**Fix**
Drop an **empty** file named **`.gdignore`** (note: **not** `.godotignore` — that's a common wrong guess, and Godot silently ignores files with the wrong name) into the folder. Godot then:
- Skips imports for that folder entirely
- Hides the folder from the FileSystem dock
- Refuses `load()`/`preload()` of paths under it
- Speeds up project scanning

After adding `.gdignore`, delete any already-generated `.import` siblings — they won't be regenerated.

**Important constraints**
- File must be **completely empty**. `.gdignore` does NOT support `.gitignore`-style patterns or comments.
- To ignore selectively, organize so the ignored content lives under its own subfolder.
- On Windows, create the file with trailing dot (`.gdignore.`) — Explorer removes it on confirm.

**Detect proactively**
When adding any non-code file to a docs/notes folder, drop `.gdignore` in that folder up front. Especially relevant for: mermaid renders, design mockups, captured screenshots, exported `.glb` references in docs.

**Confirmed by**
2026-05-26 — `docs/architecture.svg` (rendered from `architecture.mmd`) caused Godot to generate `docs/architecture.svg.import` and `docs/architecture.png.import` on next editor scan. User intuited `.godotignore` was the answer; the actual filename is `.gdignore` per https://docs.godotengine.org/en/stable/tutorials/best_practices/project_organization.html.
