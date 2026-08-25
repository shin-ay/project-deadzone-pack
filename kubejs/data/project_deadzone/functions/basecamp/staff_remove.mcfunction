# Public maintenance command. Keeps Yui because she is managed by the clothier.
execute unless entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run tellraw @s {"text":"[PROJECT DEADZONE] キャンプコアが見つかりません。","color":"red"}
execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run function project_deadzone:basecamp/staff_remove_at_core
execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run tellraw @s {"text":"[PROJECT DEADZONE] キャンプ職員6名を削除しました。ユイは維持されています。","color":"yellow"}
