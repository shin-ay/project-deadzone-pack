// PROJECT DEADZONE T4 outer relay operation v0.1
// Reuses loaded wilderness facilities.  No new giant structure, item, currency
// or player command is required: discover a relay, defeat its role-based squad,
// then hold the existing Epic Blueprint Data Chip near the site for analysis.

const DZ_T4R_LEDGER = 'dz_t4_outer_relay_ledger_v1'
const DZ_T4R_CHIP = 'superbwarfare:epic_blueprint_data_chip'
const DZ_T4R_MAX = 3
const DZ_T4R_QUESTS = {
  triangulation: '512BA8BAB5024734',
  relay1: '55E5369F5F0A4A0B',
  relay2: '7D2A0FB0C8784DB9',
  relay3: '0F8B4E1A0C9E457F',
  coordinates: '8E64D6D02C8C4481'
}
const DZ_T4R_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')

function dzT4rRead(server) {
  let raw = server.persistentData.getString(DZ_T4R_LEDGER)
  if (!raw) return []
  try {
    let value = JSON.parse(raw)
    return Array.isArray(value) ? value : []
  } catch (error) {
    console.error('[PDZ T4 RELAY] Invalid ledger: ' + error)
    return []
  }
}

function dzT4rWrite(server, ledger) {
  server.persistentData.putString(DZ_T4R_LEDGER, JSON.stringify(ledger))
}

function dzT4rMarkerId(marker) {
  let stored = marker.persistentData.getString('dz_wild_instance')
  if (stored) return String(stored)
  return String(marker.level.dimension) + '|' + Math.floor(marker.x) + '|' +
    Math.floor(marker.y) + '|' + Math.floor(marker.z)
}

function dzT4rDistance2(entity, x, y, z) {
  let dx = Number(entity.x) - Number(x)
  let dy = Number(entity.y) - Number(y)
  let dz = Number(entity.z) - Number(z)
  return dx * dx + dy * dy + dz * dz
}

function dzT4rAuthorized(player) {
  return player.persistentData.getBoolean('dz_story_auto_v3_t4_authorization') &&
    player.server.persistentData.getInt('deadzone_world_tier') >= 4
}

function dzT4rEligible(marker) {
  if (!marker || !marker.tags || !marker.tags.contains('dz_wilderness_site')) return false
  if (marker.tags.contains('dz_t4_outer_relay') || marker.persistentData.getBoolean('dz_t4_relay_reserved')) return false
  let role = String(marker.persistentData.getString('dz_wild_role') || '').toLowerCase()
  let type = String(marker.persistentData.getString('dz_wild_type') || '').toLowerCase()
  let structure = String(marker.persistentData.getString('dz_wild_structure') || '').toLowerCase()
  let faction = String(marker.persistentData.getString('dz_wild_faction') || '').toLowerCase()
  let strategic = ['communications', 'security', 'research', 'machine_node'].indexOf(role) >= 0 ||
    /radio|military|command|laboratory|outpost|fortress|watch/.test(type + ' ' + structure)
  if (!strategic || ['remnant', 'warden', 'raider'].indexOf(faction) < 0) return false
  try {
    if (dzRegionTierAt(marker.server, marker.x, marker.z) < 3) return false
  } catch (ignored) {}
  return true
}

function dzT4rNearestMarker(player, eligibleOnly, distance) {
  let found = null
  let best = distance * distance
  player.level.entities.forEach(marker => {
    if (!marker.tags || !marker.tags.contains('dz_wilderness_site')) return
    if (eligibleOnly && !dzT4rEligible(marker)) return
    let d = dzT4rDistance2(marker, player.x, player.y, player.z)
    if (d <= best) { best = d; found = marker }
  })
  return found
}

function dzT4rRecordForMarker(ledger, marker) {
  let id = dzT4rMarkerId(marker)
  for (let i = 0; i < ledger.length; i++) if (String(ledger[i].id) === id) return ledger[i]
  return null
}

function dzT4rMarkerForRecord(player, record) {
  let found = null
  player.level.entities.forEach(marker => {
    if (found || !marker.tags || !marker.tags.contains('dz_wilderness_site')) return
    if (dzT4rMarkerId(marker) === String(record.id)) found = marker
  })
  return found
}

