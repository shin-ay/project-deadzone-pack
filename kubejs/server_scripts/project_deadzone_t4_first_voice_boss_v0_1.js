// PROJECT DEADZONE T4 FIRST VOICE boss vertical slice v0.1
// The third outer relay becomes the arena only after the party leaves and
// deliberately returns.  Existing M&S, TaCZ, faction, quest and music systems
// remain authoritative; this bridge owns the readable encounter mechanics.

const DZ_T4B_TAG = 'dz_story_boss_t4_relay_shepherd'
const DZ_T4B_NODE = 'dz_t4_signal_node'
const DZ_T4B_VISUAL = 'dz_t4_signal_visual'
const DZ_T4B_ADD = 'dz_t4_boss_add'
const DZ_T4B_RUNTIME = 'dz_t4_boss_runtime'
const DZ_T4B_LEDGER = 'dz_t4_outer_relay_ledger_v1'
const DZ_T4B_QUESTS = {
  encounter: '067B7C4A04274550',
  defeated: 'F8FA04084F1B4335'
}
const DZ_T4B_MNS_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')

function dzT4bReadRelays(server) {
  try {
    let value = JSON.parse(server.persistentData.getString(DZ_T4B_LEDGER) || '[]')
    return Array.isArray(value) ? value : []
  } catch (ignored) { return [] }
}

function dzT4bFinalRelay(server) {
  let relays = dzT4bReadRelays(server)
  for (let i = 0; i < relays.length; i++)
    if (Number(relays[i].index) === 3 && relays[i].state === 'SECURED') return relays[i]
  return null
}

function dzT4bAuthorized(player) {
  return player.persistentData.getBoolean('dz_story_auto_v3_t4_authorization') &&
    player.server.persistentData.getBoolean('dz_story_t4_first_voice_coordinates_v1')
}

function dzT4bDist2(entity, x, y, z) {
  let dx = Number(entity.x) - Number(x), dy = Number(entity.y) - Number(y), dz = Number(entity.z) - Number(z)
  return dx * dx + dy * dy + dz * dz
}

function dzT4bMarkerId(marker) {
  let stored = marker.persistentData.getString('dz_wild_instance')
  if (stored) return String(stored)
  return String(marker.level.dimension) + '|' + Math.floor(marker.x) + '|' +
    Math.floor(marker.y) + '|' + Math.floor(marker.z)
}

function dzT4bMarker(player, relay) {
  let found = null
  player.level.entities.forEach(entity => {
    if (found || !entity.tags || !entity.tags.contains('dz_wilderness_site')) return
    if (dzT4bMarkerId(entity) === String(relay.id)) found = entity
  })
  return found
}

function dzT4bBossNear(player, relay, distance) {
  let found = null
  player.level.entities.forEach(entity => {
    if (found || !entity.tags || !entity.tags.contains(DZ_T4B_TAG) || !entity.alive) return
    if (dzT4bDist2(entity, relay.x, relay.y, relay.z) <= distance * distance) found = entity
  })
  return found
}

function dzT4bQuest(player, key, id) {
  let flag = 'dz_t4_boss_quest_' + key + '_v1'
  if (player.persistentData.getBoolean(flag)) return true
  let result = player.server.runCommandSilent('ftbquests change_progress ' + player.username + ' complete ' + id)
  if (result > 0) player.persistentData.putBoolean(flag, true)
  return result > 0
}

function dzT4bAnchorCount(boss) {
  let count = 0
  boss.level.entities.forEach(entity => {
    if (!entity.tags || !entity.tags.contains(DZ_T4B_NODE) || !entity.alive) return
    if (String(entity.persistentData.getString('dz_t4_boss_uuid')) === String(boss.uuid)) count++
  })
  return count
}

