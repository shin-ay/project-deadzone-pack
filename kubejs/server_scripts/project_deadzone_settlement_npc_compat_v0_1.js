// PROJECT DEADZONE - settlement NPC compatibility v0.8
// MCA owns residents and its guardSpawnFraction owns the natural guard ratio.
// This bridge only aligns existing TacZ village guards with PDZ factions and
// hostile targets. It never creates residents or guards.

const PDZ_CIVILIAN_NAMESPACES = ["mca:"]
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

function pdzIsLegacyAutoVillageGuard(entity) {
  return !!entity && String(entity.type) === "tacznpcs:npc" && !!entity.tags &&
    entity.tags.contains(PDZ_VILLAGE_GUARD_TAG) && entity.tags.contains("dz_force_civil_defense")
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
    return
  }
  if (String(entity.type) !== "tacznpcs:npc") return
  // v0.7 and older created one persistent TacZ guard per six MCA residents.
  // Remove only that bridge-owned population as it is loaded. Hand-placed and
  // template-authored TacZ NPCs do not carry both migration tags.
  if (pdzIsLegacyAutoVillageGuard(entity)) {
    entity.server.scheduleInTicks(2, () => {
      if (pdzEntityIsAlive(entity) && pdzIsLegacyAutoVillageGuard(entity)) entity.discard()
    })
    return
  }
  // TacZ finishes applying its template after EntityJoinLevelEvent. Re-assert
  // ownership after that point so template initialization cannot drop PDZ tags.
  entity.server.scheduleInTicks(20, () => pdzFinalizeVillageGuard(entity))
  entity.server.scheduleInTicks(80, () => pdzFinalizeVillageGuard(entity))
})

ServerEvents.loaded(event => pdzEnsureVillageGuardTeam(event.server))

// EntityEvents does not reliably fire for TacZ entities loaded from every NBT
// path. Inspect loaded entities once every ten seconds. Use a script-owned
// counter: ServerEvent does not expose a stable server.tickCount property on
// this KubeJS/Forge build.
ServerEvents.tick(event => {
  if (++PDZ_MCA_GUARD_MAINTENANCE_TICKS % 200 !== 0) return
  PDZ_MCA_GUARD_MAINTENANCE_PASSES++
  let level = null
  try { level = event.server.getLevel("minecraft:overworld") } catch (ignored) {}
  if (!level) {
    if (PDZ_MCA_GUARD_MAINTENANCE_PASSES <= 3)
      console.warn("[PROJECT DEADZONE][Settlement Compat] RC7 maintenance could not resolve overworld.")
    return
  }
  pdzEnsureVillageGuardTeam(event.server)

  let residents = []
  let guardEntities = []
  let hostiles = []
  let guards = 0
  let legacyRemoved = 0
  try {
    level.entities.forEach(entity => {
      if (pdzIsMcaLivingResident(entity)) {
        residents.push(entity)
        pdzProtectSettlementEntity(entity)
        return
      }
      if (pdzIsLegacyAutoVillageGuard(entity)) {
        entity.discard()
        legacyRemoved++
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

  // TacZ NPC's own opposed-faction selector can remain idle after a template
  // is loaded from NBT. Reuse this pass's loaded-entity snapshot and give each
  // guard the nearest hostile within 32m; native TacZ AI still owns movement,
  // aiming, reloading and shooting.
  let targeted = 0
  guardEntities.forEach(guard => { if (pdzVillageGuardAcquireTarget(guard, hostiles)) targeted++ })

  // Short, state-change-only diagnostics make a dedicated-server regression
  // test observable without leaving a noisy production log behind.
  let diagnostic = residents.length + "/" + guards + "/" + hostiles.length + "/" + targeted + "/" + legacyRemoved
  if (PDZ_MCA_GUARD_MAINTENANCE_PASSES <= 4 || diagnostic !== PDZ_MCA_GUARD_LAST_DIAGNOSTIC) {
    console.info("[PROJECT DEADZONE][Settlement Compat] RC8 pass=" + PDZ_MCA_GUARD_MAINTENANCE_PASSES +
      " residents=" + residents.length + " existingTacZGuards=" + guards +
      " hostiles=" + hostiles.length + " targeted=" + targeted + " legacyRemoved=" + legacyRemoved)
    PDZ_MCA_GUARD_LAST_DIAGNOSTIC = diagnostic
  }
})

console.info("[PROJECT DEADZONE][Settlement Compat] MCA-owned natural population + non-spawning TacZ guard bridge v8 loaded.")
