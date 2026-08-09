kill @e[type=minecraft:marker,tag=dz_remnant_relay_edit_origin]
summon minecraft:marker ~ ~ ~ {Tags:["dz_remnant_relay_edit_origin"]}
place template project_deadzone:remnant_relay_edit ~ ~ ~
tellraw @s [{"text":"[BUILDING EDIT] ","color":"gold","bold":true},{"text":"Completed Remnant Relay loaded.","color":"green"}]
tellraw @s [{"text":"Bind control devices with ","color":"gray"},{"text":"/deadzonecore bind_remnant","color":"yellow","underlined":true,"clickEvent":{"action":"suggest_command","value":"/deadzonecore bind_remnant"}}]
