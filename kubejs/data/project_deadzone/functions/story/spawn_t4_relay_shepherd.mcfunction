summon pdzbosses:relay_shepherd ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_npc","dz_remnant","dz_hostile","dz_story_boss","dz_story_boss_t4_relay_shepherd","dz_pdz_boss"],CustomName:'{"text":"RELAY SHEPHERD","color":"dark_purple","bold":true}',CustomNameVisible:1b}
team join dz_remnant @e[tag=dz_story_boss_t4_relay_shepherd,tag=!dz_t4_boss_initialized,sort=nearest,limit=1,distance=..4]
