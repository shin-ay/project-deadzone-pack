function project_deadzone:factions/spawn/raider_enforcer
tag @e[tag=dz_raider_enforcer,sort=nearest,limit=1,distance=..4] add dz_story_boss_gunshop
tag @e[tag=dz_story_boss_gunshop,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_gunshop,sort=nearest,limit=1,distance=..4] add dz_story_npc
data merge entity @e[tag=dz_story_boss_gunshop,sort=nearest,limit=1,distance=..4] {CustomName:'{"text":"Gun Shop Enforcer","color":"dark_red","bold":true}',CustomNameVisible:1b}
tellraw @a[distance=..32] {"text":"[任務] Gun ShopのRaider Enforcerが現れた","color":"gold"}
