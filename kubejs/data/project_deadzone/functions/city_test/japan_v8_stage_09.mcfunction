title @a actionbar {"text":"PDZ CITY V8 生成 10/42","color":"gold"}
execute at @e[type=minecraft:marker,tag=dz_city_japan_v8_origin,limit=1] run function project_deadzone:city_test/japan_v8_buildings_06
schedule function project_deadzone:city_test/japan_v8_stage_10 10t replace
