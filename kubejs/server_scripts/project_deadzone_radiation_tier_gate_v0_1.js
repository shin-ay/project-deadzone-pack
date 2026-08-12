// PROJECT DEADZONE radiation progression gate v0.1
// Infectious' radioactive enemy/effect is reserved for late progression.
// Its effect also throws repeatedly when it meets some current damage hooks,
// so removing it before T3 protects both early balance and server stability.

const DZ_RADIATION_UNLOCK_TIER = 3

function dzRadiationTier(server) {
  return Math.max(0, server.persistentData.getInt("deadzone_world_tier"))
}

EntityEvents.spawned("infectious:radioactive_zombie", event => {
  let entity = event.entity
  if (!entity || !entity.server) return
  if (dzRadiationTier(entity.server) < DZ_RADIATION_UNLOCK_TIER) {
    entity.discard()
  }
})

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 5 !== 0) return
  if (dzRadiationTier(player.server) >= DZ_RADIATION_UNLOCK_TIER) return
  // Clear legacy exposure and any effect applied during the short interval
  // between an entity spawning and the spawn gate discarding it.
  player.runCommandSilent("effect clear @s infectious:radiation")
  player.runCommandSilent("effect clear @s apocalypsenow:radiationsickness")
})

// NPCs and other living entities were previously left contaminated even while
// the world was below T3. Clear both radiation effects once per second for all
// loaded entities until radiation progression unlocks.
ServerEvents.tick(event => {
  let server = event.server
  if (server.tickCount % 20 !== 0) return
  if (dzRadiationTier(server) >= DZ_RADIATION_UNLOCK_TIER) return
  server.runCommandSilent("effect clear @e infectious:radiation")
  server.runCommandSilent("effect clear @e apocalypsenow:radiationsickness")
})

console.info("[PROJECT DEADZONE] Radiation enemies/effects unlock at World Tier T3")
