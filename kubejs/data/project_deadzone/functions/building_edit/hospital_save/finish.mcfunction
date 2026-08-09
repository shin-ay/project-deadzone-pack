execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run clone ~-10 ~200 ~-10 ~-9 ~200 ~-10 ~96 ~144 ~95 replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run fill ~-10 ~200 ~-10 ~-9 ~200 ~-10 minecraft:air replace
tellraw @a {"text":"病院36区画の自動保存が完了しました。","color":"green","bold":true}
