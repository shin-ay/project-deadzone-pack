tellraw @s [{"text":"[DEADZONE NPC TIER] Nearest tagged NPC","color":"gold"}]
data get entity @e[tag=dz_npc,sort=nearest,limit=1] Tags
data get entity @e[tag=dz_npc,sort=nearest,limit=1] ForgeData.dz_npc_scaled_tier
attribute @e[tag=dz_npc,sort=nearest,limit=1] minecraft:generic.max_health get
attribute @e[tag=dz_npc,sort=nearest,limit=1] minecraft:generic.armor get