function dzT4rRegister(player, marker, force) {
  let server = player.server
  let ledger = dzT4rRead(server)
  let existing = dzT4rRecordForMarker(ledger, marker)
  if (existing) return existing
  if (ledger.length >= DZ_T4R_MAX || (!force && !dzT4rEligible(marker))) return null
  let index = ledger.length + 1
  let record = {
    id: dzT4rMarkerId(marker),
    index: index,
    dimension: String(marker.level.dimension),
    x: Math.floor(marker.x), y: Math.floor(marker.y), z: Math.floor(marker.z),
    structure: String(marker.persistentData.getString('dz_wild_structure') || 'existing:facility'),
    role: String(marker.persistentData.getString('dz_wild_role') || 'security'),
    faction: String(marker.persistentData.getString('dz_wild_faction') || 'remnant'),
    state: 'DISCOVERED', spawned: false, reinforced: false,
    discoveredAt: Date.now(), securedAt: 0
  }
  ledger.push(record)
  dzT4rWrite(server, ledger)
  marker.addTag('dz_t4_outer_relay')
  marker.addTag('dz_t4_outer_relay_' + index)
  marker.persistentData.putBoolean('dz_t4_relay_reserved', true)
  marker.persistentData.putInt('dz_t4_relay_index', index)
  // Replace this hostile site's ordinary materialised garrison with the T4
  // authored squad.  Exact site tags prevent neighbouring NPCs being touched.
  let oldGarrisonTag = marker.persistentData.getString('dz_garrison_tag')
  if (oldGarrisonTag) player.level.entities.forEach(entity => {
    if (entity.tags && entity.tags.contains(oldGarrisonTag)) entity.discard()
  })
  marker.persistentData.putInt('dz_wild_garrison_limit', 0)
  marker.persistentData.putBoolean('dz_garrison_active', false)
  marker.persistentData.putLong('dz_garrison_respawn', 0)
  server.runCommandSilent('tellraw @a [{"text":"[レイ緊急通信] ","color":"aqua","bold":true},' +
    '{"text":"外縁中継点0' + index + 'を捕捉。精鋭分隊の反応あり。","color":"gold"}]')
  server.runCommandSilent('execute in ' + record.dimension + ' positioned ' + record.x + ' ' + record.y + ' ' + record.z +
    ' run playsound minecraft:block.beacon.power_select player @a[distance=..96] ~ ~ ~ 1 0.55')
  console.info('[PDZ T4 RELAY] Registered relay ' + index + ' at ' + record.id)
  return record
}

function dzT4rProfile(entity, record, role) {
  entity.persistentData.putString('dz_t4_relay_id', String(record.id))
  entity.persistentData.putInt('dz_t4_relay_index', Number(record.index))
  let armor = role === 'heavy' ? 14 : (role === 'officer' ? 11 : (role === 'medic' ? 8 : 7))
  entity.runCommandSilent('attribute @s minecraft:generic.armor base set ' + armor)
  entity.runCommandSilent('attribute @s minecraft:generic.knockback_resistance base set ' +
    (role === 'heavy' ? 0.75 : 0.35))
  if (role === 'heavy') entity.runCommandSilent('attribute @s minecraft:generic.movement_speed base set 0.20')
  try {
    let mns = DZ_T4R_ENTITY_DATA.get(entity)
    let apex = role === 'officer' || (Number(record.index) === 2 && role === 'heavy')
    mns.setLevel(43 + Number(record.index) * 3)
    mns.setRarity(apex ? 'legendary' : 'epic')
    mns.recalcStats_DONT_CALL()
    entity.addTag('dz_mns_elite_profile')
  } catch (error) {
    console.warn('[PDZ T4 RELAY] M&S profile failed: ' + error)
  }
  entity.health = entity.maxHealth
}

