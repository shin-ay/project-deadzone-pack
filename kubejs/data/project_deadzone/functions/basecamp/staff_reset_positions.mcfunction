# Public maintenance command. Restores the six tested positions and facings.
execute unless entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run tellraw @s {"text":"[PROJECT DEADZONE] キャンプコアが見つかりません。","color":"red"}
execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run function project_deadzone:basecamp/staff_reset_positions_at_core
execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run tellraw @s {"text":"[PROJECT DEADZONE] キャンプ職員の位置と向きを初期値へ戻しました。","color":"green"}
