summon simpleenemymod:pmcunit ~ ~ ~ {Tags:["dz_npc","dz_civildef","dz_civildef_officer","dz_unassigned"],CustomName:'{"text":"Civil Defense Officer","color":"blue"}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_civildef_officer,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 26
attribute @e[tag=dz_unassigned,tag=dz_civildef_officer,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 4
data merge entity @e[tag=dz_unassigned,tag=dz_civildef_officer,distance=..4,sort=nearest,limit=1] {Health:26.0f}
team join dz_civildef @e[tag=dz_unassigned,tag=dz_civildef_officer,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_civildef_officer,distance=..4,sort=nearest,limit=1] remove dz_unassigned
