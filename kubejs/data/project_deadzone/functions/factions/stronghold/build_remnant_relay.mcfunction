# PROJECT DEADZONE - Remnant Relay editing template
# Origin: player position / footprint: approximately 21 x 15 x 8
kill @e[type=minecraft:marker,tag=dz_remnant_relay_edit_origin]
summon minecraft:marker ~ ~ ~ {Tags:["dz_remnant_relay_edit_origin"]}
fill ~-10 ~ ~-7 ~10 ~7 ~7 minecraft:air
fill ~-10 ~-1 ~-7 ~10 ~-1 ~7 minecraft:polished_deepslate
fill ~-7 ~ ~-5 ~7 ~ ~5 minecraft:light_gray_concrete
fill ~-7 ~1 ~-5 ~7 ~4 ~-5 doomsday_decoration:wiremesh
fill ~-7 ~1 ~5 ~7 ~4 ~5 doomsday_decoration:wiremesh
fill ~-7 ~1 ~-4 ~-7 ~4 ~4 doomsday_decoration:wiremesh
fill ~7 ~1 ~-4 ~7 ~4 ~4 doomsday_decoration:wiremesh
fill ~-6 ~1 ~-4 ~6 ~4 ~4 minecraft:air
fill ~-7 ~5 ~-5 ~7 ~5 ~5 minecraft:iron_block
fill ~-5 ~ ~-3 ~5 ~ ~3 minecraft:black_concrete
fill ~-2 ~1 ~2 ~2 ~3 ~4 minecraft:gray_concrete
fill ~-1 ~1 ~2 ~1 ~2 ~3 minecraft:air
setblock ~0 ~1 ~4 doomsday_decoration:wireless
setblock ~0 ~1 ~3 doomsday_decoration:theserver
setblock ~-2 ~1 ~3 doomsday_decoration:monitor_2
setblock ~2 ~1 ~3 doomsday_decoration:monitor_4
setblock ~-5 ~ ~-3 doomsday_decoration:broadcaster
setblock ~5 ~ ~-3 doomsday_decoration:monitor_3
setblock ~-6 ~1 ~0 doomsday_decoration:floodlight_2
setblock ~6 ~1 ~0 doomsday_decoration:floodlight_3
setblock ~-5 ~ ~3 doomsday_decoration:acrate_2
setblock ~5 ~ ~3 doomsday_decoration:woodencrate
setblock ~-4 ~ ~-2 doomsday_decoration:generator
setblock ~4 ~ ~-2 doomsday_decoration:fixedgenerator
setblock ~-8 ~ ~0 doomsday_decoration:isolationbarrier_1
setblock ~8 ~ ~0 doomsday_decoration:isolationbarrier_2
tellraw @s [{"text":"[BUILDING EDIT] ","color":"gold","bold":true},{"text":"Remnant Relay template placed. ","color":"aqua"},{"text":"[保存ブロックを配置]","color":"yellow","underlined":true,"clickEvent":{"action":"run_command","value":"/function project_deadzone:building_edit/prepare_remnant_relay_save"}}]
