---
name: stem-split
description: Split a song into four production-ready stems (vocals, drums, bass, other) as 24-bit WAV for Ableton, via a chained Mel-Band Roformer + htdemucs_ft pipeline. Use when asked to separate or extract stems, isolate or remove vocals, or produce an acapella or instrumental from a track.
---

# Stem splitting

`stemsplit.sh` runs the whole pipeline. Your job is the judgement around it: picking the right source file, then reading the verification back honestly.

```bash
~/.claude/skills/stem-split/stemsplit.sh "/path/to/song.flac"
```

Output lands in `~/Music/stems/{artist}/{title}/` as `vocals.wav`, `drums.wav`, `bass.wav`, `other.wav`. Artist and title come from the file's tags, falling back to the filename with any leading track number stripped. Override with `--artist NAME` / `--title NAME` when the tags are wrong or absent.

Runtime is roughly 90 seconds for a 4-minute track on Apple Silicon.

## Why chained

Roformer isolates vocals far better than demucs (12.6 vs 9.9 SDR) but only ever emits two stems. Demucs is the only one that splits drums from bass from everything else. So Roformer goes first and takes the vocal out, then demucs splits an instrumental that no longer has a vocal in it to smear into the guitars.

Measured on the reference track: after the Roformer pass, the vocal residue left in the instrumental sits at −73.8 dB, against −23.6 dB for the vocal in the original mix.

## Choosing the source

Separation quality is bounded by the source, and the models amplify codec artifacts, so **lossless in, lossless out**.

- Search for a FLAC or WAV before settling for an mp3, checking mounted network shares and external volumes under `/Volumes` as well as the local library. A music library often holds a lossy copy of a track that exists lossless elsewhere, so a filename hit locally is not the end of the search.
- Network mounts return corrupt reads of intact files, and the OS caches the bad copy — so it hashes stable for minutes while the file's own mtime never moves. The script decodes its staged copy and re-copies up to three times, which handles this silently. When it gives up anyway, suspect the mount rather than the file, and confirm by re-reading a few minutes later.
- When only a lossy source exists, run it and say so in the report — the stems are usable, they just carry swirly high-end that is the codec's fault rather than the model's.
- Report the source's format and bit depth alongside the result, so the user can judge whether a better copy is worth hunting for.

## Options

| Flag | Effect |
|---|---|
| `--six-stem` | Swaps `htdemucs_ft` for `htdemucs_6s`, adding `guitar.wav` and `piano.wav`. Lower quality on the shared four — the trade is breadth for accuracy. |
| `--keep-instrumental` | Also writes `instrumental.wav`, the full vocal-free mix from the Roformer stage. |
| `--no-analyze` | Skips BPM and key detection. |
| `--artist` / `--title` | Override the derived output path. |

## BPM and key

Every run writes `analysis.txt` beside the stems, measured off the stems rather than the mix — beat tracking against isolated drums has no harmonic content to confuse it, and key estimation against bass and harmonic stems has no drum transients smearing the chroma.

Report the BPM as the **set of three** the file gives, not the headline figure. Half and double time fit the same beat grid equally well, so the detector lands on the right pulse at an arbitrary octave: 172.3 on the reference track means the song counts at 86. Point the user at the one that matches how the song feels.

Key is a starting guess. A margin under about 0.10 means it is near-tied with its runner-up — say so rather than stating the key flatly.

## Reading the result

The script prints a verification table. A separation can exit 0 and emit silence, so the table is the evidence that it worked — quote its peak levels rather than reporting success from the exit code alone.

A stem marked `EMPTY` is handed to you to judge, not a failure on its own. An instrumental track legitimately yields an empty vocal stem, and `--six-stem` on a guitar record yields an empty piano one. Say which reading applies given the track. Empty vocals on a song you know has singing means the Roformer stage misfired and is worth re-running.

Two limits worth stating when they matter to what the user is doing:

- **The stems do not sum back to the original mix.** Reconstruction error sits around −31 dB. Treat them as four new sources to balance, not as a decomposition that rebuilds the master.
- **Level statistics say nothing about separation quality.** Bleed between stems is what matters, and it is audible rather than measurable here. When comparing two runs, null one against the other for how *much* changed, and send the user to their ears for whether it got better.

For install repair when a stage fails, read [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md).
