kill @e[type=minecraft:marker,tag=dz_city_great_lakes_v2_origin]
execute positioned ~ ~ ~ positioned over world_surface run summon minecraft:marker ~ ~1 ~ {Tags:["dz_city_great_lakes_v2_origin","dz_city_edit_origin"]}
execute at @e[type=minecraft:marker,tag=dz_city_great_lakes_v2_origin,limit=1] if block ~ ~-1 ~ minecraft:water run tellraw @s [{"text":"[PDZ CITY v2] ","color":"red","bold":true},{"text":"水面では生成できません。平坦な陸地か編集用スーパーフラットで実行してください。","color":"yellow"}]
execute at @e[type=minecraft:marker,tag=dz_city_great_lakes_v2_origin,limit=1] if block ~ ~-1 ~ minecraft:water run kill @e[type=minecraft:marker,tag=dz_city_great_lakes_v2_origin,limit=1]
execute at @e[type=minecraft:marker,tag=dz_city_great_lakes_v2_origin,limit=1] run function project_deadzone:city_test/great_lakes_v2_build
