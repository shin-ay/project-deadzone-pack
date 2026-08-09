summon tacz_bandits:bandit ~ ~ ~ {Tags:["dz_npc","dz_raider","dz_raider_warden","dz_hostile","dz_unassigned"],CustomName:'{"text":"Raider Warden","color":"dark_red","bold":true}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_raider_warden,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 40
attribute @e[tag=dz_unassigned,tag=dz_raider_warden,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 8
attribute @e[tag=dz_unassigned,tag=dz_raider_warden,distance=..4,sort=nearest,limit=1] minecraft:generic.knockback_resistance base set 0.35
data merge entity @e[tag=dz_unassigned,tag=dz_raider_warden,distance=..4,sort=nearest,limit=1] {Health:40.0f}
team join dz_raiders @e[tag=dz_unassigned,tag=dz_raider_warden,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_raider_warden,distance=..4,sort=nearest,limit=1] remove dz_unassigned
