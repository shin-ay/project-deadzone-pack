// PROJECT DEADZONE automatic Horde director v0.2
//
// One shared director prevents multiplayer Horde stacking. Time advances only
// while at least one player is online. The 100 m camp ring blocks event
// selection during the first twenty online-active days, then becomes T1.

const PDZ_AH_ACTIVE_TICKS = 'dz_auto_horde_active_ticks_v1'
const PDZ_AH_NEXT_TICK = 'dz_auto_horde_next_tick_v1'
const PDZ_AH_PENDING_AT = 'dz_auto_horde_pending_at_v1'
const PDZ_AH_PENDING_PLAYER = 'dz_auto_horde_pending_player_v1'
const PDZ_AH_COUNT = 'dz_auto_horde_count_v1'
const PDZ_AH_INITIAL_GRACE = 54000       // 45 active minutes
const PDZ_AH_RETRY_DELAY = 12000         // 10 min if every player is in the camp ring
const PDZ_AH_WARNING = 600               // 30 s warning
const PDZ_AH_COOLDOWN_MIN = 72000        // 60 active minutes
const PDZ_AH_COOLDOWN_SPREAD = 24000     // +0..20 active minutes
const PDZ_AH_CAMP_RADIUS = 100
const PDZ_AH_POLLUTION_WARNING = 75      // brief warning effects begin here
const PDZ_AH_POLLUTION_CRITICAL = 90     // urgent raid pressure begins here
const PDZ_AH_POLLUTION_PULSE = 1200      // at most once per active minute
const PDZ_AH_POLLUTION_WARNING_CAP = 14400 // raid within 12 active minutes
const PDZ_AH_POLLUTION_CRITICAL_CAP = 3600 // raid within 3 active minutes
const PDZ_AH_TABLES = [
  'project_deadzone:pdz_t0', 'project_deadzone:pdz_t1',
  'project_deadzone:pdz_t2', 'project_deadzone:pdz_t3',
  'project_deadzone:pdz_t4', 'project_deadzone:pdz_t5'
]
const PDZ_AH_DURATIONS = [3000, 3500, 4000, 4500, 5000, 5500]
const PDZ_AH_POLLUTANTS = Java.loadClass('com.endertech.minecraft.mods.adpother.init.Pollutants$BuiltIn')

function pdzAhPollution(player) {
  try {
    let pos = player.blockPosition()
    let carbon = Number(PDZ_AH_POLLUTANTS.CARBON.get().getPercentageAtChunk(player.level, pos).getValue())
    let sulfur = Number(PDZ_AH_POLLUTANTS.SULFUR.get().getPercentageAtChunk(player.level, pos).getValue())
    if (!isFinite(carbon)) carbon = 0
    if (!isFinite(sulfur)) sulfur = 0
    return Math.max(0, Math.min(200, Math.max(carbon, sulfur)))
  } catch (ignored) { return 0 }
}

function pdzAhPollutionBand(value) {
  if (value >= PDZ_AH_POLLUTION_CRITICAL) return 2
  if (value >= PDZ_AH_POLLUTION_WARNING) return 1
  return 0
}

function pdzAhPollutionPulse(player, value, activeTicks) {
  let band = pdzAhPollutionBand(value)
  let previous = player.persistentData.getInt('dz_pollution_band_v1')
  player.persistentData.putInt('dz_pollution_band_v1', band)
  player.persistentData.putInt('dz_pollution_percent_v1', Math.floor(value))

  if (band !== previous) {
    if (band === 0 && previous > 0) {
      player.runCommandSilent('tellraw @s [{"text":"[POLLUTION] ","color":"dark_aqua","bold":true},{"text":"排煙濃度が安定域へ戻った。","color":"aqua"}]')
    } else if (band === 1) {
      player.runCommandSilent('tellraw @s [{"text":"[POLLUTION WARNING] ","color":"gold","bold":true},{"text":"排煙を追って感染群が集まり始めている。","color":"yellow"}]')
      player.runCommandSilent('playsound minecraft:block.note_block.didgeridoo player @s ~ ~ ~ 0.55 0.65')
    } else if (band === 2) {
      player.runCommandSilent('tellraw @s [{"text":"[POLLUTION CRITICAL] ","color":"dark_red","bold":true},{"text":"襲撃危険域。排煙処理か迎撃準備を。","color":"red"}]')
      player.runCommandSilent('playsound minecraft:block.bell.resonate player @s ~ ~ ~ 0.8 0.55')
    }
  }

  if (band <= 0) return
  let last = player.persistentData.getLong('dz_pollution_effect_tick_v1')
  if (activeTicks - last < PDZ_AH_POLLUTION_PULSE) return
  player.persistentData.putLong('dz_pollution_effect_tick_v1', activeTicks)

  // A short warning, not a constant survival tax. No slowness or suffocation.
  player.runCommandSilent('effect give @s minecraft:weakness ' + (band === 2 ? 8 : 5) + ' 0 true')
  if (band === 2) player.runCommandSilent('effect give @s minecraft:poison 2 0 true')
  player.runCommandSilent('playsound minecraft:entity.panda.sneeze player @s ~ ~ ~ 0.35 0.8')
}

