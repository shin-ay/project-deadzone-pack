function project_deadzone:factions/spawn/raider_warden
tag @e[tag=dz_raider_warden,sort=nearest,limit=1,distance=..4] add dz_story_boss_policestation
tag @e[tag=dz_story_boss_policestation,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_policestation,sort=nearest,limit=1,distance=..4] add dz_story_npc
data merge entity @e[tag=dz_story_boss_policestation,sort=nearest,limit=1,distance=..4] {BanditVariant:2,CustomName:'{"text":"MARSHAL GRAVES","color":"blue","bold":true}',CustomNameVisible:1b,Glowing:1b}
tellraw @a[distance=..48] {"text":"[BOSS] MARSHAL GRAVESが警察署を封鎖している","color":"blue","bold":true}
