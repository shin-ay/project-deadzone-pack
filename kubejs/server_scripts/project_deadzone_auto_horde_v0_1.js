// PROJECT DEADZONE explicit Horde bridge v1.1
// The Hordes owns normal cadence, waves, spawning and completion.
// PDZ only translates named pollution/story pressure into one explicit Horde.

const PDZ_HORDE_TABLES = [
  'project_deadzone:pdz_t0', 'project_deadzone:pdz_t1',
  'project_deadzone:pdz_t2', 'project_deadzone:pdz_t3',
  'project_deadzone:pdz_t4', 'project_deadzone:pdz_t5'
]
const PDZ_HORDE_DURATIONS = [3000, 3500, 4000, 4500, 5000, 5500]
const PDZ_HORDE_POLLUTANTS = Java.loadClass('com.endertech.minecraft.mods.adpother.init.Pollutants$BuiltIn')
const PDZ_POLLUTION_BLOCK_POS = Java.loadClass('net.minecraft.core.BlockPos')

// Pollution is evaluated once every 30 seconds, never every tick. A 128-block
// industrial cell can trigger once, then must be cleaned below 55% before it
// can arm again. Cooldowns advance only while at least one player is online.
const PDZ_POLLUTION_INTERVAL = 600
const PDZ_POLLUTION_CELL_SIZE = 128
const PDZ_POLLUTION_REARM_BELOW = 55
const PDZ_POLLUTION_HORDE_AT = 75
const PDZ_POLLUTION_COOLDOWN = 48000
const PDZ_POLLUTION_CLOCK_KEY = 'dz_pollution_active_clock_v1'
const PDZ_POLLUTION_CELLS_KEY = 'dz_pollution_pressure_cells_v1'
const PDZ_POLLUTION_PLAYER_STAGE_KEY = 'dz_pollution_warning_stage_v1'

function pdzHordePollutionParts(player) {
  let result = {carbon: 0, sulfur: 0, dust: 0, score: 0}
  try {
    // Sample the surrounding 5x5 chunks. Moving the machines just outside the
    // workshop must improve ventilation, not erase the settlement pressure.
    for (let dx = -32; dx <= 32; dx += 16) {
      for (let dz = -32; dz <= 32; dz += 16) {
        let pos = new PDZ_POLLUTION_BLOCK_POS(Math.floor(player.x) + dx, Math.floor(player.y), Math.floor(player.z) + dz)
        let carbon = Number(PDZ_HORDE_POLLUTANTS.CARBON.get().getPercentageAtChunk(player.level, pos).getValue())
        let sulfur = Number(PDZ_HORDE_POLLUTANTS.SULFUR.get().getPercentageAtChunk(player.level, pos).getValue())
        let dust = Number(PDZ_HORDE_POLLUTANTS.DUST.get().getPercentageAtChunk(player.level, pos).getValue())
        if (isFinite(carbon)) result.carbon = Math.max(result.carbon, carbon)
        if (isFinite(sulfur)) result.sulfur = Math.max(result.sulfur, sulfur)
        if (isFinite(dust)) result.dust = Math.max(result.dust, dust)
      }
    }
    result.score = Math.max(0, Math.min(200, Math.max(result.carbon, result.sulfur, result.dust)))
  } catch (ignored) {}
  return result
}

function pdzHordePollution(player) {
  return pdzHordePollutionParts(player).score
}

function pdzHordeTier(player) {
  try {
    if (typeof global.pdzCombatTierAt === 'function')
      return Math.max(0, Math.min(5, Number(global.pdzCombatTierAt(player.server, player.x, player.z, player.level.dimension))))
    if (typeof global.pdzWorldTierAt === 'function')
      return Math.max(0, Math.min(5, Number(global.pdzWorldTierAt(player.server, player.x, player.z))))
    return Math.max(0, Math.min(5, player.persistentData.getInt('dz_world_tier')))
  } catch (ignored) { return 0 }
}

function pdzHordeEligible(player) {
  return player && !player.level.clientSide && String(player.level.dimension) === 'minecraft:overworld' &&
    !player.isCreative() && !player.isSpectator()
}

