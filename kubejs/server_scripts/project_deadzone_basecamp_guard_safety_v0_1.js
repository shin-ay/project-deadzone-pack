// PROJECT DEADZONE - survivor guard relations and retaliation v0.9
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
const PDZ_DEFENSE_RESCUE_RADIUS = 128
const PDZ_DEFENSE_RESCUE_HEIGHT = 48
let PDZ_DEFENSE_ALERT_CLOCK = 0
let PDZ_DEFENSE_ALERT_RECENT = {}

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

function pdzGuardSetTarget(guard, target, retaliation) {
  if (!guard || !target || !pdzIsCampGuard(guard)) return
  if (!retaliation && !pdzIsFactionHostile(target)) return
  if (retaliation && typeof pdzRelationBlocksDamage === 'function' && pdzRelationBlocksDamage(guard, target)) return
  try { guard.setTarget(target) } catch (ignored) {}
}

// Event-driven radio response. Plain US soldiers are CDF combatants even when they are not
// settlement guards; medics stay neutral. Tagged buddies/PMC guards may answer the same call.
function pdzIsDefenseResponder(entity) {
  if (!entity || !entity.alive || pdzIsProtectedBossTestEntity(entity)) return false
  let id = String(entity.type)
  if (id === 'tacz_sewv:us_medic') return false
  if (id === 'simpleenemymod:usunit' || id.indexOf('tacz_sewv:us_') === 0) return true
  if (pdzIsCampGuard(entity)) return true
  if (typeof pdzFactionOfEntity !== 'function' || !entity.tags) return false
  let faction = pdzFactionOfEntity(entity)
  return (faction === 'cdf' || faction === 'pmc') &&
    (entity.tags.contains('dz_buddy') || entity.tags.contains('dz_faction_combatant'))
}

function pdzDefenseSetTarget(responder, target) {
  if (!pdzIsDefenseResponder(responder) || !target || !target.alive) return
  if (typeof pdzRelationAllowsTarget === 'function') {
    if (!pdzRelationAllowsTarget(responder, target)) return
  } else if (!pdzIsFactionHostile(target)) return
  try { responder.setTarget(target) } catch (ignored) {}
}

function pdzBroadcastDefenseAlert(victim, attacker) {
  if (!victim || !attacker || !attacker.alive || !pdzIsSurvivorAlly(victim)) return
  if (typeof pdzRelationAllowsTarget === 'function' && !pdzRelationAllowsTarget(victim, attacker)) return
  if (typeof pdzRelationAllowsTarget !== 'function' && !pdzIsFactionHostile(attacker)) return

  let key = String(victim.uuid) + '|' + String(attacker.uuid)
  let previous = Number(PDZ_DEFENSE_ALERT_RECENT[key] || -1000000)
  if (PDZ_DEFENSE_ALERT_CLOCK - previous < 20) return
  PDZ_DEFENSE_ALERT_RECENT[key] = PDZ_DEFENSE_ALERT_CLOCK

  let radiusSq = PDZ_DEFENSE_RESCUE_RADIUS * PDZ_DEFENSE_RESCUE_RADIUS
  victim.level.getEntities(victim, victim.boundingBox.inflate(
    PDZ_DEFENSE_RESCUE_RADIUS, PDZ_DEFENSE_RESCUE_HEIGHT, PDZ_DEFENSE_RESCUE_RADIUS)).forEach(entity => {
    if (!pdzIsDefenseResponder(entity)) return
    let dx = Number(entity.x) - Number(victim.x)
    let dy = Number(entity.y) - Number(victim.y)
    let dz = Number(entity.z) - Number(victim.z)
    if (Math.abs(dy) > PDZ_DEFENSE_RESCUE_HEIGHT || dx * dx + dy * dy + dz * dz > radiusSq) return
    pdzDefenseSetTarget(entity, attacker)
  })
}

function pdzIsFactionCombatUnit(entity) {
  if (!entity || !entity.alive || pdzIsProtectedBossTestEntity(entity) ||
      typeof pdzFactionOfEntity !== 'function') return false
  let faction = pdzFactionOfEntity(entity)
  if (['infected', 'spore', 'remnant', 'raider', 'aegis', 'warden', 'pmc'].indexOf(faction) >= 0) return true
  if (faction !== 'cdf' && faction !== 'survivor') return false
  let id = String(entity.type)
  if (id === 'simpleenemymod:usunit' || id.indexOf('tacz_sewv:us_') === 0) return true
  return pdzIsCampGuard(entity) || (!!entity.tags && (entity.tags.contains('dz_buddy') ||
    entity.tags.contains('dz_faction_combatant')))
}

// A single event-fed queue replaces the old dimension-wide scan for every
// faction. Military units can notice distant contacts and move into their own
// weapon range; infected retain a shorter awareness radius. Only one queued
// unit is serviced per tick, so cost is bounded even in dense loaded areas.
const PDZ_FACTION_TARGET_QUEUE = []
const PDZ_FACTION_TARGET_QUEUED = {}
const PDZ_FACTION_TARGET_QUEUE_CAP = 1024
const PDZ_FACTION_MILITARY_ACQUIRE_RADIUS = 96
const PDZ_FACTION_INFECTED_ACQUIRE_RADIUS = 48
const PDZ_FACTION_TARGET_RETAIN_RADIUS = 128
const PDZ_FACTION_TARGET_VERTICAL_RANGE = 32

