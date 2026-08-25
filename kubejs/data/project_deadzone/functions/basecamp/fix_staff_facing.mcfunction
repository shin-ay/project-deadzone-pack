# Public maintenance command. Rotates staff without changing their positions.
execute unless entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run tellraw @s {"text":"[PROJECT DEADZONE] キャンプコアが見つかりません。","color":"red"}
execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run function project_deadzone:basecamp/fix_staff_facing_at_core
execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run tellraw @s {"text":"[PROJECT DEADZONE] キャンプ職員の向きだけ再適用しました。","color":"green"}
