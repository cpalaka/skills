#!/usr/bin/env python3
"""Detect BPM and musical key from a finished stem set.

Runs on the stems rather than the mix, which is the whole advantage of doing it
here: beat tracking against isolated drums has no harmonic content to confuse
it, and key estimation against bass + harmonic stems has no drum transients
smearing the chroma.

Usage: analyze.py <stem-dir>   -> writes <stem-dir>/analysis.txt, prints summary
"""
import sys
import os
import warnings

warnings.filterwarnings("ignore")
import numpy as np
import librosa

# Krumhansl-Schmuckler key profiles: averaged listener ratings of how well each
# pitch class fits a key. Correlating a track's chroma against all 24 rotations
# picks the key whose expected weighting best matches what is actually played.
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def detect_bpm(path):
    y, sr = librosa.load(path, sr=None, mono=True)
    if not np.any(y):
        return None, None
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.atleast_1d(tempo)[0])
    # Confidence proxy: how regular the detected beat spacing is. A steady grid
    # gives a low coefficient of variation; a guessed one does not.
    if len(beats) > 2:
        iois = np.diff(librosa.frames_to_time(beats, sr=sr))
        conf = 1.0 - min(1.0, float(np.std(iois) / max(np.mean(iois), 1e-9)))
    else:
        conf = 0.0
    return tempo, conf


def detect_key(paths):
    chroma_sum = np.zeros(12)
    for p in paths:
        if not os.path.exists(p):
            continue
        y, sr = librosa.load(p, sr=None, mono=True)
        if not np.any(y):
            continue
        y = librosa.effects.harmonic(y)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_sum += chroma.mean(axis=1)
    if not np.any(chroma_sum):
        return None, None, None
    chroma_sum /= chroma_sum.sum()

    best = (-2.0, None, None)
    scores = []
    for i in range(12):
        for name, profile in (("major", MAJOR), ("minor", MINOR)):
            r = float(np.corrcoef(chroma_sum, np.roll(profile, i))[0, 1])
            scores.append(r)
            if r > best[0]:
                best = (r, NOTES[i], name)
    # Margin over the runner-up: a clear winner means a confident call.
    scores.sort(reverse=True)
    margin = scores[0] - scores[1] if len(scores) > 1 else 0.0
    return best[1], best[2], margin


def main():
    d = sys.argv[1]
    bpm, bpm_conf = detect_bpm(os.path.join(d, "drums.wav"))
    if bpm is None:  # no drums to track — fall back to whatever carries rhythm
        bpm, bpm_conf = detect_bpm(os.path.join(d, "other.wav"))
    tonic, mode, margin = detect_key(
        [os.path.join(d, s) for s in ("other.wav", "bass.wav", "vocals.wav")]
    )

    lines = []
    if bpm:
        # Beat trackers land on the right pulse at the wrong octave routinely,
        # so give the half and double alongside it. One of the three is the
        # tempo you want, and which one is obvious once you tap along.
        lines.append(f"BPM:  {bpm:.1f}   (or {bpm/2:.1f} / {bpm*2:.1f} - see below)")
        lines.append(f"      beat regularity {bpm_conf:.2f}")
    else:
        lines.append("BPM:  undetected")
    if tonic:
        lines.append(f"Key:  {tonic} {mode}   (margin over next-best {margin:.3f})")
    else:
        lines.append("Key:  undetected")
    lines.append("")
    lines.append("BPM is measured off drums.wav, and is reliable up to its")
    lines.append("octave: half and double time fit the same beat grid equally")
    lines.append("well, so pick whichever of the three matches how the song")
    lines.append("counts. Beat regularity near 1.00 means a steady grid.")
    lines.append("")
    lines.append("Key comes from other/bass/vocals chroma correlated against")
    lines.append("Krumhansl-Schmuckler profiles. It is a starting guess, not a")
    lines.append("verdict - a margin under about 0.10 means it is near-tied")
    lines.append("with its runner-up. Confirm by ear.")

    with open(os.path.join(d, "analysis.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    for line in lines[:2]:
        print(f"    {line}")


if __name__ == "__main__":
    main()
