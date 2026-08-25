# Remove entities left in the retired NPC downed state by older scripts.
# Run once after updating an existing world.
kill @e[tag=dz_npc_downed]
tag @e[tag=dz_npc_bleedout_armed] remove dz_npc_bleedout_armed
tag @e[tag=dz_npc_bleedout] remove dz_npc_bleedout
tellraw @a [{"text":"[DEADZONE] ","color":"gold"},{"text":"旧NPCダウン状態を消去しました。以後、NPCと敵は通常どおり死亡します。","color":"green"}]
