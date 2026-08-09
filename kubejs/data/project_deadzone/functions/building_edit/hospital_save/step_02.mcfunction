execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run clone ~-10 ~200 ~-10 ~-9 ~200 ~-10 ~0 ~0 ~47 replace
# project_deadzone:deadzone_chaosz_gianthospital_edit_x0_y0_z2
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run clone ~0 ~0 ~95 ~1 ~0 ~95 ~-10 ~200 ~-10 replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run setblock ~0 ~0 ~95 minecraft:structure_block[mode=save]{mode:"SAVE",name:"project_deadzone:deadzone_chaosz_gianthospital_edit_x0_y0_z2",author:"PROJECT_DEADZONE",posX:0,posY:0,posZ:1,sizeX:48,sizeY:48,sizeZ:16,ignoreEntities:0b,showair:0b,showboundingbox:1b,integrity:1.0f,seed:0L} replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run setblock ~1 ~0 ~95 minecraft:redstone_block replace
schedule function project_deadzone:building_edit/hospital_save/step_03 2t replace
