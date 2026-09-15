function project_deadzone:factions/spawn/raider_medic
tag @e[tag=dz_raider_medic,sort=nearest,limit=1,distance=..4] add dz_story_boss_hospital
tag @e[tag=dz_story_boss_hospital,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_hospital,sort=nearest,limit=1,distance=..4] add dz_story_npc
data merge entity @e[tag=dz_story_boss_hospital,sort=nearest,limit=1,distance=..4] {BanditVariant:1,CustomName:'{"text":"WHITE STITCH","color":"white","bold":true}',CustomNameVisible:1b,Glowing:1b}
attribute @e[tag=dz_story_boss_hospital,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 70
attribute @e[tag=dz_story_boss_hospital,sort=nearest,limit=1,distance=..4] minecraft:generic.armor base set 8
data merge entity @e[tag=dz_story_boss_hospital,sort=nearest,limit=1,distance=..4] {Health:70.0f}
tellraw @a[distance=..64] {"text":"[BOSS] WHITE STITCHが薬品保管区画を占拠している","color":"white","bold":true}
