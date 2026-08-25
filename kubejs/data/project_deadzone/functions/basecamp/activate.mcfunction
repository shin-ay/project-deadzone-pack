# Run this function at the 32x20x32 structure origin.
function project_deadzone:factions/setup

# SecurityCraft reinforced controls can reject ordinary survivors. Replace the
# legacy camp palette with normal redstone controls every time it is activated.
fill ~0 ~0 ~0 ~31 ~19 ~31 minecraft:stone_button replace securitycraft:reinforced_stone_button
fill ~0 ~0 ~0 ~31 ~19 ~31 minecraft:stone_pressure_plate replace securitycraft:reinforced_stone_pressure_plate
# The fill command resets block-state properties. Restore both gate buttons as
# wall-mounted, west-facing controls so they remain attached to the stone frame.
setblock ~8 ~2 ~18 minecraft:stone_button[face=wall,facing=west,powered=false]
setblock ~8 ~2 ~21 minecraft:stone_button[face=wall,facing=west,powered=false]

# Remove previously generated camp staff before rebuilding marker functions.
execute positioned ~16 ~10 ~16 run kill @e[tag=dz_basecamp_staff,distance=..28]
execute positioned ~16 ~10 ~16 run kill @e[tag=dz_basecamp_raid_anchor,distance=..28]
execute positioned ~16 ~10 ~16 run kill @e[tag=dz_basecamp_core_anchor,distance=..28]

# Arrival marker and shared respawn. Always leave a solid floor below the player.
setblock ~13 ~1 ~20 minecraft:stone_bricks
setblock ~13 ~2 ~20 air
setblock ~13 ~3 ~20 air
gamerule spawnRadius 0
setworldspawn ~13 ~2 ~20
spawnpoint @a ~13 ~2 ~20

# Main story arrival is awarded only to players actually present at the camp.
ftbquests change_progress @a[distance=..64] complete 4262970F1B621A1D
ftbquests change_progress @a[distance=..64] complete 1920AEAAF4D75E94

# Functional Base Core.
setblock ~24 ~11 ~16 kubejs:deadzone_base_core
summon minecraft:marker ~24.5 ~11 ~16.5 {Tags:["dz_basecamp_core_anchor"]}

# Delivery inventory. The two orange markers form one double barrel station.
setblock ~10 ~0 ~27 minecraft:barrel[facing=up,open=false]
setblock ~10 ~0 ~28 minecraft:barrel[facing=up,open=false]
data merge block ~10 ~0 ~27 {CustomName:'{"text":"共同物資納品 A","color":"gold"}'}
data merge block ~10 ~0 ~28 {CustomName:'{"text":"共同物資納品 B","color":"gold"}'}

# JOB guide.
setblock ~10 ~1 ~24 air

# Radio and main quest contact.
setblock ~20 ~6 ~24 air

# Buddy recruiter.
setblock ~20 ~2 ~20 air
setblock ~18 ~1 ~20 simpleenemymod:recruit_table

# Three trade contacts.
setblock ~15 ~1 ~28 air
setblock ~16 ~1 ~27 air
setblock ~26 ~2 ~24 air

# Clothing trader anchor. Keep the NPC tied to the actual activated camp,
# rather than reconstructing its position from possibly stale saved origin data.
kill @e[type=minecraft:marker,tag=dz_basecamp_clothier_anchor]
summon minecraft:marker ~25.5 ~2 ~6.5 {Tags:["dz_basecamp_clothier_anchor"]}

# Four approach anchors used by the raid controller.
setblock ~0 ~1 ~19 air
summon minecraft:marker ~0.5 ~1 ~19.5 {Tags:["dz_basecamp_raid_anchor","dz_raid_west"]}
setblock ~14 ~1 ~1 air
summon minecraft:marker ~14.5 ~1 ~1.5 {Tags:["dz_basecamp_raid_anchor","dz_raid_north"]}
setblock ~31 ~1 ~11 air
summon minecraft:marker ~31.5 ~1 ~11.5 {Tags:["dz_basecamp_raid_anchor","dz_raid_east"]}
setblock ~31 ~1 ~31 air
summon minecraft:marker ~31.5 ~1 ~31.5 {Tags:["dz_basecamp_raid_anchor","dz_raid_southeast"]}

# Armed camp guards. Pink concrete marks their feet and is removed on activation.
execute positioned ~16 ~10 ~16 run kill @e[tag=dz_basecamp_guard,distance=..32]

setblock ~10 ~4 ~7 air
execute positioned ~10.5 ~4 ~7.5 run function project_deadzone:basecamp/spawn_guard
execute positioned ~10.5 ~4 ~7.5 run data merge entity @e[tag=dz_basecamp_guard,sort=nearest,limit=1,distance=..4] {Rotation:[180.0f,0.0f]}

setblock ~16 ~6 ~29 air
execute positioned ~16.5 ~6 ~29.5 run function project_deadzone:basecamp/spawn_guard
execute positioned ~16.5 ~6 ~29.5 run data merge entity @e[tag=dz_basecamp_guard,sort=nearest,limit=1,distance=..4] {Rotation:[0.0f,0.0f]}

setblock ~25 ~6 ~20 air
execute positioned ~25.5 ~6 ~20.5 run function project_deadzone:basecamp/spawn_guard
execute positioned ~25.5 ~6 ~20.5 run data merge entity @e[tag=dz_basecamp_guard,sort=nearest,limit=1,distance=..4] {Rotation:[-90.0f,0.0f]}

setblock ~25 ~11 ~17 air
execute positioned ~25.5 ~11 ~17.5 run function project_deadzone:basecamp/spawn_guard
execute positioned ~25.5 ~11 ~17.5 run data merge entity @e[tag=dz_basecamp_guard,sort=nearest,limit=1,distance=..4] {Rotation:[-90.0f,0.0f]}

# Import the finalized Easy NPC staff presets and apply role profiles.
function project_deadzone:basecamp/migrate_easy_npc_staff
function project_deadzone:basecamp/repair_staff_service_ui
deadzoneclothier install_silent

tellraw @a[distance=..64] {"text":"[PROJECT DEADZONE] Survivor Campが稼働しました","color":"green","bold":true}
