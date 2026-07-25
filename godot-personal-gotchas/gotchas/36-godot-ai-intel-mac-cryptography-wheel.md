### 36. godot-ai MCP server won't launch on Intel macOS — `cryptography` 49 has no x86_64 wheel + ancient Rust

**Status:** retired 2026-07-25 — this machine completed the arm64 migration on 2026-06-20;
`/usr/local/Homebrew` (Intel Homebrew) is uninstalled, so the x86_64 path this entry describes
is unreachable here. The arm64 sibling #37 remains LIVE. Un-retire if an Intel Mac re-enters
the fleet.

**Symptom**
The godot-ai editor dock shows "The server exited before the WebSocket handshake" (even after a `uvx --refresh` retry, with a "brand-new release / PyPI propagating" hypothesis). `/mcp` shows it disconnected; ports 8000 (HTTP/MCP) and 9500 (WebSocket) stay free — the Python server process never starts. A direct `uvx` run shows `Building cryptography==49.0.0` → `Failed to build` (`cargo metadata`: `invalid type: map, expected a sequence for key 'package.authors'`). The dock's "brand-new release" hypothesis and "downgrade the godot-ai addon" are BOTH red herrings.

**Cause**
Version-INDEPENDENT three-part environment trap: (1) the machine is Intel / x86_64 macOS; (2) `cryptography==49.0.0` ships NO x86_64-macOS wheel (uv reports "no usable wheels" on every Python 3.11–3.14), so uv builds it from source; (3) the source build needs cargo ≥1.64 (workspace inheritance, Sept 2022) but the toolchain is cargo/rustc 1.43.1 (May 2020), so `cargo metadata` fails, maturin's `build_wheel` returns non-zero, uv aborts, and the server never starts. Dependency chain: godot-ai → `fastmcp` 3.4.2 → `fastmcp-slim[client]` → `authlib` 1.7.2 → `cryptography` 49.0.0 (uv picks the newest cryptography satisfying authlib; godot-ai declares only a range). godot-ai 2.7.4 fails identically — `pyproject.toml` differs from 2.7.5 only in the version string.

**Fix**
Constrain `cryptography<49` → uv resolves `48.0.1` (the last version WITH an x86_64-mac wheel), still satisfying authlib 1.7.2 + fastmcp 3.4.2; the whole 67-package tree installs wheel-only (no Rust, no native build — `Installed 67 packages in 152ms`). The dock spawns `uvx` as an editor child and uvx honors `UV_CONSTRAINT`:
1. Put `cryptography<49` in `~/.config/godot-ai/constraints.txt`.
2. Launch the editor with the var scoped to the Godot process tree: `UV_CONSTRAINT="$HOME/.config/godot-ai/constraints.txt" /Applications/Godot.app/Contents/MacOS/Godot --path . -e` (a terminal launch / wrapper scopes it).
3. Reload Plugin in the dock, then `/mcp` to reconnect.

**WARNING:** do NOT `export UV_CONSTRAINT` globally (`~/.zshrc` / `launchctl setenv`) — that pins `cryptography<49` on EVERY uv operation machine-wide and can break an unrelated Python project that needs cryptography ≥49. Keep it scoped to the editor launch. Heavier alternatives: `rustup update` (+ likely Homebrew OpenSSL + env) to build cryptography 49 natively, or move to Apple Silicon (has wheels) — drop the constraint if you do either.

**Detect proactively**
"Server exited before the WebSocket handshake" / "exits before handshake" from an MCP dock almost always means the install/spawn failed, not a networking issue — run the dock's command by hand and read the `uvx` build output before touching ports/firewall/version. For any `uvx`/`uv`-launched tool with a native (Rust/C) extension on Intel macOS, check the suspect transitive dep's wheel availability before blaming a version bump: `uv venv /tmp/t --python 3.13 && uv pip install --python /tmp/t/bin/python --only-binary :all: '<pkg>==<ver>' --dry-run` ("has no usable wheels" → forced source build); then check `cargo --version` (anything pre-1.64 can't build modern crates).

**Confirmed by**
The mechanism was verified 2026-06-17 by uv-resolver inspection (cryptography 49 → "no usable wheels" on x86_64-mac across Python 3.11–3.14; `cryptography<49` resolves 48.0.1, the last x86_64-mac wheel). The end-to-end "exited before handshake → fixed" was actually hit on this dev box as the **Apple Silicon x86_64-toolchain variant (#37)** — the hardware was an M3 Max, not a genuine Intel Mac — so this Intel entry's `UV_CONSTRAINT` fix is the *analyzed pure-Intel sibling* of #37, not a separate on-hardware boot. Environment (per-machine) gotcha, not a code one — unlike the godot-ai writer/RPC-surface entries (#19, #22–#25). Cross-references `docs/godot-mcp-guide.md`.
