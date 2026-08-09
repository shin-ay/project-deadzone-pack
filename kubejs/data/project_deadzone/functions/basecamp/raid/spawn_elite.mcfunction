# Five-player scaling: one Raider Enforcer from a random approach.
execute at @e[type=minecraft:marker,tag=dz_basecamp_raid_anchor,sort=random,limit=1] positioned ~ ~ ~4 run function project_deadzone:factions/spawn/raider_enforcer
execute at @e[type=minecraft:marker,tag=dz_basecamp_raid_anchor,sort=random,limit=1] run tag @e[tag=dz_raider,tag=!dz_basecamp_raider,sort=nearest,limit=1,distance=..16] add dz_basecamp_raider
