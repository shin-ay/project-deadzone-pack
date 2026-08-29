// PROJECT DEADZONE TaCZ Skill XP v0.1
// Uses TaCZ's official KubeJS event group. No gun NBT or animation timing changes.

function dzAddSkillXp(player, category, amount) {
  // M&S already owns combat XP and the unified gun-kill bridge records JOB
  // activity. Keep this retired entry point as a no-op to prevent double XP.
  return 0
}

function dzIsServerPlayer(entity) {
  return entity && entity.isPlayer() && !entity.level.clientSide
}

TimelessGunEvents.gunReload(event => {
  let player = event.entity
  if (!dzIsServerPlayer(player)) return

  // GunReloadEvent fires at reload start. Cooldown prevents reload-key XP farming.
  let now = Date.now()
  let last = player.persistentData.getLong("dz_reload_xp_last_ms")
  if (now - last < 10000) return

  player.persistentData.putLong("dz_reload_xp_last_ms", now)
  dzAddSkillXp(player, "reload", 1)
})

TimelessGunEvents.entityKillByGun(event => {
  let player = event.attacker
  if (!dzIsServerPlayer(player)) return

  // Slow baseline progression leaves room for quests, elites and boss rewards.
  let xp = event.headShot ? 7 : 5
  dzAddSkillXp(player, "firearms", xp)
})
