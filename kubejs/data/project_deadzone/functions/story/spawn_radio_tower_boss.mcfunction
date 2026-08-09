function project_deadzone:factions/spawn/remnant_heavy
tag @e[tag=dz_remnant_heavy,sort=nearest,limit=1,distance=..4] add dz_story_boss_radio_tower
tag @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] add dz_story_npc
data merge entity @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] {CustomName:'{"text":"Remnant Signal Hunter","color":"dark_purple","bold":true}',CustomNameVisible:1b}
attribute @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 75
data merge entity @e[tag=dz_story_boss_radio_tower,sort=nearest,limit=1,distance=..4] {Health:75.0f}
tellraw @a[distance=..64] {"text":"[警告] Remnant Signal Hunterが送信源を捕捉した","color":"dark_purple","bold":true}
