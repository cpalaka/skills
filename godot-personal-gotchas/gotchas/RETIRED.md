# Retired & superseded gotchas

Entries that are no longer live routing targets. **Nothing here is deleted** — numbers are stable
pointers (index row -> body file), so a retired entry keeps its number and its body forever. This
file exists so the index stays a hot path for failures that can still happen, without losing the
record of ones that can't.

Retiring is not the same as being wrong. A retired entry was true when observed; what changed is
the environment (a toolchain uninstalled, a version superseded, a bug fixed upstream). Each row
below carries the condition that would bring it back.

## The 2026-08-08 prune — 32 rows

The index was audited entry-by-entry against two tests: **recurrence** (will it fire again, on
another day and ideally another project?) and **non-inferability** (would a competent agent get this
wrong *without* the entry?). 32 of 107 rows failed one or both, leaving 75. Index: 7,953 → 6,736 tok
(derive it: `scripts/lint-index.sh`).

The tests now live at the two gates that feed this catalog — `ADDING.md` (filing) and the
`wrap-session` skill's admission test (closeout). The growth rate that made the prune necessary was
2.3 entries/day over the preceding 13 days, and the diagnosed cause was a closeout step that reads
as a prompt to produce *something*.

**A cut row does not delete anything.** The body moves to `ARCHIVE/`, the number is never reused, and
a single line at the foot of the index names every cut number so nothing gets re-filed.

**A `#N` you cannot find in the index is in `ARCHIVE/`.** Cross-references between bodies were written
when every number was live; the 2026-08-08 prune moved 32 bodies to `gotchas/ARCHIVE/` without
rewriting those references, because a body is only ever read on an index match and the number still
resolves. If a reference does not resolve in `gotchas/`, look in `ARCHIVE/` and read `RETIRED.md`
for why it left — several archived entries carry fixes that are now stale or actively wrong.


| Reason | Entries | Rationale |
|---|---|---|
| **Inferable** — the error names its own fix | 2, 12, 17, 20, 40, 87 | The compiler already says it. #2/#12/#17/#20 **keep their mechanized scan check** — prevention is free, and a check does not need an index row. #40 and #87 never had one and need none (corrected 2026-08-08 — the original prune record claimed all six kept a check): #40 is MCP-behavioural with an error that literally reads "add `@tool` to instantiate it here", and #87 is a "this is legal" fact with nothing to detect. #17 (forward is −Z) is documented engine convention. |
| **One-shot** — passes universality, fails recurrence | 4, 10, 11, 33, 48, 50, 59, 62, 67, 70, 71, 73, 85, 101 | Each bound to one project's asset, shader, tuning or platform slice. #101 is 5 KB of excellent measurement that will not fire twice; #62's 4.7 re-save was a fleet migration completed in June; #70 carried no `Confirmed by` at all. |
| **Merged** — same fact, two rows | 81→16, 93→51, 98→60, 103→95 | Content folded into the target body and the target's index row widened to carry the absorbed symptom keywords. #98/#60 were the same `%e`/`%g` runtime throw filed 4 weeks apart, second copy 4× longer, both caught by the same check. |
| **Fixed upstream** | 24, 45, 52 | godot-ai 2.8.0 / 3.1.3. See the Retired table below — #52's stale Fix was actively harmful. |
| **Already collapsed, still costing a row** | 22, 36, 38 | Recorded below since 2026-07-25; the pointer rows were paying ~180 chars each to say "see #N". |
| **Deprecated path** | 32 | A `godot_input` quirk on a channel the Tooling section now steers away from in favour of godot-ai `input_sequence`. |
| **Unreachable on this fleet** | 3 | Scoped to the 4.6.x clear-override path (`property = null` written instead of the line being deleted); every project moved to 4.7 in June 2026. Retired on **unreachability, not on a measurement that the bug is gone** — 4.7's save path prunes at-default properties instead (#62, #99), a different mechanism. Un-retire if a project pins 4.6.x. |

### Probed and NOT retired (2026-08-08)

Three entries were held back from the prune because retiring them would have rested on inference
about upstream rather than a measurement. Probed against live godot-ai **3.1.3**; two survived:

