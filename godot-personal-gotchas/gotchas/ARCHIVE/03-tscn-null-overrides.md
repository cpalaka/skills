### 3. `.tscn` `null` overrides silently zero typed exports

**Symptom**
- After a play session involving live Inspector tuning of `@export` properties, the affected `.tscn` contains lines like:
  ```
  [node name="Player" ...]
  script = ExtResource("...")
  max_speed = null
  turn_rate_deg = null
  ```
- Current session works (Inspector still has live values). Fresh load (fresh checkout, different developer, or just restarting the editor) loads `0.0` for those properties **on Godot 4.6.x**, freezing whatever depended on them. **(Godot 4.7 differs — the `null` is ignored on load and the script default is kept, so it no longer zeroes; the override is silently dropped back to the default instead. See the 2026-06-18 note below.)**

**Cause**
When the Inspector "clears" an override on an exported property (right-click → Reset, or manual deletion of the override entry), Godot may write back `property = null` instead of removing the line. The apparent intent is "fall back to script default," but the on-disk representation is a destructive `null` override. On scene load, the override is applied — null coerces to `0.0` for typed numeric exports, overriding the script's default. **(This is the Godot 4.6.x behavior; on 4.7 the `null` is ignored on load and the typed export keeps its script default — see Confirmed by.)**

**Fix**
Hand-edit the `.tscn` to remove the `= null` lines entirely. The script's default then applies on load. (Alternative: set the property to its intended value rather than leaving null.)

**Detect proactively**
After any live-Inspector-tuning session, grep affected `.tscn` files:

```bash
grep ' = null' scenes/*.tscn
```

Any hit is suspicious — investigate whether it's a stale clear-override or intentional.

**Confirmed by**
Hit during the `3d-prototype-1` movement-depth implementation on 2026-05-24. After a feel-tuning session on the Player, `scenes/player.tscn` had `max_speed = null` and `turn_rate_deg = null` overrides. Caught by the final cross-task code reviewer; would have broken the player on next fresh F5.

2026-06-18 — **CHANGED on Godot 4.7** (re-verified headless, `4.7.stable.official`): a `property = null` line for a typed numeric `@export` is **ignored on load — the script default is retained, NOT coerced to `0.0`**. Tested both a root-node script property and an instanced-scene override (`max_speed: float = 5.0` with `max_speed = null` → loads `5.0`, `typeof` float; the `= null` line confirmed still present on disk; a real `= 12.0` override loads `12.0`). So on 4.7 the gotcha is *milder*: a stale `= null` line no longer zeroes the value — it silently drops your tuned override back to the script default. The `grep ' = null'` detection still applies (a null line still means a dropped override). NOT yet re-checked on 4.7: the Inspector clear-override *trigger* — whether 4.7 still WRITES `= null` vs. removing the line (a GUI behavior).
