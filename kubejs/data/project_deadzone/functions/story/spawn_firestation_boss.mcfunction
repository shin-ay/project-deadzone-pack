function project_deadzone:factions/spawn/raider_enforcer
tag @e[tag=dz_raider_enforcer,sort=nearest,limit=1,distance=..4] add dz_story_boss_firestation
tag @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] add dz_story_npc
data merge entity @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] {BanditVariant:3,CustomName:'{"text":"CINDER","color":"dark_red","bold":true}',CustomNameVisible:1b,Glowing:1b}
attribute @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 55
data merge entity @e[tag=dz_story_boss_firestation,sort=nearest,limit=1,distance=..4] {Health:55.0f}
tellraw @a[distance=..48] {"text":"[BOSS] CINDERが救助指令室を焼夷封鎖している","color":"dark_red","bold":true}
