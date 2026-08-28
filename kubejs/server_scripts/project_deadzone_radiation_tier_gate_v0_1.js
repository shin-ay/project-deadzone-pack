// PROJECT DEADZONE radiation progression gate v0.1
// Infectious' radioactive enemy/effect is reserved for geographic Region T3+.
// Its effect also throws repeatedly when it meets some current damage hooks,
// so removing it before T3 protects both early balance and server stability.

const DZ_RADIATION_UNLOCK_TIER = 3

function dzRadiationTier(entity) {
  try { return Math.max(0, Math.min(5, dzRegionTierAt(entity.server,entity.x,entity.z))) }
  catch (ignored) { return 0 }
}

EntityEvents.spawned("infectious:radioactive_zombie", event => {
  let entity = event.entity
  if (!entity || !entity.server) return
  if (entity.tags.contains("dz_boss_showroom") || entity.tags.contains("dz_boss_loadtest")) return
  if (dzRadiationTier(entity) < DZ_RADIATION_UNLOCK_TIER) {
    entity.discard()
  }
})

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 5 !== 0) return
  if (dzRadiationTier(player) >= DZ_RADIATION_UNLOCK_TIER) return
  // Clear legacy exposure and any effect applied during the short interval
  // between an entity spawning and the spawn gate discarding it.
  player.runCommandSilent("effect clear @s infectious:radiation")
  player.runCommandSilent("effect clear @s apocalypsenow:radiationsickness")
})

console.info("[PROJECT DEADZONE] Radiation enemies/effects are restricted to geographic Region T3+")
