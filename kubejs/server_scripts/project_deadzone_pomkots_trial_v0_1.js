// PROJECT DEADZONE Pomkots Mechs faction trial v0.3
//
// Pomkots is still a local-only candidate library. This script exposes staged,
// admin-only tests for its recon, squad, strongpoint, carrier and boss classes.
// Natural spawning, survival recipes and campaign unlocks stay disabled until
// every class has passed damage, targeting, pathfinding and multiplayer tests.

const PDZ_POMKOTS_STRING = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
const PDZ_POMKOTS_TRIAL_TAG = 'dz_pomkots_trial'
const PDZ_POMKOTS_PREVIEW_TAG = 'dz_pomkots_preview'
const PDZ_POMKOTS_LOS_GRACE_TICKS = 80
const PDZ_POMKOTS_LOST_TARGET_TICKS = 60
const PDZ_POMKOTS_RETARGET_COOLDOWN = 100
const PDZ_POMKOTS_PROJECTILES = [
  'pomkotsmechs:bullet',
  'pomkotsmechs:bulletmiddle',
  'pomkotsmechs:bulletrifle',
  'pomkotsmechs:bulletmachine',
  'pomkotsmechs:bulletmachinelarge',
  'pomkotsmechs:bulletbeam',
  'pomkotsmechs:grenade',
  'pomkotsmechs:grenadelarge',
  'pomkotsmechs:missileenemy',
  'pomkotsmechs:missileenemylarge',
  'pomkotsmechs:missilegeneric',
  'pomkotsmechs:missilegenericlarge',
  'pomkotsmechs:missilevertical',
  'pomkotsmechs:missilehorizontal',
  'pomkotsmechs:missilepod',
  'pomkotsmechs:bulletgrenade',
  'pomkotsmechs:bulletgrenadelarge',
  'pomkotsmechs:needle',
  'pomkotsmechs:mine',
  'pomkotsmechs:earthbreak',
  'pomkotsmechs:earthbreak2',
  'pomkotsmechs:earthraise',
  'pomkotsmechs:wave_h',
  'pomkotsmechs:rocklarge',
  'pomkotsmechs:rocksmall'
]

// [short id, entity id, combat class, intended World Tier]
const PDZ_POMKOTS_UNITS = [
  ['pmss01', 'pomkotsmechs:pmss01', 'recon', 3],
  ['pmss02', 'pomkotsmechs:pmss02', 'recon', 3],
  ['pmss03', 'pomkotsmechs:pmss03', 'recon', 3],
  ['pms01', 'pomkotsmechs:pms01', 'squad', 3],
  ['pms02', 'pomkotsmechs:pms02', 'squad', 3],
  ['pms03', 'pomkotsmechs:pms03', 'squad', 3],
  ['pms04', 'pomkotsmechs:pms04', 'squad', 3],
  ['pms05', 'pomkotsmechs:pms05', 'specialist', 4],
  ['pms06', 'pomkotsmechs:pms06', 'specialist', 4],
  ['pms07', 'pomkotsmechs:pms07', 'specialist', 4],
  ['pms08', 'pomkotsmechs:pms08', 'specialist', 4],
  ['pms09', 'pomkotsmechs:pms09', 'squad', 3],
  ['pms10', 'pomkotsmechs:pms10', 'specialist', 4],
  ['pmt01', 'pomkotsmechs:pmt01', 'turret', 4],
  ['pmt02', 'pomkotsmechs:pmt02', 'turret', 4],
  ['pmt03', 'pomkotsmechs:pmt03', 'turret', 5],
  ['pmt04', 'pomkotsmechs:pmt04', 'turret', 5],
  ['pmc01', 'pomkotsmechs:pmc01', 'carrier', 4],
  ['pmc02', 'pomkotsmechs:pmc02', 'carrier', 4],
  ['pmb01mk2', 'pomkotsmechs:pmb01mk2', 'boss', 4],
  ['pmb02', 'pomkotsmechs:pmb02', 'boss', 5],
  ['pmb03', 'pomkotsmechs:pmb03', 'boss', 4],
  ['pmb04', 'pomkotsmechs:pmb04', 'boss', 4],
  ['pmb05', 'pomkotsmechs:pmb05', 'boss', 5],
  ['pmb06', 'pomkotsmechs:pmb06', 'boss', 5],
  ['pmb07', 'pomkotsmechs:pmb07', 'boss', 5],
  ['pmb08', 'pomkotsmechs:pmb08', 'boss', 5]
]

