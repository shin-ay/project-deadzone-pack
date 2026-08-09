execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run clone ~-10 ~200 ~-10 ~-9 ~200 ~-10 ~0 ~48 ~95 replace
# project_deadzone:deadzone_chaosz_gianthospital_edit_x0_y2_z0
tellraw @a {"text":"[病院保存] 7 / 36","color":"gray"}
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run clone ~0 ~96 ~-1 ~1 ~96 ~-1 ~-10 ~200 ~-10 replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run setblock ~0 ~96 ~-1 minecraft:structure_block[mode=save]{mode:"SAVE",name:"project_deadzone:deadzone_chaosz_gianthospital_edit_x0_y2_z0",author:"PROJECT_DEADZONE",posX:0,posY:0,posZ:1,sizeX:48,sizeY:48,sizeZ:48,ignoreEntities:0b,showair:0b,showboundingbox:1b,integrity:1.0f,seed:0L} replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run setblock ~1 ~96 ~-1 minecraft:redstone_block replace
schedule function project_deadzone:building_edit/hospital_save/step_07 2t replace
