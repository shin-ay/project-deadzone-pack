# Cardinal yaw: south 0, west 90, north 180, east -90.
execute as @e[tag=dz_basecamp_job_guide] at @s run tp @s ~ ~ ~ -90 0
execute as @e[tag=dz_basecamp_radio] at @s run tp @s ~ ~ ~ -90 0
execute as @e[tag=dz_basecamp_buddy_recruiter] at @s run tp @s ~ ~ ~ 90 0
execute as @e[tag=dz_basecamp_trader_food] at @s run tp @s ~ ~ ~ 90 0
execute as @e[tag=dz_basecamp_trader_medical] at @s run tp @s ~ ~ ~ 180 0
execute as @e[tag=dz_basecamp_trader_parts] at @s run tp @s ~ ~ ~ 90 0
tellraw @s {"text":"[PROJECT DEADZONE] Base Campスタッフの向きを修正しました","color":"green"}