function dzT4rSpawnRoles(player, record, roles) {
  let names = {officer:'Relay Commander', heavy:'Jammer Heavy', medic:'Relay Medic', soldier:'Relay Operator'}
  let marker = dzT4rMarkerForRecord(player, record)
  let spots = []
  try { if (marker) spots = pdzGarSafeSpots(marker, roles.length) } catch (ignored) {}
  if (!spots || spots.length < 1) {
    console.warn('[PDZ T4 RELAY] No safe floor/headroom at relay ' + record.index + '; spawn deferred')
    return false
  }
  roles.forEach((role, i) => {
    let spot = spots[i % spots.length]
    let roleTags = role === 'officer' ? ',"dz_remnant_officer"' :
      (role === 'heavy' ? ',"dz_remnant_heavy"' :
      (role === 'medic' ? ',"dz_faction_medic","dz_remnant_medic"' : ''))
    let command = 'execute in ' + record.dimension + ' positioned ' + spot.x + ' ' +
      spot.y + ' ' + spot.z + ' run summon simpleenemymod:ruunit ~ ~ ~ ' +
      '{Tags:["dz_npc","dz_remnant","dz_hostile","dz_t4_relay_guard","dz_t4_relay_new","dz_t4_relay_role_' +
      role + '"' + roleTags + '],CustomName:\'{"text":"' + names[role] + ' [T4]","color":"dark_red","bold":true}\',' +
      'CustomNameVisible:1b,PersistenceRequired:1b}'
    player.server.runCommandSilent(command)
  })
  player.level.entities.forEach(entity => {
    if (!entity.tags || !entity.tags.contains('dz_t4_relay_new')) return
    if (dzT4rDistance2(entity, record.x, record.y, record.z) > 20 * 20) return
    let role = 'soldier'
    ;['officer','heavy','medic','soldier'].forEach(value => {
      if (entity.tags.contains('dz_t4_relay_role_' + value)) role = value
    })
    entity.tags.remove('dz_t4_relay_new')
    entity.runCommandSilent('team join dz_remnant @s')
    dzT4rProfile(entity, record, role)
  })
  return true
}

function dzT4rSpawnSquad(player, record) {
  let roles = Number(record.index) === 1
    ? ['officer','soldier','soldier','medic','heavy']
    : (Number(record.index) === 2
      ? ['heavy','officer','soldier','soldier','medic']
      : ['officer','heavy','soldier','soldier','soldier'])
  if (!dzT4rSpawnRoles(player, record, roles)) return false
  record.spawned = true
  record.state = 'ENGAGED'
  player.server.runCommandSilent('execute in ' + record.dimension + ' positioned ' + record.x + ' ' + record.y + ' ' + record.z +
    ' run playsound minecraft:entity.warden.sonic_charge player @a[distance=..72] ~ ~ ~ 0.7 1.35')
  return true
}

function dzT4rGuards(player, record) {
  let result = []
  player.level.entities.forEach(entity => {
    if (!entity.tags || !entity.tags.contains('dz_t4_relay_guard')) return
    if (String(entity.persistentData.getString('dz_t4_relay_id')) !== String(record.id)) return
    if (entity.alive && entity.health > 0) result.push(entity)
  })
  return result
}

function dzT4rApplyMechanic(player, record, guards) {
  let index = Number(record.index)
  if (index === 1) {
    let officerAlive = guards.some(entity => entity.tags.contains('dz_t4_relay_role_officer'))
    let pulseKey = 'dz_t4_relay_officer_pulse_' + index
    let lastPulse = Number(player.server.persistentData.getLong(pulseKey))
    if (officerAlive && Date.now() - lastPulse >= 2000) {
      player.server.persistentData.putLong(pulseKey, Date.now())
      guards.forEach(entity => {
        if (!entity.tags.contains('dz_t4_relay_role_officer'))
          entity.runCommandSilent('effect give @s minecraft:resistance 3 0 true')
      })
    }
  } else if (index === 2) {
    let jammerAlive = guards.some(entity => entity.tags.contains('dz_t4_relay_role_heavy'))
    let outcome = player.server.persistentData.getString('dz_story_argus_outcome')
    if (jammerAlive && outcome !== 'destroy' && dzT4rDistance2(player, record.x, record.y, record.z) <= 32 * 32) {
      player.runCommandSilent('effect give @s minecraft:slowness 3 0 true')
      player.runCommandSilent('effect give @s minecraft:weakness 3 0 true')
      player.runCommandSilent('title @s actionbar {"text":"JAMMER ACTIVE — Heavyを排除せよ","color":"red","bold":true}')
    }
  } else if (index === 3 && guards.length <= 2 && !record.reinforced) {
    if (dzT4rSpawnRoles(player, record, ['soldier','soldier'])) {
      record.reinforced = true
      player.server.runCommandSilent('execute in ' + record.dimension + ' positioned ' + record.x + ' ' + record.y + ' ' + record.z +
        ' run tellraw @a[distance=..96] {"text":"[警告] Hunter増援が中継点へ到着","color":"red","bold":true}')
      player.runCommandSilent('playsound minecraft:entity.ravager.roar player @s ~ ~ ~ 0.8 1.3')
      return true
    }
  }
  return false
}

