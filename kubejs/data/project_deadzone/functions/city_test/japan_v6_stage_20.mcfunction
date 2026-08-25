title @a actionbar {"text":"PDZ CITY V6 生成 21/21","color":"gold"}
execute at @e[type=minecraft:marker,tag=dz_city_japan_v6_origin,limit=1] run function project_deadzone:city_test/japan_v6_details
tellraw @a [{"text":"[PDZ CITY V6] ","color":"green","bold":true},{"text":"生成完了。上空と地上の両方から確認してください。","color":"white"}]
kill @e[type=minecraft:marker,tag=dz_city_japan_v6_origin]
