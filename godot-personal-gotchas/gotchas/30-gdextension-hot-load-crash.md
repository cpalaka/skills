### 30. Installing a GDExtension while the editor is running crashes the editor instantly — server-level extensions can't hot-load

**Symptom**
Copied a new GDExtension addon (godot-rapier2d, a PhysicsServer2D replacement) into `addons/` while the Godot 4.6.2 editor had the project open. The editor's filesystem watcher picked it up, wrote the extension to `.godot/extension_list.cfg`, then the editor process died instantly — no error dialog, no crash report, just gone.

**Cause**
Physics-server extensions (and other server-level extensions: rendering, audio) register at the Servers init stage, which only happens at process startup — they cannot hot-load into a running editor. The filesystem watcher's attempt to load the extension mid-session kills the process.

**Fix**
- **Close the editor before dropping any `.gdextension` addon into the project** — especially server-level extensions (physics, rendering, audio).
- If the crash already happened: the `extension_list.cfg` registration the dying editor leaves behind is actually valid — the next launch loads the extension correctly at the proper init stage. No cleanup needed; just relaunch.

**Detect proactively**
Before any `cp`/`mv`/unzip that lands a `.gdextension` under `addons/`, check for a running editor (`ps aux | grep -i godot`) and close it first. Also verify any GDExtension install/upgrade with a headless editor boot (`godot --headless -e --quit --path .`) before trusting it in the GUI editor — a bad binary can SIGBUS the editor at extension init (seen with godot-rapier2d v0.8.33 on the 4.6.2 macOS editor).

**Confirmed by**
2026-06-10 — `juice-tests`, editor PID 27794 died seconds after `cp -R godot-rapier2d addons/` with the project open; `.godot/extension_list.cfg` contained the new entry; subsequent CLI boots loaded the extension fine (godot-rapier2d v0.8.32, Godot 4.6.2).

2026-06-18 — Godot 4.7 migration note (from the 4.7 audit; source-grounded, NOT live-tested — the crash test was deliberately skipped): **no general GDExtension ABI break in 4.7.** Extensions targeting an earlier 4.x minor load in later minors (Godot's forward-compat policy; `extension_api.json` adds functions while preserving existing ABI). godot-rapier2d **0.8.32** declares `compatibility_minimum = 4.6` in its `.gdextension`, so it loads on 4.7 **without recompile**. The hot-load *crash* mechanism above is architectural (server-level extensions register only at init) and is expected to be unchanged on 4.7 — still close the editor before dropping a `.gdextension`. Recompile is needed only to USE new 4.7 APIs, OR if an extension *reimplements* one of three 4.7-drifted engine virtuals — notably `PhysicsServer2DExtension._body_set_shape_as_one_way_collision()` gained a `direction` param (relevant to physics backends like Rapier; not verified whether Rapier overrides it).
