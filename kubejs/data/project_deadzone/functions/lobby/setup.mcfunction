# PROJECT DEADZONE intake lobby integration
# Lobby MOD: dimension and transfer
# Easy NPC: job manager and briefing staff

execute in lobby:lobby_dimension run forceload add -1 -1 1 1

# Deterministic intake floor. The bundled lobby island may still be generating
# when the first player transfer finishes.
execute in lobby:lobby_dimension run fill 1 10 1 17 10 19 minecraft:polished_deepslate replace
execute in lobby:lobby_dimension run fill 1 11 1 17 12 1 minecraft:iron_bars replace
execute in lobby:lobby_dimension run fill 1 11 19 17 12 19 minecraft:iron_bars replace
execute in lobby:lobby_dimension run fill 1 11 2 1 12 18 minecraft:iron_bars replace
execute in lobby:lobby_dimension run fill 17 11 2 17 12 18 minecraft:iron_bars replace

# Keep existing intake staff. setup runs both before and after lobby transfer,
# so destructive refreshes can kill a newly imported NPC during interaction.
execute in lobby:lobby_dimension as @e[type=easy_npc:humanoid,tag=dz_lobby_registrar,tag=!pdz_lobby_registrar_dialog_v2] run kill @s
execute in lobby:lobby_dimension unless entity @e[type=easy_npc:humanoid,tag=dz_lobby_registrar] positioned 5 11 9 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_lobby_registrar.npc.nbt ~ ~ ~
execute in lobby:lobby_dimension positioned 5 11 9 run tag @e[type=easy_npc:humanoid,sort=nearest,limit=1,distance=..3] add pdz_intake_staff
execute in lobby:lobby_dimension positioned 5 11 9 run tag @e[type=easy_npc:humanoid,sort=nearest,limit=1,distance=..3] add dz_lobby_registrar
execute in lobby:lobby_dimension positioned 5 11 9 run tag @e[type=easy_npc:humanoid,sort=nearest,limit=1,distance=..3] add pdz_lobby_registrar
execute in lobby:lobby_dimension positioned 5 11 9 run tag @e[type=easy_npc:humanoid,sort=nearest,limit=1,distance=..3] add pdz_lobby_registrar_dialog_v2
execute in lobby:lobby_dimension as @e[type=easy_npc:humanoid,tag=dz_lobby_registrar,limit=1] run tp @s 5.5 11 9.5 -90 0
execute in lobby:lobby_dimension unless entity @e[type=easy_npc:humanoid,tag=dz_lobby_radio] positioned 13 11 9 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_rei_radio.npc.nbt ~ ~ ~
execute in lobby:lobby_dimension positioned 13 11 9 run tag @e[type=easy_npc:humanoid,sort=nearest,limit=1,distance=..3] add pdz_intake_staff
execute in lobby:lobby_dimension as @e[type=easy_npc:humanoid,tag=dz_lobby_radio,limit=1] run tp @s 13.5 11 9.5 90 0

# The extraction pad always goes through the PDZ state machine.  Never call
# /spawn directly here: doing so bypasses JOB validation and exposes the raw
# overworld spawn before the initial settlement has been verified.
execute in lobby:lobby_dimension run setblock 9 10 15 minecraft:command_block{auto:0b,Command:"execute as @p[distance=..2] at @s run deadzonevillage depart",TrackOutput:0b,CustomName:'{"text":"PDZ Settlement Transfer"}'} replace
execute in lobby:lobby_dimension run setblock 9 11 15 minecraft:heavy_weighted_pressure_plate replace
execute in lobby:lobby_dimension run setblock 9 10 14 minecraft:oak_wall_sign[facing=south]{front_text:{messages:['{"text":"SETTLEMENT TRANSFER","color":"gold","bold":true}','{"text":"1. Choose JOB","color":"white"}','{"text":"2. Read briefing","color":"white"}','{"text":"3. Step on pad","color":"green"}']}} replace

execute in lobby:lobby_dimension run forceload remove -1 -1 1 1
