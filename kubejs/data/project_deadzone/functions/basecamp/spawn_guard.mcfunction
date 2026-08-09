# Run at a pink guard marker.
# Base guards deliberately omit dz_npc/dz_unassigned. The global faction
# loadout controller may otherwise give them the NPC-incompatible TaCZ M870.
summon tacznpcs:npc ~ ~ ~ {template:"survivors",Tags:["dz_survivor","dz_survivor_guard","dz_basecamp_guard"],CustomName:'{"text":"Survivor Guard","color":"green"}',CustomNameVisible:1b,PersistenceRequired:1b}
team join dz_survivors @e[tag=dz_basecamp_guard,sort=nearest,limit=1,distance=..4]
attribute @e[tag=dz_basecamp_guard,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 30
attribute @e[tag=dz_basecamp_guard,sort=nearest,limit=1,distance=..4] minecraft:generic.armor base set 4
data merge entity @e[tag=dz_basecamp_guard,sort=nearest,limit=1,distance=..4] {Health:30.0f,PersistenceRequired:1b}
