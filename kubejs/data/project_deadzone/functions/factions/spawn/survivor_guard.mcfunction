summon tacznpcs:npc ~ ~ ~ {template:"survivors",Tags:["dz_npc","dz_survivor","dz_survivor_guard","dz_unassigned"],CustomName:'{"text":"Survivor Guard","color":"green"}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_survivor_guard,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 24
attribute @e[tag=dz_unassigned,tag=dz_survivor_guard,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 2
data merge entity @e[tag=dz_unassigned,tag=dz_survivor_guard,distance=..4,sort=nearest,limit=1] {Health:24.0f}
team join dz_survivors @e[tag=dz_unassigned,tag=dz_survivor_guard,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_survivor_guard,distance=..4,sort=nearest,limit=1] remove dz_unassigned
