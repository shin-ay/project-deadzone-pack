title @a actionbar {"text":"PDZ CITY V6 生成 6/21","color":"gold"}
execute at @e[type=minecraft:marker,tag=dz_city_japan_v6_origin,limit=1] run function project_deadzone:city_test/japan_v6_surface_05
schedule function project_deadzone:city_test/japan_v6_stage_06 10t replace
