# 104 — An MCP tool argument that DOESN'T EXIST is silently stripped, not rejected: a wrong recipe reads as working for months

## Symptom

A documented MCP recipe carries an argument that the tool has never accepted. The call
**succeeds**. It returns plausible data. Nothing warns, nothing errors, and the recipe gets copied
into more docs on the strength of "it works".

Measured 2026-08-07, space-miner-game: `godot_editor get_log_messages source="editor"` appeared in
`docs/godot-mcp-guide.md` (twice, as the *primary* tool for "scene won't load"), in `CLAUDE.md`'s
typecheck knob, and in the `godot-personal-gotchas` SKILL.md routing block. The installed
`@satelliteoflove/godot-mcp@3.6.1` schema for that action is exactly `{action, clear?, limit?}` —
the only `source`-like string in the whole `dist/tools/editor.js` is **`sourceMappingURL`**. The
filter had never existed. Every call returned the **unfiltered** log, which looks enough like a
filtered log that no one questioned it.

## Cause

Most MCP servers validate with a **non-strict** object schema (Zod `z.object`, pydantic without
`extra="forbid"`). Unknown keys are dropped during parse. And `z.toJSONSchema` emits no
`additionalProperties: false`, so the *advertised* schema does not forbid them either — meaning
neither the client nor the server complains. The argument evaporates between your call and the
handler.

The failure is doubly quiet because the *plausible* wrong answer is the common case: dropping a
**filter** widens the result set, and a superset of the right answer still contains the right
answer. You only notice when the extra rows matter.

Contrast the two behaviours you might get from the same family of tools:

- godot-ai (pydantic, strict): `editor_screenshot(target=...)` → hard
  `Unexpected keyword argument` error. Loud, fixed in one round-trip (#38 in the project guide).
- godot-mcp (Zod, non-strict): `get_log_messages(source=...)` → silently stripped. Wrong for
  months.

## Fix

**Verify an argument exists in the tool's schema before writing it into any doc, and re-verify on
every server upgrade.** Three cheap ways, in order of authority:

1. Read the loaded tool schema you were handed (in Claude Code, the `<function>` definition, or
   re-fetch it with `ToolSearch("select:<tool>")`). An arg absent there does not exist.
2. Grep the installed server: `grep -o "<argname>" node_modules/<pkg>/dist/tools/<tool>.js`. Zero
   hits outside `sourceMappingURL` is decisive.
3. Calibrate by absurdity — pass a **deliberately nonsense** argument
   (`sourc3="zzz"`, `frobnicate=1`). If the call still succeeds, the tool is non-strict and
   **every** optional arg in your recipe is unproven; go check them all. If it errors, the tool is
   strict and a successful call is evidence the args landed.

That third check is the general instrument: it tells you which *class* of validation you are
dealing with before you trust any single argument.

## Detect proactively

- Any doc/skill line of the form `<tool> <action> <key>="<value>"` that has never been re-derived
  from the schema — especially one describing a **filter**, **severity**, **source**, or **scope**
  argument, where being ignored returns a superset rather than an error.
- Any recipe that survived a **major server upgrade** unedited. v4 of the same server renamed
  every mixed tool (`godot_editor` → `godot_editor_read`/`_edit`) while *keeping* the non-strict
  schemas — so a stale recipe now fails on the tool NAME (loud) but its bogus args would still
  strip silently (quiet).
- Corollary for the reverse direction: an argument that was **removed** in an upgrade behaves
  identically. `quality` on godot-mcp's screenshot actions vanished in v4 (output also switched
  JPEG → lossless PNG); a recipe still passing `quality` is silently ignored, and the only tell is
  a changed file format.
- Family: instruments that report success while measuring nothing — #80 (channel absent, no
  error), #83 (diagnostics returns `[]` for a broken file), #92/#95 (the probe never ran).

## Confirmed by

space-miner-game, 2026-08-07, during the godot-ai 2.8.4 → 3.1.3 refresh. Found while auditing 47
godot-ai-specific claims across the docs/skills/memory corpus; the `source="editor"` fiction was
one of 23 stale claims and the only one that had propagated into three separate documents while
being wrong from the day it was written. Correct replacement on this stack: godot-ai
`logs_read source="editor"`, where the parameter is real
(`handlers/editor_handler.gd:72` — `plugin|game|editor|all`); on godot-mcp v4 the real filter is
`severity: "error"`.