const PDZ_POMKOTS_SCENARIOS = {
  recon: [
    ['pmss01', -3, 0, 22], ['pmss02', 0, 0, 25], ['pmss03', 3, 0, 22]
  ],
  patrol: [
    ['pms01', -6, 0, 28], ['pms03', -2, 0, 31],
    ['pms04', 2, 0, 31], ['pms09', 6, 0, 28]
  ],
  breach: [
    ['pms05', -6, 0, 30], ['pms06', -2, 0, 33], ['pms07', 2, 0, 30],
    ['pms08', 5, 0, 34], ['pms10', 8, 1, 38]
  ],
  strongpoint: [
    ['pmt01', -7, 0, 34], ['pmt02', 7, 0, 34],
    ['pms03', -3, 0, 28], ['pms04', 3, 0, 28]
  ],
  siege: [
    ['pmt03', -8, 0, 38], ['pmt04', 8, 0, 38],
    ['pms06', -3, 0, 31], ['pms10', 3, 1, 42]
  ],
  carriers: [
    ['pmc01', -8, 10, 42], ['pmc02', 8, 10, 42]
  ]
}

let pdzPomkotsClock = 0
let pdzPomkotsTracked = []

function pdzPomkotsUnit(value) {
  let id = String(value || '').toLowerCase().replace('pomkotsmechs:', '')
  for (let i = 0; i < PDZ_POMKOTS_UNITS.length; i++) {
    let entry = PDZ_POMKOTS_UNITS[i]
    if (entry[0] === id || entry[1] === String(value)) return entry
  }
  return null
}

function pdzPomkotsProfile(entity) {
  let entry = entity ? pdzPomkotsUnit(String(entity.type)) : null
  if (!entry) return null
  let role = entry[2]
  if (role === 'boss') return {role: role, home: 64, vertical: 24, target: 48}
  if (role === 'carrier') return {role: role, home: 72, vertical: 32, target: 56}
  if (role === 'turret') return {role: role, home: 8, vertical: 8, target: 56}
  if (role === 'recon') return {role: role, home: 40, vertical: 16, target: 32}
  return {role: role, home: 48, vertical: 20, target: 40}
}

function pdzPomkotsIsCombatUnit(entity) {
  return !!(entity && entity.alive && entity.tags &&
    entity.tags.contains(PDZ_POMKOTS_TRIAL_TAG) && pdzPomkotsProfile(entity))
}

function pdzPomkotsAllowedTarget(entity) {
  if (!entity || !entity.alive) return false
  let type = String(entity.type)
  if (type === 'minecraft:player' || type === 'minecraft:villager' ||
      type === 'minecraft:wandering_trader' || type === 'minecolonies:citizen') return true
  return type.indexOf('mca:') === 0
}

function pdzPomkotsEnsureHome(unit) {
  if (!unit || !unit.persistentData || unit.persistentData.getBoolean('dz_pomkots_home_set')) return
  unit.persistentData.putDouble('dz_pomkots_home_x', Number(unit.x))
  unit.persistentData.putDouble('dz_pomkots_home_y', Number(unit.y))
  unit.persistentData.putDouble('dz_pomkots_home_z', Number(unit.z))
  unit.persistentData.putString('dz_pomkots_home_dimension', String(unit.level.dimension))
  unit.persistentData.putBoolean('dz_pomkots_home_set', true)
}

function pdzPomkotsCanSee(unit, target) {
  try { return !!unit.hasLineOfSight(target) } catch (ignored) {}
  try { return !!unit.getSensing().hasLineOfSight(target) } catch (ignored) {}
  return true
}

function pdzPomkotsClearAggro(unit) {
  try { unit.clearAllHate() } catch (ignored) {}
  try { unit.setTarget(null) } catch (ignored) {}
}

