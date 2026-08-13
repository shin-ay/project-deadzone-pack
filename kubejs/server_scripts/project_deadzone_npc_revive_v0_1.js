// PROJECT DEADZONE NPC Revive v0.1
// Faction NPCs enter a downed state once. A living medic of the same faction
// can revive them after three seconds. Untreated NPCs bleed out after 30 seconds.

const DZ_NPC_FACTIONS = [
  "dz_survivor",
  "dz_civildef",
  "dz_raider",
  "dz_remnant"
]

function dzNpcFaction(entity) {
  for (let i = 0; i < DZ_NPC_FACTIONS.length; i++) {
    if (entity.tags.contains(DZ_NPC_FACTIONS[i])) return DZ_NPC_FACTIONS[i]
  }
  return ""
}

function dzIsValidFactionNpc(entity) {
  // NPC down/revive was retired. PlayerRevive is authoritative for players;
  // faction NPCs and hostile mobs must follow their normal death path.
  return false
  if (!entity || !entity.tags || !entity.tags.contains("dz_npc")) return false
  // A bare dz_npc tag is not enough: converted/infected entities can inherit
  // tags from their source. Only the four authored faction NPCs may be downed.
  if (dzNpcFaction(entity) === "") return false
  let id = String(entity.type)
  if (id.indexOf("zombie") >= 0 || id.indexOf("infectious:") === 0 ||
      id === "minecraft:skeleton" || id === "minecraft:stray" ||
      id === "minecraft:husk" || id === "minecraft:drowned") return false
  return true
}

function dzIsStoryBoss(entity) {
  if (!entity || !entity.tags) return false
  return entity.tags.contains("dz_story_boss_gasstation")
    || entity.tags.contains("dz_story_boss_gunshop")
    || entity.tags.contains("dz_story_boss_policestation")
    || entity.tags.contains("dz_story_boss_hospital")
    || entity.tags.contains("dz_story_boss_firestation")
    || entity.tags.contains("dz_story_boss_radio_tower")
}

function dzNpcDistanceSquared(a, b) {
  let dx = a.x - b.x
  let dy = a.y - b.y
  let dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}

function dzArmNpcBleedout(npc) {
  if (!npc || npc.tags.contains("dz_npc_bleedout_armed")) return
  npc.tags.add("dz_npc_bleedout_armed")
  // The compat mod owns the authoritative 300-tick timer. Keeping the marker
  // here lets the medic scanner remain compatible without holding a stale
  // scheduled entity reference.
}

function dzDownFactionNpc(npc) {
  if (!dzIsValidFactionNpc(npc)) return
  if (dzIsStoryBoss(npc)) return
  if (npc.tags.contains("dz_buddy")) return
  if (npc.tags.contains("dz_npc_revived") || npc.tags.contains("dz_npc_bleedout")) return
  if (npc.tags.contains("dz_npc_downed")) return

  npc.health = 1
  npc.tags.add("dz_npc_downed")
  npc.mergeNbt({
    Invulnerable: 1,
    NoAI: 1
  })
  npc.runCommandSilent("effect give @s minecraft:glowing infinite 0 true")
  console.info("[DEADZONE NPC] Downed " + String(npc.uuid) + " faction=" + dzNpcFaction(npc))
  dzArmNpcBleedout(npc)
  return true
}

// TaCZ fires this before Forge's LivingHurtEvent. Supplementaries may abort the
// later event, so intercept lethal gun damage here and preserve the NPC.
TimelessGunEvents.entityHurtByGunPre(event => {
  let npc = event.hurtEntity
  if (!dzIsValidFactionNpc(npc)) return
  if (dzIsStoryBoss(npc)) return
  if (npc.tags.contains("dz_buddy")
    || npc.tags.contains("dz_npc_downed")
    || npc.tags.contains("dz_npc_revived")
    || npc.tags.contains("dz_npc_bleedout")) return

  let incoming = Number(event.baseAmount)
  if (event.headShot) incoming *= Number(event.headshotMultiplier)
  if (!isFinite(incoming) || incoming < npc.health) return

  event.cancel()
  dzDownFactionNpc(npc)
})

