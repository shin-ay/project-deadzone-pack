// PROJECT DEADZONE modern illager raids v0.1
//
// Vanilla raids cannot safely have members replaced: the vanilla Raid object
// keeps references to its original raiders.  PDZ therefore disables vanilla
// raids/patrols and consumes Bad Omen near a settlement to start a three-wave
// TaCZ NPC assault.  All timing advances only while players are online.

const PDZ_MIR_STATE = 'dz_modern_illager_raid_state_v1'
const PDZ_MIR_ACTIVE_TICKS = 'dz_modern_illager_raid_active_ticks_v1'
const PDZ_MIR_WARNING = 600          // 30 seconds
const PDZ_MIR_INTERMISSION = 300     // 15 seconds
const PDZ_MIR_ABANDON = 6000         // 5 online-active minutes
const PDZ_MIR_RADIUS = 48
const PDZ_MIR_WAVES = 3

function pdzMirRead(server) {
  let raw = server.persistentData.getString(PDZ_MIR_STATE)
  if (!raw) return null
  try {
    let value = JSON.parse(raw)
    return value && value.active ? value : null
  } catch (ignored) { return null }
}

function pdzMirWrite(server, state) {
  server.persistentData.putString(PDZ_MIR_STATE, state ? JSON.stringify(state) : '')
}

function pdzMirTier(server, x, z) {
  try {
    if (typeof global.pdzWorldTierAt === 'function')
      return Math.max(0, Math.min(5, Number(global.pdzWorldTierAt(server, x, z))))
  } catch (ignored) {}
  return 0
}

function pdzMirSettlementNear(player) {
  let found = false
  let radius2 = PDZ_MIR_RADIUS * PDZ_MIR_RADIUS
  try {
    player.level.entities.forEach(entity => {
      if (found) return
      let id = String(entity.type)
      let civilian = id === 'minecraft:villager' || id.indexOf('mca:') === 0 || id === 'minecolonies:citizen'
      if (!civilian) return
      let dx = entity.x - player.x, dy = entity.y - player.y, dz = entity.z - player.z
      if (dx * dx + dy * dy + dz * dz <= radius2) found = true
    })
  } catch (ignored) {}
  return found
}

function pdzMirHasBadOmen(player) {
  try { return player.hasEffect('minecraft:bad_omen') } catch (ignored) { return false }
}

function pdzMirPlayerCountNear(server, state, radius) {
  let count = 0, r2 = radius * radius
  server.players.forEach(player => {
    if (String(player.level.dimension) !== state.dimension || player.isSpectator()) return
    let dx = player.x - state.x, dz = player.z - state.z
    if (dx * dx + dz * dz <= r2) count++
  })
  return count
}

function pdzMirEntityAlive(server, state) {
  return server.runCommandSilent('execute in ' + state.dimension + ' if entity @e[tag=' + state.tag + ']') > 0
}

function pdzMirStart(server, player, activeTicks, test) {
  if (pdzMirRead(server)) return false
  let tag = 'dz_mir_' + activeTicks + '_' + Math.floor(Math.random() * 10000)
  let state = {
    active: true,
    phase: 'warning',
    dimension: String(player.level.dimension),
    x: Math.floor(player.x),
    y: Math.floor(player.y),
    z: Math.floor(player.z),
    target: String(player.username),
    tag: tag,
    tier: pdzMirTier(server, player.x, player.z),
    wave: 0,
    nextTick: activeTicks + PDZ_MIR_WARNING,
    emptySince: 0,
    test: !!test
  }
  pdzMirWrite(server, state)
  player.runCommandSilent('effect clear @s minecraft:bad_omen')
  server.runCommandSilent('tellraw @a [{"text":"[SETTLEMENT ALERT] ","color":"dark_red","bold":true},{"text":"武装略奪隊を確認。30秒後に接触。","color":"red"}]')
  player.runCommandSilent('title @s title {"text":"RAID WARNING","color":"dark_red","bold":true}')
  player.runCommandSilent('title @s subtitle {"text":"住民を守り、防衛線を構築せよ","color":"gold"}')
  player.runCommandSilent('playsound minecraft:event.raid.horn master @s ~ ~ ~ 0.9 0.75')
  console.info('[PROJECT DEADZONE][ModernRaid] started warning at ' + state.x + ',' + state.z + ' T' + state.tier + ' target=' + state.target)
  return true
}

