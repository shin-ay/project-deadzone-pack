# First raid / wave 2: four Raiders from north and southeast.
execute at @e[type=minecraft:marker,tag=dz_raid_north,limit=1] positioned ~ ~ ~-5 run function project_deadzone:factions/spawn/raider
execute at @e[type=minecraft:marker,tag=dz_raid_north,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..12] add dz_basecamp_raider
execute at @e[type=minecraft:marker,tag=dz_raid_north,limit=1] positioned ~3 ~ ~-3 run function project_deadzone:factions/spawn/raider
execute at @e[type=minecraft:marker,tag=dz_raid_north,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..12] add dz_basecamp_raider

execute at @e[type=minecraft:marker,tag=dz_raid_southeast,limit=1] positioned ~5 ~ ~5 run function project_deadzone:factions/spawn/raider
execute at @e[type=minecraft:marker,tag=dz_raid_southeast,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..12] add dz_basecamp_raider
execute at @e[type=minecraft:marker,tag=dz_raid_southeast,limit=1] positioned ~3 ~ ~6 run function project_deadzone:factions/spawn/raider_medic
execute at @e[type=minecraft:marker,tag=dz_raid_southeast,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..12] add dz_basecamp_raider