function dzT4rLeash(record, guards) {
  guards.forEach(entity => {
    if (dzT4rDistance2(entity, record.x, record.y, record.z) <= 64 * 64) return
    entity.runCommandSilent('execute in ' + record.dimension + ' run tp @s ' + record.x + ' ' + record.y + ' ' + record.z)
    entity.target = null
  })
}

function dzT4rQuest(player, key, id) {
  let flag = 'dz_t4_relay_quest_' + key + '_v1'
  if (player.persistentData.getBoolean(flag)) return true
  let result = player.server.runCommandSilent('ftbquests change_progress ' + player.username + ' complete ' + id)
  if (result > 0) player.persistentData.putBoolean(flag, true)
  return result > 0
}

function dzT4rSyncQuests(player, ledger) {
  if (!dzT4rAuthorized(player)) return
  if (ledger.length > 0) dzT4rQuest(player, 'triangulation', DZ_T4R_QUESTS.triangulation)
  let secured = ledger.filter(record => record.state === 'SECURED').length
  if (secured >= 1) dzT4rQuest(player, 'relay1', DZ_T4R_QUESTS.relay1)
  if (secured >= 2) dzT4rQuest(player, 'relay2', DZ_T4R_QUESTS.relay2)
  if (secured >= 3) {
    dzT4rQuest(player, 'relay3', DZ_T4R_QUESTS.relay3)
    if (dzT4rQuest(player, 'coordinates', DZ_T4R_QUESTS.coordinates))
      player.server.persistentData.putBoolean('dz_story_t4_first_voice_coordinates_v1', true)
  }
}

function dzT4rChannel(player, record, ledger) {
  let siteKey = String(record.id)
  let activeKey = player.persistentData.getString('dz_t4_relay_channel_site_v1')
  if (activeKey !== siteKey) {
    player.persistentData.putString('dz_t4_relay_channel_site_v1', siteKey)
    player.persistentData.putInt('dz_t4_relay_channel_ticks_v1', 0)
  }
  if (player.inventory.count(Item.of(DZ_T4R_CHIP)) < 1) {
    player.persistentData.putInt('dz_t4_relay_channel_ticks_v1', 0)
    player.runCommandSilent('title @s actionbar {"text":"Epic Blueprint Data Chipが必要","color":"yellow"}')
    return
  }
  let outcome = player.server.persistentData.getString('dz_story_argus_outcome')
  let required = outcome === 'reprogram' ? 60 : (outcome === 'separate' ? 80 : 100)
  let ticks = player.persistentData.getInt('dz_t4_relay_channel_ticks_v1') + 20
  player.persistentData.putInt('dz_t4_relay_channel_ticks_v1', ticks)
  let percent = Math.min(100, Math.floor(ticks * 100 / required))
  player.runCommandSilent('title @s actionbar {"text":"中継暗号を解析中 ' + percent + '%","color":"aqua"}')
  player.runCommandSilent('playsound minecraft:block.note_block.bit player @s ~ ~ ~ 0.2 ' + (0.8 + percent / 250))
  if (ticks < required) return
  record.state = 'SECURED'
  record.securedAt = Date.now()
  record.securedBy = String(player.username)
  dzT4rWrite(player.server, ledger)
  player.persistentData.putString('dz_t4_relay_channel_site_v1', '')
  player.persistentData.putInt('dz_t4_relay_channel_ticks_v1', 0)
  let secured = ledger.filter(value => value.state === 'SECURED').length
  player.server.persistentData.putInt('dz_t4_relay_secured_count_v1', secured)
  player.server.runCommandSilent('tellraw @a [{"text":"[作戦更新] ","color":"gold","bold":true},' +
    '{"text":"外縁中継点0' + record.index + 'を確保 (' + secured + '/3)","color":"green"}]')
  player.server.runCommandSilent('execute in ' + record.dimension + ' positioned ' + record.x + ' ' + record.y + ' ' + record.z +
    ' run playsound minecraft:block.beacon.deactivate player @a[distance=..96] ~ ~ ~ 1 1.25')
  if (outcome === 'separate') player.give(Item.of('superbwarfare:battery', 1))
  dzT4rSyncQuests(player, ledger)
}

