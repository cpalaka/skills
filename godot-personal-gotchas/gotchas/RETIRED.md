# Retired & superseded gotchas

Entries that are no longer live routing targets. **Nothing here is deleted** — numbers are stable
pointers (index row -> body file), so a retired entry keeps its number and its body forever. This
file exists so the index stays a hot path for failures that can still happen, without losing the
record of ones that can't.

Retiring is not the same as being wrong. A retired entry was true when observed; what changed is
the environment (a toolchain uninstalled, a version superseded, a bug fixed upstream). Each row
below carries the condition that would bring it back.

## How an entry leaves the index

1. Add a `**Status:**` line directly under the body's `### N. title` heading:
   - `superseded-by #N — <what changed>` — a newer entry covers the same failure, usually because
     a version bump changed the symptom or the fix.
   - `retired <date> — <what changed>` — the failure can no longer occur in this environment.
   - Absent means **live**. Don't stamp `Status: live` on the other entries; silence is the default
     and stamping 75 bodies to say "normal" is pure noise.
2. Collapse the index row to a one-line pointer that keeps the symptom keywords searchable (so a
   grep for the old symptom still lands somewhere that explains itself) and names the successor.
3. Add a row here.
4. **Never renumber, never delete the body.** The number is the index->body contract, and a dated
   `Confirmed by:` anchor is provenance, not clutter.

## Retired

| # | Entry | Retired | Reason | Un-retire if |
|---|---|---|---|---|
| 36 | godot-ai Intel/x86 macOS `cryptography==49` build failure | 2026-07-25 | arm64 migration completed 2026-06-20; `/usr/local/Homebrew` is uninstalled, so the x86_64 wheel path is unreachable on this machine. The arm64 sibling **#37 stays LIVE** — it is a different root cause (interpreter arch, not uv arch). | An Intel Mac re-enters the fleet, or a project pins an x86_64 Python. |

## Superseded

| # | Entry | Superseded by | What changed |
|---|---|---|---|
| 22 | godot-ai `resource_manage op=create` on a script `class_name` -> `VALUE_OUT_OF_RANGE: Unknown resource type` | **#40** | godot-ai PR #583 (2.8.1+, merged 2026-06-30) gates create on `Script.can_instantiate()`, so the same call now fails `WRONG_TYPE: … add @tool to instantiate it here`. #22 remains accurate for a pre-2.8.1 pin. |
| 38 | godot-ai `uid=` omission on a **brand-new Write-tool** script, with an `osascript`-activate escalation | **#19** | On Godot 4.7 / godot-ai v2.7.5 a plain `reimport` materializes the `.uid` with no window focus — which is exactly #19's fix, so #38 collapses back into it. The body is retained for the v2.7.2 / 4.6.2 behaviour, where reimport silently no-op'd. |

## Checked and NOT retired

Recording near-misses so the same candidate isn't re-litigated every audit.

| # | Considered against | Verdict |
|---|---|---|
| 26 / 51 | Proposed as duplicates (both are `SceneTree._initialize` lifecycle traps with the same root cause) | **Both stay live.** Different observable symptoms and different error signatures — #26 is a silently deferred `_ready()` with no error at all; #51 is a hard `Cannot call method … on a null value` abort plus silently unregistered group membership. #51's body already frames itself as "the stronger sibling of #26: same root cause, worse symptom." Collapsing either would lose a distinct routing target for a failure that presents differently. |
| 37 | Retired alongside #36 (same `cryptography` build error text) | **Stays live.** Same error message, different root cause: #36 is "no x86_64 wheel exists", #37 is "an x86_64 *Python interpreter* pulls x86_64 wheels even under a native arm64 uv". #37 is reachable on this machine today. |
