summon tacz_bandits:bandit ~ ~ ~ {Tags:["dz_npc","dz_raider","dz_hostile","dz_unassigned"],CustomName:'{"text":"Raider","color":"red"}',PersistenceRequired:1b}
team join dz_raiders @e[tag=dz_unassigned,tag=dz_raider,distance=..4,sort=nearest,limit=1]
tag @e[tag=dz_unassigned,tag=dz_raider,distance=..4,sort=nearest,limit=1] remove dz_unassigned
