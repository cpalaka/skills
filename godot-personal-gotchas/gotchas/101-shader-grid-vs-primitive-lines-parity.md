### 101. Replacing a `PRIMITIVE_LINES` mesh with a shader: every line pixel differs, and three separate terms are why

**Symptom**
You swap a line-mesh grid/gizmo for an authored `PlaneMesh` + fragment shader that should draw the same 1 px lines. The frame diff says the whole grid changed. Fixing the obvious thing does not converge:

- First pass: **24 128 differing pixels** at a top-down pose — which is *every* line pixel in the frame.
- Colours look right on screen and to the eye, and the lines are in the right places.
- After correcting the line width, roughly **half of every tilted line's pixels** still differ by exactly one pixel, and no global offset fixes it — shifting one way fixes one camera pose and breaks the other.

**Cause**
Three independent terms, in descending order of how much of the diff they own:

1. **8-bit vertex-colour truncation — ~97% of it.** `ImmediateMesh`/`ArrayMesh` store vertex colours as 8 bits and **truncate**: `0.16 * 255 = 40.8` is committed as `40` (= 0.15686). The old grid's line therefore lands on screen at sRGB `(110, 124, 139)`; a shader feeding the exact float `0.16` lands at `(111, 124, 139)`. One code brighter, invisible to the eye, on *every line pixel in the frame*. Sibling to #82, which is the same storage fact seen from the read-back side.
2. **Line width is measured across the rasteriser's MINOR axis, not perpendicular.** The hardware walks a line's major axis and lights exactly one pixel per step, so its lines are 1 px wide *across the minor axis* — which on a tilted line is **narrower than 1 px perpendicular**. A shader measuring perpendicular distance (`length(vec2(dFdx(p), dFdy(p)))`) draws converging lines 2 px wide wherever `1/cos(angle)` crosses the threshold.
3. **Exact-boundary ties break the other way.** A line lying exactly on a pixel boundary goes to the **lower** pixel under line rasterisation, while a fragment-centre coverage test resolves it to the upper one. This is not an edge case at an axis-aligned pose: if the grid spacing works out to a whole number of pixels (e.g. 175 px), **every line** is exactly on a boundary and the tie is decided by float noise.

A fourth term bites if you reach for the nicer inspector widget: **`uniform vec3 c : source_color` double-converts.** Godot converts a picked sRGB colour to linear on upload, and mesh albedo is linear→sRGB'd again on output — so a swatch reading `0.16, 0.20, 0.26` hands the shader ~0.021 and renders the grid at `(38, 45, 56)`. (The `Environment.background_color` is written verbatim and does *not* go through that conversion, so sampling the background to "calibrate" the colour path tells you nothing about the mesh path.)

**Fix**
```glsl
vec2 p_center = v_world.xz;
vec2 grad_x = vec2(dFdx(p_center).x, dFdy(p_center).x);   // screen gradient of world X
vec2 grad_z = vec2(dFdx(p_center).y, dFdy(p_center).y);
// (2) the minor-axis step, per family — NOT length(gradient)
vec2 minor = vec2(minor_axis_step(grad_x), minor_axis_step(grad_z));
vec2 p = p_center + 0.001 * minor;                        // (3) tie-break epsilon
vec2 to_line = abs(p - round(p / step) * step);
vec2 to_line_px = to_line / max(abs(minor), vec2(1e-9));
...
ALBEDO = floor(line_color * 255.0) / 255.0;               // (1) match 8-bit storage
```
where `minor_axis_step(g)` returns `abs(g.x) >= abs(g.y) ? g.x : g.y`.

Use **bare `vec3` uniforms**, not `: source_color`, so the spec's numbers are consumed as the vertex colours were. Keep the lines **hard-edged** (a covered/not-covered test, no `smoothstep`) — `PRIMITIVE_LINES` rasterises aliased, and antialiasing is a visible per-pixel difference even at the right width.

The epsilon is a **tie-break, not a positioning knob**: sweep it and it is flat across 0.0005–0.002, too small to bite below 0.0001, and starts dragging tilted lines off a pixel from ~0.05 up.

**A residual remains and is not tunable away.** Per-row sub-pixel rounding inside the GPU's line unit disagrees with fragment coverage on a fraction of any line that is not screen-axis-aligned. Measured best case: **7 differing pixels** of 2 073 600 at an axis-aligned pose (with the grid-line pixel *count* identical), against **2.6% of line pixels** at a 63° tilt, all in the far field. Budget for "indistinguishable", not "bitwise".

**Detect proactively**
Before concluding a shader-vs-mesh replacement has a *geometry* problem, **sample the actual pixel colours of both frames first** — a 1-code colour shift makes 100% of line pixels differ and masquerades as a total mismatch. Scan one row of each image and print the lit runs as `position:width`; positions tell you about terms 2 and 3, and the colour tells you about term 1. Quote the residual as a fraction of **line pixels**, never of the whole frame — a mostly-empty frame flatters any grid comparison.

**Confirmed by**
2026-08-02, `space-miner-game` task-168 (onecam `PlaneGrid`), Godot 4.7 Forward+/Metal, 1920×1080. Term 1 alone took the tilted pose from 77 189 differing pixels to 2 702.
