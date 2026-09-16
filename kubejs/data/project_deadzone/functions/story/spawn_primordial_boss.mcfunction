summon pdzbosses:primordial ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_story_boss","dz_story_boss_primordial"],CustomName:'{"text":"PRIMORDIAL","color":"dark_purple","bold":true}',CustomNameVisible:1b}
effect give @e[tag=dz_story_boss_primordial,sort=nearest,limit=1,distance=..4] minecraft:glowing infinite 0 true
tellraw @a [{"text":"[STORY BOSS] ","color":"dark_purple","bold":true},{"text":"原初感染体が覚醒した","color":"red"}]