function pdzPomkotsClearProjectiles(origin, radius) {
  let removed = 0
  PDZ_POMKOTS_PROJECTILES.forEach(type => {
    try { removed += origin.runCommandSilent('kill @e[type=' + type + ',distance=..' + radius + ']') } catch (ignored) {}
  })
  return removed
}

function pdzPomkotsReturnHome(unit, reason) {
  if (!unit || !unit.alive || !unit.persistentData.getBoolean('dz_pomkots_home_set')) return false
  if (unit.persistentData.getString('dz_pomkots_home_dimension') !== String(unit.level.dimension)) return false
  let hx = unit.persistentData.getDouble('dz_pomkots_home_x')
  let hy = unit.persistentData.getDouble('dz_pomkots_home_y')
  let hz = unit.persistentData.getDouble('dz_pomkots_home_z')
  pdzPomkotsClearAggro(unit)
  unit.runCommandSilent('particle minecraft:portal ~ ~2 ~ 1 1.5 1 0.15 24 force @a[distance=..96]')
  unit.runCommandSilent('tp @s ' + hx + ' ' + hy + ' ' + hz)
  unit.runCommandSilent('data merge entity @s {Motion:[0.0d,0.0d,0.0d]}')
  unit.runCommandSilent('effect give @s minecraft:resistance 5 4 true')
  pdzPomkotsClearProjectiles(unit, 80)
  unit.persistentData.putInt('dz_pomkots_los_lost_ticks', 0)
  unit.persistentData.putInt('dz_pomkots_target_lost_ticks', 0)
  unit.persistentData.putBoolean('dz_pomkots_had_target', false)
  unit.persistentData.putDouble('dz_pomkots_retarget_at', Number(unit.level.gameTime) + PDZ_POMKOTS_RETARGET_COOLDOWN)
  unit.persistentData.putString('dz_pomkots_last_return_reason', reason)
  return true
}

function pdzPomkotsControlUnit(unit) {
  if (!pdzPomkotsIsCombatUnit(unit)) return
  let profile = pdzPomkotsProfile(unit)
  pdzPomkotsEnsureHome(unit)
  let data = unit.persistentData
  let hx = data.getDouble('dz_pomkots_home_x')
  let hy = data.getDouble('dz_pomkots_home_y')
  let hz = data.getDouble('dz_pomkots_home_z')
  let homeDx = Number(unit.x) - hx
  let homeDy = Number(unit.y) - hy
  let homeDz = Number(unit.z) - hz
  if (homeDx * homeDx + homeDz * homeDz > profile.home * profile.home || Math.abs(homeDy) > profile.vertical) {
    pdzPomkotsReturnHome(unit, 'arena_boundary')
    return
  }

  if (data.getDouble('dz_pomkots_retarget_at') > Number(unit.level.gameTime)) {
    pdzPomkotsClearAggro(unit)
    return
  }

  let target = null
  try { target = unit.target } catch (ignored) {}
  if (target && pdzPomkotsAllowedTarget(target)) {
    let dx = Number(target.x) - Number(unit.x)
    let dy = Number(target.y) - Number(unit.y)
    let dz = Number(target.z) - Number(unit.z)
    if (dx * dx + dy * dy + dz * dz > profile.target * profile.target) {
      pdzPomkotsReturnHome(unit, 'target_range')
      return
    }
    data.putBoolean('dz_pomkots_had_target', true)
    data.putInt('dz_pomkots_target_lost_ticks', 0)
    if (pdzPomkotsCanSee(unit, target)) {
      data.putInt('dz_pomkots_los_lost_ticks', 0)
      return
    }
    let lost = data.getInt('dz_pomkots_los_lost_ticks') + 5
    data.putInt('dz_pomkots_los_lost_ticks', lost)
    if (lost >= PDZ_POMKOTS_LOS_GRACE_TICKS) pdzPomkotsReturnHome(unit, 'line_of_sight')
    return
  }

  if (target) pdzPomkotsClearAggro(unit)
  data.putInt('dz_pomkots_los_lost_ticks', 0)
  if (!data.getBoolean('dz_pomkots_had_target')) return
  let lostTarget = data.getInt('dz_pomkots_target_lost_ticks') + 5
  data.putInt('dz_pomkots_target_lost_ticks', lostTarget)
  if (lostTarget >= PDZ_POMKOTS_LOST_TARGET_TICKS) pdzPomkotsReturnHome(unit, 'target_lost')
}

