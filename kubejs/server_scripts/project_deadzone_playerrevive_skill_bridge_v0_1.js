// PROJECT DEADZONE - PlayerRevive skill bridge v0.1
//
// Ownership contract:
//   * Minecraft/M&S health reaching zero starts the normal death event.
//   * PlayerRevive alone converts that event into the multiplayer downed state.
//   * PDZ Medical Revive and Second Wind may only revive an already-downed
//     player through PlayerRevive's public server API.
//
// This replaces the old competing LivingDeathEvent cancellation and direct HP
// restoration in project_deadzone_skill_forge_effects_v0_1.js.

const PDZ_REVIVE_SKILL_API = Java.loadClass('team.creative.playerrevive.server.PlayerReviveServer')

let PDZ_REVIVE_SKILL_HANDLED = {}
let PDZ_REVIVE_BUDDY_PENDING = {}
let PDZ_REVIVE_SKILL_API_ERROR = false
const PDZ_REVIVE_BUDDY_BANDAGES = [
  'legendarysurvivaloverhaul:bandage',
  'apocalypsenow:bandage'
]
const PDZ_REVIVE_BUDDY_CHANNEL_TICKS = 100

function pdzReviveSkillTier(entity, prefix, maxTier) {
  for (let tier = maxTier; tier >= 1; tier--) {
    if (entity.tags.contains(prefix + tier)) return tier
  }
  return 0
}

function pdzReviveSkillIsDown(player) {
  try {
    return Boolean(PDZ_REVIVE_SKILL_API.isBleeding(player))
  } catch (error) {
    if (!PDZ_REVIVE_SKILL_API_ERROR) {
      PDZ_REVIVE_SKILL_API_ERROR = true
      console.error('[PROJECT DEADZONE][Revive Skill Bridge] PlayerRevive API unavailable: ' + error)
    }
    return false
  }
}

function pdzReviveSkillHumanHelpers(player) {
  try {
    return Number(PDZ_REVIVE_SKILL_API.getBleeding(player).revivingPlayers().size())
  } catch (ignored) {
    return 0
  }
}

function pdzReviveSkillApply(victim, health, label) {
  try {
    PDZ_REVIVE_SKILL_API.revive(victim)
    // PlayerRevive first clears its own capability and applies its configured
    // revive effects. The skill then chooses the normal vanilla-health ratio;
    // M&S displays the same ratio against its authoritative max-health value.
    victim.health = Math.max(1, Math.min(Number(victim.maxHealth), Number(health)))
    victim.deathTime = 0
    victim.clearFire()
    console.info('[PDZ ReviveBridge] player=' + victim.username + ' source=' + label
      + ' vanilla=' + Number(victim.health).toFixed(1) + '/' + Number(victim.maxHealth).toFixed(1))
    return true
  } catch (error) {
    console.error('[PROJECT DEADZONE][Revive Skill Bridge] revive failed for '
      + victim.username + ': ' + error)
    return false
  }
}

function pdzReviveSkillFindMedic(victim, now) {
  let chosen = null
  let chosenTier = 0
  let chosenDistance = 999999

  victim.server.players.forEach(candidate => {
    if (!candidate || String(candidate.uuid) === String(victim.uuid)) return
    if (String(candidate.level.dimension) !== String(victim.level.dimension)) return
    if (!candidate.alive || candidate.isSpectator() || pdzReviveSkillIsDown(candidate)) return

    let tier = pdzReviveSkillTier(candidate, 'dz_medical_revive_', 3)
    if (tier <= 0) return

    let dx = Number(candidate.x) - Number(victim.x)
    let dy = Number(candidate.y) - Number(victim.y)
    let dz = Number(candidate.z) - Number(victim.z)
    let distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (distance > [0, 4, 6, 8][tier]) return

    let cooldownMs = [0, 900000, 600000, 300000][tier]
    let last = Number(candidate.persistentData.getLong('dz_medical_revive_last_ms'))
    if (now - last < cooldownMs) return

    if (tier > chosenTier || (tier === chosenTier && distance < chosenDistance)) {
      chosen = candidate
      chosenTier = tier
      chosenDistance = distance
    }
  })

  return chosen ? {player: chosen, tier: chosenTier} : null
}