function dzT4bSpawnAnchors(boss, spots, outcome) {
  let count = outcome === 'destroy' ? 2 : 3
  for (let i = 1; i <= count; i++) {
    let spot = spots[i]
    let hp = outcome === 'reprogram' ? 20 : 28
    let node = '{Size:1,NoAI:1b,Silent:1b,PersistenceRequired:1b,Health:' + hp + '.0f,' +
      'Attributes:[{Name:"minecraft:generic.max_health",Base:' + hp + '.0d}],CustomName:\'{"text":"SIGNAL NODE ' + i + '","color":"aqua","bold":true}\',' +
      'CustomNameVisible:1b,Tags:["' + DZ_T4B_NODE + '","' + DZ_T4B_RUNTIME + '","dz_pdz_boss_weakpoint","dz_t4_signal_node_' + i + '"]}'
    let display = '{block_state:{Name:"doomsday_decoration:monitor_3"},transformation:{scale:[0.75f,0.75f,0.75f]},' +
      'Tags:["' + DZ_T4B_VISUAL + '","' + DZ_T4B_RUNTIME + '","dz_t4_signal_visual_' + i + '"]}'
    boss.server.runCommandSilent('execute in ' + String(boss.level.dimension) + ' positioned ' + spot.x + ' ' + spot.y + ' ' + spot.z + ' run summon minecraft:slime ~ ~ ~ ' + node)
    boss.server.runCommandSilent('execute in ' + String(boss.level.dimension) + ' positioned ' + spot.x + ' ' + spot.y + ' ' + spot.z + ' run summon minecraft:block_display ~ ~0.2 ~ ' + display)
  }
  boss.level.entities.forEach(entity => {
    if (!entity.tags || !entity.tags.contains(DZ_T4B_NODE)) return
    if (dzT4bDist2(entity, boss.x, boss.y, boss.z) > 24 * 24) return
    if (!entity.persistentData.getString('dz_t4_boss_uuid'))
      entity.persistentData.putString('dz_t4_boss_uuid', String(boss.uuid))
  })
}

function dzT4bInitialize(boss, relay, spots) {
  if (!boss || boss.tags.contains('dz_t4_boss_initialized')) return false
  boss.addTag('dz_t4_boss_initialized')
  boss.persistentData.putString('dz_t4_relay_id', String(relay.id))
  boss.persistentData.putString('dz_t4_argus_outcome', boss.server.persistentData.getString('dz_story_argus_outcome'))
  try {
    let mns = DZ_T4B_MNS_ENTITY_DATA.get(boss)
    mns.setLevel(55)
    mns.setRarity('boss')
    mns.recalcStats_DONT_CALL()
    boss.addTag('dz_mns_boss_profile')
  } catch (error) {
    console.warn('[PDZ T4 BOSS] M&S profile failed: ' + error)
  }
  boss.health = boss.maxHealth
  let outcome = boss.persistentData.getString('dz_t4_argus_outcome')
  dzT4bSpawnAnchors(boss, spots, outcome)
  boss.runCommandSilent('effect give @s minecraft:resistance 9999 3 true')
  boss.runCommandSilent('effect give @s minecraft:glowing 9999 0 true')
  boss.runCommandSilent('playsound minecraft:entity.warden.emerge hostile @a[distance=..96] ~ ~ ~ 1 0.7')
  boss.runCommandSilent('tellraw @a[distance=..96] [{"text":"[FIRST VOICE] ","color":"dark_purple","bold":true},' +
    '{"text":"あなたたちの帰還経路は、もう記録した。","color":"light_purple"}]')
  return true
}

function dzT4bSpawn(player, relay) {
  let marker = dzT4bMarker(player, relay)
  if (!marker) return false
  let outcome = player.server.persistentData.getString('dz_story_argus_outcome')
  let anchors = outcome === 'destroy' ? 2 : 3
  let spots = []
  try { spots = pdzGarSafeSpots(marker, anchors + 1) } catch (ignored) {}
  if (!spots || spots.length < anchors + 1) {
    console.warn('[PDZ T4 BOSS] Safe arena positions unavailable at relay 03; spawn deferred')
    return false
  }
  let spot = spots[0]
  player.server.runCommandSilent('execute in ' + relay.dimension + ' positioned ' + spot.x + ' ' + spot.y + ' ' + spot.z +
    ' run function project_deadzone:story/spawn_t4_relay_shepherd')
  let boss = null
  player.level.entities.forEach(entity => {
    if (boss || !entity.tags || !entity.tags.contains(DZ_T4B_TAG) || entity.tags.contains('dz_t4_boss_initialized')) return
    if (dzT4bDist2(entity, spot.x, spot.y, spot.z) <= 16) boss = entity
  })
  if (!boss || !dzT4bInitialize(boss, relay, spots)) return false
  player.server.persistentData.putBoolean('dz_t4_boss_spawned_v1', true)
  player.server.persistentData.putLong('dz_t4_boss_spawned_ms_v1', Date.now())
  player.server.players.forEach(member => {
    if (dzT4bAuthorized(member)) dzT4bQuest(member, 'encounter', DZ_T4B_QUESTS.encounter)
  })
  return true
}

