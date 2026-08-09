# PROJECT DEADZONE - Raider Roadblock editing template
# Origin: player position / footprint: approximately 21 x 15 x 7
kill @e[type=minecraft:marker,tag=dz_raider_roadblock_edit_origin]
summon minecraft:marker ~ ~ ~ {Tags:["dz_raider_roadblock_edit_origin"]}
fill ~-10 ~ ~-7 ~10 ~6 ~7 minecraft:air
fill ~-10 ~-1 ~-7 ~10 ~-1 ~7 minecraft:gray_concrete
fill ~-10 ~-1 ~-2 ~10 ~-1 ~2 minecraft:black_concrete
fill ~-10 ~-1 ~0 ~10 ~-1 ~0 minecraft:yellow_concrete
fill ~-1 ~-1 ~0 ~1 ~-1 ~0 minecraft:black_concrete
setblock ~-8 ~ ~-3 doomsday_decoration:highwayguardrail
setblock ~-5 ~ ~-3 doomsday_decoration:barriergatepole
setblock ~-4 ~ ~-3 doomsday_decoration:barriergate
setblock ~4 ~ ~3 doomsday_decoration:barriergate
setblock ~5 ~ ~3 doomsday_decoration:barriergatepole
setblock ~8 ~ ~3 doomsday_decoration:highwayguardrail
setblock ~-7 ~ ~4 doomsday_decoration:sandbag
setblock ~-6 ~ ~4 doomsday_decoration:sandbag_2
setblock ~-5 ~ ~4 doomsday_decoration:sandbag_3
setblock ~5 ~ ~-4 doomsday_decoration:sandbag_3
setblock ~6 ~ ~-4 doomsday_decoration:sandbag_2
setblock ~7 ~ ~-4 doomsday_decoration:sandbag
setblock ~-8 ~ ~5 doomsday_decoration:woodencrate
setblock ~-7 ~ ~5 doomsday_decoration:ammunitionbox
setblock ~7 ~ ~-5 doomsday_decoration:acrate
setblock ~8 ~ ~-5 doomsday_decoration:woodencrate
fill ~-3 ~ ~4 ~3 ~ ~6 minecraft:polished_deepslate
fill ~-3 ~1 ~4 ~3 ~3 ~6 minecraft:iron_bars
fill ~-2 ~1 ~4 ~2 ~2 ~6 minecraft:air
fill ~-3 ~4 ~4 ~3 ~4 ~6 minecraft:deepslate_tiles
setblock ~0 ~1 ~5 doomsday_decoration:generator
setblock ~-2 ~1 ~5 doomsday_decoration:electricbox
setblock ~2 ~1 ~5 doomsday_decoration:radio
setblock ~0 ~1 ~6 doomsday_decoration:floodlight
setblock ~-9 ~ ~-6 doomsday_decoration:roadsignpole
setblock ~9 ~ ~6 doomsday_decoration:spotlight
tellraw @s [{"text":"[BUILDING EDIT] ","color":"gold","bold":true},{"text":"Raider Roadblock template placed. ","color":"yellow"},{"text":"[保存ブロックを配置]","color":"aqua","underlined":true,"clickEvent":{"action":"run_command","value":"/function project_deadzone:building_edit/prepare_raider_roadblock_save"}}]