function pdzPomkotsTrack(entity) {
  if (!pdzPomkotsIsCombatUnit(entity)) return
  pdzPomkotsEnsureHome(entity)
  let uuid = String(entity.uuid)
  for (let i = 0; i < pdzPomkotsTracked.length; i++) {
    if (String(pdzPomkotsTracked[i].uuid) === uuid) return
  }
  pdzPomkotsTracked.push(entity)
}

function pdzPomkotsSpawnRelative(player, id, left, up, forward, preview) {
  let entry = pdzPomkotsUnit(id)
  if (!entry) return 0
  let tag = preview ? PDZ_POMKOTS_PREVIEW_TAG : PDZ_POMKOTS_TRIAL_TAG
  let tags = '"' + tag + '","dz_pomkots_candidate","dz_pomkots_' + entry[2] + '","dz_pomkots_t' + entry[3] + '"'
  if (!preview) tags += ',"dz_hostile"'
  let nbt = preview
    ? '{NoAI:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b,Tags:[' + tags + ']}'
    : '{PersistenceRequired:1b,Tags:[' + tags + ']}'
  let command = 'execute as ' + player.username + ' at @s positioned ^' + left + ' ^' + up + ' ^' + forward +
    ' run summon ' + entry[1] + ' ~ ~ ~ ' + nbt
  return player.server.runCommandSilent(command)
}

function pdzPomkotsSpawnScenario(player, name, preview) {
  let scenario = PDZ_POMKOTS_SCENARIOS[String(name || '').toLowerCase()]
  if (!scenario) return 0
  let count = 0
  scenario.forEach(spawn => { count += pdzPomkotsSpawnRelative(player, spawn[0], spawn[1], spawn[2], spawn[3], preview) })
  return count
}

EntityEvents.spawned(event => {
  if (!event.entity || event.entity.level.clientSide) return
  pdzPomkotsTrack(event.entity)
})

ServerEvents.tick(event => {
  pdzPomkotsClock++
  if (pdzPomkotsClock % 5 === 0) {
    let alive = []
    pdzPomkotsTracked.forEach(unit => {
      if (!pdzPomkotsIsCombatUnit(unit)) return
      pdzPomkotsControlUnit(unit)
      alive.push(unit)
    })
    pdzPomkotsTracked = alive
  }
  if (pdzPomkotsClock % 100 !== 0) return
  let seenLevels = {}
  event.server.players.forEach(player => {
    let dimension = String(player.level.dimension)
    if (seenLevels[dimension]) return
    seenLevels[dimension] = true
    player.level.entities.forEach(entity => pdzPomkotsTrack(entity))
  })
})

