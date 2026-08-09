summon tacznpcs:npc ~ ~ ~ {template:"survivors",Tags:["dz_npc","dz_survivor","dz_unassigned"],CustomName:'{"text":"Survivor","color":"green"}',CustomNameVisible:1b,PersistenceRequired:1b}
team join dz_survivors @e[tag=dz_unassigned,tag=dz_survivor,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_survivor,distance=..4,sort=nearest,limit=1] remove dz_unassigned