function pdzMirSpawnWave(server, state, activeTicks) {
  state.wave++
  let nearby = pdzMirPlayerCountNear(server, state, 96)
  // Eight / ten / twelve base riflemen.  Geography and extra defenders add
  // modestly, without multiplying one wave per online player.
  let rifles = 6 + state.wave * 2 + Math.min(3, state.tier) + Math.min(3, Math.max(0, nearby - 1))
  let waveTag = state.tag + '_w' + state.wave
  let at = 'execute in ' + state.dimension + ' positioned ' + state.x + ' ' + state.y + ' ' + state.z + ' run '
  for (let i = 0; i < rifles; i++) {
    server.runCommandSilent(at + 'summon tacznpcs:npc ~ ~ ~ {template:"pdz_illager_rifle",PersistenceRequired:1b,Tags:["dz_modern_illager_raid","dz_npc","dz_raider","dz_hostile","' + state.tag + '","' + waveTag + '"]}')
  }
  let launchers = 0
  if (state.wave === PDZ_MIR_WAVES && state.tier >= 1) {
    launchers = state.tier >= 4 ? 2 : 1
    for (let j = 0; j < launchers; j++) {
      server.runCommandSilent(at + 'summon tacznpcs:npc ~ ~ ~ {template:"pdz_illager_rocket",PersistenceRequired:1b,Tags:["dz_modern_illager_raid","dz_npc","dz_raider","dz_hostile","' + state.tag + '","' + waveTag + '"]}')
    }
  }
  // Overwatch is deliberately sparse. T1 introduces the threat; higher tiers
  // and later waves make it more reliable, while T3+ guarantees one in the
  // final wave. Admin test raids always expose the role in wave one.
  let snipers = 0
  if (state.tier >= 1 && typeof global.pdzSpawnOverwatchSniper === 'function') {
    let sniperChance = Math.min(0.85, 0.20 + state.tier * 0.12 + (state.wave - 1) * 0.08)
    let guaranteed = state.test && state.wave === 1 || state.tier >= 3 && state.wave === PDZ_MIR_WAVES
    if (guaranteed || Math.random() < sniperChance) {
      snipers = global.pdzSpawnOverwatchSniper(server, {
        dimension: state.dimension,
        x: state.x,
        y: state.y,
        z: state.z,
        groupTag: state.tag,
        waveTag: waveTag
      })
    }
  }
  server.runCommandSilent(at + 'team join dz_raiders @e[tag=' + waveTag + ',distance=..12]')
  server.runCommandSilent(at + 'spreadplayers ' + state.x + ' ' + state.z + ' 30 54 false @e[tag=' + waveTag + ',distance=..12]')
  state.phase = 'wave'
  state.nextTick = activeTicks + 40
  pdzMirWrite(server, state)
  server.runCommandSilent('tellraw @a [{"text":"[RAID WAVE ' + state.wave + '/' + PDZ_MIR_WAVES + '] ","color":"red","bold":true},{"text":"銃兵 ' + rifles + (launchers ? ' / 対装甲兵 ' + launchers : '') + (snipers ? ' / 狙撃手 ' + snipers : '') + '","color":"gold"}]')
  if (snipers) server.runCommandSilent('execute in ' + state.dimension + ' positioned ' + state.x + ' ' + state.y + ' ' + state.z + ' run tellraw @a[distance=..160] [{"text":"[RADIO] ","color":"aqua","bold":true},{"text":"遠距離の光学照準を探知。高所と窓際に注意。","color":"red"}]')
  server.runCommandSilent('execute in ' + state.dimension + ' positioned ' + state.x + ' ' + state.y + ' ' + state.z + ' run playsound minecraft:event.raid.horn master @a[distance=..160] ~ ~ ~ 0.9 ' + (0.78 + state.wave * 0.05))
  console.info('[PROJECT DEADZONE][ModernRaid] wave=' + state.wave + ' rifles=' + rifles + ' launchers=' + launchers + ' snipers=' + snipers + ' T' + state.tier)
}

function pdzMirFinish(server, state) {
  server.runCommandSilent('tellraw @a [{"text":"[SETTLEMENT SECURED] ","color":"green","bold":true},{"text":"武装略奪隊を排除した。","color":"aqua"}]')
  server.runCommandSilent('execute in ' + state.dimension + ' positioned ' + state.x + ' ' + state.y + ' ' + state.z + ' run effect give @a[distance=..128] minecraft:hero_of_the_village 600 0 true')
  server.runCommandSilent('execute in ' + state.dimension + ' positioned ' + state.x + ' ' + state.y + ' ' + state.z + ' run playsound minecraft:ui.toast.challenge_complete master @a[distance=..160] ~ ~ ~ 0.8 1.0')
  pdzMirWrite(server, null)
  console.info('[PROJECT DEADZONE][ModernRaid] completed at ' + state.x + ',' + state.z)
}

