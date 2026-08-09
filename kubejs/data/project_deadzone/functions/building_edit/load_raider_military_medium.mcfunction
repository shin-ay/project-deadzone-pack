# PROJECT DEADZONE - medium Raider stronghold editing base
kill @e[type=minecraft:marker,tag=dz_raider_military_medium_edit_origin]
summon minecraft:marker ~ ~ ~ {Tags:["dz_raider_military_medium_edit_origin"]}
place template apocalypsenow:military ~ ~ ~
tellraw @s [{"text":"[BUILDING EDIT] ","color":"gold","bold":true},{"text":"Apocalypse Now military facility loaded.","color":"green"}]
tellraw @s [{"text":"Required: ","color":"yellow"},{"text":"1 Core + electric box/radio/broadcaster + default/group/single spawners","color":"aqua"}]
tellraw @s [{"text":"After NPC setup: ","color":"gray"},{"text":"/deadzonecore bind_raider_medium","color":"yellow","underlined":true,"clickEvent":{"action":"suggest_command","value":"/deadzonecore bind_raider_medium"}}]
tellraw @s [{"text":"Save helper: ","color":"gray"},{"text":"/function project_deadzone:building_edit/prepare_raider_military_medium_save","color":"aqua","underlined":true,"clickEvent":{"action":"run_command","value":"/function project_deadzone:building_edit/prepare_raider_military_medium_save"}}]
