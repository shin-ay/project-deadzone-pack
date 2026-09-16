summon pdzbosses:choir_vessel ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_story_boss","dz_story_boss_choir_vessel"],CustomName:'{"text":"CHOIR VESSEL","color":"dark_purple","bold":true}',CustomNameVisible:1b}
effect give @e[tag=dz_story_boss_choir_vessel,sort=nearest,limit=1,distance=..4] minecraft:glowing infinite 0 true
tellraw @a [{"text":"[THE CHOIR] ","color":"dark_purple","bold":true},{"text":"あなたたちは、まだ一つではない。","color":"light_purple"}]
