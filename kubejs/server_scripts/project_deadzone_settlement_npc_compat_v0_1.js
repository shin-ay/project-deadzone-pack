// PROJECT DEADZONE - settlement NPC compatibility v0.1
// MCA / Workers are civilian systems. Recruits / Village Expansion own their
// native faction relations and must not be forced friendly by PDZ.

const PDZ_CIVILIAN_NAMESPACES = ["mca:", "workers:"]
const PDZ_EXTERNAL_FACTION_NAMESPACES = ["recruits:", "village_recruits:"]

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

function pdzIsExternalFactionEntity(entity) {
  return pdzNamespaceMatches(entity, PDZ_EXTERNAL_FACTION_NAMESPACES)
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
  if (pdzIsExternalFactionEntity(entity)) {
    entity.tags.add("dz_external_faction_npc")
    entity.tags.remove("dz_settlement_civilian")
    // Native Recruits ownership/hostility remains authoritative.
    pdzClearCustomCombatState(entity)
  }
}

EntityEvents.spawned(event => {
  let entity = event.entity
  if (!pdzIsCivilianSettlementEntity(entity) && !pdzIsExternalFactionEntity(entity)) return
  entity.server.scheduleInTicks(2, () => pdzProtectSettlementEntity(entity))
})

// Also cover residents loaded from an existing settlement save.
ServerEvents.tick(event => {
  if (event.server.tickCount % 200 !== 0) return
  let seen = {}
  event.server.players.forEach(player => {
    player.level.entities.forEach(entity => {
      if (!pdzIsCivilianSettlementEntity(entity) && !pdzIsExternalFactionEntity(entity)) return
      let uuid = String(entity.uuid)
      if (seen[uuid]) return
      seen[uuid] = true
      pdzProtectSettlementEntity(entity)
    })
  })
})

console.info("[PROJECT DEADZONE][Settlement Compat] MCA civilians and native recruit factions separated.")
