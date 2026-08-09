summon tacz_bandits:bandit ~ ~ ~ {Tags:["dz_npc","dz_raider","dz_raider_enforcer","dz_hostile","dz_unassigned"],CustomName:'{"text":"Raider Enforcer","color":"dark_red"}',CustomNameVisible:1b,PersistenceRequired:1b}
attribute @e[tag=dz_unassigned,tag=dz_raider_enforcer,distance=..4,sort=nearest,limit=1] minecraft:generic.max_health base set 28
attribute @e[tag=dz_unassigned,tag=dz_raider_enforcer,distance=..4,sort=nearest,limit=1] minecraft:generic.armor base set 5
data merge entity @e[tag=dz_unassigned,tag=dz_raider_enforcer,distance=..4,sort=nearest,limit=1] {Health:28.0f}
team join dz_raiders @e[tag=dz_unassigned,tag=dz_raider_enforcer,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_raider_enforcer,distance=..4,sort=nearest,limit=1] remove dz_unassigned
