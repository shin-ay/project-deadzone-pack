// PROJECT DEADZONE - survivor guard relations and retaliation v0.7
// Scoreboard teams stop friendly fire. These checks bridge TacZ NPC factions
// and PDZ-authored faction tags.

function pdzIsCampGuard(entity) {
  if (!entity || !entity.tags) return false
  if (entity.tags.contains('dz_village_guard_v2')) return true
  try { if (entity.persistentData.getBoolean('dz_village_guard_v2')) return true } catch (ignored) {}
  return entity.tags.contains('dz_basecamp_guard') ||
    entity.tags.contains('dz_starter_colony_guard') ||
    entity.tags.contains('dz_colony_guard') ||
    entity.tags.contains('dz_settlement_guard') ||
    entity.tags.contains('dz_guard_bridge_pending') ||
    entity.tags.contains('dz_faction_civil_defense') ||
    (entity.tags.contains('dz_survivor_guard') && entity.tags.contains('dz_survivor'))
}

const PDZ_GUARD_TARGET_QUEUE = []
const PDZ_GUARD_TARGET_QUEUED = {}
const PDZ_GUARD_TARGET_QUEUE_CAP = 256
let PDZ_GUARD_TARGET_TICKS = 0

function pdzQueueGuardTargeting(guard) {
  if (!guard || !guard.alive || !pdzIsCampGuard(guard)) return
  let key = String(guard.uuid)
  if (PDZ_GUARD_TARGET_QUEUED[key] || PDZ_GUARD_TARGET_QUEUE.length >= PDZ_GUARD_TARGET_QUEUE_CAP) return
  PDZ_GUARD_TARGET_QUEUED[key] = true
  PDZ_GUARD_TARGET_QUEUE.push(guard)
}

function pdzIsProtectedBossTestEntity(entity) {
  return !!entity && !!entity.tags && (entity.tags.contains('dz_boss_showroom') ||
    entity.tags.contains('dz_boss_loadtest') ||
    entity.tags.contains('dz_boss_mechanic_runtime') ||
    entity.tags.contains('dz_boss_loadtest_runtime'))
}

function pdzIsInfectedFaction(entity) {
  if (!entity || pdzIsProtectedBossTestEntity(entity)) return false
  if (typeof pdzFactionOfEntity === 'function') return pdzFactionOfEntity(entity) === 'infected'
  let id = String(entity.type)
  if (id.indexOf('infectious:') === 0 || id.indexOf('apocalypse_zombies:') === 0) return true
  if (id.indexOf('zombie') >= 0 || id === 'minecraft:husk' || id === 'minecraft:drowned') return true
  return !!entity.tags && entity.tags.contains('dz_force_infected')
}

function pdzIsZombieAggressor(entity) {
  if (!entity) return false
  let id = String(entity.type)
  return id === 'minecraft:zombie' || id === 'minecraft:zombie_villager' ||
    id === 'minecraft:husk' || id === 'minecraft:drowned' ||
    id === 'mca:male_zombie_villager' || id === 'mca:female_zombie_villager'
}

function pdzIsLivingVillagerTarget(entity) {
  if (!entity || !entity.alive || pdzIsInfectedFaction(entity)) return false
  let id = String(entity.type)
  return id === 'minecraft:villager' || id === 'minecraft:wandering_trader' ||
    id === 'mca:male_villager' || id === 'mca:female_villager'
}

function pdzIsSurvivorAlly(entity) {
  if (!entity) return false
  if (typeof pdzFactionRelation === 'function' && typeof pdzFactionOfEntity === 'function') {
    let relation = pdzFactionRelation('cdf', pdzFactionOfEntity(entity))
    return relation === 'ALLY' || relation === 'FRIENDLY'
  }
  // Hostility always wins over stale survivor/team tags. This is especially
  // important for infected MCA villagers and zombies copied from faction NPCs.
  if (pdzIsFactionHostile(entity)) return false
  let id = String(entity.type)
  if (id === 'minecraft:player' || id === 'simpleenemymod:usunit' || id.indexOf('mca:') === 0) return true
  return !!entity.tags && (entity.tags.contains('dz_survivor') || entity.tags.contains('dz_friendly') ||
    entity.tags.contains('dz_buddy') || entity.tags.contains('dz_story_npc') ||
    entity.tags.contains('dz_settlement_civilian') || entity.tags.contains('dz_starter_colony_resident') ||
    entity.tags.contains('dz_faction_civil_defense'))
}

