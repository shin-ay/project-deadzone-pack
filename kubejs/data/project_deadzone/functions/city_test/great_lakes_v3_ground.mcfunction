# 224 x 224 city platform, centred on the execution marker.
# Split into quadrants and shallow layers so every fill remains below 32768 blocks.
fill ~-112 ~-4 ~-112 ~-1 ~-3 ~-1 minecraft:stone
fill ~0 ~-4 ~-112 ~111 ~-3 ~-1 minecraft:stone
fill ~-112 ~-4 ~0 ~-1 ~-3 ~111 minecraft:stone
fill ~0 ~-4 ~0 ~111 ~-3 ~111 minecraft:stone
fill ~-112 ~-2 ~-112 ~-1 ~-2 ~-1 minecraft:dirt
fill ~0 ~-2 ~-112 ~111 ~-2 ~-1 minecraft:dirt
fill ~-112 ~-2 ~0 ~-1 ~-2 ~111 minecraft:dirt
fill ~0 ~-2 ~0 ~111 ~-2 ~111 minecraft:dirt
fill ~-112 ~-1 ~-112 ~-1 ~-1 ~-1 minecraft:grass_block
fill ~0 ~-1 ~-112 ~111 ~-1 ~-1 minecraft:grass_block
fill ~-112 ~-1 ~0 ~-1 ~-1 ~111 minecraft:grass_block
fill ~0 ~-1 ~0 ~111 ~-1 ~111 minecraft:grass_block
# Retaining walls make the city platform read as constructed land over water or ravines.
fill ~-112 ~-8 ~-112 ~111 ~-1 ~-110 minecraft:stone_bricks
fill ~-112 ~-8 ~109 ~111 ~-1 ~111 minecraft:stone_bricks
fill ~-112 ~-8 ~-109 ~-110 ~-1 ~108 minecraft:stone_bricks
fill ~109 ~-8 ~-109 ~111 ~-1 ~108 minecraft:stone_bricks
