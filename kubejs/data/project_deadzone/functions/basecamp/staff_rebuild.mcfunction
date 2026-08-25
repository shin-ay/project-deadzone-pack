# Rebuild the six core EasyNPC staff members around the active Survivor Camp.
# Yui is intentionally excluded: the clothier controller owns her placement,
# dialogue and rotating inventory independently.
execute unless entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run tellraw @s {"text":"[PROJECT DEADZONE] キャンプコアが見つからないため、職員を配置できません。","color":"red"}
execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run function project_deadzone:basecamp/staff_remove_at_core
execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,sort=nearest,limit=1] run function project_deadzone:basecamp/staff_place_at_core
