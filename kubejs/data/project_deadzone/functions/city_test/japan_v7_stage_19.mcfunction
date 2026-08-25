title @a actionbar {"text":"PDZ CITY V7 生成 20/48","color":"gold"}
execute at @e[type=minecraft:marker,tag=dz_city_japan_v7_origin,limit=1] run function project_deadzone:city_test/japan_v7_buildings_10
schedule function project_deadzone:city_test/japan_v7_stage_20 10t replace