function pdzAhAtCamp(player) {
  try {
    return player.runCommandSilent('execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,distance=..' +
      PDZ_AH_CAMP_RADIUS + ',limit=1]') > 0
  } catch (ignored) { return true }
}

function pdzAhTier(player) {
  try {
    if (typeof global.pdzCombatTierAt === 'function')
      return Math.max(0, Math.min(5, Number(global.pdzCombatTierAt(player.server, player.x, player.z, player.level.dimension))))
    if (typeof global.pdzWorldTierAt === 'function')
      return Math.max(0, Math.min(5, Number(global.pdzWorldTierAt(player.server, player.x, player.z))))
    return Math.max(0, Math.min(5, player.persistentData.getInt('dz_world_tier')))
  } catch (ignored) { return 0 }
}

function pdzAhEligible(player) {
  if (!player || player.level.clientSide) return false
  if (String(player.level.dimension) !== 'minecraft:overworld') return false
  if (player.isCreative() || player.isSpectator()) return false
  let atCamp = pdzAhAtCamp(player)
  let protection = true
  try { if (typeof global.pdzCampProtectionActive === 'function') protection = global.pdzCampProtectionActive(player.server) } catch (ignored) {}
  return !(atCamp && protection)
}

function pdzAhEligiblePlayers(server) {
  let list = []
  server.players.forEach(player => { if (pdzAhEligible(player)) list.push(player) })
  return list
}

function pdzAhFindPlayer(server, uuid) {
  let found = null
  server.players.forEach(player => {
    if (!found && String(player.uuid) === String(uuid)) found = player
  })
  return found
}

function pdzAhScheduleNext(server, activeTicks, shortRetry) {
  let delay = shortRetry ? PDZ_AH_RETRY_DELAY :
    PDZ_AH_COOLDOWN_MIN + Math.floor(Math.random() * (PDZ_AH_COOLDOWN_SPREAD + 1))
  server.persistentData.putLong(PDZ_AH_NEXT_TICK, activeTicks + delay)
}

function pdzAhClearPending(server) {
  server.persistentData.putLong(PDZ_AH_PENDING_AT, 0)
  server.persistentData.putString(PDZ_AH_PENDING_PLAYER, '')
}

function pdzAhWarn(server, player, activeTicks) {
  server.persistentData.putLong(PDZ_AH_PENDING_AT, activeTicks + PDZ_AH_WARNING)
  server.persistentData.putString(PDZ_AH_PENDING_PLAYER, String(player.uuid))
  let pollution = pdzAhPollution(player)
  let cause = pollution >= PDZ_AH_POLLUTION_WARNING ? '工業排煙と活動音' : '活動音'
  server.runCommandSilent('tellraw @a [{"text":"[HORDE WARNING] ","color":"dark_red","bold":true},' +
    '{"text":"大量の感染者が' + cause + 'へ接近中。約30秒で接触。","color":"red"}]')
  player.runCommandSilent('title @s title {"text":"HORDE 接近","color":"dark_red","bold":true}')
  player.runCommandSilent('title @s subtitle {"text":"退路と弾薬を確認せよ","color":"yellow"}')
  player.runCommandSilent('playsound minecraft:entity.zombie.ambient player @s ~ ~ ~ 0.9 0.55')
}

function pdzAhStart(server, player, activeTicks) {
  if (!pdzAhEligible(player)) {
    pdzAhClearPending(server)
    pdzAhScheduleNext(server, activeTicks, true)
    return false
  }
  let tier = pdzAhTier(player)
  let table = PDZ_AH_TABLES[tier] || PDZ_AH_TABLES[0]
  let duration = PDZ_AH_DURATIONS[tier] || PDZ_AH_DURATIONS[0]
  let pollution = pdzAhPollution(player)
  if (pollution >= PDZ_AH_POLLUTION_CRITICAL) duration = Math.floor(duration * 1.25)
  else if (pollution >= PDZ_AH_POLLUTION_WARNING) duration = Math.floor(duration * 1.125)
  let result = server.runCommandSilent('execute as ' + player.username + ' at @s run hordes start ' + duration + ' ' + table)
  pdzAhClearPending(server)
  if (result <= 0) {
    console.warn('[PROJECT DEADZONE][HORDE] Start failed for ' + player.username + ' table=' + table)
    pdzAhScheduleNext(server, activeTicks, true)
    return false
  }
  server.persistentData.putInt(PDZ_AH_COUNT, server.persistentData.getInt(PDZ_AH_COUNT) + 1)
  pdzAhScheduleNext(server, activeTicks, false)
  server.runCommandSilent('tellraw @a [{"text":"[HORDE] ","color":"dark_red","bold":true},' +
    '{"text":"T' + tier + '感染群が ' + player.username + ' の周辺へ到達。","color":"red"}]')
  console.info('[PROJECT DEADZONE][HORDE] Started T' + tier + ' for ' + player.username +
    ' duration=' + duration + ' table=' + table + ' pollution=' + Math.floor(pollution) + '%')
  return true
}

