// PROJECT DEADZONE - settlement NPC compatibility v0.7
// MCA owns residents. TacZ NPC loadouts own armed guards. This bridge waits
// until MCA conversion has finished, then gives each loaded settlement a small,
// deterministic defense quota without relying on structure processor order.

const PDZ_CIVILIAN_NAMESPACES = ["mca:"]
const PDZ_MCA_GUARD_RESIDENT_RADIUS = 96
const PDZ_MCA_GUARD_MIN_RESIDENTS = 4
const PDZ_MCA_GUARD_RESIDENTS_PER_GUARD = 6
const PDZ_MCA_GUARD_ROLL_KEY = "dz_mca_guard_checked_v2"
const PDZ_VILLAGE_GUARD_TAG = "dz_village_guard_v2"
let PDZ_MCA_GUARD_MAINTENANCE_TICKS = 0
let PDZ_MCA_GUARD_MAINTENANCE_PASSES = 0
let PDZ_MCA_GUARD_LAST_DIAGNOSTIC = ""
let PDZ_MCA_GUARD_TEAM_READY = false

function pdzEntityIsAlive(entity) {
  if (!entity) return false
  try {
    if (typeof entity.isAlive === "function") return entity.isAlive()
  } catch (ignored) {}
  try {
    if (entity.alive !== undefined) return !!entity.alive
  } catch (ignored) {}
  // Some KubeJS entity wrappers do not expose either accessor even though the
  // entity came from the loaded-entity collection. Do not reject those.
  return true
}

function pdzNamespaceMatches(entity, namespaces) {
  if (!entity || !entity.tags) return false
  let id = String(entity.type)
  for (let i = 0; i < namespaces.length; i++) {
    if (id.indexOf(namespaces[i]) === 0) return true
  }
  return false
}

function pdzIsCivilianSettlementEntity(entity) {
  return pdzNamespaceMatches(entity, PDZ_CIVILIAN_NAMESPACES)
}

function pdzIsMcaLivingResident(entity) {
  if (!pdzEntityIsAlive(entity)) return false
  let id = String(entity.type)
  return id === "mca:male_villager" || id === "mca:female_villager"
}

function pdzEnsureVillageGuardTeam(server) {
  if (PDZ_MCA_GUARD_TEAM_READY || !server) return
  server.runCommandSilent("team add dz_survivors")
  server.runCommandSilent("team modify dz_survivors friendlyFire false")
  server.runCommandSilent("team modify dz_survivors color aqua")
  PDZ_MCA_GUARD_TEAM_READY = true
}

function pdzJoinLoadedVillageGuards(server) {
  if (!server) return
  // Entity.runCommandSilent does not provide an entity-bound @s command source
  // for TacZ NPC wrappers. Join from the server using the persistent guard tag.
  server.runCommandSilent("execute in minecraft:overworld run team join dz_survivors @e[type=tacznpcs:npc,tag=" +
    PDZ_VILLAGE_GUARD_TAG + "]")
}

function pdzMcaGuardWasChecked(entity) {
  if (!entity || !entity.tags) return false
  if (entity.tags.contains(PDZ_MCA_GUARD_ROLL_KEY)) return true
  try { return entity.persistentData.getBoolean(PDZ_MCA_GUARD_ROLL_KEY) } catch (ignored) {}
  return false
}

function pdzMarkMcaGuardChecked(entity) {
  if (!entity || !entity.tags) return
  // Entity tags are vanilla-saved NBT and work consistently for MCA wrappers;
  // arbitrary ForgeData writes through persistentData do not on this build.
  entity.tags.add(PDZ_MCA_GUARD_ROLL_KEY)
}

function pdzGuardTemplate(entity) {
  if (!entity || String(entity.type) !== "tacznpcs:npc") return ""
  try { return String(entity.nbt.getString("template")) } catch (ignored) {}
  try { return String(entity.nbt.template) } catch (ignored) {}
  return ""
}

function pdzIsVillageGuard(entity) {
  if (!entity || String(entity.type) !== "tacznpcs:npc") return false
  if (entity.tags && entity.tags.contains(PDZ_VILLAGE_GUARD_TAG)) return true
  try { if (entity.persistentData.getBoolean("dz_village_guard_v2")) return true } catch (ignored) {}
  if (entity.tags && (entity.tags.contains("dz_guard_bridge_pending") ||
      entity.tags.contains("dz_settlement_guard") || entity.tags.contains("dz_starter_colony_guard") ||
      entity.tags.contains("dz_colony_guard"))) return true
  return pdzGuardTemplate(entity) === "pdz_village_guard"
}

