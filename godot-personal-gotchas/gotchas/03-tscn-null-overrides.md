### 3. `.tscn` `null` overrides silently zero typed exports

**Symptom**
- After a play session involving live Inspector tuning of `@export` properties, the affected `.tscn` contains lines like:
  ```
  [node name="Player" ...]
  script = ExtResource("...")
  max_speed = null
  turn_rate_deg = null
  ```
- Current session works (Inspector still has live values). Fresh load (fresh checkout, different developer, or just restarting the editor) loads `0.0` for those properties, freezing whatever depended on them.

**Cause**
When the Inspector "clears" an override on an exported property (right-click → Reset, or manual deletion of the override entry), Godot may write back `property = null` instead of removing the line. The apparent intent is "fall back to script default," but the on-disk representation is a destructive `null` override. On scene load, the override is applied — null coerces to `0.0` for typed numeric exports, overriding the script's default.

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
