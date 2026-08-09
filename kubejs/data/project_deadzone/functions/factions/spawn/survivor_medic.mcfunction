summon tacznpcs:npc ~ ~ ~ {template:"survivors",Tags:["dz_npc","dz_survivor","dz_faction_medic","dz_survivor_medic","dz_unassigned"],CustomName:'{"text":"Survivor Medic","color":"green"}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_survivor_medic,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 22
attribute @e[tag=dz_unassigned,tag=dz_survivor_medic,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 1
data merge entity @e[tag=dz_unassigned,tag=dz_survivor_medic,distance=..4,sort=nearest,limit=1] {Health:22.0f}
team join dz_survivors @e[tag=dz_unassigned,tag=dz_survivor_medic,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_survivor_medic,distance=..4,sort=nearest,limit=1] remove dz_unassigned
