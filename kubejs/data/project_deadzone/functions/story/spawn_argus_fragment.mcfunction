summon infectious:mecha_zombie ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_story_boss","dz_story_boss_argus_fragment"],CustomName:'{"text":"ARGUS Fragment","color":"gold","bold":true}',CustomNameVisible:1b}
attribute @e[tag=dz_story_boss_argus_fragment,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 240
attribute @e[tag=dz_story_boss_argus_fragment,sort=nearest,limit=1,distance=..4] minecraft:generic.armor base set 18
attribute @e[tag=dz_story_boss_argus_fragment,sort=nearest,limit=1,distance=..4] minecraft:generic.knockback_resistance base set 0.95
data merge entity @e[tag=dz_story_boss_argus_fragment,sort=nearest,limit=1,distance=..4] {Health:240.0f}
effect give @e[tag=dz_story_boss_argus_fragment,sort=nearest,limit=1,distance=..4] minecraft:glowing infinite 0 true
team join dz_warden @e[tag=dz_story_boss_argus_fragment,sort=nearest,limit=1,distance=..4]
tellraw @a [{"text":"[STORY BOSS] ","color":"gold","bold":true},{"text":"ARGUS Fragmentが実体化した","color":"red"}]
