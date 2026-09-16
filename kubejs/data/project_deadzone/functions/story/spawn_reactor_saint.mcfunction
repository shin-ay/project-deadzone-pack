summon pdzbosses:reactor_saint ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_story_boss","dz_story_boss_reactor_saint"],CustomName:'{"text":"REACTOR SAINT","color":"green","bold":true}',CustomNameVisible:1b}
effect give @e[tag=dz_story_boss_reactor_saint,sort=nearest,limit=1,distance=..4] minecraft:glowing infinite 0 true
tellraw @a [{"text":"[STORY BOSS] ","color":"green","bold":true},{"text":"REACTOR SAINTが隔離区画を封鎖した","color":"yellow"}]