global.pdzStartExplicitHorde = function(server, player, cause) {
  cause = String(cause || '').toLowerCase()
  let allowed = cause === 'pollution' || cause.indexOf('pollution:') === 0 ||
    cause === 'story' || cause.indexOf('story:') === 0
  if (!server || !pdzHordeEligible(player) || !allowed) {
    console.warn('[PROJECT DEADZONE][HORDE] rejected explicit request cause=' + cause)
    return false
  }
  let tier = pdzHordeTier(player)
  let table = PDZ_HORDE_TABLES[tier]
  let duration = PDZ_HORDE_DURATIONS[tier]
  if (cause.indexOf('pollution') === 0) {
    let pollution = pdzHordePollution(player)
    if (pollution < PDZ_POLLUTION_HORDE_AT) {
      console.warn('[PROJECT DEADZONE][HORDE] pollution request below threshold: ' + Math.floor(pollution) + '%')
      return false
    }
    duration = Math.floor(duration * (pollution >= 90 ? 1.25 : 1.125))
  }
  let result = server.runCommandSilent('execute as ' + player.username + ' at @s run hordes start ' + duration + ' ' + table)
  if (result <= 0) {
    console.warn('[PROJECT DEADZONE][HORDE] explicit start failed cause=' + cause + ' table=' + table)
    return false
  }
  server.persistentData.putInt('dz_explicit_horde_count_v1',
    server.persistentData.getInt('dz_explicit_horde_count_v1') + 1)
  server.runCommandSilent('tellraw @a [{"text":"[HORDE] ","color":"dark_red","bold":true},' +
    '{"text":"' + (cause.indexOf('pollution') === 0 ? '汚染に引き寄せられた感染群' : '物語イベントの感染群') +
    'が ' + player.username + ' 周辺へ接近。","color":"red"}]')
  console.info('[PROJECT DEADZONE][HORDE] explicit start cause=' + cause + ' tier=' + tier + ' duration=' + duration)
  return true
}

function pdzPollutionStage(score) {
  if (score >= 90) return 4
  if (score >= 75) return 3
  if (score >= 65) return 2
  if (score >= 50) return 1
  return 0
}

function pdzPollutionCellKey(player) {
  return String(player.level.dimension) + ':' +
    Math.floor(Number(player.x) / PDZ_POLLUTION_CELL_SIZE) + ':' +
    Math.floor(Number(player.z) / PDZ_POLLUTION_CELL_SIZE)
}

function pdzPollutionLoadCells(server) {
  try {
    let raw = String(server.persistentData.getString(PDZ_POLLUTION_CELLS_KEY) || '')
    if (!raw) return {}
    let value = JSON.parse(raw)
    return value && typeof value === 'object' ? value : {}
  } catch (ignored) { return {} }
}

function pdzPollutionSaveCells(server, cells) {
  server.persistentData.putString(PDZ_POLLUTION_CELLS_KEY, JSON.stringify(cells))
}

function pdzPollutionNotify(player, previous, stage, parts) {
  if (previous === stage) return
  let score = Math.floor(parts.score)
  if (stage === 0 && previous > 0) {
    player.tell(Text.of('[産業汚染] 周辺汚染は安定域まで低下。防衛警戒を解除しました。').green())
  } else if (stage === 1) {
    player.tell(Text.of('[産業汚染] 警戒: 周辺汚染 ' + score + '%。集じんフィルターを点検してください。').yellow())
  } else if (stage === 2) {
    player.tell(Text.of('[産業汚染] 警報: 周辺汚染 ' + score + '%。感染体の活動が増加しています。').gold())
  } else if (stage === 3) {
    player.tell(Text.of('[産業汚染] 危険: 周辺汚染 ' + score + '%。感染群誘引の可能性が高い。').red())
  } else if (stage === 4) {
    player.tell(Text.of('[産業汚染] 緊急: 周辺汚染 ' + score + '%。大規模感染群を警戒。').red())
  } else if (stage < previous) {
    player.tell(Text.of('[産業汚染] 汚染圧力が ' + score + '% まで低下しました。').aqua())
  }
}

