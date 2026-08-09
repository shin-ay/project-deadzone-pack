tellraw @s {"text":"[DEADZONE] 4勢力を間隔を空けて召喚します","color":"yellow"}
execute positioned ~8 ~ ~ run function project_deadzone:factions/squad/survivors
execute positioned ~24 ~ ~ run function project_deadzone:factions/squad/civildef
execute positioned ~8 ~ ~24 run function project_deadzone:factions/squad/raiders
execute positioned ~24 ~ ~24 run function project_deadzone:factions/squad/remnant
function project_deadzone:factions/status