function pdzFinalizeVillageGuard(entity) {
  if (!pdzIsVillageGuard(entity)) return false
  pdzEnsureVillageGuardTeam(entity.server)
  ;[PDZ_VILLAGE_GUARD_TAG, "dz_guard_bridge_pending", "dz_settlement_guard", "dz_survivor_guard", "dz_survivor",
    "dz_friendly", "dz_faction_civil_defense"].forEach(tag => entity.tags.add(tag))
  ;["dz_hostile", "dz_enemy", "dz_force_infected", "dz_raider"].forEach(tag => entity.tags.remove(tag))
  if (typeof pdzQueueGuardTargeting === "function") pdzQueueGuardTargeting(entity)
  return true
}

function pdzVillageGuardHostile(entity) {
  if (!pdzEntityIsAlive(entity)) return false
  try {
    if (typeof pdzIsFactionHostile === "function" && pdzIsFactionHostile(entity)) return true
  } catch (ignored) {}
  let id = String(entity.type)
  if (id === "minecraft:zombie" || id === "minecraft:zombie_villager" ||
      id === "minecraft:husk" || id === "minecraft:drowned" ||
      id === "minecraft:skeleton" || id === "minecraft:stray" ||
      id === "minecraft:creeper" || id === "minecraft:spider" ||
      id === "minecraft:cave_spider" || id === "minecraft:witch" ||
      id === "minecraft:pillager" || id === "minecraft:vindicator" ||
      id === "minecraft:evoker" || id === "minecraft:ravager") return true
  if (id.indexOf("infectious:") === 0 || id.indexOf("apocalypse_zombies:") === 0 ||
      id.indexOf("tacz_bandits:") === 0) return true
  return !!entity.tags && (entity.tags.contains("dz_hostile") || entity.tags.contains("dz_enemy") ||
    entity.tags.contains("dz_raider") || entity.tags.contains("dz_force_infected"))
}

function pdzVillageGuardAcquireTarget(guard, candidates) {
  if (!pdzEntityIsAlive(guard) || !pdzIsVillageGuard(guard)) return false
  try { if (pdzVillageGuardHostile(guard.target)) return true } catch (ignored) {}
  let best = null
  let bestDistance = 32 * 32
  candidates.forEach(candidate => {
    if (!pdzVillageGuardHostile(candidate)) return
    let dx = Number(candidate.x) - Number(guard.x)
    let dy = Number(candidate.y) - Number(guard.y)
    let dz = Number(candidate.z) - Number(guard.z)
    let distance = dx * dx + dy * dy + dz * dz
    if (distance >= bestDistance) return
    bestDistance = distance
    best = candidate
  })
  if (!best) return false
  try {
    guard.setTarget(best)
    return true
  } catch (ignored) {}
  return false
}

function pdzReconcileMcaVillageGuard(source) {
  if (!pdzIsMcaLivingResident(source)) return false
  // The nearby-entity query includes the source resident, so start from zero.
  // Starting from one shifts every guard-quota boundary by one resident.
  let residents = 0
  let guards = 0
  source.level.getEntities(source, source.boundingBox.inflate(PDZ_MCA_GUARD_RESIDENT_RADIUS)).forEach(entity => {
    if (pdzIsMcaLivingResident(entity)) residents++
    else if (pdzIsVillageGuard(entity)) guards++
  })
  if (residents < PDZ_MCA_GUARD_MIN_RESIDENTS) return false
  let wanted = Math.max(1, Math.floor(residents / PDZ_MCA_GUARD_RESIDENTS_PER_GUARD))
  if (guards >= wanted) return false

  let dimension = String(source.level.dimension)
  let x = Math.floor(Number(source.x)) + 0.5
  let y = Math.floor(Number(source.y))
  let z = Math.floor(Number(source.z)) + 0.5
  let result = source.server.runCommandSilent('execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z +
    ' run summon tacznpcs:npc ~ ~ ~ {template:"pdz_village_guard",PersistenceRequired:1b,Tags:["dz_guard_bridge_pending","dz_force_civil_defense"]}')
  return result > 0
}

function pdzClearCustomCombatState(entity) {
  entity.tags.remove("dz_npc_downed")
  entity.tags.remove("dz_buddy_downed")
  entity.tags.remove("dz_npc_revive_in_progress")
  entity.tags.remove("dz_npc_bleedout_armed")
  entity.tags.remove("dz_elite")
  entity.tags.remove("dz_named_hostile")
}

function pdzProtectSettlementEntity(entity) {
  if (pdzIsCivilianSettlementEntity(entity)) {
    entity.tags.add("dz_settlement_civilian")
    entity.tags.add("dz_friendly")
    pdzClearCustomCombatState(entity)
    return
  }
}

