# Collision-free Create railway and station district.
fill ~-128 ~-1 ~-105 ~127 ~-1 ~-95 minecraft:deepslate_tiles
fill ~-23 ~-1 ~-94 ~32 ~-1 ~-76 minecraft:smooth_stone
fill ~-126 ~0 ~-100 ~125 ~0 ~-100 create:track[shape=xo,turn=false,waterlogged=false]
setblock ~-20 ~0 ~-95 create:track_station
setblock ~-40 ~0 ~-101 create:track_signal
setblock ~48 ~0 ~-101 create:track_signal
