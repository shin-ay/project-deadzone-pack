kill @e[type=minecraft:marker,tag=dz_city_great_lakes_v3_origin]
execute positioned ~ ~ ~ positioned over world_surface run summon minecraft:marker ~ ~1 ~ {Tags:["dz_city_great_lakes_v3_origin","dz_city_edit_origin"]}
execute at @e[type=minecraft:marker,tag=dz_city_great_lakes_v3_origin,limit=1] run function project_deadzone:city_test/great_lakes_v3_build