// Catch lethal damage before the entity enters its non-cancellable removal path.
EntityEvents.hurt(event => {
  let npc = event.entity
  if (!dzIsValidFactionNpc(npc)) return
  if (dzIsStoryBoss(npc)) return
  if (npc.tags.contains("dz_buddy")
    || npc.tags.contains("dz_npc_downed")
    || npc.tags.contains("dz_npc_revived")
    || npc.tags.contains("dz_npc_bleedout")) return

  let incoming = Number(event.damage)
  if (incoming < npc.health) return

  event.cancel()
  dzDownFactionNpc(npc)
})

// Fallback for damage sources that bypass LivingHurtEvent.
EntityEvents.death(event => {
  let npc = event.entity
  if (!dzIsValidFactionNpc(npc)) return
  if (dzIsStoryBoss(npc)) return
  if (npc.tags.contains("dz_buddy")
    || npc.tags.contains("dz_npc_revived")
    || npc.tags.contains("dz_npc_bleedout")) return

  event.cancel()
  dzDownFactionNpc(npc)
})

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 20 !== 0) return

  let medics = []
  let downed = []
  player.level.entities.forEach(entity => {
    if (!entity.tags.contains("dz_npc")) return
    if (entity.tags.contains("dz_faction_medic")
      && !entity.tags.contains("dz_npc_downed")
      && entity.alive) {
      medics.push(entity)
    }
    if (entity.tags.contains("dz_npc_downed")
      && !entity.tags.contains("dz_npc_revive_in_progress")) {
      dzArmNpcBleedout(entity)
      downed.push(entity)
    }
  })

  medics.forEach(medic => {
    let faction = dzNpcFaction(medic)
    if (faction === "") return

    let target = null
    let nearest = 256
    downed.forEach(candidate => {
      if (candidate === medic
        || candidate.tags.contains("dz_npc_revive_in_progress")
        || dzNpcFaction(candidate) !== faction) return
      let distance = dzNpcDistanceSquared(medic, candidate)
      if (distance <= nearest) {
        nearest = distance
        target = candidate
      }
    })
    if (!target) return

    target.tags.add("dz_npc_revive_in_progress")
    let reviveTarget = target
    let reviveMedic = medic
    player.server.scheduleInTicks(60, callback => {
      if (!reviveTarget || !reviveTarget.alive
        || !reviveTarget.tags.contains("dz_npc_downed")) return

      if (!reviveMedic || !reviveMedic.alive
        || reviveMedic.tags.contains("dz_npc_downed")
        || dzNpcFaction(reviveMedic) !== dzNpcFaction(reviveTarget)
        || dzNpcDistanceSquared(reviveMedic, reviveTarget) > 400) {
        reviveTarget.tags.remove("dz_npc_revive_in_progress")
        return
      }

      reviveTarget.mergeNbt({
        Invulnerable: 0,
        NoAI: 0
      })
      reviveTarget.tags.remove("dz_npc_downed")
      reviveTarget.tags.remove("dz_npc_revive_in_progress")
      reviveTarget.tags.remove("dz_npc_bleedout_armed")
      reviveTarget.persistentData.remove("dz_down_started_tick")
      reviveTarget.tags.add("dz_npc_revived")
      reviveTarget.health = Math.max(8, reviveTarget.maxHealth * 0.5)
      reviveTarget.runCommandSilent("effect clear @s minecraft:glowing")
      reviveTarget.runCommandSilent("effect give @s minecraft:regeneration 5 0 true")
      reviveTarget.runCommandSilent("playsound minecraft:block.brewing_stand.brew neutral @a[distance=..20] ~ ~ ~ 0.7 1.2")
      console.info("[DEADZONE NPC] Revived " + String(reviveTarget.uuid)
        + " by medic=" + String(reviveMedic.uuid))
    })
  })
})
