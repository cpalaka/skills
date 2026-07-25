### 3. Explicit invocation of `godot-personal-gotchas` skill

**Status:** retired 2026-07-25 — premise falsified. After the 2026-07-11 description sharpening the
loader surfaces the skill readily, including in sessions with no Godot content at all (observed
three times in one `~/Claude` session). The rule now over-fires rather than under-fires: 197
invocations in 60 days, with the same instruction additionally asserted in
`space-miner-game/CLAUDE.md` and by the 1%-rule in the `superpowers-default` chunk — three
statements of one rule.

Kept as history because the constraint can come back: if a loader change makes description
matching soft again, the symptom is a Godot session that trips a catalogued gotcha without the
skill ever loading. The fix then is to sharpen the description (which is what worked), not to
reinstate a blanket explicit-invocation rule.

**When this applies** _(historical — no longer active)_

Any session where I'm working on a Godot project. The skill loader's auto-activation via description matching is too soft to fire reliably on subtle Godot contexts (intent-based triggers, not file-extension triggers).

**Preferred behavior**

Invoke the `godot-personal-gotchas` skill EXPLICITLY via the Skill tool. Don't wait for auto-activation. Specifically invoke it when:

- **A Godot operation produces a silent no-op** (call succeeds, no error, no visible change)
- **A GDScript parser warning fires** (especially Variant-inference warnings)
- **About to hand-edit `.tscn` or `.tres`** files
- **About to change window or display state from script** (`window_set_mode`, mode setters)
- **About to write GDScript using** `clamp`/`min`/`max`/`abs`/`sign`/`floor`/`ceil`/`round` (the un-suffixed variants)
- **About to mutate scenes via MCP tools**
- **Before assuming "I know what's happening"** on any unexpected Godot behavior — check the skill FIRST, not after spending time debugging

**Why**

The skill description matches on file extensions and tooling context, but doesn't fire on intent context ("I'm about to do X risky thing"). Explicit invocation is the safety net — it treats the skill as a checklist, not as overhead.

**How to apply**

Use the Skill tool with `skill: godot-personal-gotchas` proactively. If the skill turns out not to apply to the current task, the cost is small (one tool call). The cost of not invoking it and tripping a known gotcha is much higher (debugging time + the user catching me using an outdated approach).
