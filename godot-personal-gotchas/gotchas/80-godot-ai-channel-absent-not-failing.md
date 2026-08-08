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

**A THIRD state, and it defeated the check that exists to catch the other two — measured 2026-08-07.** The editor was open on the correct project (PID 3677) **and** the server was listening on both its ports, yet `session_manage(op="list")` returned `count: 0` and `editor_state` returned `PLUGIN_DISCONNECTED`. The **plugin↔server WebSocket** was dead: the editor's socket to the WS port sat in state `CLOSED`. Both of the hook's signals — editor process, port listener — were green, and it reported a confident **`OK — editor open, server listening on 8000`**. *Process and port cannot see the bridge.* Two triggers seen the same day: (a) replacing the vendored addon files **under a running editor** (the plugin keeps the old code and never re-registers), and (b) the server process dying, after which the plugin's retry loop — backoff `[1,2,4,8,16,30,60]` in `connection.gd:9` — **only ever reconnects, it does not respawn**, so it retries forever against nothing. The MCP dock is not evidence either: it showed a stale green "Server connected" for minutes before settling to a red "Retrying in 48s — attempt 8".

**Settle liveness with `session_manage(op="list")` — `count: 0` is the authoritative "no session".** Recovery: toggle the plugin off/on in *Project Settings → Plugins*, or restart the editor. If the server process itself is gone, launching it yourself works and the retry loop adopts it within ~16 s — `uvx --from godot-ai==<version> godot-ai --transport streamable-http --port <http> --ws-port <ws>` — but kill any server you started before the user restarts the editor, or the plugin's own spawn collides on the port.

**The hook was fixed to derive this** (2026-08-07): it now adds a `bridge_established` probe that finds the server PID owning the HTTP port, discovers that PID's *other* listening port, and requires an `ESTABLISHED` connection on it — reporting `DEGRADED (bridge)` when process and port are green but the bridge is not. It derives the WS port rather than hardcoding one, because **the plugin RESOLVES its ports** (walks on collision; `godot_ai/http_port` / `godot_ai/ws_port` EditorSettings override), and upstream explicitly calls a hardcoded 9500 "a stale record from an older install" that can mislead a check into **killing an unrelated external process**. Calibrated both directions before being trusted: live bridge → `OK … bridge ESTABLISHED on 9500`; a listener with no peer → `DEGRADED (bridge)`.

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

Third state + hook fix: 2026-08-07, same project (godot-ai **3.1.3** / Godot 4.7-stable), during the 2.8.4 → 3.1.3 upgrade. Note also that the "a mid-session fix requires a **new session**" line above is **no longer universal**: on the deferred-tools harness (`mcp__godot-ai__*` reachable via ToolSearch) the connection is established lazily at first call, so an editor opened mid-session *does* become usable — settle it with a live `session_manage`/`editor_state` probe, never with the ABSENT notice.
