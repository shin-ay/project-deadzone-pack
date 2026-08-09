execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run clone ~-10 ~200 ~-10 ~-9 ~200 ~-10 ~0 ~144 ~-1 replace
# project_deadzone:deadzone_chaosz_gianthospital_edit_x0_y3_z1
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run clone ~0 ~144 ~47 ~1 ~144 ~47 ~-10 ~200 ~-10 replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run setblock ~0 ~144 ~47 minecraft:structure_block[mode=save]{mode:"SAVE",name:"project_deadzone:deadzone_chaosz_gianthospital_edit_x0_y3_z1",author:"PROJECT_DEADZONE",posX:0,posY:0,posZ:1,sizeX:48,sizeY:12,sizeZ:48,ignoreEntities:0b,showair:0b,showboundingbox:1b,integrity:1.0f,seed:0L} replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run setblock ~1 ~144 ~47 minecraft:redstone_block replace
schedule function project_deadzone:building_edit/hospital_save/step_11 2t replace
