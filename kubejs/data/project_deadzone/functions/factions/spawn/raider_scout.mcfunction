summon tacz_bandits:bandit ~ ~ ~ {Tags:["dz_npc","dz_raider","dz_raider_scout","dz_hostile","dz_unassigned"],CustomName:'{"text":"Raider Scout","color":"red"}',PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_raider_scout,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 16
attribute @e[tag=dz_unassigned,tag=dz_raider_scout,distance=..4,sort=nearest,limit=1] minecraft:generic.movement_speed base set 0.30
data merge entity @e[tag=dz_unassigned,tag=dz_raider_scout,distance=..4,sort=nearest,limit=1] {Health:16.0f}
team join dz_raiders @e[tag=dz_unassigned,tag=dz_raider_scout,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_raider_scout,distance=..4,sort=nearest,limit=1] remove dz_unassigned
