// PROJECT DEADZONE explicit Horde bridge v1.0
// The Hordes owns normal cadence, waves, spawning and completion.
// PDZ may request an extra Horde only for a named pollution or story event.

const PDZ_HORDE_TABLES = [
  'project_deadzone:pdz_t0', 'project_deadzone:pdz_t1',
  'project_deadzone:pdz_t2', 'project_deadzone:pdz_t3',
  'project_deadzone:pdz_t4', 'project_deadzone:pdz_t5'
]
const PDZ_HORDE_DURATIONS = [3000, 3500, 4000, 4500, 5000, 5500]
const PDZ_HORDE_POLLUTANTS = Java.loadClass('com.endertech.minecraft.mods.adpother.init.Pollutants$BuiltIn')

function pdzHordePollution(player) {
  try {
    let pos = player.blockPosition()
    let carbon = Number(PDZ_HORDE_POLLUTANTS.CARBON.get().getPercentageAtChunk(player.level, pos).getValue())
    let sulfur = Number(PDZ_HORDE_POLLUTANTS.SULFUR.get().getPercentageAtChunk(player.level, pos).getValue())
    return Math.max(0, Math.min(200, Math.max(isFinite(carbon) ? carbon : 0, isFinite(sulfur) ? sulfur : 0)))
  } catch (ignored) { return 0 }
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
    if (pollution < 75) {
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

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonehorde')
  root.then(Commands.literal('status').executes(ctx => {
    let pollution = pdzHordePollution(ctx.source.player)
    ctx.source.player.tell(Text.of('HORDE OWNER: The Hordes / PDZ scheduler: OFF / PDZ explicit: ' +
      ctx.source.server.persistentData.getInt('dz_explicit_horde_count_v1') + ' / Pollution: ' +
      Math.floor(pollution) + '%').gold())
    return 1
  }))
  root.then(Commands.literal('test_story').requires(source => source.hasPermission(2)).executes(ctx =>
    global.pdzStartExplicitHorde(ctx.source.server, ctx.source.player, 'story:test') ? 1 : 0))
  root.then(Commands.literal('test_pollution').requires(source => source.hasPermission(2)).executes(ctx =>
    global.pdzStartExplicitHorde(ctx.source.server, ctx.source.player, 'pollution:test') ? 1 : 0))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Explicit Horde bridge loaded; The Hordes owns normal cadence')
