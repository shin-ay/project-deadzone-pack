kill @e[type=easy_npc:humanoid,tag=dz_easy_npc_test,distance=..16]
summon easy_npc:humanoid ^ ^ ^3 {Tags:["dz_easy_npc_test","dz_basecamp_staff"],CustomName:'{"text":"Easy NPC 試作スタッフ","color":"aqua"}',CustomNameVisible:1b,PersistenceRequired:1b,Invulnerable:1b,NoAI:1b,Rotation:[0.0f,0.0f]}
tellraw @s {"text":"[PROJECT DEADZONE] Easy NPC試作スタッフを3ブロック前へ召喚しました","color":"aqua"}
