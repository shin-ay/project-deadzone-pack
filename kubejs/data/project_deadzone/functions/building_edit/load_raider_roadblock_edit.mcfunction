kill @e[type=minecraft:marker,tag=dz_raider_roadblock_edit_origin]
summon minecraft:marker ~ ~ ~ {Tags:["dz_raider_roadblock_edit_origin"]}
place template project_deadzone:raider_roadblock_edit ~ ~ ~
tellraw @s [{"text":"[BUILDING EDIT] ","color":"gold","bold":true},{"text":"Completed Raider Roadblock loaded.","color":"green"}]
tellraw @s [{"text":"Bind control devices with ","color":"gray"},{"text":"/deadzonecore bind_raider","color":"yellow","underlined":true,"clickEvent":{"action":"suggest_command","value":"/deadzonecore bind_raider"}}]
