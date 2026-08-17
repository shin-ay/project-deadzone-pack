# PROJECT DEADZONE intake lobby integration
# Lobby MOD: dimension and transfer
# Easy NPC: job manager and briefing staff

execute in lobby:lobby_dimension run forceload add -1 -1 1 1
execute in lobby:lobby_dimension run kill @e[type=easy_npc:humanoid,tag=pdz_intake_staff]
execute in lobby:lobby_dimension positioned 5 10 9 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_minato_job.npc.nbt ~ ~ ~
execute in lobby:lobby_dimension positioned 5 10 9 run tag @e[type=easy_npc:humanoid,sort=nearest,limit=1,distance=..3] add pdz_intake_staff
execute in lobby:lobby_dimension positioned 13 10 9 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_rei_radio.npc.nbt ~ ~ ~
execute in lobby:lobby_dimension positioned 13 10 9 run tag @e[type=easy_npc:humanoid,sort=nearest,limit=1,distance=..3] add pdz_intake_staff
execute in lobby:lobby_dimension run setblock 9 10 15 minecraft:command_block{auto:0b,Command:"execute as @p[distance=..2] at @s run spawn",TrackOutput:0b,CustomName:'{"text":"PDZ Camp Transfer"}'} replace
execute in lobby:lobby_dimension run setblock 9 11 15 minecraft:heavy_weighted_pressure_plate replace
execute in lobby:lobby_dimension run setblock 9 10 14 minecraft:oak_wall_sign[facing=south]{front_text:{messages:['{"text":"CAMP TRANSFER","color":"gold","bold":true}','{"text":"1. Choose JOB","color":"white"}','{"text":"2. Read briefing","color":"white"}','{"text":"3. Step on pad","color":"green"}']}} replace
execute in lobby:lobby_dimension run forceload remove -1 -1 1 1