function dzT4rProcess(player, record, ledger) {
  if (String(player.level.dimension) !== String(record.dimension)) return
  let distance = dzT4rDistance2(player, record.x, record.y, record.z)
  if (distance > 96 * 96 || record.state === 'SECURED') return
  let outcome = player.server.persistentData.getString('dz_story_argus_outcome')
  let supportFlag = 'dz_t4_relay_support_notice_' + record.index + '_v1'
  if (!player.persistentData.getBoolean(supportFlag)) {
    player.persistentData.putBoolean(supportFlag, true)
    if (outcome === 'reprogram') {
      player.runCommandSilent('effect give @s minecraft:night_vision 120 0 true')
      player.runCommandSilent('effect give @s minecraft:absorption 120 0 true')
      player.tell(Text.of('[ARGUS支援] 敵識別と解析補助を120秒間提供。').aqua())
    } else if (outcome === 'separate') {
      player.runCommandSilent('effect give @s minecraft:speed 60 0 true')
      player.tell(Text.of('[地域ノード] 短時間の経路支援を確保。解析完了時にBatteryを回収可能。').yellow())
    } else player.tell(Text.of('[無線] ARGUS支援なし。現地戦力だけで中継点を確保せよ。').gray())
  }
  if (!record.spawned) {
    if (Number(record.nextSpawnAt || 0) > Date.now()) return
    if (!dzT4rSpawnSquad(player, record)) record.nextSpawnAt = Date.now() + 30000
    dzT4rWrite(player.server, ledger)
    if (!record.spawned) return
  }
  let guards = dzT4rGuards(player, record)
  dzT4rLeash(record, guards)
  if (guards.length > 0) {
    if (dzT4rApplyMechanic(player, record, guards)) dzT4rWrite(player.server, ledger)
    return
  }
  if (record.state !== 'CLEARED') {
    record.state = 'CLEARED'
    dzT4rWrite(player.server, ledger)
    player.server.runCommandSilent('execute in ' + record.dimension + ' positioned ' + record.x + ' ' + record.y + ' ' + record.z +
      ' run tellraw @a[distance=..96] {"text":"分隊排除完了。Epic Data Chipを持って中枢へ接近せよ。","color":"aqua"}')
  }
  if (distance <= 10 * 10) dzT4rChannel(player, record, ledger)
  else if (player.persistentData.getString('dz_t4_relay_channel_site_v1') === String(record.id)) {
    player.persistentData.putString('dz_t4_relay_channel_site_v1', '')
    player.persistentData.putInt('dz_t4_relay_channel_ticks_v1', 0)
  }
}

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 20 !== 0 || !dzT4rAuthorized(player)) return
  let ledger = dzT4rRead(player.server)
  if (ledger.length < DZ_T4R_MAX && player.age % 40 === 0) {
    let marker = dzT4rNearestMarker(player, true, 72)
    if (marker && !dzT4rRecordForMarker(ledger, marker)) {
      dzT4rRegister(player, marker, false)
      ledger = dzT4rRead(player.server)
    }
  }
  ledger.forEach(record => dzT4rProcess(player, record, ledger))
  dzT4rSyncQuests(player, ledger)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonet4relay').requires(source => source.hasPermission(2))
  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    let ledger = dzT4rRead(player.server)
    player.tell(Text.of('=== T4 OUTER RELAYS ===').gold())
    player.tell(Text.of('Registered: ' + ledger.length + '/3 / Story S' +
      player.server.persistentData.getInt('deadzone_world_tier')).aqua())
    ledger.forEach(record => player.tell(Text.of('0' + record.index + ' ' + record.state + ' / ' +
      record.role + ' / ' + record.x + ', ' + record.y + ', ' + record.z).gray()))
    return 1
  }))
  root.then(Commands.literal('force_nearest').executes(ctx => {
    let player = ctx.source.player
    let marker = dzT4rNearestMarker(player, false, 128)
    if (!marker) {
      player.tell(Text.of('128m以内に既存のwilderness site markerがありません。').red())
      return 0
    }
    let record = dzT4rRegister(player, marker, true)
    if (!record) {
      player.tell(Text.of('中継点は既に3地点登録済みです。').red())
      return 0
    }
    player.tell(Text.of('既存施設をT4中継点0' + record.index + 'として登録しました。').green())
    return 1
  }))
  event.register(root)
})
