tellraw @s {"text":"[DEADZONE] 役職別NPC編成を召喚します。十分に距離を空けてください。","color":"yellow"}
execute positioned ~8 ~ ~ run function project_deadzone:factions/squad/survivors_roles
execute positioned ~24 ~ ~ run function project_deadzone:factions/squad/civildef_roles
execute positioned ~8 ~ ~24 run function project_deadzone:factions/squad/raiders_roles
execute positioned ~24 ~ ~24 run function project_deadzone:factions/squad/remnant_roles
function project_deadzone:factions/status
