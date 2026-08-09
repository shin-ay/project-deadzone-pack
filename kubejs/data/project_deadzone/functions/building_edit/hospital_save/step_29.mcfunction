execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run clone ~-10 ~200 ~-10 ~-9 ~200 ~-10 ~96 ~48 ~47 replace
# project_deadzone:deadzone_chaosz_gianthospital_edit_x2_y1_z2
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run clone ~96 ~48 ~95 ~97 ~48 ~95 ~-10 ~200 ~-10 replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run setblock ~96 ~48 ~95 minecraft:structure_block[mode=save]{mode:"SAVE",name:"project_deadzone:deadzone_chaosz_gianthospital_edit_x2_y1_z2",author:"PROJECT_DEADZONE",posX:0,posY:0,posZ:1,sizeX:32,sizeY:48,sizeZ:16,ignoreEntities:0b,showair:0b,showboundingbox:1b,integrity:1.0f,seed:0L} replace
execute at @e[type=minecraft:marker,tag=dz_hospital_edit_origin,limit=1] run setblock ~97 ~48 ~95 minecraft:redstone_block replace
schedule function project_deadzone:building_edit/hospital_save/step_30 2t replace