let PDZ_POLLUTION_TICKS = 0
ServerEvents.tick(event => {
  PDZ_POLLUTION_TICKS++
  if (PDZ_POLLUTION_TICKS % PDZ_POLLUTION_INTERVAL !== 0) return

  let groups = {}
  let online = 0
  event.server.players.forEach(player => {
    online++
    if (!pdzHordeEligible(player)) return
    let parts = pdzHordePollutionParts(player)
    let stage = pdzPollutionStage(parts.score)
    let previous = Number(player.persistentData.getInt(PDZ_POLLUTION_PLAYER_STAGE_KEY))
    pdzPollutionNotify(player, previous, stage, parts)
    player.persistentData.putInt(PDZ_POLLUTION_PLAYER_STAGE_KEY, stage)

    let key = pdzPollutionCellKey(player)
    if (!groups[key] || parts.score > groups[key].parts.score)
      groups[key] = {player: player, parts: parts, stage: stage}
  })
  if (online <= 0) return

  let data = event.server.persistentData
  let clock = Number(data.getLong(PDZ_POLLUTION_CLOCK_KEY)) + PDZ_POLLUTION_INTERVAL
  data.putLong(PDZ_POLLUTION_CLOCK_KEY, clock)
  let cells = pdzPollutionLoadCells(event.server)

  Object.keys(groups).forEach(key => {
    let group = groups[key]
    let cell = cells[key]
    if (!cell || typeof cell !== 'object') cell = {armed: true, cooldownUntil: 0, lastSeen: clock}
    if (typeof cell.armed !== 'boolean') cell.armed = true
    cell.lastSeen = clock

    if (group.parts.score < PDZ_POLLUTION_REARM_BELOW) cell.armed = true
    if (group.stage >= 3 && cell.armed && clock >= Number(cell.cooldownUntil || 0)) {
      if (global.pdzStartExplicitHorde(event.server, group.player, 'pollution:auto')) {
        cell.armed = false
        cell.cooldownUntil = clock + PDZ_POLLUTION_COOLDOWN
        console.info('[PROJECT DEADZONE][POLLUTION] auto Horde cell=' + key +
          ' score=' + Math.floor(group.parts.score) + ' cooldownUntil=' + cell.cooldownUntil)
      }
    }
    cells[key] = cell
  })

  Object.keys(cells).forEach(key => {
    if (clock - Number(cells[key].lastSeen || 0) > 336000) delete cells[key]
  })
  pdzPollutionSaveCells(event.server, cells)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonehorde')
  root.then(Commands.literal('status').executes(ctx => {
    let parts = pdzHordePollutionParts(ctx.source.player)
    ctx.source.player.tell(Text.of('HORDE OWNER: The Hordes / PDZ explicit: ' +
      ctx.source.server.persistentData.getInt('dz_explicit_horde_count_v1') +
      ' / Pollution: ' + Math.floor(parts.score) + '% [C ' + Math.floor(parts.carbon) +
      ' / S ' + Math.floor(parts.sulfur) + ' / D ' + Math.floor(parts.dust) + ']').gold())
    return 1
  }))
  root.then(Commands.literal('test_story').requires(source => source.hasPermission(2)).executes(ctx =>
    global.pdzStartExplicitHorde(ctx.source.server, ctx.source.player, 'story:test') ? 1 : 0))
  root.then(Commands.literal('test_pollution').requires(source => source.hasPermission(2)).executes(ctx =>
    global.pdzStartExplicitHorde(ctx.source.server, ctx.source.player, 'pollution:test') ? 1 : 0))
  root.then(Commands.literal('pollution_rearm').requires(source => source.hasPermission(2)).executes(ctx => {
    ctx.source.server.persistentData.putString(PDZ_POLLUTION_CELLS_KEY, '{}')
    ctx.source.player.tell(Text.of('Pollution Horde cells re-armed for testing.').aqua())
    return 1
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Explicit Horde bridge v1.1 loaded; automatic pollution pressure enabled')
