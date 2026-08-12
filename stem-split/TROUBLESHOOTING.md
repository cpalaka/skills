# Troubleshooting

Both tools carry undeclared or mis-bounded dependencies, so a stage that dies on an import error is usually packaging rather than anything about the audio.

All work happens in `$TMPDIR/stemsplit.$$`, which is removed on success and **kept on failure** so the logs survive — the error message prints the full path to `rf.log` or `dm.log`. Nothing intermediate is ever written beside the output or onto the source volume.

## Setup

Two tools and ffmpeg. On Apple Silicon both pick up MPS/CoreML automatically.

```bash
brew install ffmpeg

# demucs — clone the maintained fork (Meta archived the original in Jan 2025)
git clone https://github.com/adefossez/demucs.git ~/Code/github/demucs
uv venv --python 3.12 ~/Code/github/demucs/.venv
uv pip install --python ~/Code/github/demucs/.venv/bin/python -e ~/Code/github/demucs numpy

# audio-separator — audioread and the librosa bound are both required, see below
uv tool install --python 3.12 --with audioread "audio-separator[cpu]"
uv pip install --python ~/.local/share/uv/tools/audio-separator/bin/python "librosa<1.0"

# Roformer checkpoint (~500 MB, downloads on first run)
mkdir -p ~/Code/github/audio-separator-models
```

Python 3.10+ is required; 3.12 is what this is tested on. Point the script elsewhere with `STEMSPLIT_DEMUCS`, `STEMSPLIT_MODEL_DIR`, `STEMSPLIT_OUT`, `STEMSPLIT_ROFORMER`, `STEMSPLIT_PYTHON` — a `demucs` on `PATH` is found automatically.

The model cache path is passed on every run because the default is `/tmp/audio-separator-models/`, which macOS clears — losing it means re-downloading the checkpoint.

## Known failures

**`ModuleNotFoundError: No module named 'numpy'`** — demucs 4.1.0 imports numpy without declaring it.

```bash
uv pip install --python ~/Code/github/demucs/.venv/bin/python numpy
```

**`ModuleNotFoundError: No module named 'audioread'`** — audio-separator imports it without declaring it.

```bash
uv tool install --python 3.12 --with audioread "audio-separator[cpu]"
```

**`TypeError: get_duration() got an unexpected keyword argument 'filename'`** — audio-separator declares `librosa>=0.10` with no upper bound, and librosa 1.0 removed the deprecated `filename=` kwarg it still passes. This one returns after any `uv tool upgrade` that re-resolves librosa.

```bash
uv pip install --python ~/.local/share/uv/tools/audio-separator/bin/python "librosa<1.0"
```

**`FileNotFoundError: 'ffmpeg'`** — audio-separator shells out to ffmpeg (demucs does not; it decodes via bundled `sphn`).

```bash
brew install ffmpeg
```

## Model choice

`--normalization 1.0` is deliberate. The default of `0.9` rescales any stem peaking above it, which shifts levels away from the source; `normalize()` in `spec_utils.py` only ever attenuates above the threshold and never boosts below it, so `1.0` acts as pure clip protection. Measured on the reference track, it improved reconstruction against the original mix by 3.4 dB.

Browse other checkpoints with:

```bash
audio-separator --list_models --model_file_dir ~/Code/github/audio-separator-models
```

Worth knowing about, all MDXC/Roformer and swappable into `ROFORMER_MODEL`:

| Model | Use |
|---|---|
| `mel_band_roformer_karaoke_aufr33_viperx_sdr_10.1956.ckpt` | Splits lead vocal from backing vocals |
| `deverb_bs_roformer_8_384dim_10depth.ckpt` | De-reverb, as a pass over an isolated vocal |
| `denoise_mel_band_roformer_aufr33_sdr_27.9959.ckpt` | Denoise |
| `MDX23C-DrumSep-aufr33-jarredou.ckpt` | Splits a drum stem into kick, snare, toms, hats, ride, crash |

Model licences vary by author and the tool does not track them. The installed `vocals_mel_band_roformer.ckpt` (Kimberley Jensen) is MIT; check the author's HuggingFace page before adopting another.
