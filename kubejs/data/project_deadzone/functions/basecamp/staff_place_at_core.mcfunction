# Internal function. Execution position must be dz_basecamp_core_anchor.
# Coordinates are relative to the core at camp structure offset 24.5,11,16.5.

# Minato / JOB guide: structure offset 9.5,1,24.5
execute positioned ~-15 ~-10 ~8 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_minato_job.npc.nbt ~ ~ ~
execute positioned ~-15 ~-10 ~8 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_job_guide,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_job_guide
execute positioned ~-15 ~-10 ~8 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_staff

# Rei / radio contact: structure offset 19.5,6,24.5
execute positioned ~-5 ~-5 ~8 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_rei_radio.npc.nbt ~ ~ ~
execute positioned ~-5 ~-5 ~8 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_radio,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_radio
execute positioned ~-5 ~-5 ~8 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_staff

# Hank / Buddy recruiter: structure offset 19.5,2,20.5
execute positioned ~-5 ~-9 ~4 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_hank_buddy.npc.nbt ~ ~ ~
execute positioned ~-5 ~-9 ~4 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_buddy_recruiter,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_buddy_recruiter
execute positioned ~-5 ~-9 ~4 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_staff

# Maya / food trader: structure offset 14.5,1,28.5
execute positioned ~-10 ~-10 ~12 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_maya_food.npc.nbt ~ ~ ~
execute positioned ~-10 ~-10 ~12 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_trader_food,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_trader_food
execute positioned ~-10 ~-10 ~12 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_staff

# Shiori / medical trader: structure offset 15.5,1,27.5
execute positioned ~-9 ~-10 ~11 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_shiori_medical.npc.nbt ~ ~ ~
execute positioned ~-9 ~-10 ~11 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_trader_medical,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_trader_medical
execute positioned ~-9 ~-10 ~11 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_staff

# Goro / parts trader: structure offset 25.5,2,24.5
execute positioned ~1 ~-9 ~8 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_goro_parts.npc.nbt ~ ~ ~
execute positioned ~1 ~-9 ~8 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_trader_parts,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_trader_parts
execute positioned ~1 ~-9 ~8 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,sort=nearest,limit=1,distance=..0.8] add dz_basecamp_staff

# Preserve each finalized preset's skin, name, dialogue, trade and service data.
# Only add stable camp ownership and movement protection here.
data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,sort=nearest,limit=1,distance=..32] {Invulnerable:1b,PersistenceRequired:1b,NoAI:1b}
data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,sort=nearest,limit=1,distance=..32] {Invulnerable:1b,PersistenceRequired:1b,NoAI:1b}
data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,sort=nearest,limit=1,distance=..32] {Invulnerable:1b,PersistenceRequired:1b,NoAI:1b}
data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,sort=nearest,limit=1,distance=..32] {Invulnerable:1b,PersistenceRequired:1b,NoAI:1b}
data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,sort=nearest,limit=1,distance=..32] {Invulnerable:1b,PersistenceRequired:1b,NoAI:1b}
data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,sort=nearest,limit=1,distance=..32] {Invulnerable:1b,PersistenceRequired:1b,NoAI:1b}
team join dz_survivors @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,tag=!dz_basecamp_trader_clothing,distance=..32]
function project_deadzone:basecamp/staff_reset_positions_at_core
function project_deadzone:basecamp/staff_status_at_core
tellraw @a[distance=..64] {"text":"[PROJECT DEADZONE] キャンプ職員6名を配置しました。位置と向きを確認してください。","color":"green","bold":true}
