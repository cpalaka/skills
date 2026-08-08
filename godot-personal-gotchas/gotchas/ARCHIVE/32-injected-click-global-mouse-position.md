### 32. Injected MCP mouse clicks act at one fixed wrong world position when the handler uses `get_global_mouse_position()`

**Symptom**
godot-ai `game_manage op=input_mouse event="button"` returns `sent:true` and the game's `_unhandled_input` genuinely fires — but a click handler that calls `get_global_mouse_position()` acts at a far-off-window position, and EVERY injected click acts at the SAME wrong position (observed: world x=-2124 repeatedly; balls spawned into the void and freefell). The freefall looked exactly like physics tunneling — velocity ~9700 px/s, y ~700000. Injecting `event="motion"` first does NOT fix it.

**Cause**
The injected `InputEventMouseButton` carries its `position`, but `get_global_mouse_position()` reads the Viewport's tracked OS cursor, which sits wherever the real mouse is (outside the game window in MCP-driven sessions). Injected motion events don't warp the tracked cursor either.

**Fix**
In click handlers that should be injectable/testable, use the event's own position converted to world space:

```gdscript
var world_pos := get_canvas_transform().affine_inverse() * event.position
```

Identical behavior for real clicks, correct for injected ones.

**Detect proactively**
Grep input handlers before MCP-driven testing: `grep -rn 'get_global_mouse_position' scripts/` — any hit in a click handler will misbehave under injected input. Trap note: the freefalling-body signature (huge y, ~constant gravity acceleration, same spawn x every time) reads as "physics blasted the body through the floor" — check the spawn position before blaming the solver. Identical x across two independent drops was the giveaway.

**Confirmed by**
2026-06-10 — `juice-tests` fluid_faucet_test session, Godot 4.6.2, godot-ai v2.5.13, godot-rapier2d v0.8.32. Applied in that project's `scripts/fluid_pool_test.gd` and `scripts/fluid_faucet_test.gd`.

2026-07-25 — NOT re-verified on 4.7. Requires godot-ai input injection into a live game instance, and the only editor running was mid-session on another project. Entry stays 4.6.2 / godot-ai v2.5.13-anchored; 4.7 status unknown, not fixed.
