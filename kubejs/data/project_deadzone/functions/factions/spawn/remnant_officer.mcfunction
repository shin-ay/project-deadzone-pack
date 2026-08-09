summon simpleenemymod:ruunit ~ ~ ~ {Tags:["dz_npc","dz_remnant","dz_remnant_officer","dz_hostile","dz_unassigned"],CustomName:'{"text":"Remnant Officer","color":"dark_red"}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_remnant_officer,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 34
attribute @e[tag=dz_unassigned,tag=dz_remnant_officer,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 7
data merge entity @e[tag=dz_unassigned,tag=dz_remnant_officer,distance=..4,sort=nearest,limit=1] {Health:34.0f}
team join dz_remnant @e[tag=dz_unassigned,tag=dz_remnant_officer,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_remnant_officer,distance=..4,sort=nearest,limit=1] remove dz_unassigned
