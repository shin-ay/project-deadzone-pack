title @a actionbar {"text":"PDZ CITY V8 生成 4/42","color":"gold"}
execute at @e[type=minecraft:marker,tag=dz_city_japan_v8_origin,limit=1] run function project_deadzone:city_test/japan_v8_railway
schedule function project_deadzone:city_test/japan_v8_stage_04 10t replace
