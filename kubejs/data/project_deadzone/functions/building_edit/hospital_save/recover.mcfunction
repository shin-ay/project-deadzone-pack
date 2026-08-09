# 中断時にstep_00が使用した2ブロックを退避領域から復元する。
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] if block ~0 ~0 ~-1 minecraft:structure_block run clone ~-10 ~200 ~-10 ~-9 ~200 ~-10 ~0 ~0 ~-1 replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run fill ~-10 ~200 ~-10 ~-9 ~200 ~-10 minecraft:air replace
