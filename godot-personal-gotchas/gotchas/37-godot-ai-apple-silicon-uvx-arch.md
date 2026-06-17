### 37. godot-ai MCP server won't launch on Apple Silicon — `uvx` resolves x86_64 wheels because the Python interpreter is x86_64

**Symptom**
Same godot-ai dock "The server exited before the WebSocket handshake" + `/mcp` disconnected + free 8000/9500 as #36 — but on Apple Silicon (arm64). The dock log (or a direct `uvx` run) shows `Building cryptography==49.0.0` then `Failed to build` (maturin / `cargo metadata`: `invalid type: map, expected a sequence for key 'package.authors'`). Installing a native arm64 `uv` ALONE does not fix it.

**Cause**
uv resolves wheels for the Python INTERPRETER's architecture, not uv's own. If `uvx` selects an x86_64 Python (classic case: Intel Homebrew at `/usr/local` under Rosetta, often inherited via Migration Assistant, sometimes with a years-old Rust), it pulls x86_64-macOS wheels; `cryptography>=49` dropped its x86_64-mac wheel, so uv falls back to a source build that fails on the x86/old toolchain. godot-ai's `CliFinder` resolves the `uvx` binary in order `~/.local/bin` → `~/.cargo/bin` → `/opt/homebrew/bin` → `/usr/local/bin`. Two red herrings: (a) "brand-new release / downgrade godot-ai" — deps are version-independent ranges, so an older godot-ai resolves the same `fastmcp`/`cryptography` and fails identically; (b) a native arm64 `uv` is NECESSARY BUT NOT SUFFICIENT — uv still resolves for the *Python's* arch.

**Fix**
1. Install a NATIVE arm64 `uv` into `~/.local/bin` (CliFinder checks it first): `curl -LsSf https://astral.sh/uv/install.sh | sh` from an arm64 shell; verify `arch` = `arm64` and `file ~/.local/bin/uvx` reports arm64.
2. Force a managed (non-system) Python via `~/.config/uv/uv.toml` → `python-preference = "only-managed"`. (uvx honors this; it does NOT honor `constraint-dependencies` from config — so `UV_CONSTRAINT` is #36's lever, `python-preference` is this one's.)
3. Curate the managed-Python pool to arm64-ONLY. `only-managed` selects the highest-VERSION managed Python regardless of arch, so a leftover higher-version x86_64 managed Python re-breaks it: `uv python uninstall <the x86_64 one>`; `uv python install <current>` (an arm64 uv fetches an aarch64 build); `uv python list --only-installed | grep python` must show ONLY `...aarch64...`.
4. Reload Plugin in the dock (its retry re-runs `uvx` and now succeeds; no full restart needed once the pool is arm64-only).

**Verification discipline:** ALWAYS verify with `--refresh` — a bare `uvx` reuses cache and gives a FALSE pass, while the dock's retry uses `--refresh`: `~/.local/bin/uvx --refresh --from godot-ai==<ver> godot-ai --version` must print the version with NO "Building cryptography". (Bare-uvx false pass caused a false "fixed" during diagnosis.)

**Detect proactively**
"Server exited before the WebSocket handshake" = the `uvx` install/spawn failed, not a network/port/firewall issue — reproduce with the dock's command directly. On Apple Silicon, check toolchain arch before blaming godot-ai: `arch` (should be `arm64`), `file "$(command -v uv)"`, `file "$(python3 -c 'import sys;print(sys.executable)')"` — an x86_64 `uv`/`python3` (resolved under `/usr/local` = Intel Homebrew) is the tell. The same class hits ANY `uvx`/`uv`-launched tool with a native (Rust/C) extension lacking an x86_64-mac wheel. Cross-check a suspect dep's wheel availability: `uv pip install --only-binary :all: '<pkg>==<ver>' --python-platform aarch64-apple-darwin --dry-run` (arm64) vs the default — "no usable wheels" for x86_64 but "Would install" for arm64 confirms arch is the variable.

**Confirmed by**
2026-06-17 — diagnosed and verified end-to-end on this M3 Max (Intel Homebrew under Rosetta); `Installed 67 packages`, server binds `127.0.0.1:8000` + `127.0.0.1:9500`. See memory `godot-ai-x86-toolchain-on-apple-silicon.md`. Environment (per-machine) gotcha, not code. Sibling to #36 (Intel-mac variant — there the box is genuinely x86_64 and the fix is `UV_CONSTRAINT=cryptography<49`; here the fix is a native arm64 uv + a managed arm64 Python). Cross-references `docs/godot-mcp-guide.md`.
