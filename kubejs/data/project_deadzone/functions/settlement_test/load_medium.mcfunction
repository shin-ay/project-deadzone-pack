tag @e[type=minecraft:villager,distance=..56] add dz_settlement_preexisting
place jigsaw minecraft:village/plains/town_centers minecraft:street 4 ~ ~ ~
execute as @e[type=minecraft:villager,tag=!dz_settlement_preexisting,distance=..56] at @s run summon mca:female_villager ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_medium"]}
kill @e[type=minecraft:villager,tag=!dz_settlement_preexisting,distance=..56]
tag @e[type=minecraft:villager,tag=dz_settlement_preexisting,distance=..56] remove dz_settlement_preexisting
fill ~-42 ~ ~-42 ~42 ~3 ~-42 minecraft:stone_brick_wall
fill ~-42 ~ ~42 ~42 ~3 ~42 minecraft:stone_brick_wall
fill ~-42 ~ ~-41 ~-42 ~3 ~41 minecraft:stone_brick_wall
fill ~42 ~ ~-41 ~42 ~3 ~41 minecraft:stone_brick_wall
fill ~-3 ~ ~-42 ~3 ~3 ~-42 minecraft:air
fill ~-3 ~ ~42 ~3 ~3 ~42 minecraft:air
fill ~-42 ~ ~-3 ~-42 ~3 ~3 minecraft:air
fill ~42 ~ ~-3 ~42 ~3 ~3 minecraft:air
summon tacznpcs:npc ~ ~1 ~ {template:"pdz_village_guard",PersistenceRequired:1b,Tags:["dz_settlement_guard","dz_survivor_guard","dz_friendly","dz_settlement_medium"],CustomName:'{"text":"交易集落警備長 イサム","color":"gold"}',CustomNameVisible:1b}
summon tacznpcs:npc ~5 ~1 ~5 {template:"pdz_village_guard",PersistenceRequired:1b,Tags:["dz_settlement_guard","dz_survivor_guard","dz_friendly","dz_settlement_medium"]}
summon tacznpcs:npc ~-5 ~1 ~5 {template:"pdz_village_guard",PersistenceRequired:1b,Tags:["dz_settlement_guard","dz_survivor_guard","dz_friendly","dz_settlement_medium"]}
summon mca:male_villager ~4 ~1 ~-4 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_medium"],CustomName:'{"text":"交易商 ナギ","color":"yellow"}',CustomNameVisible:1b}
summon mca:female_villager ~8 ~1 ~-8 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_medium"]}
summon mca:male_villager ~-8 ~1 ~-8 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_medium"]}
summon mca:female_villager ~8 ~1 ~8 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_medium"]}
tellraw @s [{"text":"[PDZ] ","color":"gold","bold":true},{"text":"中規模『交易集落』を村Jigsaw方式で配置しました。","color":"green"}]
