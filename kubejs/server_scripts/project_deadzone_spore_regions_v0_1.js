// PROJECT DEADZONE - Fungal Infection: Spore region gate v0.1
//
// Spore belongs to the geographical endgame layer.  Check only when an entity
// is created: mobs that later walk across a Region boundary are deliberately
// left alone, avoiding a permanent world scan/despawn loop.

const PDZ_SPORE_MIN_REGION_TIER = 3
const PDZ_NEXUS_MIN_REGION_TIER = 4
const PDZ_NEXUS_ARM_TICKS = 300

function pdzSporeScriptedEntity(entity) {
  if (!entity || !entity.tags) return false
  let allowed = [
    'dz_spore_scripted', 'dz_story_boss', 'dz_boss_showroom',
    'dz_boss_test_frozen', 'dz_boss_loadtest'
  ]
  for (let i = 0; i < allowed.length; i++)
    if (entity.tags.contains(allowed[i])) return true
  return false
}

function pdzSporeRegionTier(entity) {
  try { return Math.max(0, Math.min(5,
    Number(dzRegionTierAt(entity.server, entity.x, entity.z)))) }
  catch (ignored) { return 0 }
}

EntityEvents.spawned(event => {
  let entity = event.entity
  if (!entity || entity.level.clientSide) return
  let id = String(entity.type)
  let isSpore = id.indexOf('spore:') === 0
  let isNexus = id === 'infnexus:nexus'
  if ((!isSpore && !isNexus) || pdzSporeScriptedEntity(entity)) return

  // PDZ currently has one playable infection layer.  Do not let cross-mod
  // summoning leak Spore into utility dimensions.
  if (String(entity.level.dimension) !== 'minecraft:overworld') {
    event.cancel()
    return
  }

  let tier = pdzSporeRegionTier(entity)
  let requiredTier = isNexus ? PDZ_NEXUS_MIN_REGION_TIER : PDZ_SPORE_MIN_REGION_TIER
  if (tier < requiredTier) {
    event.cancel()
    return
  }

  entity.addTag('dz_infected')
  if (isNexus) entity.addTag('dz_spore_nexus')
  entity.addTag('dz_spore_region_t' + tier)
})

function pdzSporeMarkerId(marker) {
  let stored = marker.persistentData.getString('dz_wild_instance')
  if (stored) return String(stored)
  return String(marker.level.dimension) + '|' + Math.floor(marker.x) + '|' +
    Math.floor(marker.y) + '|' + Math.floor(marker.z)
}

function pdzSporeNexusSite(player) {
  let best = null
  let bestDistance = 96 * 96
  player.level.entities.forEach(marker => {
    if (!marker.tags || !marker.tags.contains('dz_wilderness_site')) return
    let structure = String(marker.persistentData.getString('dz_wild_structure') || '')
    if (structure.indexOf('spore:') !== 0) return
    if (pdzSporeRegionTier(marker) < PDZ_NEXUS_MIN_REGION_TIER) return
    let dx = Number(marker.x) - Number(player.x)
    let dy = Number(marker.y) - Number(player.y)
    let dz = Number(marker.z) - Number(player.z)
    let distance = dx * dx + dy * dy + dz * dz
    if (distance > bestDistance) return
    // Prefer Spore's authored tower when more than one infection site is loaded.
    let preferred = structure === 'spore:biomass_tower'
    let currentPreferred = best && String(best.persistentData.getString('dz_wild_structure')) ===
      'spore:biomass_tower'
    if (!best || (preferred && !currentPreferred) || preferred === currentPreferred) {
      best = marker
      bestDistance = distance
    }
  })
  return best
}

// Infnexus is not allowed to autospawn at world spawn. After the authored T4
// relay boss has fallen, remaining near a loaded T4+ Spore facility for 15 s
// promotes that existing facility into the next infection front. This is a
// deliberate in-world action and requires no player command.
PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 20 !== 0) return
  let server = player.server
  if (!server.persistentData.getBoolean('dz_story_boss_t4_relay_shepherd_complete_v1') ||
      server.persistentData.getBoolean('dz_spore_nexus_activated_v1')) return
  let marker = pdzSporeNexusSite(player)
  if (!marker) {
    player.persistentData.putString('dz_spore_nexus_candidate_v1', '')
    player.persistentData.putInt('dz_spore_nexus_arm_ticks_v1', 0)
    return
  }
  let markerId = pdzSporeMarkerId(marker)
  if (player.persistentData.getString('dz_spore_nexus_candidate_v1') !== markerId) {
    player.persistentData.putString('dz_spore_nexus_candidate_v1', markerId)
    player.persistentData.putInt('dz_spore_nexus_arm_ticks_v1', 0)
    player.tell(Text.of('[検疫警報] T4感染施設から中枢反応。15秒間留まり信号源を特定せよ。').red())
  }
  let armed = player.persistentData.getInt('dz_spore_nexus_arm_ticks_v1') + 20
  player.persistentData.putInt('dz_spore_nexus_arm_ticks_v1', armed)
  player.runCommandSilent('title @s actionbar {"text":"感染中枢を追跡中 ' +
    Math.min(100, Math.floor(armed * 100 / PDZ_NEXUS_ARM_TICKS)) + '%","color":"dark_red"}')
  if (armed < PDZ_NEXUS_ARM_TICKS) return
  let dimension = String(marker.level.dimension)
  let x = Math.floor(marker.x), y = Math.floor(marker.y), z = Math.floor(marker.z)
  let result = server.runCommandSilent('execute in ' + dimension + ' run infnexus summon ' + x + ' ' + y + ' ' + z)
  if (result <= 0) {
    player.persistentData.putInt('dz_spore_nexus_arm_ticks_v1', 0)
    console.error('[PROJECT DEADZONE][Spore] Infnexus summon failed at ' + markerId)
    return
  }
  server.persistentData.putBoolean('dz_spore_nexus_activated_v1', true)
  server.persistentData.putString('dz_spore_nexus_site_v1', markerId)
  server.runCommandSilent('tellraw @a [{"text":"[WORLD EVENT] ","color":"dark_red","bold":true},' +
    '{"text":"T4感染施設でINFECTION NEXUSが覚醒した。","color":"red"}]')
})

console.info('[PROJECT DEADZONE] Spore region gate loaded: mobs T3+, Nexus T4+ after T4 relay story')
