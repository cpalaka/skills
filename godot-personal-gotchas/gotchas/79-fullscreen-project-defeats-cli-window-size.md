# 79 — A project set to fullscreen captures screenshots at a NON-DETERMINISTIC size, and no CLI flag pins it

## Symptom

The same `godot --path . <scene>` command line, run twice in a row with nothing else changed, writes
screenshots at **different pixel dimensions and different aspect ratios**. Nothing errors, nothing
warns, and each individual capture looks perfectly fine on its own.

Measured (macOS, Godot 4.7, space-miner-game task-137), three identical launches:

```
[a3d] shot size 3456x2160
[a3d] shot size 1920x1080
[a3d] shot size 3456x2160
```

`3456x2160` is the display's native retina framebuffer (1728×1080 points at 2× backing scale, 16:10).
`1920x1080` is the project's own `window/size/viewport_width`/`_height` at 1× (16:9). The two differ
in **aspect ratio**, not just scale — which is what makes this bite.

Adding the CLI flags that are supposed to control this does **not** fix it:

```
godot --path . --windowed --resolution 1600x900 <scene>
  -> [a3d] shot size 3456x2160     # flags ignored
  -> [a3d] shot size 1600x900      # flags honoured
```

Two launches, same flags, different outcome.

## Why it bites

Any workflow that compares two screenshots taken from **two separate processes** is silently
invalid. A pixel diff across 3456×2160 and 1920×1080 cannot distinguish the change you are looking
for from a reframe — and because the tool "works" (it produces a diff image and a differing-pixel
count), the result reads as a measurement rather than as noise. The failure is in the instrument,
not in the thing being measured, which is the class of error that survives review.

This bit an A/B comparison of a merged vs. split mesh render: the two frames were captured by two
launches, came out at different aspect ratios, and the resulting "51,589 differing pixels" was
meaningless until both frames were captured from one process instead.

## Cause

The project sets a non-windowed startup mode:

```ini
[display]
window/size/viewport_width=1920
window/size/viewport_height=1080
window/size/mode=3                  # 3 = Window.MODE_FULLSCREEN
```

`window/size/mode=3` asks for a fullscreen window. On macOS that transition is asynchronous and
depends on state outside the process (which Space the window opens on, whether it takes focus,
whether another app is fullscreen). Whether it has completed by the frame you capture is therefore
**not deterministic**, and `get_viewport().get_texture().get_image()` returns whichever framebuffer
is current at that moment — native retina pixels if fullscreen landed, the configured viewport size
at 1× if it has not.

`--windowed` / `-w` / `--resolution` set the *windowed* geometry. They do not reliably win against
the project's own mode setting, as the second measurement above shows: the same flags were honoured
on one launch and ignored on the next.

Note the 1× vs 2× asymmetry — a windowed capture came back at exactly the requested `1600x900`, not
`3200x1800`. The hidpi backing scale attaches along with the fullscreen transition, so the two
outcomes differ in scale *and* framing.

## Fix

**Capture every frame you intend to compare from ONE process.** This is the only reliable fix, and
it is reliable for the right reason: one process means one window, one backing scale, one camera.
Drive the state change (split the mesh, toggle the effect, advance the sim) between two captures in
the same run rather than relaunching:

```gdscript
# A capture that does NOT tear the stage down, so a second frame can follow it.
func _capture_still(path: String) -> void:
    await RenderingServer.frame_post_draw
    var img := get_viewport().get_texture().get_image()
    img.save_png(path)
```

Supporting measures, none of which are sufficient alone:

1. **Print the size with every capture** — `print("shot size %dx%d" % [img.get_width(), img.get_height()])`.
   Without it the variance is invisible; a screenshot does not announce its own dimensions, and a
   thumbnail at either size looks correct.
2. **Assert the two frames match before diffing them.** A comparison tool that accepts mismatched
   dimensions will happily produce a confident, meaningless number. Fail instead.
3. If you genuinely need cross-process captures, set the mode from script at startup
   (`DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)` then
   `window_set_size(...)`) and wait for it to settle before the shutter — but see **#01**, which
   makes `window_set_mode` a silent no-op when the game runs in the editor's embedded Game tab.

## Detect proactively

- Any screenshot-comparison tool, script, or agent workflow that launches the game **more than once**
  and diffs the results. The launches do not have to be adjacent — a "before" captured last week and
  an "after" captured today have the same problem.
- A `project.godot` carrying `window/size/mode` set to anything other than `0` (windowed), in a
  project that also has a screenshot/regression-capture path.
- A capture helper that does not print or assert the image dimensions.
- A diff report quoting a differing-pixel count without also quoting both source dimensions — the
  count is uninterpretable without them.

Not expressible as a repo grep with an acceptable false-positive rate (it depends on how a tool is
*invoked*, not on what any file contains), so no `precommit-scan.sh` check is planted for it — the
detection above is a review-time read, deliberately.

## Confirmed by

space-miner-game, 2026-07-25 (task-137 A3D-WS2c, stage 7). First surfaced in stage 6 as a wrong
cause — "the window's retina backing scale varies per launch" — which was recorded in a code comment
before being verified. Re-measured at stage 7: the varying quantity is the window **mode**, not the
backing scale alone, and `--windowed`/`--resolution` were shown non-deterministic too. Both the
harness comment and this entry were corrected from the same measurement.
