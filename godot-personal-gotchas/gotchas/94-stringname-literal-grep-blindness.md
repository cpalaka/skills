# 94 — A group/signal/action name has TWO literal forms (`"x"` and `&"x"`), so a one-form grep reports a false ABSENCE

## Symptom

You enumerate the call sites of a group (or a signal, an input action, a property name) by grepping
the literal, and the count comes back confidently wrong — usually low by one or two, occasionally
zero. Nothing errors. The code works. The audit, the ADR amendment, or the "nothing else consumes
this" claim built on that count is simply false.

```gdscript
# these are the SAME group, and both of these lines work identically
for n in get_tree().get_nodes_in_group("minable"):   # plain String
for n in get_tree().get_nodes_in_group(&"minable"):  # StringName
```

The worst shape is a producer/consumer split: `grep 'add_to_group(&"minable")'` returns **zero**
hits in a project whose producer happens to write `add_to_group("minable")` — so the group reads as
never populated at all, and the natural conclusion is "dead group, safe to delete".

## Cause

Every Godot API in this family is typed `StringName`, and GDScript **implicitly converts a String
literal** at the call site. So both forms compile to the same interned name and are completely
interchangeable at runtime — measured, Godot 4.7:

```
a.add_to_group("minable")    # plain
b.add_to_group(&"minable")   # StringName
get_nodes_in_group("minable").size()  -> 2      # finds BOTH
get_nodes_in_group(&"minable").size() -> 2      # finds BOTH
a.is_in_group(&"minable") -> true    b.is_in_group("minable") -> true
"minable" == &"minable"   -> true
typeof("minable") = 4 (String)       typeof(&"minable") = 21 (StringName)
Node.get_groups()[0] -> typeof 21    # the engine normalises to StringName either way
```

Nothing — not the parser, not a warning, not `--check-only`, not the editor — ever surfaces the
difference, so a codebase drifts into using both forms for the same name with no signal at all. The
engine sees one name; `grep` sees two unrelated strings. The instrument, not the code, is what is
broken.

This is not specific to groups. It applies to **any** `StringName`-typed API surface: group names,
signal names (`emit_signal`, `connect`, `is_connected`), input actions (`Input.is_action_pressed`),
`NodePath` segments, property names in `set`/`get`/`set_indexed`, `Animation` track paths, and
`Tween`/`Object.call` method names.

(A third surface exists for groups specifically: the editor's Node→Groups panel writes them into the
`.tscn` as `groups = PackedStringArray("name")`, which no `.gd` grep sees at all. Not exercised in
any project on this machine at the time of writing — zero occurrences — but it is where a
scene-authored group hides if the script grep comes up empty.)

## Fix

Search **both** forms, always. The cheapest correct pattern is to make the `&` optional:

```sh
# RIGHT — one pass, both forms
grep -rnE '_group\(&?"minable"' --include='*.gd' .

# also catches the .tscn-declared form
grep -rnE '&?"minable"' --include='*.gd' --include='*.tscn' .

# WRONG — silently omits every consumer using the other form
grep -rn 'get_nodes_in_group(&"minable")' --include='*.gd' .
```

For a signal or action, the same `&?` trick applies. When the answer gates something irreversible
(an ADR claim, a deletion, a "no other consumer" argument), **calibrate first**: grep for a call
site you already know exists and confirm your pattern returns it.

Optionally normalise a repo to one form so the consumer set is greppable in a single pass — but
treat that as cosmetic hygiene, not a fix. The next file someone writes can use either form, and
nothing will flag it, so the two-form grep discipline is the durable part.

## Detect proactively

- **Any grep that enumerates the call sites of a `StringName`-typed API must search both `"x"` and
  `&"x"`.** This is the whole rule. It applies hardest to the greps that feel most routine: an
  absence claim, a consumer count, a refactor's blast radius, a "safe to delete" argument.
- A mixed repo is the precondition, and it is common: measured in `space-miner-game`, group literals
  split **29 plain / 30 `&`-form** — near-exactly half, so a one-form grep there is wrong about
  roughly half the codebase by construction.
- Treat a `StringName` grep result as *provisional* until the pattern has been calibrated against a
  known-present hit. A confident low count is the failure mode; it never looks like an error.

**Not added to `precommit-scan.sh`.** The defect is in the *search*, not in the code — both literal
forms are legal, correct, and working, so there is no diff-local pattern to flag. A scan that fired
on every mixed-form group name would report ~6 findings in a healthy repo and be trained away
immediately. Same reasoning as #90. Hand-scan item; the check that matters is the one you run on
your own grep before quoting its count.

Sibling to **#90** (the other half of "a `StringName` is not a `String`, and the difference is
invisible until it bites" — there the interned pointer breaks `sort()`, here the two literal forms
break `grep`), and to **#84** (a widened group query breaking unguarded `as T` casts at call sites
the query's own scanners never named — the same lesson that a group's real consumer set is larger
than the obvious grep suggests).

## Confirmed by

- `space-miner-game` task-157, 2026-07-28 (routed via draft-026). A `&"minable"` grep never saw
  `cell_debug_overlay.gd:36`, which uses the plain form, producing a confidently wrong consumer
  count in the first draft of an ADR-0031 amendment. Caught only by widening the pattern on a hunch.
- Re-measured independently 2026-07-28 during the parity audit, Godot v4.7.stable.official
  (`5b4e0cb0f`), macOS: the interchangeability table above (both queries return 2, cross-form
  `is_in_group` both true, `get_groups()` normalises to `StringName`), and the 29/30 in-repo split.
  Note the count probe must run after the tree is live — sampling it inside `_initialize` returns
  `0` for **both** forms (#93) and looks like a symmetric result rather than a dead instrument.