| # | Claim | Probe | Verdict |
|---|---|---|---|
| 23 | godot-ai cannot create `Skeleton3D` bones — no method-call verb | `batch_execute` accepts only plugin commands (`create_node`, `set_property`, `delete_node`, `attach_script`); still no general method-call path, so `add_bone` remains unreachable | **Stays live** |
| 25 | godot-ai cannot author an AnimationTree graph — `animation_manage` is AnimationPlayer-only | The live op enum is `add_method_track, add_property_track, create_simple, delete, get, list, play, player_create, preset_fade, preset_pulse, preset_shake, preset_slide, set_autoplay, stop, validate` — no AnimationTree, BlendTree, StateMachine or transform-track verb | **Stays live** |
| 3 | 4.6.x `.tscn` null overrides | Not probed — no 4.6.x install remains to probe against | Retired as unreachable (above) |

## How an entry leaves the index

1. Add a `**Status:**` line directly under the body's `### N. title` heading:
   - `superseded-by #N — <what changed>` — a newer entry covers the same failure, usually because
     a version bump changed the symptom or the fix.
   - `retired <date> — <what changed>` — the failure can no longer occur in this environment.
   - Absent means **live**. Don't stamp `Status: live` on the other entries; silence is the default
     and stamping 75 bodies to say "normal" is pure noise.
2. **Delete the index row outright** and add its number to the `**Retired / superseded**` line at the
   foot of the index. Do **not** leave a collapsed `_(see #N)_` pointer row: that was the convention
   until 2026-08-08, and it cost ~180 hot-path characters *per entry*, forever, to say nothing. The
   single shared line does the same job — blocking a re-file, giving a grep somewhere to land — for
   the whole set at about the price of one former pointer.
3. **Move the body to `ARCHIVE/`.** Bodies cost zero tokens either way (nothing reads them without an
   index row), so this is not about size — it is about keeping a stale Fix out of the path an agent
   might grep. Not hypothetical: #52's Fix told you to hand-edit a `.tscn`, the highest-risk
   operation in this fleet, to dodge a bug that had already been fixed upstream.
4. Add a row here.
5. **Never renumber, never delete the body.** The number is the index->body contract, and a dated
   `Confirmed by:` anchor is provenance, not clutter.

## Retired

| # | Entry | Retired | Reason | Un-retire if |
|---|---|---|---|---|
| 36 | godot-ai Intel/x86 macOS `cryptography==49` build failure | 2026-07-25 | arm64 migration completed 2026-06-20; `/usr/local/Homebrew` is uninstalled, so the x86_64 wheel path is unreachable on this machine. The arm64 sibling **#37 stays LIVE** — it is a different root cause (interpreter arch, not uv arch). | An Intel Mac re-enters the fleet, or a project pins an x86_64 Python. |
| 24 | godot-ai `node_set_property` can't write a `Vector2i` (sets the container LENGTH, then silently no-ops) | 2026-08-08 | Fixed upstream in godot-ai **2.8.0** (PR #582); the fix was re-verified holding on 3.1.3 on 2026-08-07. Every godot-ai in this fleet is ≥3.1.3. | A project pins godot-ai < 2.8.0. |
| 45 | godot-ai `input_map_manage op=list` omits the project's own `project.godot` `[input]` actions | 2026-08-08 | Fixed upstream in godot-ai **3.1.3** (upstream #213 — `_read_user_authored_actions` merges the `project.godot` `[input]` block with the live `InputMap`). Measured `count: 11` against a pre-fix `count: 0`. | A project pins godot-ai < 3.1.3. |
| 52 | godot-ai writes a typed `Array[T]` export as an untyped literal; the saved `.tscn` silently loads EMPTY | 2026-08-08 | Fixed upstream in godot-ai **3.1.3** (`_coerce_typed_array` + a hard error naming the failing element index). Retiring this one is not merely hygiene: its stale Fix prescribes a `.tscn` hand-edit, the highest-risk operation in this fleet, to work around a bug that no longer exists. | A project pins godot-ai < 3.1.3. |

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