function dzT4bTrackParticipants(boss) {
  let raw = boss.persistentData.getString('dz_t4_boss_participants')
  let list = raw ? raw.split(';') : []
  boss.server.players.forEach(player => {
    if (String(player.level.dimension) !== String(boss.level.dimension)) return
    if (dzT4bDist2(player, boss.x, boss.y, boss.z) > 96 * 96) return
    let id = String(player.uuid)
    if (list.indexOf(id) < 0) list.push(id)
    player.addTag('dz_t4_boss_participant')
  })
  boss.persistentData.putString('dz_t4_boss_participants', list.join(';'))
}

function dzT4bSpawnEchoes(boss, count) {
  let marker = null
  boss.level.entities.forEach(entity => {
    if (marker || !entity.tags || !entity.tags.contains('dz_wilderness_site')) return
    if (dzT4bMarkerId(entity) === boss.persistentData.getString('dz_t4_relay_id')) marker = entity
  })
  let spots = []
  try { if (marker) spots = pdzGarSafeSpots(marker, count) } catch (ignored) {}
  if (!spots || spots.length < 1) return 0
  for (let i = 0; i < count; i++) {
    let spot = spots[i % spots.length]
    boss.server.runCommandSilent('execute in ' + String(boss.level.dimension) + ' positioned ' + spot.x + ' ' + spot.y + ' ' + spot.z +
      ' run summon simpleenemymod:ruunit ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_npc","dz_remnant","dz_hostile","' +
      DZ_T4B_ADD + '","' + DZ_T4B_RUNTIME + '","dz_pdz_boss_minion"],CustomName:\'{"text":"VOICE ECHO","color":"dark_purple"}\'}')
  }
  boss.runCommandSilent('team join dz_remnant @e[tag=' + DZ_T4B_ADD + ',distance=..32]')
  return count
}

function dzT4bSignalStrike(boss, outcome) {
  let target = null, best = 64 * 64
  boss.server.players.forEach(player => {
    // Damage selectors below already exclude creative/spectator. Avoid relying
    // on version-sensitive player mode methods here; selecting an admin only
    // produces a harmless warning marker during test sessions.
    if (String(player.level.dimension) !== String(boss.level.dimension)) return
    let d = dzT4bDist2(player, boss.x, boss.y, boss.z)
    if (d < best) { best = d; target = player }
  })
  if (!target) return false
  let x = Number(target.x).toFixed(2), y = Number(target.y).toFixed(2), z = Number(target.z).toFixed(2)
  let dimension = String(boss.level.dimension)
  let warning = outcome === 'reprogram' ? 50 : 35
  boss.server.runCommandSilent('execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z +
    ' run particle minecraft:dust 0.75 0.0 1.0 1.5 ~ ~0.1 ~ 2.5 0.1 2.5 0 80 force @a[distance=..96]')
  target.runCommandSilent('title @s actionbar {"text":"SIGNAL LOCK — 着弾地点から離脱！","color":"light_purple","bold":true}')
  target.runCommandSilent('playsound minecraft:block.beacon.deactivate player @s ~ ~ ~ 1 1.7')
  let ref = boss
  boss.server.scheduleInTicks(warning, () => {
    if (!ref || !ref.alive) return
    ref.server.runCommandSilent('execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z +
      ' run particle minecraft:sonic_boom ~ ~1 ~ 0 0 0 0 1 force @a[distance=..96]')
    ref.server.runCommandSilent('execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z +
      ' run damage @a[distance=..3,gamemode=!creative,gamemode=!spectator] 8 minecraft:magic')
    ref.server.runCommandSilent('execute in ' + dimension + ' positioned ' + x + ' ' + y + ' ' + z +
      ' run effect give @a[distance=..3,gamemode=!creative,gamemode=!spectator] minecraft:levitation 1 1 true')
  })
  return true
}

