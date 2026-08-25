title @a actionbar {"text":"PDZ CITY V7 生成 30/48","color":"gold"}
execute at @e[type=minecraft:marker,tag=dz_city_japan_v7_origin,limit=1] run function project_deadzone:city_test/japan_v7_buildings_20
schedule function project_deadzone:city_test/japan_v7_stage_30 10t replace
