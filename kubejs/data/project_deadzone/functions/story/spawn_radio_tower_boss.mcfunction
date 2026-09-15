function project_deadzone:factions/spawn/remnant_heavy
tag @e[tag=dz_remnant_heavy,sort=nearest,limit=1,distance=..4] add dz_story_boss_radio_tower
tag @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] add dz_story_npc
data merge entity @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] {Variant:4,CustomName:'{"text":"ECHO-7","color":"dark_purple","bold":true}',CustomNameVisible:1b,Glowing:1b}
attribute @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 75
data merge entity @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] {Health:75.0f}
tellraw @a[distance=..64] {"text":"[BOSS] ECHO-7が送信源を捕捉。狙撃標定を遮蔽で切れ","color":"dark_purple","bold":true}