ServerEvents.recipes(event => {
  event.remove({mod: 'pomkotsmechs'})
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonepomkots').requires(source => source.hasPermission(2))

  root.then(Commands.literal('list').executes(ctx => {
    if (ctx.source.player) {
      ctx.source.player.tell(Text.of('[POMKOTS TRIAL] recon / patrol / breach / strongpoint / siege / carriers').aqua())
      ctx.source.player.tell(Text.of('preview <id> / combat <id> / wave <scenario> / status / cleanup').gray())
    }
    return 1
  }))

  root.then(Commands.literal('catalog').executes(ctx => {
    let player = ctx.source.player
    if (!player) return 0
    player.tell(Text.of('[T3 RECON] pmss01 pmss02 pmss03').green())
    player.tell(Text.of('[T3 SQUAD] pms01 pms02 pms03 pms04 pms09').yellow())
    player.tell(Text.of('[T4 SPECIALIST] pms05 pms06 pms07 pms08 pms10').gold())
    player.tell(Text.of('[T4-5 TURRET/CARRIER] pmt01-04 pmc01-02').red())
    player.tell(Text.of('[T4-5 BOSS] pmb01mk2 pmb02-08').red())
    return 1
  }))

  root.then(Commands.literal('preview').then(Commands.argument('id', PDZ_POMKOTS_STRING.word()).executes(ctx => {
    let player = ctx.source.player
    if (!player) return 0
    let id = PDZ_POMKOTS_STRING.getString(ctx, 'id')
    let result = pdzPomkotsSpawnRelative(player, id, 0, 0, 24, true)
    player.tell(result ? Text.of('[POMKOTS TRIAL] ' + id + 'を停止展示しました。').aqua() : Text.of('不明なID: ' + id).red())
    return result
  })))

  root.then(Commands.literal('combat').then(Commands.argument('id', PDZ_POMKOTS_STRING.word()).executes(ctx => {
    let player = ctx.source.player
    if (!player) return 0
    let id = PDZ_POMKOTS_STRING.getString(ctx, 'id')
    let result = pdzPomkotsSpawnRelative(player, id, 0, 0, 28, false)
    player.tell(result ? Text.of('[POMKOTS TRIAL] ' + id + 'を安全制御付きで展開しました。').red() : Text.of('不明なID: ' + id).red())
    return result
  })))

  root.then(Commands.literal('wave').then(Commands.argument('scenario', PDZ_POMKOTS_STRING.word()).executes(ctx => {
    let player = ctx.source.player
    if (!player) return 0
    let scenario = PDZ_POMKOTS_STRING.getString(ctx, 'scenario')
    let result = pdzPomkotsSpawnScenario(player, scenario, false)
    player.tell(result ? Text.of('[POMKOTS TRIAL] ' + scenario + ' 部隊を展開: ' + result).red() : Text.of('不明なシナリオ: ' + scenario).red())
    return result
  })))

  // Compatibility with the first PMB test command set.
  ;[['01','pmb01mk2'],['02','pmb02'],['03','pmb03'],['04','pmb04'],['05','pmb05'],['06','pmb06'],['07','pmb07'],['08','pmb08']].forEach(entry => {
    root.then(Commands.literal('preview_' + entry[0]).executes(ctx => {
      let player = ctx.source.player
      return player ? pdzPomkotsSpawnRelative(player, entry[1], 0, 0, 24, true) : 0
    }))
    root.then(Commands.literal('combat_' + entry[0]).executes(ctx => {
      let player = ctx.source.player
      return player ? pdzPomkotsSpawnRelative(player, entry[1], 0, 0, 28, false) : 0
    }))
  })

  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    if (!player) return 0
    let counts = {recon: 0, squad: 0, specialist: 0, turret: 0, carrier: 0, boss: 0}
    pdzPomkotsTracked.forEach(unit => {
      let profile = pdzPomkotsProfile(unit)
      if (profile && counts[profile.role] !== undefined) counts[profile.role]++
    })
    player.tell(Text.of('[POMKOTS TRIAL] recon=' + counts.recon + ' squad=' + counts.squad +
      ' specialist=' + counts.specialist + ' turret=' + counts.turret +
      ' carrier=' + counts.carrier + ' boss=' + counts.boss).aqua())
    player.tell(Text.of('視線喪失4秒 / ターゲット喪失3秒 / 再索敵待機5秒').gray())
    return 1
  }))

  root.then(Commands.literal('cleanup').executes(ctx => {
    let player = ctx.source.player
    if (!player) return 0
    let count = player.runCommandSilent('kill @e[tag=' + PDZ_POMKOTS_TRIAL_TAG + ',distance=..192]')
    count += player.runCommandSilent('kill @e[tag=' + PDZ_POMKOTS_PREVIEW_TAG + ',distance=..192]')
    count += pdzPomkotsClearProjectiles(player, 192)
    pdzPomkotsTracked = []
    player.tell(Text.of('[POMKOTS TRIAL] 192m以内の試験個体・飛翔体を撤去: ' + count).yellow())
    return count
  }))

  event.register(root)
})

console.info('[PROJECT DEADZONE] Pomkots Mechs faction trial v0.3 loaded')
