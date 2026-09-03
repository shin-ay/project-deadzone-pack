// PROJECT DEADZONE radiation progression gate v0.3
// Infectious' radioactive enemy/effect is reserved for geographic Region T3+.
// Its effect also throws repeatedly when it meets some current damage hooks,
// so removing it before T3 protects both early balance and server stability.

const DZ_RADIATION_UNLOCK_TIER = 3

function dzRadiationTier(entity) {
  try { return Math.max(0, Math.min(5, dzRegionTierAt(entity.server,entity.x,entity.z))) }
  catch (ignored) { return 0 }
}

// Infectious finalises several variants after EntityJoinLevelEvent and may try
// to add the same instance again.  Cancelling or discarding any Infectious
// entity from EntityEvents.spawned therefore creates "removed already" adds.
// Keep its entity lifecycle entirely owned by the mod.  Progression is enforced
// on the exposure/effect side below and in authored Horde spawn pools.

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 5 !== 0) return
  if (dzRadiationTier(player) >= DZ_RADIATION_UNLOCK_TIER) return
  // Clear legacy exposure and any effect applied during the short interval
  // between an entity spawning and the spawn gate discarding it.
  player.runCommandSilent("effect clear @s infectious:radiation")
  player.runCommandSilent("effect clear @s apocalypsenow:radiationsickness")
})

console.info("[PROJECT DEADZONE] Radiation exposure is restricted to geographic Region T3+ without intercepting Infectious entity joins")