function pdzMirCancel(server, state, reason) {
  server.runCommandSilent('execute in ' + state.dimension + ' run kill @e[tag=' + state.tag + ']')
  pdzMirWrite(server, null)
  console.info('[PROJECT DEADZONE][ModernRaid] cancelled reason=' + reason)
}

function pdzMirAdvance(server, activeTicks) {
  let state = pdzMirRead(server)
  if (!state) return
  let nearby = pdzMirPlayerCountNear(server, state, 160)
  if (nearby <= 0) {
    if (!state.emptySince) state.emptySince = activeTicks
    if (activeTicks - state.emptySince >= PDZ_MIR_ABANDON) {
      pdzMirCancel(server, state, 'no nearby players')
      return
    }
  } else state.emptySince = 0

  if (activeTicks < state.nextTick) {
    pdzMirWrite(server, state)
    return
  }
  if (state.phase === 'warning' || state.phase === 'intermission') {
    pdzMirSpawnWave(server, state, activeTicks)
    return
  }
  if (state.phase === 'wave') {
    if (pdzMirEntityAlive(server, state)) {
      state.nextTick = activeTicks + 40
      pdzMirWrite(server, state)
      return
    }
    if (state.wave >= PDZ_MIR_WAVES) {
      pdzMirFinish(server, state)
      return
    }
    state.phase = 'intermission'
    state.nextTick = activeTicks + PDZ_MIR_INTERMISSION
    pdzMirWrite(server, state)
    server.runCommandSilent('tellraw @a [{"text":"[RADIO] ","color":"aqua","bold":true},{"text":"次波を探知。15秒で接触。","color":"yellow"}]')
  }
}

let PDZ_MIR_TICKS = 0
ServerEvents.tick(event => {
  PDZ_MIR_TICKS++
  if (PDZ_MIR_TICKS % 20 !== 0) return
  let server = event.server
  if (server.players.length <= 0) return
  let active = server.persistentData.getLong(PDZ_MIR_ACTIVE_TICKS) + 20
  server.persistentData.putLong(PDZ_MIR_ACTIVE_TICKS, active)
  pdzMirAdvance(server, active)
  if (pdzMirRead(server) || active % 100 !== 0) return
  server.players.forEach(player => {
    if (pdzMirRead(server) || player.level.clientSide || player.isCreative() || player.isSpectator()) return
    if (String(player.level.dimension) !== 'minecraft:overworld') return
    try { if (typeof pdzTerrAtProtectedCamp === 'function' && pdzTerrAtProtectedCamp(player)) return } catch (ignored) {}
    if (pdzMirHasBadOmen(player) && pdzMirSettlementNear(player)) pdzMirStart(server, player, active, false)
  })
})

ServerEvents.loaded(event => {
  // Vanilla Raid accounting is incompatible with replacing members after
  // spawn.  PDZ owns both settlement raids and patrol cadence instead.
  event.server.runCommandSilent('gamerule disableRaids true')
  event.server.runCommandSilent('gamerule doPatrolSpawning false')
  event.server.runCommandSilent('team add dz_raiders')
  event.server.runCommandSilent('team modify dz_raiders friendlyFire false')
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzoneillagerraid').requires(source => source.hasPermission(2))
  root.then(Commands.literal('status').executes(ctx => {
    let state = pdzMirRead(ctx.source.server)
    if (ctx.source.player) ctx.source.player.tell(Text.of(state ?
      '[RAID] ' + state.phase + ' / wave ' + state.wave + '/' + PDZ_MIR_WAVES + ' / T' + state.tier : '[RAID] 待機中').gold())
    return state ? 1 : 0
  }))
  root.then(Commands.literal('test').executes(ctx => {
    let player = ctx.source.player
    if (!player) return 0
    let active = ctx.source.server.persistentData.getLong(PDZ_MIR_ACTIVE_TICKS)
    return pdzMirStart(ctx.source.server, player, active, true) ? 1 : 0
  }))
  root.then(Commands.literal('reset').executes(ctx => {
    let state = pdzMirRead(ctx.source.server)
    if (!state) return 0
    pdzMirCancel(ctx.source.server, state, 'admin reset')
    if (ctx.source.player) ctx.source.player.tell(Text.of('[RAID] リセットしました。').yellow())
    return 1
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Modern illager raids v0.1 loaded')
