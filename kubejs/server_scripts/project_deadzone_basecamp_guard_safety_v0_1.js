// PROJECT DEADZONE - survivor guard relations and retaliation v0.3
// Scoreboard teams stop friendly fire. These checks also bridge Recruits AI,
// TaCZ NPC factions, and PDZ-authored faction tags.

function pdzIsRecruitEntity(entity) {
  if (!entity) return false
  let id = String(entity.type)
  return id.indexOf('recruits:') === 0 || id.indexOf('village_recruits:') === 0
}

function pdzIsCampGuard(entity) {
  if (!entity || !entity.tags) return false
  return entity.tags.contains('dz_basecamp_guard') ||
    entity.tags.contains('dz_starter_colony_guard') ||
    entity.tags.contains('dz_colony_guard') ||
    entity.tags.contains('dz_settlement_guard') ||
    entity.tags.contains('dz_faction_civil_defense') ||
    (entity.tags.contains('dz_survivor_guard') && entity.tags.contains('dz_survivor'))
}

function pdzIsSurvivorAlly(entity) {
  if (!entity) return false
  let id = String(entity.type)
  if (id === 'minecraft:player' || id === 'simpleenemymod:usunit' || id.indexOf('mca:') === 0) return true
  if (pdzIsRecruitEntity(entity) && !pdzIsFactionHostile(entity)) return true
  return !!entity.tags && (entity.tags.contains('dz_survivor') || entity.tags.contains('dz_friendly') ||
    entity.tags.contains('dz_buddy') || entity.tags.contains('dz_story_npc') ||
    entity.tags.contains('dz_settlement_civilian') || entity.tags.contains('dz_starter_colony_resident') ||
    entity.tags.contains('dz_faction_civil_defense'))
}

function pdzIsFactionHostile(entity) {
  if (!entity) return false
  let id = String(entity.type)
  if (id.indexOf('tacz_bandits:') === 0 || id === 'simpleenemymod:ruunit') return true
  if (!entity.tags) return false
  return entity.tags.contains('dz_hostile') || entity.tags.contains('dz_enemy') ||
    entity.tags.contains('dz_raider') || entity.tags.contains('dz_force_raider') ||
    entity.tags.contains('dz_force_remnant') || entity.tags.contains('dz_force_ash_jackals') ||
    entity.tags.contains('dz_force_helix') || entity.tags.contains('dz_force_infected')
}

function pdzGuardSetTarget(guard, target) {
  if (!guard || !target || !pdzIsCampGuard(guard) || !pdzIsFactionHostile(target)) return
  try { guard.setTarget(target) } catch (ignored) {}
}

function pdzEnsureGuardGear(guard) {
  if (!guard || !pdzIsRecruitEntity(guard)) return
  // Never overwrite equipment supplied by Recruits, a faction function, or a
  // player. Only fill genuinely empty slots on PDZ-tagged settlement guards.
  guard.runCommandSilent('execute unless data entity @s HandItems[0].id run item replace entity @s weapon.mainhand with survival_instinct:tactical_knife')
  guard.runCommandSilent('execute unless data entity @s ArmorItems[0].id run item replace entity @s armor.feet with survival_instinct:green_recluit_armor_boots')
  guard.runCommandSilent('execute unless data entity @s ArmorItems[1].id run item replace entity @s armor.legs with survival_instinct:green_recluit_armor_leggings')
  guard.runCommandSilent('execute unless data entity @s ArmorItems[2].id run item replace entity @s armor.chest with survival_instinct:green_recluit_armor_chestplate')
  guard.runCommandSilent('execute unless data entity @s ArmorItems[3].id run item replace entity @s armor.head with survival_instinct:green_recluit_armor_helmet')
}

EntityEvents.hurt(event => {
  let victim = event.entity
  let attacker = event.source.actual
  let direct = event.source.direct
  if (!attacker && direct) attacker = direct

  // Friendly units never damage one another, irrespective of which AI mod
  // initiated the attack.
  if (pdzIsSurvivorAlly(attacker) && pdzIsSurvivorAlly(victim)) {
    event.cancel()
    return
  }

  // Retaliate immediately when a hostile TaCZ/RU/PDZ faction attacks either a
  // guard or a protected colony resident.
  if (!pdzIsFactionHostile(attacker) || (!pdzIsCampGuard(victim) && !pdzIsSurvivorAlly(victim))) return
  victim.level.entities.forEach(entity => {
    if (!pdzIsCampGuard(entity)) return
    let dx = entity.x - victim.x, dy = entity.y - victim.y, dz = entity.z - victim.z
    if (dx * dx + dy * dy + dz * dz <= 32 * 32) pdzGuardSetTarget(entity, attacker)
  })
})

ServerEvents.tick(event => {
  if (event.server.tickCount % 40 !== 0) return
  let seen = {}
  let gearPulse = event.server.tickCount % 200 === 0
  event.server.players.forEach(player => {
    player.level.entities.forEach(entity => {
      if (!pdzIsCampGuard(entity) || seen[String(entity.uuid)]) return
      seen[String(entity.uuid)] = true
      entity.tags.add('dz_survivor_guard')
      entity.tags.add('dz_survivor')
      entity.tags.add('dz_friendly')
      entity.tags.add('dz_faction_civil_defense')
      entity.runCommandSilent('team join dz_survivors @s')
      if (gearPulse) pdzEnsureGuardGear(entity)
      try {
        if (pdzIsSurvivorAlly(entity.target)) entity.setTarget(null)
      } catch (ignored) {}

      let best = null, bestDistance = 28 * 28
      entity.level.entities.forEach(candidate => {
        if (!pdzIsFactionHostile(candidate) || !candidate.alive) return
        let dx = candidate.x - entity.x, dy = candidate.y - entity.y, dz = candidate.z - entity.z
        let distance = dx * dx + dy * dy + dz * dz
        if (distance < bestDistance) { bestDistance = distance; best = candidate }
      })
      if (best) pdzGuardSetTarget(entity, best)
    })
  })
})
