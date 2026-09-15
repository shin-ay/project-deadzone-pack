function project_deadzone:factions/spawn/raider_enforcer
tag @e[tag=dz_raider_enforcer,sort=nearest,limit=1,distance=..4] add dz_story_boss_gunshop
tag @e[tag=dz_story_boss_gunshop,sort=nearest,limit=1,distance=..4] add dz_story_boss
tag @e[tag=dz_story_boss_gunshop,sort=nearest,limit=1,distance=..4] add dz_story_npc
data merge entity @e[tag=dz_story_boss_gunshop,sort=nearest,limit=1,distance=..4] {BanditVariant:2,CustomName:'{"text":"BRASS HOUND","color":"gold","bold":true}',CustomNameVisible:1b,Glowing:1b}
tellraw @a[distance=..48] {"text":"[BOSS] BRASS HOUNDが武器庫を封鎖。弾薬供給セルを破壊せよ","color":"gold","bold":true}