function pdzIsMineColoniesRaider(entity) {
  if (!entity) return false
  let id = String(entity.type)
  if (id.indexOf('minecolonies:') !== 0) return false
  return id.indexOf('barbarian') >= 0 || id.indexOf('pirate') >= 0 ||
    id.indexOf('mummy') >= 0 || id.indexOf('pharao') >= 0 ||
    id.indexOf('amazon') >= 0 || id.indexOf('shieldmaiden') >= 0 ||
    id.indexOf('norsemen') >= 0 || id.indexOf('drownedpirate') >= 0
}

function pdzSanitizeMineColoniesRaider(entity) {
  if (!pdzIsMineColoniesRaider(entity)) return
  let dirty = !entity.tags.contains('dz_faction_sanitized') ||
    entity.tags.contains('dz_survivor') || entity.tags.contains('dz_friendly') ||
    entity.tags.contains('dz_buddy') || entity.tags.contains('dz_story_npc') ||
    entity.tags.contains('dz_settlement_civilian') || entity.tags.contains('dz_starter_colony_resident') ||
    entity.tags.contains('dz_faction_civil_defense') || entity.tags.contains('dz_survivor_guard')
  if (!dirty) return
  ;['dz_survivor', 'dz_friendly', 'dz_buddy', 'dz_story_npc',
    'dz_settlement_civilian', 'dz_starter_colony_resident',
    'dz_faction_civil_defense', 'dz_survivor_guard'].forEach(tag => {
      entity.runCommandSilent('tag @s remove ' + tag)
    })
  entity.runCommandSilent('tag @s add dz_hostile')
  entity.runCommandSilent('tag @s add dz_enemy')
  entity.runCommandSilent('tag @s add dz_raider')
  entity.runCommandSilent('tag @s add dz_faction_sanitized')
  entity.runCommandSilent('team leave @s')
}

function pdzSanitizeInfectedFaction(entity) {
  if (!pdzIsInfectedFaction(entity)) return
  let dirty = !entity.tags.contains('dz_faction_sanitized') ||
    entity.tags.contains('dz_survivor') || entity.tags.contains('dz_friendly') ||
    entity.tags.contains('dz_buddy') || entity.tags.contains('dz_story_npc') ||
    entity.tags.contains('dz_settlement_civilian') || entity.tags.contains('dz_starter_colony_resident') ||
    entity.tags.contains('dz_faction_civil_defense') || entity.tags.contains('dz_survivor_guard') ||
    entity.tags.contains('dz_basecamp_guard') || entity.tags.contains('dz_starter_colony_guard') ||
    entity.tags.contains('dz_colony_guard') || entity.tags.contains('dz_settlement_guard')
  if (!dirty) return
  ;['dz_survivor', 'dz_friendly', 'dz_buddy', 'dz_story_npc',
    'dz_settlement_civilian', 'dz_starter_colony_resident',
    'dz_faction_civil_defense', 'dz_survivor_guard',
    'dz_basecamp_guard', 'dz_starter_colony_guard',
    'dz_colony_guard', 'dz_settlement_guard'].forEach(tag => {
      entity.runCommandSilent('tag @s remove ' + tag)
    })
  entity.runCommandSilent('tag @s add dz_hostile')
  entity.runCommandSilent('tag @s add dz_enemy')
  entity.runCommandSilent('tag @s add dz_force_infected')
  entity.runCommandSilent('tag @s add dz_faction_sanitized')
  entity.runCommandSilent('team leave @s')
}

function pdzIsFactionHostile(entity) {
  if (!entity) return false
  if (pdzIsProtectedBossTestEntity(entity)) return false
  if (typeof pdzFactionRelation === 'function' && typeof pdzFactionOfEntity === 'function')
    return pdzFactionRelation('cdf', pdzFactionOfEntity(entity)) === 'HOSTILE'
  if (pdzIsInfectedFaction(entity)) return true
  if (pdzIsMineColoniesRaider(entity)) return true
  let id = String(entity.type)
  if (id.indexOf('tacz_bandits:') === 0 || id === 'simpleenemymod:ruunit') return true
  if (!entity.tags) return false
  return entity.tags.contains('dz_hostile') || entity.tags.contains('dz_enemy') ||
    entity.tags.contains('dz_raider') || entity.tags.contains('dz_force_raider') ||
    entity.tags.contains('dz_force_remnant') || entity.tags.contains('dz_force_ash_jackals') ||
    entity.tags.contains('dz_force_helix') || entity.tags.contains('dz_force_infected')
}

