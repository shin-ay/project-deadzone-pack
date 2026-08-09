// PROJECT DEADZONE US Unit alliance v0.1
// Unrecruited US Units (Simple Enemy Mod PMC units) are friendly survivors.
// RU Units remain hostile. Explicit story-faction units keep their own setup.

const DZ_USUNIT_TYPE = "simpleenemymod:pmcunit"
const DZ_USUNIT_FACTION_TAGS = ["dz_civildef", "dz_remnant", "dz_raider"]
const DZ_USUNIT_NATURAL_KEEP_CHANCE = 0.28
const DZ_USUNIT_LOADED_CAP = 8

function dzUsunitHasOwner(entity) {
  try {
    let owner = entity.getOwnerUUID()
    return owner != null && String(owner) !== ""
  } catch (ignored) {
    return false
  }
}

function dzUsunitIsManagedFaction(entity) {
  return DZ_USUNIT_FACTION_TAGS.some(tag => entity.tags.contains(tag))
}

function dzUsunitMakeFriendly(entity) {
  if (!entity || String(entity.type) !== DZ_USUNIT_TYPE) return
  if (dzUsunitIsManagedFaction(entity)) return

  entity.tags.add("dz_usunit")
  entity.tags.add("dz_usunit_natural")
  entity.tags.add("dz_survivor")
  entity.tags.add("dz_friendly")
  entity.runCommandSilent("team join dz_survivors @s")

  try {
    let target = entity.target
    if (target && (String(target.type) === "minecraft:player" ||
        target.tags.contains("dz_survivor") || target.tags.contains("dz_friendly"))) {
      entity.setTarget(null)
    }
  } catch (ignored) {}
}

EntityEvents.spawned(DZ_USUNIT_TYPE, event => {
  let entity = event.entity
  // Wait for scripted strongholds/buddies to attach their ownership tags. Only
  // unmanaged natural spawns are thinned; authored faction units are untouched.
  entity.server.scheduleInTicks(20, callback => {
    if (!entity || !entity.alive || dzUsunitIsManagedFaction(entity) ||
        entity.tags.contains("dz_buddy") || entity.tags.contains("dz_story_npc") ||
        entity.tags.contains("dz_basecamp_guard")) return
    if (Math.random() > DZ_USUNIT_NATURAL_KEEP_CHANCE) {
      entity.discard()
      return
    }
    dzUsunitMakeFriendly(entity)
  })
})

// Simple Enemy Mod may refresh its target after spawn, so periodically repair
// the alliance state for loaded natural US Units and recruited buddies.
ServerEvents.tick(event => {
  if (event.server.tickCount % 100 !== 0) return
  let retained = {}
  event.server.players.forEach(player => {
    player.level.entities.forEach(entity => {
      if (String(entity.type) !== DZ_USUNIT_TYPE) return
      if (dzUsunitIsManagedFaction(entity) || entity.tags.contains("dz_buddy") ||
          entity.tags.contains("dz_story_npc") || entity.tags.contains("dz_basecamp_guard")) return
      let key = String(entity.uuid)
      if (retained[key]) return
      retained[key] = true
      let count = Object.keys(retained).length
      if (count > DZ_USUNIT_LOADED_CAP) {
        entity.discard()
        return
      }
      dzUsunitMakeFriendly(entity)
    })
  })
})

EntityEvents.hurt(event => {
  let victim = event.entity
  let attacker = event.source.actual
  if (String(victim.type) === DZ_USUNIT_TYPE && victim.tags.contains("dz_friendly") && attacker &&
      (String(attacker.type) === "minecraft:player" ||
        (attacker.tags && (attacker.tags.contains("dz_survivor") ||
          attacker.tags.contains("dz_friendly"))))) {
    event.cancel()
    return
  }
  if (!attacker || String(attacker.type) !== DZ_USUNIT_TYPE ||
      !attacker.tags.contains("dz_friendly")) return
  if (String(victim.type) === "minecraft:player" ||
      (victim.tags && (victim.tags.contains("dz_survivor") ||
        victim.tags.contains("dz_friendly")))) event.cancel()
})
