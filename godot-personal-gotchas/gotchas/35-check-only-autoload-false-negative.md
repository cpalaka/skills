### 35. `--check-only --script` falsely fails any autoload-referencing script with `Identifier not found: <AutoloadName>`

**Symptom**
- `godot --headless --check-only --script <file.gd> --quit --path .` fails with `SCRIPT ERROR: Compile Error: Identifier not found: <AutoloadName>` (plus `Failed to compile depended scripts` for its dependents) on a script that references a project autoload (e.g. `Feel.v("key")`).
- The autoload IS correctly registered in `project.godot`'s `[autoload]` section, and the same script compiles and runs flawlessly in a real game boot and at F5.
- A false negative of the check-only harness, not a real defect.

**Cause**
Autoload singletons are registered as compile-time-resolvable globals only when the full game/SceneTree initializes. `--check-only --script` parses/compiles the one script WITHOUT initializing the SceneTree (so it never registers project autoloads), and any autoload identifier fails to resolve in that mode.

**Fix** — correct verification routes for autoload-referencing scripts:
- Bounded full headless boot of a scene that loads the script: `godot --headless --path . res://scenes/main.tscn --quit-after 30 2>&1 | grep -E "SCRIPT ERROR|Failed to load"` — empty output = clean, **but only once calibrated**. A healthy boot of this shape prints almost nothing, so "no matches" and "the scene never loaded" are the same reading; and the process exits **0** even with a planted parse error, so never let `$?` into the verdict (#27). Before believing a clean run, plant a syntax error in a script that scene *actually loads*, confirm the grep reds, revert — calibrating in a file the run never mounts proves nothing. Also check the engine flags are to the LEFT of any `--` separator: past it they are handed to the application and silently discarded (#72), so the run is never bounded at all.
- Or read the open editor's log: `mcp__godot-mcp__godot_editor get_log_messages source="editor"`.
- Keep `--check-only --script` for autoload-FREE scripts only (pure-logic files) — there it remains a fast, reliable parse check.

**THE COMPLEMENT — do not skip it; this entry is routinely over-read into a false conclusion.** Everything above is about the **compile-time global**. It does NOT mean "headless runs have no autoloads". A `--script` run whose script **extends `SceneTree`** — the normal shape for a headless test harness — builds a real SceneTree, and Godot **registers every `[autoload]` singleton as a live node at `/root/<Name>`**. Measured 2026-08-02, space-miner-game, Godot 4.7-stable, a plain `--headless --path . --script res://probe.gd`:

```
PROBE root-node Game:      Game:<Node#32128370135>
PROBE root-node BalanceDB: BalanceDB:<Node#29427238355>
PROBE /root children:      ["GameEvents", "BalanceDB", "AudioDirector", "Game", "SaveService", ...]
```

So the split is: **bare identifier — absent at parse time. Node at `/root/<Name>` — present at run time.** Reach them by path and they work:

```gdscript
var game := get_root().get_node_or_null("Game")   # works under --script
# Game.something                                   # does NOT compile under --check-only --script
```

Reading only the first half of this entry makes tests re-derive state or skip coverage that was available all along — measured in space-miner-game, where one test's header asserted the limitation while a sibling test had been using the real autoload by path for weeks. `preload("res://…/game.gd").new()` is NOT the workaround (it fails "Nonexistent function 'new' in base 'GDScript'"); node-path access is the working route. The "a bare `--script` run ALSO fails" note under *Confirmed by* is about the **identifier**, and is not a claim about `/root`.

**Detect proactively**
Before reaching for `--check-only --script` on a file, check it for references to any name in `project.godot`'s `[autoload]` section — any hit means check-only will false-fail; route through the bounded-boot check instead. Don't confuse with #34 (`op=reimport` stale-log): same `Identifier not found: <AutoloadName>` text, but #34 is transient append-only editor-log noise after a reimport, while this is structural to check-only mode and fires on every run.

**Confirmed by**
2026-06-12, `maw-prototype` Stage 1 (Godot 4.6.2) — `scripts/tuning_panel.gd` and `scripts/main.gd` (both reference the `Feel` autoload) failed check-only with `Identifier not found: Feel` while the same commit's 30-frame headless boot and F5 run were clean.

2026-07-25 — **re-verified live on Godot 4.7.stable**, with a proper control. `--headless --check-only --script` on a script referencing an `[autoload]` fails `Compile Error: Identifier not found: MyAuto`; the same project booted through its real `run/main_scene` prints `MyAuto.ping() -> pong`. Note the near-miss: a bare `--script` run (no main scene) ALSO fails, because it builds no SceneTree either — it is not a valid control for this entry. Only a main-scene run is.
