tag @e[type=minecraft:villager,distance=..76] add dz_settlement_preexisting
place jigsaw minecraft:village/plains/town_centers minecraft:street 6 ~ ~ ~
execute as @e[type=minecraft:villager,tag=!dz_settlement_preexisting,distance=..76] at @s run summon workers:farmer ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"]}
kill @e[type=minecraft:villager,tag=!dz_settlement_preexisting,distance=..76]
tag @e[type=minecraft:villager,tag=dz_settlement_preexisting,distance=..76] remove dz_settlement_preexisting
fill ~-58 ~ ~-58 ~58 ~4 ~-58 minecraft:stone_brick_wall
fill ~-58 ~ ~58 ~58 ~4 ~58 minecraft:stone_brick_wall
fill ~-58 ~ ~-57 ~-58 ~4 ~57 minecraft:stone_brick_wall
fill ~58 ~ ~-57 ~58 ~4 ~57 minecraft:stone_brick_wall
fill ~-4 ~ ~-58 ~4 ~4 ~-58 minecraft:air
fill ~-4 ~ ~58 ~4 ~4 ~58 minecraft:air
fill ~-58 ~ ~-4 ~-58 ~4 ~4 minecraft:air
fill ~58 ~ ~-4 ~58 ~4 ~4 minecraft:air
summon recruits:recruit ~ ~1 ~ {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"],CustomName:'{"text":"HAVEN防衛司令 レイナ","color":"gold","bold":true}',CustomNameVisible:1b}
summon recruits:recruit ~6 ~1 ~6 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"],CustomName:'{"text":"北門警備長 ダイゴ","color":"aqua"}',CustomNameVisible:1b}
summon recruits:recruit ~-6 ~1 ~6 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"],CustomName:'{"text":"南門警備長 アキ","color":"aqua"}',CustomNameVisible:1b}
summon recruits:recruit ~10 ~1 ~10 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"]}
summon recruits:bowman ~-10 ~1 ~10 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"]}
summon recruits:crossbowman ~10 ~1 ~-10 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"]}
summon workers:merchant ~5 ~1 ~-5 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"],CustomName:'{"text":"HAVEN交易代表 ソウマ","color":"yellow"}',CustomNameVisible:1b}
summon workers:miner ~-8 ~1 ~-8 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"]}
summon workers:builder ~8 ~1 ~-8 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"]}
summon workers:farmer ~-12 ~1 ~12 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"]}
summon workers:cook ~12 ~1 ~12 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"]}
summon workers:fisherman ~-12 ~1 ~-12 {PersistenceRequired:1b,Tags:["dz_settlement_civilian","dz_friendly","dz_settlement_large"]}
tellraw @s [{"text":"[PDZ] ","color":"gold","bold":true},{"text":"大規模『HAVEN居住区』を村Jigsaw方式で配置しました。旧リスポーンキャンプと固有NPCは使用していません。","color":"green"}]
