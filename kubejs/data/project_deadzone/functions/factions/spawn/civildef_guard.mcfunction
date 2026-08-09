summon simpleenemymod:pmcunit ~ ~ ~ {Tags:["dz_npc","dz_civildef","dz_unassigned"],CustomName:'{"text":"Civil Defense","color":"blue"}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_civildef,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 20
attribute @e[tag=dz_unassigned,tag=dz_civildef,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 2
data merge entity @e[tag=dz_unassigned,tag=dz_civildef,distance=..4,sort=nearest,limit=1] {Health:20.0f}
team join dz_civildef @e[tag=dz_unassigned,tag=dz_civildef,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_civildef,distance=..4,sort=nearest,limit=1] remove dz_unassigned
