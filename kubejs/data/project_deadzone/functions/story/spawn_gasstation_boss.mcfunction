function project_deadzone:factions/spawn/raider_scout
tag @e[tag=dz_raider_scout,sort=nearest,limit=1,distance=..4] add dz_story_boss_gasstation
tag @e[tag=dz_story_boss_gasstation,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_gasstation,sort=nearest,limit=1,distance=..4] add dz_story_npc
data merge entity @e[tag=dz_story_boss_gasstation,sort=nearest,limit=1,distance=..4] {CustomName:'{"text":"Fuel Route Scout","color":"red","bold":true}',CustomNameVisible:1b}
tellraw @a[distance=..32] {"text":"[任務] Gas Stationの偵察隊長が現れた","color":"gold"}
