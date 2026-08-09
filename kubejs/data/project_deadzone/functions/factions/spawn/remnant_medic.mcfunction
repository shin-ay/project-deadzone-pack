summon simpleenemymod:ruunit ~ ~ ~ {Tags:["dz_npc","dz_remnant","dz_faction_medic","dz_remnant_medic","dz_hostile","dz_unassigned"],CustomName:'{"text":"Remnant Medic","color":"dark_red"}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_remnant_medic,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 30
attribute @e[tag=dz_unassigned,tag=dz_remnant_medic,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 5
data merge entity @e[tag=dz_unassigned,tag=dz_remnant_medic,distance=..4,sort=nearest,limit=1] {Health:30.0f}
team join dz_remnant @e[tag=dz_unassigned,tag=dz_remnant_medic,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_remnant_medic,distance=..4,sort=nearest,limit=1] remove dz_unassigned
