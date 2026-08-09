PROJECT DEADZONE - Lost Cities profile

Install:
1. Copy profiles/deadzone.json to:
   <instance>/config/lostcities/profiles/deadzone.json
2. Replace or edit:
   <instance>/config/lostcities/common.toml
   so dimensionsWithProfiles is ["minecraft:overworld=deadzone"]
3. Create a NEW world. Existing generated chunks will not change.

Design goals:
- Separate cities with real wilderness corridors
- Medium/large urban areas rather than endless continuous city
- More visible decay and rubble
- Slightly scarcer Lost Cities loot
- Lost Cities mob spawners disabled so In Control!/The Hordes can own progression

Primary tuning knobs if cities are still too common:
- cityChance: 0.003 -> 0.002
- cityMaxRadius: 92 -> 80
- cityThreshold: 0.25 -> 0.30

If cities become too rare:
- cityChance: 0.003 -> 0.0045
- cityMaxRadius: 92 -> 105
- cityThreshold: 0.25 -> 0.22
