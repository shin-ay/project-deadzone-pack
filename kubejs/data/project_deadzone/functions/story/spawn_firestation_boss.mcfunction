function project_deadzone:factions/spawn/raider_enforcer
tag @e[tag=dz_raider_enforcer,sort=nearest,limit=1,distance=..4] add dz_story_boss_firestation
tag @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] add dz_story_npc
data merge entity @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] {CustomName:'{"text":"Raider Ash Captain","color":"dark_red","bold":true}',CustomNameVisible:1b}
attribute @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 55
data merge entity @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] {Health:55.0f}
tellraw @a[distance=..48] {"text":"[任務] Raider Ash Captainが救助指令室を占拠している","color":"dark_red","bold":true}
