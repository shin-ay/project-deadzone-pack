tag @e[type=minecraft:villager,distance=..40] add dz_settlement_preexisting
place jigsaw minecraft:village/plains/town_centers minecraft:street 2 ~ ~ ~
execute as @e[type=minecraft:villager,tag=!dz_settlement_preexisting,distance=..40] at @s run summon mca:male_villager ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_small"]}
kill @e[type=minecraft:villager,tag=!dz_settlement_preexisting,distance=..40]
tag @e[type=minecraft:villager,tag=dz_settlement_preexisting,distance=..40] remove dz_settlement_preexisting
fill ~-28 ~ ~-28 ~28 ~2 ~-28 minecraft:cobblestone_wall
fill ~-28 ~ ~28 ~28 ~2 ~28 minecraft:cobblestone_wall
fill ~-28 ~ ~-27 ~-28 ~2 ~27 minecraft:cobblestone_wall
fill ~28 ~ ~-27 ~28 ~2 ~27 minecraft:cobblestone_wall
fill ~-2 ~ ~-28 ~2 ~2 ~-28 minecraft:air
fill ~-2 ~ ~28 ~2 ~2 ~28 minecraft:air
fill ~-28 ~ ~-2 ~-28 ~2 ~2 minecraft:air
fill ~28 ~ ~-2 ~28 ~2 ~2 minecraft:air
summon tacznpcs:npc ~4 ~1 ~4 {template:"pdz_village_guard",PersistenceRequired:1b,Tags:["dz_settlement_guard","dz_survivor_guard","dz_friendly","dz_settlement_small"],CustomName:'{"text":"前哨警備員","color":"aqua"}',CustomNameVisible:1b}
summon tacznpcs:npc ~-4 ~1 ~4 {template:"pdz_village_guard",PersistenceRequired:1b,Tags:["dz_settlement_guard","dz_survivor_guard","dz_friendly","dz_settlement_small"],CustomName:'{"text":"監視担当","color":"aqua"}',CustomNameVisible:1b}
summon mca:female_villager ~6 ~1 ~-6 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_small"],CustomName:'{"text":"農業担当 ミナト","color":"green"}',CustomNameVisible:1b}
summon mca:male_villager ~-6 ~1 ~-6 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_small"],CustomName:'{"text":"資材担当 ケン","color":"green"}',CustomNameVisible:1b}
tellraw @s [{"text":"[PDZ] ","color":"gold","bold":true},{"text":"小規模『前哨避難所』を村Jigsaw方式で配置しました。","color":"green"}]
