summon simpleenemymod:ruunit ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_npc","dz_remnant","dz_hostile","dz_story_boss","dz_story_boss_t4_relay_shepherd","dz_pdz_boss"],CustomName:'{"text":"FIRST VOICE // RELAY SHEPHERD","color":"dark_purple","bold":true}',CustomNameVisible:1b}
attribute @e[tag=dz_story_boss_t4_relay_shepherd,tag=!dz_t4_boss_initialized,sort=nearest,limit=1,distance=..4] minecraft:generic.max_health base set 180
attribute @e[tag=dz_story_boss_t4_relay_shepherd,tag=!dz_t4_boss_initialized,sort=nearest,limit=1,distance=..4] minecraft:generic.armor base set 18
attribute @e[tag=dz_story_boss_t4_relay_shepherd,tag=!dz_t4_boss_initialized,sort=nearest,limit=1,distance=..4] minecraft:generic.knockback_resistance base set 0.9
data merge entity @e[tag=dz_story_boss_t4_relay_shepherd,tag=!dz_t4_boss_initialized,sort=nearest,limit=1,distance=..4] {Health:180.0f,HandDropChances:[0.0f,0.0f]}
team join dz_remnant @e[tag=dz_story_boss_t4_relay_shepherd,tag=!dz_t4_boss_initialized,sort=nearest,limit=1,distance=..4]
