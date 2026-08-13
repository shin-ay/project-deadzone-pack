summon infectious:giant_zombie ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_story_boss","dz_story_boss_choir_vessel"],CustomName:'{"text":"CHOIR VESSEL","color":"dark_purple","bold":true}',CustomNameVisible:1b}
attribute @e[tag=dz_story_boss_choir_vessel,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 280
attribute @e[tag=dz_story_boss_choir_vessel,sort=nearest,limit=1,distance=..4] minecraft:generic.armor base set 14
attribute @e[tag=dz_story_boss_choir_vessel,sort=nearest,limit=1,distance=..4] minecraft:generic.knockback_resistance base set 1
data merge entity @e[tag=dz_story_boss_choir_vessel,sort=nearest,limit=1,distance=..4] {Health:280.0f}
effect give @e[tag=dz_story_boss_choir_vessel,sort=nearest,limit=1,distance=..4] minecraft:glowing infinite 0 true
tellraw @a [{"text":"[THE CHOIR] ","color":"dark_purple","bold":true},{"text":"あなたたちは、まだ一つではない。","color":"light_purple"}]
