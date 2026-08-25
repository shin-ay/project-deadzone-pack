# Perimeter road: the city edge is readable without turning every block into a uniform grid.
fill ~-108 ~-1 ~-108 ~107 ~-1 ~-103 minecraft:gray_concrete
fill ~-108 ~-1 ~102 ~107 ~-1 ~107 minecraft:gray_concrete
fill ~-108 ~-1 ~-102 ~-103 ~-1 ~101 minecraft:gray_concrete
fill ~102 ~-1 ~-102 ~107 ~-1 ~101 minecraft:gray_concrete
# Primary north-south and east-west boulevard through the city centre.
fill ~-8 ~-1 ~-108 ~7 ~-1 ~107 minecraft:black_concrete
fill ~-108 ~-1 ~-8 ~107 ~-1 ~7 minecraft:black_concrete
# Median and lane markings.
fill ~-1 ~-1 ~-108 ~0 ~-1 ~107 minecraft:yellow_concrete
fill ~-108 ~-1 ~-1 ~107 ~-1 ~0 minecraft:yellow_concrete
# District collector roads.
fill ~-66 ~-1 ~-108 ~-60 ~-1 ~107 minecraft:gray_concrete
fill ~59 ~-1 ~-108 ~65 ~-1 ~107 minecraft:gray_concrete
fill ~-108 ~-1 ~-66 ~107 ~-1 ~-60 minecraft:gray_concrete
fill ~-108 ~-1 ~59 ~107 ~-1 ~65 minecraft:gray_concrete
# Short local streets. They stop at collectors to avoid the old endless grid look.
fill ~-24 ~-1 ~-108 ~-20 ~-1 ~-67 minecraft:gray_concrete
fill ~48 ~-1 ~-108 ~52 ~-1 ~-67 minecraft:gray_concrete
fill ~-24 ~-1 ~66 ~-20 ~-1 ~107 minecraft:gray_concrete
fill ~44 ~-1 ~66 ~48 ~-1 ~107 minecraft:gray_concrete
fill ~-108 ~-1 ~-24 ~-67 ~-1 ~-20 minecraft:gray_concrete
fill ~66 ~-1 ~-24 ~107 ~-1 ~-20 minecraft:gray_concrete
fill ~-108 ~-1 ~54 ~-67 ~-1 ~58 minecraft:gray_concrete
fill ~66 ~-1 ~54 ~107 ~-1 ~58 minecraft:gray_concrete
# Sidewalks on both sides of the main boulevard.
fill ~-11 ~-1 ~-102 ~-9 ~-1 ~101 minecraft:smooth_stone
fill ~8 ~-1 ~-102 ~10 ~-1 ~101 minecraft:smooth_stone
fill ~-102 ~-1 ~-11 ~101 ~-1 ~-9 minecraft:smooth_stone
fill ~-102 ~-1 ~8 ~101 ~-1 ~10 minecraft:smooth_stone