global.pdzT4BossPulse = function(boss, time) {
  if (!boss || !boss.alive || !boss.tags.contains(DZ_T4B_TAG)) return false
  dzT4bTrackParticipants(boss)
  let outcome = boss.persistentData.getString('dz_t4_argus_outcome')
  let anchors = dzT4bAnchorCount(boss)
  if (anchors > 0) boss.runCommandSilent('effect give @s minecraft:resistance 3 3 true')
  else boss.runCommandSilent('effect clear @s minecraft:resistance')
  let ratio = Number(boss.health) / Math.max(1, Number(boss.maxHealth))
  if (ratio <= 0.66 && !boss.tags.contains('dz_t4_boss_echo_phase_1')) {
    boss.addTag('dz_t4_boss_echo_phase_1')
    dzT4bSpawnEchoes(boss, 2)
    boss.runCommandSilent('effect give @s minecraft:resistance 5 1 true')
    boss.runCommandSilent('tellraw @a[distance=..96] {"text":"[FIRST VOICE] 追跡記録からEcho分隊を再構成。","color":"dark_purple","bold":true}')
    return true
  }
  if (ratio <= 0.33 && !boss.tags.contains('dz_t4_boss_echo_phase_2')) {
    boss.addTag('dz_t4_boss_echo_phase_2')
    dzT4bSpawnEchoes(boss, 3)
    boss.runCommandSilent('effect give @s minecraft:speed 9999 0 true')
    boss.runCommandSilent('tellraw @a[distance=..96] {"text":"[FIRST VOICE] 最終同期。全射線を解放。","color":"red","bold":true}')
    return true
  }
  let interval = outcome === 'destroy' ? 8 : (outcome === 'reprogram' ? 11 : 10)
  if (time % interval === 0) return dzT4bSignalStrike(boss, outcome)
  return false
}

EntityEvents.death(event => {
  let entity = event.entity
  if (!entity || entity.level.clientSide) return
  if (entity.tags.contains(DZ_T4B_NODE)) {
    let index = 0
    for (let i = 1; i <= 3; i++) if (entity.tags.contains('dz_t4_signal_node_' + i)) index = i
    entity.runCommandSilent('kill @e[tag=dz_t4_signal_visual_' + index + ',distance=..6]')
    let boss = null
    entity.level.entities.forEach(candidate => {
      if (boss || !candidate.tags || !candidate.tags.contains(DZ_T4B_TAG) || !candidate.alive) return
      if (String(candidate.uuid) === entity.persistentData.getString('dz_t4_boss_uuid')) boss = candidate
    })
    if (!boss) return
    boss.health = Math.max(1, Number(boss.health) - Math.max(10, Number(boss.maxHealth) * 0.08))
    boss.runCommandSilent('effect give @s minecraft:weakness 4 0 true')
    let outcome = boss.persistentData.getString('dz_t4_argus_outcome')
    if (outcome === 'separate') entity.runCommandSilent('effect give @a[distance=..48] minecraft:absorption 30 0 true')
    let remaining = dzT4bAnchorCount(boss)
    if (remaining <= 0) {
      boss.runCommandSilent('effect clear @s minecraft:resistance')
      boss.runCommandSilent('effect give @s minecraft:glowing 12 0 true')
      boss.runCommandSilent('effect give @s minecraft:slowness 6 1 true')
      boss.runCommandSilent('tellraw @a[distance=..96] {"text":"全Signal Node停止。本体防護が崩壊！","color":"gold","bold":true}')
    } else boss.runCommandSilent('tellraw @a[distance=..96] {"text":"Signal Node破壊。残り ' + remaining + '","color":"aqua"}')
    return
  }
  if (!entity.tags.contains(DZ_T4B_TAG) || entity.tags.contains('dz_boss_showroom') || entity.tags.contains('dz_boss_loadtest')) return
  let server = entity.server
  entity.runCommandSilent('kill @e[tag=' + DZ_T4B_RUNTIME + ',distance=..128]')
  server.persistentData.putBoolean('dz_story_boss_t4_relay_shepherd_complete_v1', true)
  server.persistentData.putString('dz_t4_boss_participants_v1', entity.persistentData.getString('dz_t4_boss_participants'))
  server.runCommandSilent('tellraw @a [{"text":"[T4作戦完了] ","color":"gold","bold":true},' +
    '{"text":"RELAY SHEPHERDを撃破。First Voiceの移動回線を切断した。","color":"green"}]')
  server.players.forEach(player => {
    if (dzT4bAuthorized(player)) dzT4bQuest(player, 'defeated', DZ_T4B_QUESTS.defeated)
  })
})

