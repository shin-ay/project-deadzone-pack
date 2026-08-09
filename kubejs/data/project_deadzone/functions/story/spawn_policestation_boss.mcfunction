function project_deadzone:factions/spawn/raider_warden
tag @e[tag=dz_raider_warden,sort=nearest,limit=1,distance=..4] add dz_story_boss_policestation
tag @e[tag=dz_story_boss_policestation,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_policestation,sort=nearest,limit=1,distance=..4] add dz_story_npc
tellraw @a[distance=..48] {"text":"[任務] Raider Wardenが警察署を封鎖している","color":"dark_red","bold":true}
