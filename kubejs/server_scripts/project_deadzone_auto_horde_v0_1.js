// PROJECT DEADZONE automatic Horde director v0.1
//
// One shared director prevents multiplayer Horde stacking. Time advances only
// while at least one player is online. The permanent 100 m camp ring blocks
// event selection; project_deadzone_t0_safezone_v0_1.js also rejects any
// individual hostile spawn that lands inside that ring.

const PDZ_AH_ACTIVE_TICKS = 'dz_auto_horde_active_ticks_v1'
const PDZ_AH_NEXT_TICK = 'dz_auto_horde_next_tick_v1'
const PDZ_AH_PENDING_AT = 'dz_auto_horde_pending_at_v1'
const PDZ_AH_PENDING_PLAYER = 'dz_auto_horde_pending_player_v1'
const PDZ_AH_COUNT = 'dz_auto_horde_count_v1'
const PDZ_AH_INITIAL_GRACE = 72000       // 3 active Minecraft days / about 60 min
const PDZ_AH_RETRY_DELAY = 12000         // 10 min if every player is in the camp ring
const PDZ_AH_WARNING = 600               // 30 s warning
const PDZ_AH_COOLDOWN_MIN = 120000       // 5 active Minecraft days / about 100 min
const PDZ_AH_COOLDOWN_SPREAD = 48000     // +0..2 active days
const PDZ_AH_CAMP_RADIUS = 100
const PDZ_AH_TABLES = [
  'project_deadzone:pdz_t0', 'project_deadzone:pdz_t1',
  'project_deadzone:pdz_t2', 'project_deadzone:pdz_t3',
  'project_deadzone:pdz_t4', 'project_deadzone:pdz_t5'
]
const PDZ_AH_DURATIONS = [2400, 2800, 3200, 3600, 4000, 4400]

function pdzAhAtCamp(player) {
  try {
    return player.runCommandSilent('execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,distance=..' +
      PDZ_AH_CAMP_RADIUS + ',limit=1]') > 0
  } catch (ignored) { return true }
}

function pdzAhTier(player) {
  try {
    if (typeof global.pdzWorldTierAt === 'function')
      return Math.max(0, Math.min(5, Number(global.pdzWorldTierAt(player.server, player.x, player.z))))
    return Math.max(0, Math.min(5, player.persistentData.getInt('dz_world_tier')))
  } catch (ignored) { return 0 }
}

function pdzAhEligible(player) {
  if (!player || player.level.clientSide) return false
  if (String(player.level.dimension) !== 'minecraft:overworld') return false
  if (player.isCreative() || player.isSpectator()) return false
  return !pdzAhAtCamp(player)
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
  server.runCommandSilent('tellraw @a [{"text":"[HORDE WARNING] ","color":"dark_red","bold":true},' +
    '{"text":"大量の感染者が活動音へ接近中。約30秒で接触。","color":"red"}]')
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
    ' duration=' + duration + ' table=' + table)
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
  let eligible = pdzAhEligiblePlayers(server)
  if (eligible.length <= 0) {
    pdzAhScheduleNext(server, activeTicks, true)
    return
  }
  pdzAhWarn(server, eligible[Math.floor(Math.random() * eligible.length)], activeTicks)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonehorde')
  root.then(Commands.literal('status').executes(ctx => {
    let server = ctx.source.server
    let active = server.persistentData.getLong(PDZ_AH_ACTIVE_TICKS)
    let next = server.persistentData.getLong(PDZ_AH_NEXT_TICK)
    let pending = server.persistentData.getLong(PDZ_AH_PENDING_AT)
    ctx.source.player.tell(Text.of('AUTO HORDE: T0+ / 発生 ' + server.persistentData.getInt(PDZ_AH_COUNT) +
      '回 / 次回まで約' + Math.max(0, Math.ceil((next - active) / 1200)) + '分' +
      (pending > 0 ? ' / 警告中' : '') + ' / Camp 100m除外').gold())
    return 1
  }))
  root.then(Commands.literal('test').requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    if (!pdzAhEligible(player)) {
      player.tell(Text.of('Camp 100m以内・別Dimension・Creative/Spectatorでは開始できません。').red())
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

console.info('[PROJECT DEADZONE] Auto Horde director loaded: T0+, player-active time, Camp 100m excluded')