function pdzReviveSkillTryMedic(victim, now) {
  let medic = pdzReviveSkillFindMedic(victim, now)
  if (!medic) return false
  if (!pdzReviveSkillApply(victim, [0, 4, 6, 8][medic.tier], 'medical_t' + medic.tier)) return false

  medic.player.persistentData.putLong('dz_medical_revive_last_ms', now)
  victim.runCommandSilent('effect give @s minecraft:regeneration 5 1 true')
  if (medic.tier >= 2) {
    victim.runCommandSilent('effect give @s minecraft:resistance '
      + (medic.tier >= 3 ? 8 : 4) + ' 0 true')
  }
  victim.tell(Text.of(medic.player.username + ' により緊急蘇生されました').green())
  medic.player.tell(Text.of(victim.username + ' を緊急蘇生しました').aqua())
  return true
}

function pdzReviveSkillTrySecondWind(player, now) {
  if (Number(player.armorValue) <= 0) return false
  if (pdzReviveSkillTier(player, 'dz_armor_recovery_', 3) < 3) return false

  let last = Number(player.persistentData.getLong('dz_armor_second_wind_ms'))
  if (now - last < 900000) return false
  if (!pdzReviveSkillApply(player, 4, 'second_wind')) return false

  player.persistentData.putLong('dz_armor_second_wind_ms', now)
  player.runCommandSilent('effect give @s minecraft:resistance 6 1 true')
  player.runCommandSilent('effect give @s minecraft:regeneration 6 1 true')
  player.tell(Text.of('セカンドウィンド発動').gold())
  return true
}

function pdzReviveBuddyOwnerUuid(entity) {
  try {
    let owner = entity.getOwnerUUID()
    return owner == null ? '' : String(owner)
  } catch (ignored) {
    return ''
  }
}

function pdzReviveBuddyTier(buddy) {
  for (let tier = 5; tier >= 0; tier--) {
    if (buddy.tags.contains('dz_buddy_tier_' + tier)) return tier
  }
  return 0
}

function pdzReviveBuddyFind(player) {
  if (String(player.persistentData.getString('dz_buddy_role')) !== 'medic') return null
  let owner = String(player.uuid)
  let found = null
  player.level.entities.forEach(entity => {
    if (found || !entity || String(entity.type) !== 'simpleenemymod:pmcunit') return
    if (pdzReviveBuddyOwnerUuid(entity) !== owner) return
    if (!entity.alive || Number(entity.health) <= 0 || entity.tags.contains('dz_buddy_downed')) return
    if (!entity.tags.contains('dz_buddy_role_medic')) return

    let tier = pdzReviveBuddyTier(entity)
    let range = tier >= 4 ? 10 : (tier >= 2 ? 8 : 6)
    let dx = Number(entity.x) - Number(player.x)
    let dy = Number(entity.y) - Number(player.y)
    let dz = Number(entity.z) - Number(player.z)
    if (dx * dx + dy * dy + dz * dz > range * range) return
    try { if (!entity.hasLineOfSight(player)) return } catch (ignored) {}
    found = {entity: entity, tier: tier, range: range}
  })
  return found
}

function pdzReviveBuddyBandage(player) {
  if (player.creative) return 'creative'
  for (let i = 0; i < PDZ_REVIVE_BUDDY_BANDAGES.length; i++) {
    let id = PDZ_REVIVE_BUDDY_BANDAGES[i]
    try {
      if (Number(player.inventory.count(Item.of(id))) > 0) return id
    } catch (ignored) {}
  }
  return ''
}

function pdzReviveBuddyConsumeBandage(player, id) {
  if (id === 'creative') return true
  if (!id) return false
  return Number(player.runCommandSilent('clear @s ' + id + ' 1')) > 0
}

