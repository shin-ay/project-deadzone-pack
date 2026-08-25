summon infectious:mutant_zombie ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_story_boss","dz_story_boss_primordial"],CustomName:'{"text":"原初感染体","color":"dark_purple","bold":true}',CustomNameVisible:1b}
attribute @e[tag=dz_story_boss_primordial,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 180
attribute @e[tag=dz_story_boss_primordial,sort=nearest,limit=1,distance=..4] minecraft:generic.armor base set 14
attribute @e[tag=dz_story_boss_primordial,sort=nearest,limit=1,distance=..4] minecraft:generic.knockback_resistance base set 0.85
data merge entity @e[tag=dz_story_boss_primordial,sort=nearest,limit=1,distance=..4] {Health:180.0f}
effect give @e[tag=dz_story_boss_primordial,sort=nearest,limit=1,distance=..4] minecraft:glowing infinite 0 true
tellraw @a [{"text":"[STORY BOSS] ","color":"dark_purple","bold":true},{"text":"原初感染体が覚醒した","color":"red"}]
