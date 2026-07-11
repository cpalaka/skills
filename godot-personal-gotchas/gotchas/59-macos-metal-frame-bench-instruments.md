### 59. Benching GPU/frame cost on macOS Metal: three instruments silently lie

**Symptom**

Trying to measure a change's GPU/present cost (an A/B bench of a render feature) on macOS
Metal, every obvious instrument returns garbage with no error:

1. `RenderingServer.viewport_get_measured_render_time_gpu(rid)` (after
   `viewport_set_measure_render_time(rid, true)`) returns **0.0 for every viewport, every
   frame** — the API exists and accepts the calls, it just never measures.
2. `Performance.TIME_PROCESS` is **not a wall clock even uncapped**: with `Engine.max_fps = 0`
   and `DisplayServer.window_set_vsync_mode(VSYNC_DISABLED)`, it read ~15 ms/frame while
   actual throughput was ~363 fps (~2.8 ms/frame, self-evident from sample count ÷ window).
   At vsync it is present-paced (~16.7 ms floor) — GD-04 already documented that half.
3. A sequential A/B split (30 s phase A then 30 s phase B) produces wildly different
   run-to-run results — one run showed the *lighter* phase at 93 fps with p95 pinned at
   exactly 16.67 ms: **macOS occlusion/background throttling** (window covered, app
   deprioritized) re-imposed pacing mid-run and confounded whichever phase it landed on.

**Cause**

(1) GPU timestamp queries are unsupported/unimplemented on this Metal stack — the editor
profiler's GPU column shows the same zeros. (2) `TIME_PROCESS` measures the process step
including engine-internal waits, not frame wall time. (3) macOS throttles occluded/background
windows independently of the app's vsync setting, and a CLI-launched Godot window is easily
occluded.

**Fix**

- **Wall frame clock = the `_process(delta)` parameter itself**, uncapped + vsync off. It is
  self-validating: `samples / window_seconds` must equal the observed fps.
- **Interleave short alternating phases** (e.g. 6 × 10 s A/B/A/B/A/B, aggregate by parity)
  instead of one long split — environment drift then cancels within a single run.
- Keep the GD-04 `work_ms` instrument (first `physics_frame` → `RenderingServer.frame_pre_draw`
  wall µs) for the CPU bar; discard >500 ms hygiene samples and settle frames per phase.
- Save/restore `Engine.max_fps` + vsync mode around the bench.

Reference implementation: space-miner-game `labs/look3d/look_bench.gd`.

**Detect proactively**

Any bench reporting `gpu_ms == 0.00` across thousands of frames, or a `frame_ms` mean that
contradicts `n / window`, is reading a broken instrument — reconcile the frame clock against
the sample count before trusting either phase. A p95 pinned at exactly 16.67 ms with vsync
"off" = pacing crept back in (occlusion throttling or embedded-tab vsync).

**Confirmed by**

space-miner-game task-105.06 two-clock bench (2026-07-11, Godot 4.7.stable, M-series macOS):
three methodology iterations committed in `look_bench.gd`; final numbers work_ms p95 0.23/0.59,
frame 2.69/2.81 ms at ~1100 fps uncapped.
