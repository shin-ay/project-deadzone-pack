summon infectious:radioactive_zombie ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_story_boss","dz_story_boss_reactor_saint"],CustomName:'{"text":"REACTOR SAINT","color":"green","bold":true}',CustomNameVisible:1b}
attribute @e[tag=dz_story_boss_reactor_saint,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 220
attribute @e[tag=dz_story_boss_reactor_saint,sort=nearest,limit=1,distance=..4] minecraft:generic.armor base set 16
attribute @e[tag=dz_story_boss_reactor_saint,sort=nearest,limit=1,distance=..4] minecraft:generic.knockback_resistance base set 0.9
data merge entity @e[tag=dz_story_boss_reactor_saint,sort=nearest,limit=1,distance=..4] {Health:220.0f}
effect give @e[tag=dz_story_boss_reactor_saint,sort=nearest,limit=1,distance=..4] minecraft:glowing infinite 0 true
tellraw @a [{"text":"[STORY BOSS] ","color":"green","bold":true},{"text":"REACTOR SAINTが隔離区画を封鎖した","color":"yellow"}]