function pdzIsInfectedTarget(entity) {
  if (!entity || !entity.alive || pdzIsInfectedFaction(entity) || pdzIsProtectedBossTestEntity(entity)) return false
  if (typeof pdzFactionRelation === 'function' && typeof pdzFactionOfEntity === 'function')
    return pdzFactionRelation('infected', pdzFactionOfEntity(entity)) === 'HOSTILE'
  let id = String(entity.type)
  if (id === 'minecraft:player' || id === 'minecraft:villager' ||
      id === 'minecraft:wandering_trader' || id === 'minecraft:iron_golem') return true
  if (id.indexOf('mca:') === 0 || id.indexOf('minecolonies:citizen') === 0 ||
      id.indexOf('simpleenemymod:') === 0 || id.indexOf('tacz_bandits:') === 0 ||
      id.indexOf('easy_npc:') === 0) return true
  if (!entity.tags) return false
  return entity.tags.contains('dz_survivor') || entity.tags.contains('dz_friendly') ||
    entity.tags.contains('dz_buddy') || entity.tags.contains('dz_story_npc') ||
    entity.tags.contains('dz_settlement_civilian') || entity.tags.contains('dz_starter_colony_resident') ||
    entity.tags.contains('dz_faction_civil_defense') || entity.tags.contains('dz_force_raider') ||
    entity.tags.contains('dz_force_remnant') || entity.tags.contains('dz_force_ash_jackals') ||
    entity.tags.contains('dz_force_helix')
}

function pdzInfectedSetNearestFactionTarget(infected, candidates) {
  if (!infected || !infected.alive) return
  try {
    if (pdzIsInfectedTarget(infected.target)) return
  } catch (ignored) {}
  let best = null, bestDistance = 32 * 32
  candidates.forEach(candidate => {
    if (!pdzIsInfectedTarget(candidate) || String(candidate.level.dimension) !== String(infected.level.dimension)) return
    let dx = candidate.x - infected.x, dy = candidate.y - infected.y, dz = candidate.z - infected.z
    let distance = dx * dx + dy * dy + dz * dz
    if (distance < bestDistance) { bestDistance = distance; best = candidate }
  })
  if (best) {
    try { infected.setTarget(best) } catch (ignored) {}
  }
}

function pdzGuardSetTarget(guard, target, retaliation) {
  if (!guard || !target || !pdzIsCampGuard(guard)) return
  if (!retaliation && !pdzIsFactionHostile(target)) return
  if (retaliation && typeof pdzRelationBlocksDamage === 'function' && pdzRelationBlocksDamage(guard, target)) return
  try { guard.setTarget(target) } catch (ignored) {}
}

function pdzIsFactionCombatUnit(entity) {
  if (!entity || !entity.alive || pdzIsProtectedBossTestEntity(entity) ||
      typeof pdzFactionOfEntity !== 'function') return false
  let faction = pdzFactionOfEntity(entity)
  if (['infected', 'spore', 'remnant', 'raider', 'aegis', 'warden', 'pmc'].indexOf(faction) >= 0) return true
  if (faction !== 'cdf' && faction !== 'survivor') return false
  return pdzIsCampGuard(entity) || (!!entity.tags && (entity.tags.contains('dz_buddy') ||
    entity.tags.contains('dz_faction_combatant')))
}

function pdzFactionTargetCell(entity) {
  return Math.floor(Number(entity.x) / 32) + '|' + Math.floor(Number(entity.z) / 32)
}

function pdzFactionTargetBuckets(entities) {
  let buckets = {}
  entities.forEach(entity => {
    let key = pdzFactionTargetCell(entity)
    if (!buckets[key]) buckets[key] = []
    buckets[key].push(entity)
  })
  return buckets
}

