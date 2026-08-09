summon simpleenemymod:ruunit ~ ~ ~ {Tags:["dz_npc","dz_remnant","dz_remnant_heavy","dz_hostile","dz_unassigned"],CustomName:'{"text":"Remnant Heavy","color":"dark_red"}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_remnant_heavy,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 44
attribute @e[tag=dz_unassigned,tag=dz_remnant_heavy,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 10
attribute @e[tag=dz_unassigned,tag=dz_remnant_heavy,distance=..4,sort=nearest,limit=1] minecraft:generic.movement_speed base set 0.20
data merge entity @e[tag=dz_unassigned,tag=dz_remnant_heavy,distance=..4,sort=nearest,limit=1] {Health:44.0f}
team join dz_remnant @e[tag=dz_unassigned,tag=dz_remnant_heavy,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_remnant_heavy,distance=..4,sort=nearest,limit=1] remove dz_unassigned
