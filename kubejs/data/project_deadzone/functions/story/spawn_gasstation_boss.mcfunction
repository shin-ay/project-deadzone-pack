tag @e[type=tacz_hostiles:soldier,distance=..24] add dz_gas_scout_preexisting
brutalbosses spawnboss pdz_fuel_route_scout
tag @e[type=tacz_hostiles:soldier,tag=!dz_gas_scout_preexisting,distance=..16,sort=nearest,limit=1] add dz_story_boss_gasstation
tag @e[tag=dz_story_boss_gasstation,distance=..16,sort=nearest,limit=1] add dz_story_boss
tag @e[tag=dz_story_boss_gasstation,distance=..16,sort=nearest,limit=1] add dz_story_npc
tag @e[tag=dz_story_boss_gasstation,distance=..16,sort=nearest,limit=1] add dz_npc
tag @e[tag=dz_story_boss_gasstation,distance=..16,sort=nearest,limit=1] add dz_raider
tag @e[tag=dz_story_boss_gasstation,distance=..16,sort=nearest,limit=1] add dz_hostile
tag @e[tag=dz_story_boss_gasstation,distance=..16,sort=nearest,limit=1] add dz_gas_scout_brutal_v1
tag @e[type=tacz_hostiles:soldier,tag=dz_gas_scout_preexisting,distance=..24] remove dz_gas_scout_preexisting
tellraw @a[distance=..32] {"text":"[任務] Gas Stationの偵察隊長が現れた","color":"gold"}
