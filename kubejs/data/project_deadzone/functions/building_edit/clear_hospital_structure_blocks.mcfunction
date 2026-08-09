execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run fill ~0 ~1 ~-3 ~100 ~145 ~-3 minecraft:air replace minecraft:structure_block
tellraw @s {"text":"病院保存用ストラクチャーブロックを撤去しました。","color":"green"}
