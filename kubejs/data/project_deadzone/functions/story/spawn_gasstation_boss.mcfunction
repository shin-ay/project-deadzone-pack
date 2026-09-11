tag @e[type=tacz_hostiles:soldier,distance=..64] add dz_gas_scout_preexisting
brutalbosses spawnboss pdz_fuel_route_scout
tag @e[type=tacz_hostiles:soldier,tag=!dz_gas_scout_preexisting,distance=..64,sort=nearest,limit=1] add dz_story_boss_gasstation
tag @e[tag=dz_story_boss_gasstation,distance=..64,sort=nearest,limit=1] add dz_story_boss
tag @e[tag=dz_story_boss_gasstation,distance=..64,sort=nearest,limit=1] add dz_story_npc
tag @e[tag=dz_story_boss_gasstation,distance=..64,sort=nearest,limit=1] add dz_npc
tag @e[tag=dz_story_boss_gasstation,distance=..64,sort=nearest,limit=1] add dz_raider
tag @e[tag=dz_story_boss_gasstation,distance=..64,sort=nearest,limit=1] add dz_hostile
tag @e[tag=dz_story_boss_gasstation,distance=..64,sort=nearest,limit=1] add dz_gas_scout_brutal_v1
tag @e[type=tacz_hostiles:soldier,tag=dz_gas_scout_preexisting,distance=..64] remove dz_gas_scout_preexisting
execute if entity @e[tag=dz_story_boss_gasstation,distance=..64,limit=1] run tellraw @a[distance=..96] {"text":"[任務] Gas Stationの偵察隊長が現れた","color":"gold"}