function pdzSetNearestRelationTarget(unit, buckets) {
  if (!pdzIsFactionCombatUnit(unit) || typeof pdzRelationAllowsTarget !== 'function') return
  try {
    if (unit.target && unit.target.alive && pdzRelationAllowsTarget(unit, unit.target)) {
      let dx = Number(unit.target.x) - Number(unit.x)
      let dy = Number(unit.target.y) - Number(unit.y)
      let dz = Number(unit.target.z) - Number(unit.z)
      if (Math.abs(dy) <= 12 && dx * dx + dy * dy + dz * dz <= 32 * 32 && unit.hasLineOfSight(unit.target)) return
    }
    if (unit.target) unit.setTarget(null)
  } catch (ignored) {}

  let cx = Math.floor(Number(unit.x) / 32), cz = Math.floor(Number(unit.z) / 32)
  let best = null, bestDistance = 32 * 32
  for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
    let candidates = buckets[(cx + ox) + '|' + (cz + oz)] || []
    candidates.forEach(candidate => {
      if (candidate === unit || !candidate.alive || !pdzRelationAllowsTarget(unit, candidate)) return
      let dx = Number(candidate.x) - Number(unit.x)
      let dy = Number(candidate.y) - Number(unit.y)
      let dz = Number(candidate.z) - Number(unit.z)
      if (Math.abs(dy) > 12) return
      let distance = dx * dx + dy * dy + dz * dz
      if (distance >= bestDistance) return
      try { if (!unit.hasLineOfSight(candidate)) return } catch (ignored) {}
      bestDistance = distance
      best = candidate
    })
  }
  if (best) try { unit.setTarget(best) } catch (ignored) {}
}

EntityEvents.hurt(event => {
  let victim = event.entity
  let attacker = event.source.actual
  let direct = event.source.direct
  if (!attacker && direct) attacker = direct

  // MineColonies camp/raid units must never inherit the survivor team. Fix the
  // relation on first contact as well as during the periodic proximity scan.
  pdzSanitizeMineColoniesRaider(attacker)
  pdzSanitizeMineColoniesRaider(victim)
  pdzSanitizeInfectedFaction(attacker)
  pdzSanitizeInfectedFaction(victim)

  // Friendly units never damage one another, irrespective of which AI mod
  // initiated the attack.
  let friendlyDamage = false
  if (typeof pdzRelationBlocksDamage === 'function') friendlyDamage = pdzRelationBlocksDamage(attacker, victim)
  else friendlyDamage = pdzIsSurvivorAlly(attacker) && pdzIsSurvivorAlly(victim)
  if (attacker && attacker !== victim && friendlyDamage) {
    event.cancel()
    return
  }

  // Neutral factions do not open fire first, but any combat unit may defend
  // itself after a real hit. Friendly and allied damage was cancelled above.
  if (attacker && pdzIsFactionCombatUnit(victim)) {
    try { victim.setTarget(attacker) } catch (ignored) {}
  }

  // Retaliate immediately when a hostile TaCZ/RU/PDZ faction attacks either a
  // guard or a protected colony resident.
  if (!attacker || (!pdzIsCampGuard(victim) && !pdzIsSurvivorAlly(victim))) return
  // Query only the local spatial index. Iterating level.entities here made one
  // attack scan every loaded entity in the dimension.
  victim.level.getEntities(victim, victim.boundingBox.inflate(32)).forEach(entity => {
    if (!pdzIsCampGuard(entity)) return
    let dx = entity.x - victim.x, dy = entity.y - victim.y, dz = entity.z - victim.z
    if (dx * dx + dy * dy + dz * dz <= 32 * 32) pdzGuardSetTarget(entity, attacker, true)
  })
})

// Faction hygiene and guard registration are properties of an entity, not a
// reason to rescan the whole dimension forever. EntityEvents.spawned is backed
// by EntityJoinLevelEvent, so this also covers entities loaded from chunks.
EntityEvents.spawned(event => {
  let entity = event.entity
  pdzSanitizeMineColoniesRaider(entity)
  pdzSanitizeInfectedFaction(entity)
  if (!pdzIsCampGuard(entity)) return
  let newlyRegistered = !entity.tags.contains('dz_survivor_guard')
  entity.tags.add('dz_survivor_guard')
  entity.tags.add('dz_survivor')
  entity.tags.add('dz_friendly')
  entity.tags.add('dz_faction_civil_defense')
  if (newlyRegistered) entity.runCommandSilent('team join dz_survivors @s')
  pdzQueueGuardTargeting(entity)
})

