# Run at the 32x20x32 Survivor Camp structure origin.
# This is intentionally separate from activate.mcfunction until the migration is tested.
execute positioned ~16 ~10 ~16 run kill @e[tag=dz_basecamp_staff,distance=..28]
# Clean up untagged leftovers from an interrupted or older migration.
execute positioned ~9.5 ~1 ~24.5 run kill @e[type=easy_npc:humanoid,distance=..1]
execute positioned ~19.5 ~6 ~24.5 run kill @e[type=easy_npc:humanoid,distance=..1]
execute positioned ~19.5 ~2 ~20.5 run kill @e[type=easy_npc:humanoid,distance=..1]
execute positioned ~14.5 ~1 ~28.5 run kill @e[type=easy_npc:humanoid,distance=..1]
execute positioned ~15.5 ~1 ~27.5 run kill @e[type=easy_npc:humanoid,distance=..1]
execute positioned ~25.5 ~2 ~24.5 run kill @e[type=easy_npc:humanoid,distance=..1]

# JOB guide
execute positioned ~9.5 ~1 ~24.5 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_minato_job.npc.nbt ~ ~ ~
execute positioned ~9.5 ~1 ~24.5 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_staff,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_staff
execute positioned ~9.5 ~1 ~24.5 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,tag=!dz_basecamp_job_guide,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_job_guide
execute positioned ~9.5 ~1 ~24.5 run data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,sort=nearest,limit=1,distance=..0.75] {CustomName:'{"text":"JOB案内担当","color":"light_purple"}',CustomNameVisible:1b,Invulnerable:1b,PersistenceRequired:1b}

# Radio / main quest contact
execute positioned ~19.5 ~6 ~24.5 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_rei_radio.npc.nbt ~ ~ ~
execute positioned ~19.5 ~6 ~24.5 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_staff,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_staff
execute positioned ~19.5 ~6 ~24.5 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,tag=!dz_basecamp_radio,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_radio
execute positioned ~19.5 ~6 ~24.5 run data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,sort=nearest,limit=1,distance=..0.75] {CustomName:'{"text":"周波数107.3 無線担当","color":"aqua"}',CustomNameVisible:1b,Invulnerable:1b,PersistenceRequired:1b}

# Buddy recruiter
execute positioned ~19.5 ~2 ~20.5 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_hank_buddy.npc.nbt ~ ~ ~
execute positioned ~19.5 ~2 ~20.5 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_staff,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_staff
execute positioned ~19.5 ~2 ~20.5 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,tag=!dz_basecamp_buddy_recruiter,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_buddy_recruiter
execute positioned ~19.5 ~2 ~20.5 run data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,sort=nearest,limit=1,distance=..0.75] {CustomName:'{"text":"Buddy募集担当","color":"aqua"}',CustomNameVisible:1b,Invulnerable:1b,PersistenceRequired:1b}

# Food and water trader
execute positioned ~14.5 ~1 ~28.5 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_maya_food.npc.nbt ~ ~ ~
execute positioned ~14.5 ~1 ~28.5 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_staff,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_staff
execute positioned ~14.5 ~1 ~28.5 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,tag=!dz_basecamp_trader_food,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_trader_food
execute positioned ~14.5 ~1 ~28.5 run data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,sort=nearest,limit=1,distance=..0.75] {CustomName:'{"text":"補給担当：食料・水","color":"yellow"}',CustomNameVisible:1b,Invulnerable:1b,PersistenceRequired:1b}

# Medical trader
execute positioned ~15.5 ~1 ~27.5 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_shiori_medical.npc.nbt ~ ~ ~
execute positioned ~15.5 ~1 ~27.5 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_staff,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_staff
execute positioned ~15.5 ~1 ~27.5 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,tag=!dz_basecamp_trader_medical,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_trader_medical
execute positioned ~15.5 ~1 ~27.5 run data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,sort=nearest,limit=1,distance=..0.75] {CustomName:'{"text":"補給担当：医療","color":"yellow"}',CustomNameVisible:1b,Invulnerable:1b,PersistenceRequired:1b}

# Tools and parts trader
execute positioned ~25.5 ~2 ~24.5 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_goro_parts.npc.nbt ~ ~ ~
execute positioned ~25.5 ~2 ~24.5 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_staff,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_staff
execute positioned ~25.5 ~2 ~24.5 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,tag=!dz_basecamp_trader_parts,sort=nearest,limit=1,distance=..0.75] add dz_basecamp_trader_parts
execute positioned ~25.5 ~2 ~24.5 run data merge entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,sort=nearest,limit=1,distance=..0.75] {CustomName:'{"text":"補給担当：工具・部品","color":"yellow"}',CustomNameVisible:1b,Invulnerable:1b,PersistenceRequired:1b}

function project_deadzone:basecamp/apply_staff_profiles
function project_deadzone:basecamp/apply_staff_random_dialogues
function project_deadzone:basecamp/apply_trade_economy
function project_deadzone:basecamp/apply_staff_services
function project_deadzone:basecamp/fix_staff_facing
execute positioned ~16 ~10 ~16 run team join dz_survivors @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,distance=..28]
tellraw @a[distance=..64] {"text":"[PROJECT DEADZONE] キャンプ職員をEasy NPCへ移行しました","color":"green","bold":true}
