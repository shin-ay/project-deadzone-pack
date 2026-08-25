# Internal recovery function. Execute at dz_basecamp_core_anchor.
execute positioned ~-14 ~-7 ~-9 unless entity @e[tag=dz_basecamp_guard,distance=..2] run function project_deadzone:basecamp/spawn_guard
execute positioned ~-8 ~-5 ~13 unless entity @e[tag=dz_basecamp_guard,distance=..2] run function project_deadzone:basecamp/spawn_guard
execute positioned ~1 ~-5 ~4 unless entity @e[tag=dz_basecamp_guard,distance=..2] run function project_deadzone:basecamp/spawn_guard
execute positioned ~1 ~ ~1 unless entity @e[tag=dz_basecamp_guard,distance=..2] run function project_deadzone:basecamp/spawn_guard