let PDZ_AH_TICK = 0
ServerEvents.tick(event => {
  PDZ_AH_TICK++
  if (PDZ_AH_TICK % 20 !== 0) return
  let server = event.server
  if (server.players.length <= 0) return
  let activeTicks = server.persistentData.getLong(PDZ_AH_ACTIVE_TICKS) + 20
  server.persistentData.putLong(PDZ_AH_ACTIVE_TICKS, activeTicks)
  let next = server.persistentData.getLong(PDZ_AH_NEXT_TICK)
  if (next <= 0) {
    next = activeTicks + PDZ_AH_INITIAL_GRACE
    server.persistentData.putLong(PDZ_AH_NEXT_TICK, next)
  }

  let eligible = pdzAhEligiblePlayers(server)
  let target = null
  let targetPollution = -1
  eligible.forEach(player => {
    let pollution = pdzAhPollution(player)
    pdzAhPollutionPulse(player, pollution, activeTicks)
    if (pollution > targetPollution) {
      target = player
      targetPollution = pollution
    }
  })

  // Pollution never raises world tier or raw mob damage. It pulls the next
  // Horde closer and slightly extends that Horde instead.
  if (targetPollution >= PDZ_AH_POLLUTION_WARNING) {
    let cap = targetPollution >= PDZ_AH_POLLUTION_CRITICAL ?
      PDZ_AH_POLLUTION_CRITICAL_CAP : PDZ_AH_POLLUTION_WARNING_CAP
    if (next - activeTicks > cap) {
      next = activeTicks + cap
      server.persistentData.putLong(PDZ_AH_NEXT_TICK, next)
    }
  }

  let pendingAt = server.persistentData.getLong(PDZ_AH_PENDING_AT)
  if (pendingAt > 0) {
    if (activeTicks < pendingAt) return
    let target = pdzAhFindPlayer(server, server.persistentData.getString(PDZ_AH_PENDING_PLAYER))
    if (!target) {
      pdzAhClearPending(server)
      pdzAhScheduleNext(server, activeTicks, true)
      return
    }
    pdzAhStart(server, target, activeTicks)
    return
  }
  if (activeTicks < next) return
  if (eligible.length <= 0) {
    pdzAhScheduleNext(server, activeTicks, true)
    return
  }
  pdzAhWarn(server, target || eligible[Math.floor(Math.random() * eligible.length)], activeTicks)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonehorde')
  root.then(Commands.literal('status').executes(ctx => {
    let server = ctx.source.server
    let active = server.persistentData.getLong(PDZ_AH_ACTIVE_TICKS)
    let next = server.persistentData.getLong(PDZ_AH_NEXT_TICK)
    let pending = server.persistentData.getLong(PDZ_AH_PENDING_AT)
    let pollution = pdzAhPollution(ctx.source.player)
    ctx.source.player.tell(Text.of('AUTO HORDE: T0+ / 発生 ' + server.persistentData.getInt(PDZ_AH_COUNT) +
      '回 / 次回まで約' + Math.max(0, Math.ceil((next - active) / 1200)) + '分' +
      (pending > 0 ? ' / 警告中' : '') + ' / 汚染 ' + Math.floor(pollution) + '% / Camp保護 ' +
      ((typeof global.pdzCampProtectionActive === 'function' && global.pdzCampProtectionActive(server)) ? 'ON' : 'OFF/T1')).gold())
    return 1
  }))
  root.then(Commands.literal('test').requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    if (!pdzAhEligible(player)) {
      player.tell(Text.of('保護期間中のCamp 100m以内・別Dimension・Creative/Spectatorでは開始できません。').red())
      return 0
    }
    return pdzAhStart(ctx.source.server, player,
      ctx.source.server.persistentData.getLong(PDZ_AH_ACTIVE_TICKS)) ? 1 : 0
  }))
  root.then(Commands.literal('reset_timer').requires(source => source.hasPermission(2)).executes(ctx => {
    let server = ctx.source.server
    let active = server.persistentData.getLong(PDZ_AH_ACTIVE_TICKS)
    pdzAhClearPending(server)
    server.persistentData.putLong(PDZ_AH_NEXT_TICK, active + PDZ_AH_INITIAL_GRACE)
    ctx.source.player.tell(Text.of('Auto Horde timerを初回猶予へリセットしました。').yellow())
    return 1
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Auto Horde director loaded: v0.3 pollution pressure, T0+, Camp protected for 20 active days')
