// PROJECT DEADZONE US Unit alliance v0.4
// Unrecruited US Units are friendly survivors.
// RU Units remain hostile. Explicit story-faction units keep their own setup.

const DZ_USUNIT_TYPE = "simpleenemymod:usunit"
const DZ_US_ALLY_TYPES = {
  "simpleenemymod:usunit": true,
  "tacz_sewv:us_medic": true,
  "tacz_sewv:us_engineer": true,
  "tacz_sewv:us_combat_engineer": true
}
// Civil Defense and Remnant US units are allies too. Only explicitly hostile
// authored units are excluded from the alliance repair.
const DZ_USUNIT_HOSTILE_TAGS = ["dz_raider", "dz_hostile", "dz_enemy"]
function dzUsunitHasOwner(entity) {
  try {
    let owner = entity.getOwnerUUID()
    return owner != null && String(owner) !== ""
  } catch (ignored) {
    return false
  }
}

function dzUsunitIsManagedFaction(entity) {
  return DZ_USUNIT_HOSTILE_TAGS.some(tag => entity.tags.contains(tag))
}

function dzUsunitIsVillageAlly(entity) {
  if (!entity) return false
  let id = String(entity.type)
  return id === "minecraft:villager" || id === "minecraft:wandering_trader" ||
    id === "minecraft:iron_golem" || id === "mca:male_villager" ||
    id === "mca:female_villager"
}

function dzIsUsAllianceUnit(entity) {
  return !!entity && !!DZ_US_ALLY_TYPES[String(entity.type)]
}

function dzUsunitMakeFriendly(entity) {
  if (!dzIsUsAllianceUnit(entity)) return
  if (dzUsunitIsManagedFaction(entity)) return

  entity.tags.add("dz_usunit")
  entity.tags.add("dz_usunit_natural")
  entity.tags.add("dz_survivor")
  entity.tags.add("dz_friendly")
  entity.tags.add("dz_usunit_friendly")
  entity.runCommandSilent("team join dz_survivors @s")

  try {
    let target = entity.target
    if (target && (String(target.type) === "minecraft:player" || dzUsunitIsVillageAlly(target) ||
        target.tags.contains("dz_survivor") || target.tags.contains("dz_friendly"))) {
      entity.setTarget(null)
    }
  } catch (ignored) {}
}

EntityEvents.spawned(event => {
  let entity = event.entity
  if (!dzIsUsAllianceUnit(entity)) return
  // Wait for scripted strongholds/buddies to attach their ownership tags, then
  // establish relations only. Population control belongs to the source mod's
  // spawn configuration; never let a unit appear and discard it afterward.
  entity.server.scheduleInTicks(20, callback => {
    if (!entity || !entity.alive || dzUsunitIsManagedFaction(entity) ||
        entity.tags.contains("dz_buddy") || entity.tags.contains("dz_story_npc") ||
        entity.tags.contains("dz_basecamp_guard")) return
    // EntityJoinLevelEvent also fires when a saved chunk is loaded. A unit that
    // already passed the natural-spawn roll must not roll again on every load.
    if (entity.persistentData.getBoolean("dz_usunit_natural_roll_done")) {
      dzUsunitMakeFriendly(entity)
      return
    }
    entity.persistentData.putBoolean("dz_usunit_natural_roll_done", true)
    dzUsunitMakeFriendly(entity)
  })
})

// Do not poll every loaded entity to repair targets. Spawn/join establishes the
// alliance, and the hurt bridge below blocks any stale AI target from dealing
// friendly damage. The manual repair command remains available for diagnostics.

EntityEvents.hurt(event => {
  let victim = event.entity
  let attacker = event.source.actual
  let direct = event.source.direct
  if (dzIsUsAllianceUnit(victim) && victim.tags.contains("dz_friendly") && attacker &&
      (String(attacker.type) === "minecraft:player" || dzUsunitIsVillageAlly(attacker) ||
        (attacker.tags && (attacker.tags.contains("dz_survivor") ||
          attacker.tags.contains("dz_friendly"))))) {
    event.cancel()
    return
  }
  if (!dzIsUsAllianceUnit(attacker) && dzIsUsAllianceUnit(direct)) attacker = direct
  // Keep every US Unit neutral toward settlement NPCs for now. This is
  // intentionally independent of PDZ faction tags and works in both directions.
  if ((dzIsUsAllianceUnit(victim) && dzUsunitIsVillageAlly(attacker)) ||
      (dzIsUsAllianceUnit(attacker) && dzUsunitIsVillageAlly(victim))) {
    event.cancel()
    return
  }
  if (!dzIsUsAllianceUnit(attacker) ||
      !attacker.tags.contains("dz_friendly")) return
  if (String(victim.type) === "minecraft:player" || dzUsunitIsVillageAlly(victim) ||
      (victim.tags && (victim.tags.contains("dz_survivor") ||
        victim.tags.contains("dz_friendly")))) event.cancel()
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzoneusunit").requires(source => source.hasPermission(2))

  root.then(Commands.literal("repair").executes(ctx => {
    let player = ctx.source.player
    let repaired = 0
    player.level.entities.forEach(entity => {
      if (!dzIsUsAllianceUnit(entity) || dzUsunitIsManagedFaction(entity)) return
      dzUsunitMakeFriendly(entity)
      repaired++
    })
    player.tell(Text.of("[USUNIT] loaded friendly units repaired: " + repaired).green())
    return repaired
  }))

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let total = 0, friendly = 0
    player.level.entities.forEach(entity => {
      if (!dzIsUsAllianceUnit(entity)) return
      total++
      if (entity.tags.contains("dz_friendly") && entity.tags.contains("dz_survivor")) friendly++
    })
    player.tell(Text.of("[USUNIT] loaded=" + total + " / friendly=" + friendly).aqua())
    return total
  }))

  event.register(root)
})
