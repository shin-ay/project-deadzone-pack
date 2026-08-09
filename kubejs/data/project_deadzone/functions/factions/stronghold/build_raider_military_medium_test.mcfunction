# Temporary multiplayer-test layout. Control devices are placed on the roof
# so none silently overwrite the original Apocalypse Now interior.
place template apocalypsenow:military ~ ~ ~
setblock ~13 ~8 ~18 doomsday_decoration:generator
setblock ~10 ~8 ~18 doomsday_decoration:electricbox
setblock ~13 ~8 ~15 doomsday_decoration:radio
setblock ~16 ~8 ~18 doomsday_decoration:broadcaster
setblock ~3 ~8 ~3 easy_npc:default_spawner
setblock ~22 ~8 ~3 easy_npc:group_spawner
setblock ~13 ~8 ~33 easy_npc:single_spawner
tellraw @s [{"text":"[STRONGHOLD TEST] ","color":"gold","bold":true},{"text":"Medium Raider outpost placed. Spawners require Easy NPC presets before balance testing.","color":"yellow"}]
