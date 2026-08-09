summon minecraft:marker ~ ~ ~ {Tags:["dz_control_marker","dz_raider_site","dz_unassigned"]}
scoreboard players set @e[type=minecraft:marker,tag=dz_unassigned,tag=dz_raider_site,distance=..2,sort=nearest,limit=1] dz_control 0
tag @e[type=minecraft:marker,tag=dz_unassigned,tag=dz_raider_site,distance=..2,sort=nearest,limit=1] remove dz_unassigned
tellraw @s {"text":"[DEADZONE] Raider制圧判定地点を作成しました（半径32）","color":"red"}
