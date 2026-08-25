# Parks and undeveloped lots break up the road grid and provide district identity.
fill ~-101 ~-1 ~76 ~-77 ~-1 ~100 minecraft:coarse_dirt replace minecraft:grass_block
fill ~44 ~-1 ~78 ~62 ~-1 ~98 minecraft:coarse_dirt replace minecraft:grass_block
fill ~77 ~-1 ~46 ~99 ~-1 ~62 minecraft:gravel replace minecraft:grass_block
# Parking lots near the service and market districts.
fill ~-101 ~-1 ~45 ~-76 ~-1 ~61 minecraft:gray_concrete
fill ~42 ~-1 ~45 ~62 ~-1 ~61 minecraft:gray_concrete
fill ~-98 ~-1 ~48 ~-77 ~-1 ~49 minecraft:white_concrete
fill ~-98 ~-1 ~55 ~-77 ~-1 ~56 minecraft:white_concrete
fill ~45 ~-1 ~48 ~59 ~-1 ~49 minecraft:white_concrete
fill ~45 ~-1 ~55 ~59 ~-1 ~56 minecraft:white_concrete
# Street lighting on major approaches.
setblock ~-12 ~0 ~-64 minecraft:stone_brick_wall
setblock ~-12 ~1 ~-64 minecraft:lantern
setblock ~11 ~0 ~-64 minecraft:stone_brick_wall
setblock ~11 ~1 ~-64 minecraft:lantern
setblock ~-12 ~0 ~63 minecraft:stone_brick_wall
setblock ~-12 ~1 ~63 minecraft:lantern
setblock ~11 ~0 ~63 minecraft:stone_brick_wall
setblock ~11 ~1 ~63 minecraft:lantern
setblock ~-64 ~0 ~-12 minecraft:stone_brick_wall
setblock ~-64 ~1 ~-12 minecraft:lantern
setblock ~63 ~0 ~11 minecraft:stone_brick_wall
setblock ~63 ~1 ~11 minecraft:lantern
# Light debris keeps the prototype from reading as a pristine creative-mode city.
setblock ~-22 ~0 ~-31 minecraft:barrel
setblock ~25 ~0 ~31 minecraft:composter
setblock ~82 ~0 ~54 minecraft:iron_bars
setblock ~-88 ~0 ~54 minecraft:iron_bars
