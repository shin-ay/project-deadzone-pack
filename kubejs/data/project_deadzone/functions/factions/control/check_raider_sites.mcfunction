execute as @e[type=minecraft:marker,tag=dz_raider_site,scores={dz_control=0}] at @s unless entity @e[tag=dz_raider,distance=..32] run scoreboard players set @s dz_control 1
execute as @e[type=minecraft:marker,tag=dz_raider_site,scores={dz_control=1}] at @s run particle minecraft:happy_villager ~ ~1 ~ 1 1 1 0.1 20 force
