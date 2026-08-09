summon tacz_bandits:bandit ~ ~ ~ {Tags:["dz_npc","dz_raider","dz_faction_medic","dz_raider_medic","dz_hostile","dz_unassigned"],CustomName:'{"text":"Raider Medic","color":"red"}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_raider_medic,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 18
attribute @e[tag=dz_unassigned,tag=dz_raider_medic,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 1
data merge entity @e[tag=dz_unassigned,tag=dz_raider_medic,distance=..4,sort=nearest,limit=1] {Health:18.0f}
team join dz_raiders @e[tag=dz_unassigned,tag=dz_raider_medic,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_raider_medic,distance=..4,sort=nearest,limit=1] remove dz_unassigned