function dzT4bReward(player) {
  if (player.persistentData.getBoolean('dz_t4_boss_reward_v1')) return
  let raw = player.server.persistentData.getString('dz_t4_boss_participants_v1')
  if (!raw || raw.split(';').indexOf(String(player.uuid)) < 0) return
  player.persistentData.putBoolean('dz_t4_boss_reward_v1', true)
  player.give(Item.of('lightmanscurrency:coin_copper', 40))
  let outcome = player.server.persistentData.getString('dz_story_argus_outcome')
  if (outcome === 'destroy') player.give(Item.of('immersiveengineering:component_steel', 6))
  else if (outcome === 'reprogram') player.give(Item.of('superbwarfare:epic_blueprint_data_chip', 1))
  else player.give(Item.of('superbwarfare:battery', 3))
  player.tell(Text.of('RELAY SHEPHERD作戦の参加報酬を受領。').gold())
}

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 100 !== 0) return
  if (player.server.persistentData.getBoolean('dz_t4_boss_spawned_v1') && dzT4bAuthorized(player)) {
    dzT4bQuest(player, 'encounter', DZ_T4B_QUESTS.encounter)
  }
  if (player.server.persistentData.getBoolean('dz_story_boss_t4_relay_shepherd_complete_v1')) {
    if (dzT4bAuthorized(player)) {
      dzT4bQuest(player, 'encounter', DZ_T4B_QUESTS.encounter)
      dzT4bQuest(player, 'defeated', DZ_T4B_QUESTS.defeated)
    }
    dzT4bReward(player)
  }
})

let DZ_T4B_TICKS = 0
ServerEvents.tick(event => {
  DZ_T4B_TICKS++
  if (DZ_T4B_TICKS % 20 !== 0) return
  let server = event.server
  if (!server.persistentData.getBoolean('dz_story_t4_first_voice_coordinates_v1') ||
      server.persistentData.getBoolean('dz_story_boss_t4_relay_shepherd_complete_v1')) return
  let relay = dzT4bFinalRelay(server)
  if (!relay) return
  let near = null
  server.players.forEach(player => {
    if (!dzT4bAuthorized(player) || String(player.level.dimension) !== String(relay.dimension)) return
    if (dzT4bDist2(player, relay.x, relay.y, relay.z) <= 128 * 128) near = player
  })
  if (!near) {
    server.persistentData.putBoolean('dz_t4_boss_armed_v1', true)
    return
  }
  if (!server.persistentData.getBoolean('dz_t4_boss_armed_v1') ||
      dzT4bDist2(near, relay.x, relay.y, relay.z) > 96 * 96) return
  if (dzT4bBossNear(near, relay, 160)) return
  let retry = Number(server.persistentData.getLong('dz_t4_boss_spawn_retry_ms_v1'))
  if (Date.now() < retry) return
  if (!dzT4bSpawn(near, relay)) server.persistentData.putLong('dz_t4_boss_spawn_retry_ms_v1', Date.now() + 30000)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonet4boss').requires(source => source.hasPermission(2))
  root.then(Commands.literal('status').executes(ctx => {
    let server = ctx.source.server
    let relay = dzT4bFinalRelay(server)
    ctx.source.player.tell(Text.of('=== T4 FIRST VOICE BOSS ===').gold())
    ctx.source.player.tell(Text.of('Coordinates=' + server.persistentData.getBoolean('dz_story_t4_first_voice_coordinates_v1') +
      ' / Armed=' + server.persistentData.getBoolean('dz_t4_boss_armed_v1') +
      ' / Spawned=' + server.persistentData.getBoolean('dz_t4_boss_spawned_v1') +
      ' / Defeated=' + server.persistentData.getBoolean('dz_story_boss_t4_relay_shepherd_complete_v1')).aqua())
    if (relay) ctx.source.player.tell(Text.of('Arena: ' + relay.x + ', ' + relay.y + ', ' + relay.z).gray())
    return 1
  }))
  root.then(Commands.literal('force_spawn').executes(ctx => {
    let player = ctx.source.player
    let relay = dzT4bFinalRelay(player.server)
    if (!relay) {
      player.tell(Text.of('確保済みの第3外縁中継点がありません。').red())
      return 0
    }
    if (String(player.level.dimension) !== String(relay.dimension) || dzT4bDist2(player, relay.x, relay.y, relay.z) > 160 * 160) {
      player.tell(Text.of('第3外縁中継点の160m以内で実行してください。').red())
      return 0
    }
    if (dzT4bBossNear(player, relay, 160)) {
      player.tell(Text.of('RELAY SHEPHERDは既に存在します。').yellow())
      return 0
    }
    return dzT4bSpawn(player, relay) ? 1 : 0
  }))
  event.register(root)
})