// TacZ NPC normally owns target selection. This bounded bridge only repairs
// acquisition when another conversion/load-order step left the guard idle.
// One local query runs every 10 ticks, so cost does not scale with total mobs.
ServerEvents.tick(event => {
  if (++PDZ_GUARD_TARGET_TICKS % 10 !== 0) return
  if (!PDZ_GUARD_TARGET_QUEUE.length) return
  let guard = PDZ_GUARD_TARGET_QUEUE.shift()
  let key = guard ? String(guard.uuid) : ''
  if (key) delete PDZ_GUARD_TARGET_QUEUED[key]
  if (!guard || !guard.alive || !pdzIsCampGuard(guard)) return

  let current = null
  try { current = guard.target } catch (ignored) {}
  if (!current || !current.alive || !pdzIsFactionHostile(current)) {
    let best = null, bestDistance = 32 * 32
    guard.level.getEntities(guard, guard.boundingBox.inflate(32)).forEach(candidate => {
      if (!pdzIsFactionHostile(candidate)) return
      let dx = Number(candidate.x) - Number(guard.x)
      let dy = Number(candidate.y) - Number(guard.y)
      let dz = Number(candidate.z) - Number(guard.z)
      let distance = dx * dx + dy * dy + dz * dz
      if (distance >= bestDistance) return
      bestDistance = distance
      best = candidate
    })
    if (best) pdzGuardSetTarget(guard, best, false)
  }

  pdzQueueGuardTargeting(guard)
})

// MCA villagers are not subclasses of vanilla Villager, so vanilla zombie AI
// does not consistently acquire them. Keep a bounded event-fed queue and
// service at most one idle zombie per tick with a spatially indexed local
// query. This supports encounters after movement without restoring a global
// level.entities scan.
const PDZ_ZOMBIE_TARGET_QUEUE = []
const PDZ_ZOMBIE_TARGET_QUEUED = {}
const PDZ_ZOMBIE_TARGET_QUEUE_CAP = 512
let PDZ_ZOMBIE_TARGET_TICKS = 0

EntityEvents.spawned(event => {
  let entity = event.entity
  if (!pdzIsZombieAggressor(entity)) return
  let key = String(entity.uuid)
  if (PDZ_ZOMBIE_TARGET_QUEUED[key]) return
  if (PDZ_ZOMBIE_TARGET_QUEUE.length >= PDZ_ZOMBIE_TARGET_QUEUE_CAP) return
  PDZ_ZOMBIE_TARGET_QUEUED[key] = true
  PDZ_ZOMBIE_TARGET_QUEUE.push(entity)
})

ServerEvents.tick(event => {
  if (++PDZ_ZOMBIE_TARGET_TICKS % 5 !== 0) return
  if (!PDZ_ZOMBIE_TARGET_QUEUE.length) return
  let zombie = PDZ_ZOMBIE_TARGET_QUEUE.shift()
  let key = zombie ? String(zombie.uuid) : ''
  if (key) delete PDZ_ZOMBIE_TARGET_QUEUED[key]
  if (!zombie || !zombie.alive || !pdzIsZombieAggressor(zombie)) return

  let current = null
  try { current = zombie.target } catch (ignored) {}
  if (!current || !current.alive || !pdzRelationAllowsTarget(zombie, current)) {
    let best = null, bestDistance = 32 * 32
    zombie.level.getEntities(zombie, zombie.boundingBox.inflate(32)).forEach(candidate => {
      if (!pdzIsLivingVillagerTarget(candidate)) return
      let dx = Number(candidate.x) - Number(zombie.x)
      let dy = Number(candidate.y) - Number(zombie.y)
      let dz = Number(candidate.z) - Number(zombie.z)
      let distance = dx * dx + dy * dy + dz * dz
      if (distance >= bestDistance) return
      bestDistance = distance
      best = candidate
    })
    if (best) try { zombie.setTarget(best) } catch (ignored) {}
  }

  // Requeue live zombies. With N zombies, each is revisited every N slots;
  // work remains capped at four local queries per second.
  if (zombie.alive && PDZ_ZOMBIE_TARGET_QUEUE.length < PDZ_ZOMBIE_TARGET_QUEUE_CAP) {
    PDZ_ZOMBIE_TARGET_QUEUED[key] = true
    PDZ_ZOMBIE_TARGET_QUEUE.push(zombie)
  }
})
