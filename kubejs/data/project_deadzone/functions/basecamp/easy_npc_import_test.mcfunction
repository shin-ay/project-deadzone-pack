# Run as a player. Imports the saved local Easy NPC preset two blocks ahead.
kill @e[type=easy_npc:humanoid,tag=dz_easy_npc_import_test,distance=..8]
execute positioned ^ ^ ^2 run easy_npc preset import_new custom easy_npc:preset/humanoid/deadzone_basecamp_staff_test.npc.nbt ~ ~ ~
tag @e[type=easy_npc:humanoid,tag=!dz_basecamp_staff,sort=nearest,limit=1,distance=..5] add dz_easy_npc_import_test
tellraw @s {"text":"[PROJECT DEADZONE] Easy NPCプリセットの単体インポートを実行しました","color":"aqua"}
