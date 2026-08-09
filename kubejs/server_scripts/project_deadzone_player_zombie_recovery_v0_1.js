// PROJECT DEADZONE player-zombie recovery protection v0.1
// Death still creates a thematic recovery target, but not a second boss.

const DZ_PLAYER_ZOMBIES = [
  "hordes:zombie_player", "hordes:husk_player", "hordes:drowned_player"
]

function dzTunePlayerZombie(entity) {
  if (!entity || entity.level.clientSide) return
  entity.addTag("dz_player_recovery")
  entity.runCommandSilent("attribute @s minecraft:generic.max_health base set 30")
  entity.runCommandSilent("attribute @s minecraft:generic.attack_damage base set 3")
  entity.runCommandSilent("attribute @s minecraft:generic.movement_speed base set 0.20")
  entity.runCommandSilent("effect give @s minecraft:glowing 6000 0 true")
  entity.runCommandSilent("data merge entity @s {Health:30.0f,PersistenceRequired:1b}")
}

DZ_PLAYER_ZOMBIES.forEach(type => {
  EntityEvents.spawned(type, event => dzTunePlayerZombie(event.entity))
})
