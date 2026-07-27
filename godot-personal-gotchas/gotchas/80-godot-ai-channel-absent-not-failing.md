### 80. `mcp__godot-ai__*` is absent from the tool list with no error anywhere — visual verification silently degrades to "ask the user to F5"

**Symptom**
- No `mcp__godot-ai__*` tools in the session, while `mcp__godot-mcp__*` and `mcp__godot__*` (both stdio) are present and working.
- **There is no error, no warning, and no failed call.** Nothing appears in the transcript, the editor log, or the MCP dock. The tools are simply not in the list.
- `.mcp.json` declares `godot-ai`, `enabledMcpjsonServers` includes it, and `mcp__godot-ai__*` may even be allowlisted in `settings.local.json` — all correct, all irrelevant.
- The downstream tell is behavioural, not diagnostic: an agent that would have screenshotted or `project_run`'d instead asks the human to F5 and report back. On a project whose AC reads `F5: <observable behavior>` with a user sign-off gate, that substitution looks exactly like normal process and is never questioned.

**Cause**
`godot-ai` is an **HTTP** MCP (`http://127.0.0.1:<port>/mcp`) served by a `uvx godot-ai` process that the **editor plugin spawns**. Two consequences compound:

1. No editor open → no server → no tools.
2. Claude Code connects MCP servers **once, at session start**. Opening the editor afterwards does not reconnect that session. Verified 2026-07-26: a session began `01:03:44Z`, the `uvx godot-ai` server started `01:13:55Z` ten minutes later, and `mcp__godot-ai__*` stayed absent for the session's entire life despite correct config.

This is **absence, not failure** — which is why there is nothing to catch. A `PreToolUse` hook cannot intercept a call that is never attempted, and there is no error object anywhere in the pipeline. The stdio MCPs are unaffected because the CLI spawns them itself on demand.

**Diagnostic trap while probing this:** under a sandboxed session (this machine's default) a Bash `curl http://127.0.0.1:<port>/mcp` returns **000**, while the same curl with the sandbox off returns `406` from a live server. That `000` is the **Bash tool's** network restriction, not evidence about the server — and it is *not* what gates the MCP client, which connects from the CLI process itself. Do not conclude "the server is down" from a sandboxed curl; re-probe with the sandbox off, or use the hook below.

A second, distinct state exists: the `uvx godot-ai` child can **outlive a closed editor**, leaving a listener on the port with no editor behind it. Then the tools may connect, but every editor-backed op (`editor_screenshot`, `project_run`, `game_manage`, `logs_read`, `editor_state`) fails or returns stale state. Probing only the port calls this healthy — check the editor process too.

**Fix**
Open the Godot editor **before** starting the session, confirm the godot-ai dock is connected, then start the session. A mid-session fix requires a **new session**; nothing reconnects in place.

**Detect proactively**
The `godot-ai-channel-check.sh` SessionStart hook (`~/.claude/hooks/`, registered in `~/.claude/settings.json`) makes the absence explicit. It probes both halves — editor process AND port listener — and reports `OK` / `DEGRADED` / `ABSENT`, emitting **nothing** when healthy or when the project does not declare `godot-ai`. Agent-callable modes:

```sh
bash ~/.claude/hooks/godot-ai-channel-check.sh --check            # status
bash ~/.claude/hooks/godot-ai-channel-check.sh --alert "<reason>" # desktop alert
```

`--alert` prints `DESKTOP ALERT DELIVERED.` or `DESKTOP ALERT **NOT** DELIVERED` — **read which**. Under a sandboxed session (this machine's default) `osascript display notification` cannot reach StandardAdditions and exits 1, so no notification fires; retry with the sandbox off if the sound matters, and never imply the user was pinged when the line says NOT DELIVERED.

**The behavioural rule this exists to enforce:** if the task's verification is visual or runtime — AC of the form `F5: <observable behavior>`, a screenshot check, a feel/look verdict, or any claim that a scene renders or a runtime surface responds — and the channel is `ABSENT`/`DEGRADED`, then **fire `--alert` and STOP.** Tell the user the channel is down and wait. Do **not** silently substitute "I'll ask the user to F5", and do **not** record the surface as verified. Ordinary GDScript / headless-test / docs / board work needs no editor and proceeds normally — this is not a blanket stop.

Do not read a project's low godot-ai call count as "agents don't find it useful". Measured on `space-miner-game` (9,440 tool calls, Jul 7–26 2026): 287 godot-ai calls with **zero errors**, 121 in a single day when the editor was open, and zero on days it was not. Usage tracks availability, not preference.

Related: #43 (capture handshake dies under embedded-game mode — the *other* way visual verification goes quiet), #76 (a vendor-less worktree strips the plugin from `project.godot`). Note also that `.mcp.json` is git-tracked, so every worktree inherits the same `127.0.0.1:<port>` endpoint, which is bound to whichever project the running editor has open — a worktree agent's `project_run` can silently report on the **main checkout's** code (unobserved to date; all 313 godot MCP calls in that project came from a main loop).

**Confirmed by**
2026-07-26, `space-miner-game` (godot-ai v2.8.4 / Godot 4.7). Measured across 144 session transcripts; mechanism confirmed by session-start vs server-start timestamps, and the probe calibrated against the live known-bad state (editor closed, orphaned listener on 8000 → `DEGRADED`).
