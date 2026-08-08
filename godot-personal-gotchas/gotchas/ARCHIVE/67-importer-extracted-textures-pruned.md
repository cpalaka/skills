### 67. Mirror-prune deletes importer-EXTRACTED embedded-glb textures; re-import won't bring them back

**Symptom**
- An imported `.glb` that loaded fine starts failing at `load()` with
  `Resource file not found: res://<pack>/<Stem>_<name>.png (expected type: Texture2D)` →
  `Can't load dependency` → `Failed loading resource`, after an asset-dir cleanup /
  mirror-sync / "delete files I didn't put there" pass ran over its directory.
- The `.glb` itself is byte-identical to when it worked; running `--headless --import`
  again reports success but does NOT fix the load.
- Tell: a sync/prune tool earlier reported deleting `<Stem>_<name>.png` (+ its `.import`)
  it "didn't recognize" — the deletion can be several runs before the first failing load,
  so the two events don't look related.

**Cause**
Godot's scene importer, on importing a glb whose glTF images are EMBEDDED (bufferView
images, no external URIs), extracts each image to a real file `<Stem>_<name>.png` next to
the source glb (default `gltf/embedded_image_handling`), imports that png separately, and
makes the imported `.scn` depend on it as an external `Texture2D`. Those generated pngs
live inside the asset directory a sync tool thinks it owns, so strict mirror semantics
("delete anything not in my expected set") classify them as strays and delete them. A
subsequent `--import` does not re-extract: the source glb's md5 is unchanged, so the
importer skips it entirely while its `.scn` still points at the now-missing png.

**Fix**
- Design fix: never give an asset-sync tool strict-mirror prune semantics over a directory
  Godot imports from. Prune only files the tool itself copied (e.g. de-listed model files
  by extension+stem, plus their `.import`/`.uid`); treat everything else — importer
  extractions included — as Godot-managed. (kenney-26 `tools/sync_assets.gd` is the
  reference implementation.)
- Recovery: delete the model's entries under `.godot/imported/` (`<Stem>.glb-<hash>.md5`
  and `.scn`) and re-run `--import` — the md5 removal forces a fresh import, which
  re-extracts the png. Commit the extracted `<Stem>_<name>.png` + `.png.import` alongside
  the glb; they are required runtime deps, not scratch.

**Detect proactively**
Before shipping any tool that deletes files under an imported asset tree, ask: does the
expected-set include files GODOT generates there (`<Stem>_<name>.png` extractions,
`.import`, `.uid`)? If the corpus contains any glb with embedded images (parse: `images`
entries without `uri`), a mirror prune WILL eventually eat its extracted textures — the
first prune after the first import is the destructive one. Grep candidate: a prune/mirror
routine whose expected-set is built only from source-derived paths.

**Confirmed by**
2026-07-17, `kenney-26` (Godot 4.7-stable). KayKit Adventurers `Knight.glb` (fully
embedded buffers+images) imported clean and load-checked 9/9 textured meshes; the sync
tool's mirror prune then deleted `Knight_knight_texture.png` + `.import` (logged as the
mysterious `pruned=2`), after which every `load()` failed and `--import` re-runs were
no-ops. Recovered by deleting the two `.godot/imported/Knight.glb-*` entries + re-import;
prune redesigned to de-listed-model-only in commit `8bf0e24`.
