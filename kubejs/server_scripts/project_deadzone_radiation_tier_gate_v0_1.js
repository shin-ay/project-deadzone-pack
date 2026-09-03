// PROJECT DEADZONE radiation progression gate v0.2
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
  let tier = dzRadiationTier(entity)
  if (tier >= DZ_RADIATION_UNLOCK_TIER) return
  // EntityEvents.spawned is backed by Forge's EntityJoinLevelEvent. discard()
  // here marks the object removed but still lets the add/tracker path continue,
  // leaving a removed entity in ServerEntity and replaying stale packets at login.
  // Cancel the join transaction itself so no entity id or tracker is published.
  event.cancel()
  console.info("[PROJECT DEADZONE][Radiation gate] cancelled radioactive zombie join at " +
    Math.floor(entity.x) + "," + Math.floor(entity.y) + "," + Math.floor(entity.z) +
    " (region tier " + tier + ")")
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