EntityEvents.spawned(event => {
  let entity = event.entity
  if (pdzIsMcaLivingResident(entity)) {
    entity.server.scheduleInTicks(2, () => pdzProtectSettlementEntity(entity))
    if (!pdzMcaGuardWasChecked(entity)) {
      pdzMarkMcaGuardChecked(entity)
      entity.server.scheduleInTicks(60, () => pdzReconcileMcaVillageGuard(entity))
    }
    return
  }
  if (String(entity.type) !== "tacznpcs:npc") return
  // TacZ finishes applying its template after EntityJoinLevelEvent. Re-assert
  // ownership after that point so template initialization cannot drop PDZ tags.
  entity.server.scheduleInTicks(20, () => pdzFinalizeVillageGuard(entity))
  entity.server.scheduleInTicks(80, () => pdzFinalizeVillageGuard(entity))
})

ServerEvents.loaded(event => pdzEnsureVillageGuardTeam(event.server))

// EntityEvents does not reliably fire for MCA/TacZ entities created by every
// worldgen and conversion path. Reconcile the loaded overworld directly once
// every five seconds. Use a script-owned counter: ServerEvent does not expose a
// stable server.tickCount property on this KubeJS/Forge build.
ServerEvents.tick(event => {
  if (++PDZ_MCA_GUARD_MAINTENANCE_TICKS % 100 !== 0) return
  PDZ_MCA_GUARD_MAINTENANCE_PASSES++
  let level = null
  try { level = event.server.getLevel("minecraft:overworld") } catch (ignored) {}
  if (!level) {
    if (PDZ_MCA_GUARD_MAINTENANCE_PASSES <= 3)
      console.warn("[PROJECT DEADZONE][Settlement Compat] RC7 maintenance could not resolve overworld.")
    return
  }
  pdzEnsureVillageGuardTeam(event.server)

  let unchecked = []
  let residents = []
  let guardEntities = []
  let hostiles = []
  let guards = 0
  try {
    level.entities.forEach(entity => {
      if (pdzIsMcaLivingResident(entity)) {
        residents.push(entity)
        pdzProtectSettlementEntity(entity)
        if (!pdzMcaGuardWasChecked(entity)) unchecked.push(entity)
        return
      }
      if (String(entity.type) === "tacznpcs:npc" && pdzFinalizeVillageGuard(entity)) {
        guards++
        guardEntities.push(entity)
      }
      if (pdzVillageGuardHostile(entity)) hostiles.push(entity)
    })
  } catch (error) {
    if (PDZ_MCA_GUARD_MAINTENANCE_PASSES <= 3)
      console.error("[PROJECT DEADZONE][Settlement Compat] RC7 entity scan failed: " + String(error))
    return
  }
  pdzJoinLoadedVillageGuards(event.server)

  // Cap first-contact work. A village becomes protected on the first pass,
  // while very large loaded settlements finish marking over later passes.
  let limit = Math.min(32, unchecked.length)
  for (let i = 0; i < limit; i++) {
    let resident = unchecked[i]
    pdzMarkMcaGuardChecked(resident)
  }

  // TacZ NPC's own opposed-faction selector can remain idle after a template
  // is loaded from NBT. Reuse this pass's loaded-entity snapshot and give each
  // guard the nearest hostile within 32m; native TacZ AI still owns movement,
  // aiming, reloading and shooting.
  let targeted = 0
  guardEntities.forEach(guard => { if (pdzVillageGuardAcquireTarget(guard, hostiles)) targeted++ })

  // Quotas are reconciled independently from the one-time marker. Add at most
  // one guard per pass, so a 22-resident village converges to three guards in
  // 15 seconds without a same-tick summon burst or login/reload duplication.
  let summoned = false
  for (let i = 0; i < residents.length; i++) {
    if (pdzReconcileMcaVillageGuard(residents[i])) {
      summoned = true
      break
    }
  }

  // Short, state-change-only diagnostics make a dedicated-server regression
  // test observable without leaving a noisy production log behind.
  let diagnostic = residents.length + "/" + guards + "/" + unchecked.length + "/" + summoned + "/" +
    hostiles.length + "/" + targeted
  if (PDZ_MCA_GUARD_MAINTENANCE_PASSES <= 4 || diagnostic !== PDZ_MCA_GUARD_LAST_DIAGNOSTIC) {
    console.info("[PROJECT DEADZONE][Settlement Compat] RC7 pass=" + PDZ_MCA_GUARD_MAINTENANCE_PASSES +
      " residents=" + residents.length + " guards=" + guards + " unchecked=" + unchecked.length +
      " summoned=" + summoned + " hostiles=" + hostiles.length + " targeted=" + targeted)
    PDZ_MCA_GUARD_LAST_DIAGNOSTIC = diagnostic
  }
})

console.info("[PROJECT DEADZONE][Settlement Compat] MCA residents + deterministic TaCZ village guard quota v7 loaded.")
