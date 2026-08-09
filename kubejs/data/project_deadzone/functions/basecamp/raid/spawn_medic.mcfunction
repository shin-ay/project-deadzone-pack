# Five-player scaling: wave 1 also receives a Raider Medic.
execute at @e[type=minecraft:marker,tag=dz_basecamp_raid_anchor,sort=random,limit=1] positioned ~ ~ ~4 run function project_deadzone:factions/spawn/raider_medic
execute at @e[type=minecraft:marker,tag=dz_basecamp_raid_anchor,sort=random,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..16] add dz_basecamp_raider