function pdzQueueFactionTargeting(unit) {
  if (!pdzIsFactionCombatUnit(unit)) return
  let key = String(unit.uuid)
  if (PDZ_FACTION_TARGET_QUEUED[key] || PDZ_FACTION_TARGET_QUEUE.length >= PDZ_FACTION_TARGET_QUEUE_CAP) return
  PDZ_FACTION_TARGET_QUEUED[key] = true
  PDZ_FACTION_TARGET_QUEUE.push(unit)
}

function pdzFactionAcquireRadius(unit) {
  let faction = pdzFactionOfEntity(unit)
  return faction === 'infected' || faction === 'spore' ?
    PDZ_FACTION_INFECTED_ACQUIRE_RADIUS : PDZ_FACTION_MILITARY_ACQUIRE_RADIUS
}

function pdzSetNearestRelationTarget(unit) {
  if (!pdzIsFactionCombatUnit(unit) || typeof pdzRelationAllowsTarget !== 'function') return
  try {
    if (unit.target && unit.target.alive && pdzRelationAllowsTarget(unit, unit.target)) {
      let dx = Number(unit.target.x) - Number(unit.x)
      let dy = Number(unit.target.y) - Number(unit.y)
      let dz = Number(unit.target.z) - Number(unit.z)
      if (Math.abs(dy) <= PDZ_FACTION_TARGET_VERTICAL_RANGE &&
          dx * dx + dy * dy + dz * dz <= PDZ_FACTION_TARGET_RETAIN_RADIUS * PDZ_FACTION_TARGET_RETAIN_RADIUS) return
    }
    if (unit.target) unit.setTarget(null)
  } catch (ignored) {}

  let radius = pdzFactionAcquireRadius(unit)
  let best = null, bestDistance = radius * radius
  unit.level.getEntities(unit, unit.boundingBox.inflate(radius)).forEach(candidate => {
    if (candidate === unit || !candidate.alive || !pdzRelationAllowsTarget(unit, candidate)) return
    let dx = Number(candidate.x) - Number(unit.x)
    let dy = Number(candidate.y) - Number(unit.y)
    let dz = Number(candidate.z) - Number(unit.z)
    if (Math.abs(dy) > PDZ_FACTION_TARGET_VERTICAL_RANGE) return
    let distance = dx * dx + dy * dy + dz * dz
    if (distance >= bestDistance) return
    bestDistance = distance
    best = candidate
  })
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

  // A real hit on a player/survivor is a radio alarm, not a permanent 128-block periodic scan.
  // The pair cooldown bounds dense automatic fire to one spatial query per second.
  if (attacker) pdzBroadcastDefenseAlert(victim, attacker)
})

// Faction hygiene and guard registration are properties of an entity, not a
// reason to rescan the whole dimension forever. EntityEvents.spawned is backed
// by EntityJoinLevelEvent, so this also covers entities loaded from chunks.
EntityEvents.spawned(event => {
  let entity = event.entity
  pdzSanitizeMineColoniesRaider(entity)
  pdzSanitizeInfectedFaction(entity)
  pdzQueueFactionTargeting(entity)
  if (!pdzIsCampGuard(entity)) return
  let newlyRegistered = !entity.tags.contains('dz_survivor_guard')
  entity.tags.add('dz_survivor_guard')
  entity.tags.add('dz_survivor')
  entity.tags.add('dz_friendly')
  entity.tags.add('dz_faction_civil_defense')
  if (newlyRegistered) entity.runCommandSilent('team join dz_survivors @s')
  pdzQueueFactionTargeting(entity)
  pdzQueueGuardTargeting(entity)
})

// TacZ NPC normally owns target selection. This bounded bridge only repairs
// acquisition when another conversion/load-order step left the guard idle.
// One local query runs every 10 ticks, so cost does not scale with total mobs.
ServerEvents.tick(event => {
  PDZ_DEFENSE_ALERT_CLOCK++
  if (PDZ_DEFENSE_ALERT_CLOCK % 1200 === 0) PDZ_DEFENSE_ALERT_RECENT = {}
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

// This also covers MCA villagers: the relation matrix classifies them as
// independent, so infected acquire them without a second zombie-only scanner.
ServerEvents.tick(event => {
  if (!PDZ_FACTION_TARGET_QUEUE.length) return
  let unit = PDZ_FACTION_TARGET_QUEUE.shift()
  let key = unit ? String(unit.uuid) : ''
  if (key) delete PDZ_FACTION_TARGET_QUEUED[key]
  if (!unit || !unit.alive || !pdzIsFactionCombatUnit(unit)) return
  pdzSetNearestRelationTarget(unit)
  pdzQueueFactionTargeting(unit)
})
