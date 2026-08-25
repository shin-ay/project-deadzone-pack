kill @e[type=minecraft:marker,tag=dz_city_japan_v4_origin]
execute positioned ~ ~ ~ positioned over world_surface run summon minecraft:marker ~ ~1 ~ {Tags:["dz_city_japan_v4_origin","dz_city_edit_origin"]}
execute at @e[type=minecraft:marker,tag=dz_city_japan_v4_origin,limit=1] run function project_deadzone:city_test/japan_v4_build
