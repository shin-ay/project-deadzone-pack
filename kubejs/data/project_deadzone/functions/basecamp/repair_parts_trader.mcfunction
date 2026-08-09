# Restore only the Survivor Camp tools/parts trader (Goro).
# The camp core marker is origin +24.5,+11,+16.5; Goro stands at origin +25.5,+2,+24.5.
execute unless entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1] run tellraw @s {"text":"[PROJECT DEADZONE] キャンプの基準点が見つかりません。","color":"red"}
execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] positioned ~1 ~-9 ~8 run kill @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,distance=..2]
execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] positioned ~1 ~-9 ~8 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_goro_parts.npc.nbt ~ ~ ~
execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] positioned ~1 ~-9 ~8 run tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_staff,sort=nearest,limit=1,distance=..1] add dz_basecamp_staff
execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] positioned ~1 ~-9 ~8 run tag @e[type=easy_npc:humanoid,tag=dz_basecamp_staff,tag=!dz_basecamp_trader_parts,sort=nearest,limit=1,distance=..1] add dz_basecamp_trader_parts
execute as @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,sort=nearest,limit=1] run data merge entity @s {CustomName:'{"text":"ゴロ｜工具・工業部品","color":"yellow"}',CustomNameVisible:1b,Invulnerable:1b,PersistenceRequired:1b}
team join dz_survivors @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,sort=nearest,limit=1]
function project_deadzone:basecamp/apply_staff_profiles
function project_deadzone:basecamp/apply_staff_random_dialogues
function project_deadzone:basecamp/apply_trade_economy
function project_deadzone:basecamp/fix_staff_facing
execute if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,limit=1] run tellraw @s {"text":"[PROJECT DEADZONE] ゴロ（工具・工業部品）を復旧しました。","color":"green"}
