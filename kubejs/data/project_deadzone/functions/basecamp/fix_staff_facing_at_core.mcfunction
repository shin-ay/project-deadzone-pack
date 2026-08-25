# Internal function. Execution position must be the base core anchor.
# Cardinal yaw: south 0, west 90, north 180, east -90.
execute as @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,distance=..32,sort=nearest,limit=1] at @s run tp @s ~ ~ ~ -90 0
execute as @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,distance=..32,sort=nearest,limit=1] at @s run tp @s ~ ~ ~ -90 0
execute as @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter,distance=..32,sort=nearest,limit=1] at @s run tp @s ~ ~ ~ 90 0
execute as @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_food,distance=..32,sort=nearest,limit=1] at @s run tp @s ~ ~ ~ 90 0
execute as @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_medical,distance=..32,sort=nearest,limit=1] at @s run tp @s ~ ~ ~ 180 0
execute as @e[type=easy_npc:humanoid,tag=dz_basecamp_trader_parts,distance=..32,sort=nearest,limit=1] at @s run tp @s ~ ~ ~ 90 0
