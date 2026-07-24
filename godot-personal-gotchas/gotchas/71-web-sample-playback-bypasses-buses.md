# 71 — Web export plays audio as SAMPLE type: buses, effects and playback position all go dead

## Symptom

A web (HTML5) build appears to have completely broken audio when measured from inside the
engine, while the browser is in fact producing sound normally:

- An `AudioEffectCapture` on the Master bus receives a continuous stream of buffers at the
  real-time rate (hundreds of thousands of frames) in which **every sample is exactly 0.0**.
- `AudioStreamPlayer.get_playback_position()` advances by exactly **one mix block and then
  freezes** — e.g. pinned at `0.0026666...` s, which is 128 frames at a 48 kHz context.
- Any `AudioEffect` on any bus does nothing.
- There is **no error, no warning, and nothing in the browser console**; `pageErrors` is empty.
- The same project run natively (`--audio-driver CoreAudio`) plays perfectly: position runs to
  the full stream length and the capture sees the real waveform.

The natural (wrong) conclusion is "Godot web audio is broken" or "the browser suspended the
AudioContext". Both are false — the AudioContext reports `state: "running"` with an advancing
`currentTime`, and a tap on the context's `destination` shows real non-zero output.

## Cause

Godot 4.3+ introduced `AudioServer.PlaybackType` and **defaults the web platform to
`PLAYBACK_TYPE_SAMPLE` (2)**. Sample playback hands the buffer to the browser's Web Audio
implementation to play directly, for lower latency and less crackling. The documented
trade-off is the whole engine-side signal path:

> "AudioEffects are not supported when playback is considered as a sample."

Because the audio never traverses Godot's own bus graph, an `AudioEffectCapture` on Master
legitimately captures silence, and the engine has no per-frame playback cursor to advance, so
`get_playback_position()` stalls after the initial block. Both instruments are structurally
blind rather than reporting a failure — which is why the failure is silent.

**The project setting is not a reliable lever.** Writing
`audio/general/default_playback_type.web=1` into `project.godot` did **not** change the
behaviour of players left at `PLAYBACK_TYPE_DEFAULT` (measured: `ProjectSettings.get_setting`
read back `1`, yet those players still behaved as samples).

## Fix

Set the playback type **on the individual player**, which does work:

```gdscript
player.playback_type = AudioServer.PLAYBACK_TYPE_STREAM
```

Do this for any `AudioStreamPlayer` whose `get_playback_position()` you intend to read (music
synchronisation, rhythm timing) or that must route through a bus effect (ducking, reverb, a
mixer-driven volume bus). Accept the documented latency/crackle cost for those players only,
and leave one-shot SFX on the default sample path.

Verified side by side in one web build: of three players, only the one with the explicit
`PLAYBACK_TYPE_STREAM` override advanced its position (0.344 s of a 0.35 s stream) and
delivered non-zero PCM to the Master-bus capture (peak 0.599); the two left on the default
stayed frozen at 0.0026666 s with a silent capture.

## Detect proactively

- Any web-targeting project that reads `get_playback_position()` for synchronisation, or that
  relies on bus effects / bus volume, without setting `playback_type` explicitly. A rhythm or
  step-synced game is the high-risk case.
- Any automated web smoke test that asserts audio via an engine-side meter
  (`AudioEffectCapture`, bus peak, playback position). **These instruments cannot prove web
  audio either way.** Measure the browser instead: wrap `AudioContext` before the engine
  constructs one, interpose a `GainNode` + `AnalyserNode` in place of `destination`, and read
  `getFloatTimeDomainData` — everything the page outputs must pass through that tap.
- `AudioServer.get_bus_peak_volume_left_db()` is likewise not usable as a web audio check.

## Confirmed by

gmtk-26 wayfinder ticket 01 (2026-07-22), Godot 4.7.stable, Chrome (headless and headed,
identical results), both `variant/thread_support=true` and `false` — thread support is not the
variable. Native CoreAudio run of the identical scene was audible with working position and
capture, isolating the behaviour to the web platform's sample playback default.
