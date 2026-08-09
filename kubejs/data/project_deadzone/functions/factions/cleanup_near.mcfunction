tellraw @s {"text":"[DEADZONE] 64ブロック以内のテストNPCを削除します","color":"yellow"}
kill @e[tag=dz_npc,distance=..64]
kill @e[type=minecraft:marker,tag=dz_control_marker,distance=..64]