function pdzReviveSkillTryBuddy(player, key, now, gameTick) {
  let buddy = pdzReviveBuddyFind(player)
  if (!buddy) {
    delete PDZ_REVIVE_BUDDY_PENDING[key]
    return false
  }

  let cooldownMs = buddy.tier >= 4 ? 300000 : (buddy.tier >= 2 ? 420000 : 600000)
  let last = Number(player.persistentData.getLong('dz_buddy_medic_revive_last_ms'))
  if (now - last < cooldownMs) {
    delete PDZ_REVIVE_BUDDY_PENDING[key]
    return false
  }

  let bandage = pdzReviveBuddyBandage(player)
  let pending = PDZ_REVIVE_BUDDY_PENDING[key]
  if (!bandage) {
    if (!pending || !pending.noSupplyWarned) {
      player.tell(Text.of('Buddy Medic: 救助には所持品の包帯が1個必要です。').yellow())
      PDZ_REVIVE_BUDDY_PENDING[key] = {start: gameTick, noSupplyWarned: true}
    }
    return false
  }

  if (!pending || pending.noSupplyWarned) {
    PDZ_REVIVE_BUDDY_PENDING[key] = {start: gameTick, noSupplyWarned: false}
    player.tell(Text.of('Buddy Medicが救助を開始しました。5秒間援護してください。').aqua())
    try { buddy.entity.setTarget(null) } catch (ignored) {}
    buddy.entity.runCommandSilent('effect give @s minecraft:resistance 6 2 true')
    return false
  }
  if (gameTick - Number(pending.start) < PDZ_REVIVE_BUDDY_CHANNEL_TICKS) return false

  // Re-check position, supply and down state at completion. The server thread
  // is single-threaded, so consume immediately after the PlayerRevive API has
  // accepted the revive.
  bandage = pdzReviveBuddyBandage(player)
  if (!bandage || !pdzReviveSkillIsDown(player)) return false
  if (!pdzReviveSkillApply(player, 4, 'buddy_medic_t' + buddy.tier)) return false
  if (!pdzReviveBuddyConsumeBandage(player, bandage)) {
    console.warn('[PDZ ReviveBridge] Buddy revive supply changed during completion for ' + player.username)
  }

  player.persistentData.putLong('dz_buddy_medic_revive_last_ms', now)
  player.runCommandSilent('effect give @s minecraft:resistance 8 1 true')
  player.runCommandSilent('effect give @s minecraft:regeneration 6 1 true')
  buddy.entity.runCommandSilent('playsound minecraft:item.totem.use neutral @a[distance=..20] ~ ~ ~ 0.7 1.1')
  player.tell(Text.of('Buddy Medicに救助されました。').green())
  delete PDZ_REVIVE_BUDDY_PENDING[key]
  return true
}

ServerEvents.tick(event => {
  // A two-tick cadence is quick enough to feel immediate while avoiding another
  // full per-player pass on every server tick.
  if (event.server.tickCount % 2 !== 0) return

  event.server.players.forEach(player => {
    let key = String(player.uuid)
    if (!player.alive) {
      delete PDZ_REVIVE_SKILL_HANDLED[key]
      delete PDZ_REVIVE_BUDDY_PENDING[key]
      return
    }
    if (!pdzReviveSkillIsDown(player)) {
      delete PDZ_REVIVE_SKILL_HANDLED[key]
      delete PDZ_REVIVE_BUDDY_PENDING[key]
      return
    }
    if (PDZ_REVIVE_SKILL_HANDLED[key]) return

    let now = Date.now()
    let gameTick = Number(event.server.tickCount)
    // A real player actively reviving always owns the interaction. Automated
    // skills and Buddy support wait instead of consuming cooldowns or supplies.
    if (pdzReviveSkillHumanHelpers(player) > 0) {
      delete PDZ_REVIVE_BUDDY_PENDING[key]
      return
    }
    // Player Medical Revive keeps priority, then the personal tank fallback.
    // Buddy Medic is the final solo safety net and deliberately needs time.
    let handled = pdzReviveSkillTryMedic(player, now)
    if (!handled) handled = pdzReviveSkillTrySecondWind(player, now)
    if (!handled) handled = pdzReviveSkillTryBuddy(player, key, now, gameTick)
    if (handled) PDZ_REVIVE_SKILL_HANDLED[key] = true
  })
})
