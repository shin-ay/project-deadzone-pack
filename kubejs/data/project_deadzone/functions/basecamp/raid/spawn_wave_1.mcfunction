# First raid / wave 1: four lightly equipped Raiders from west and east.
execute at @e[type=minecraft:marker,tag=dz_raid_west,limit=1] positioned ~-5 ~ ~ run function project_deadzone:factions/spawn/raider
execute at @e[type=minecraft:marker,tag=dz_raid_west,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..12] add dz_basecamp_raider
execute at @e[type=minecraft:marker,tag=dz_raid_west,limit=1] positioned ~-3 ~ ~3 run function project_deadzone:factions/spawn/raider_scout
execute at @e[type=minecraft:marker,tag=dz_raid_west,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..12] add dz_basecamp_raider

execute at @e[type=minecraft:marker,tag=dz_raid_east,limit=1] positioned ~5 ~ ~ run function project_deadzone:factions/spawn/raider
execute at @e[type=minecraft:marker,tag=dz_raid_east,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..12] add dz_basecamp_raider
execute at @e[type=minecraft:marker,tag=dz_raid_east,limit=1] positioned ~3 ~ ~3 run function project_deadzone:factions/spawn/raider_scout
execute at @e[type=minecraft:marker,tag=dz_raid_east,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..12] add dz_basecamp_raider

