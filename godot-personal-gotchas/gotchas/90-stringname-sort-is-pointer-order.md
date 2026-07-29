# 90 — `Array.sort()` on `StringName` sorts by interned pointer, not by text

## Symptom

You sort a list of `StringName` — typically `some_dictionary.keys()` on a dictionary keyed by
`&"name"` — and the result is neither alphabetical nor insertion order. Worse, it is not stable
*across builds*: the same ten names sorted from two different scripts come out in two different
orders. Nothing errors, and a comment promising "sorted, so every run agrees" is simply false.

```gdscript
var d := {}
for n in [&"regolith", &"iron", &"mnemite", &"ilmenite", &"graphite",
        &"cogitite", &"iridium", &"diamond", &"noesite", &"anima"]:
    d[n] = true
var keys: Array = d.keys()
keys.sort()
# measured, Godot 4.7, same ten names, two different source files:
#   file A -> anima,noesite,diamond,iridium,cogitite,graphite,ilmenite,mnemite,iron,regolith
#   file B -> iron,mnemite,ilmenite,regolith,graphite,anima,noesite,diamond,iridium,cogitite
```

## Cause

`StringName`'s `<` compares the **interned pointer**, not the characters — cheap comparison is the
entire reason `StringName` exists. So the order `Array.sort()` produces is decided by the order the
engine first interned each name during startup/parse, which depends on which script, scene or
resource mentioned it first. Editing an unrelated file can reorder it.

Spot checks mislead: individual comparisons often *happen* to agree with alphabetical, so seeing
`&"anima" < &"cogitite"` return `true` proves nothing. Sort the whole list and compare across two
separately-built scripts.

## Fix

Sort on the `String` value explicitly:

```gdscript
keys.sort_custom(func(a: StringName, b: StringName) -> bool: return String(a) < String(b))
```

If the order only needs to be *stable* rather than alphabetical, sort on something you own — an
authored id, an index — never on the `StringName` itself.

## Detect proactively

- Any bare `.sort()` (no `_custom`) on `Dictionary.keys()` where the dictionary is keyed by `&"..."`.
- A doc comment promising determinism, reproducibility, or "the same order every run" sitting next
  to a bare `.sort()` on names.
- Deterministic-generation code that digests a `Dictionary` by sorting its keys: if any key is a
  `StringName`, the digest becomes build-dependent — so the instrument that exists to *prove*
  determinism becomes the thing reporting phantom failures.

Not added to `precommit-scan.sh`: deciding whether a sorted array holds `StringName` needs type
information a grep does not have, and a pattern loose enough to catch it (`.keys()` … `.sort()`)
fires on every safe `String`-keyed dictionary in the tree. A check that cries wolf gets ignored,
which is worse than no check. Hand-scan item.

## Confirmed by

space-miner-game, 2026-07-27 (task-097 review). `BalanceDB.ore_ids()` sorted `_ores.keys()` with a
bare `.sort()` under a comment claiming a stable per-run order; measured across two source files and
found to disagree. Fixed with the `String` cast. The same project's `FieldGen._params_digest` sorts
params keys and is safe *only* because every key there is a plain `String` — now documented there as
a required invariant rather than left as an accident.
