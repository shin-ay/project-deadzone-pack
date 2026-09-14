// PROJECT DEADZONE faction-unit administrative reset v0.1
// Uses discard(), not /kill, so a population reset creates no loot storm,
// death-stat/quest progress, corpses, or retaliatory target cascades.

const DZ_FACTION_RESET_TYPES = {
  'simpleenemymod:usunit': 'us',
  'tacz_sewv:us_medic': 'us',
  'tacz_sewv:us_engineer': 'us',
  'tacz_sewv:us_combat_engineer': 'us',
  'simpleenemymod:ruunit': 'ru',
  'tacz_sewv:ru_medic': 'ru',
  'tacz_sewv:ru_engineer': 'ru',
  'tacz_sewv:ru_combat_engineer': 'ru'
}
const DZ_FACTION_RESET_ON_LOGIN_KEY = 'dz_faction_unit_reset_on_login_20260914'

function dzFactionUnitLevels(server) {
  let levels = []
  server.getAllLevels().forEach(level => levels.push(level))
  return levels
}

function dzFactionUnitCounts(server) {
  let counts = {us: 0, ru: 0}
  dzFactionUnitLevels(server).forEach(level => level.entities.forEach(entity => {
    let faction = DZ_FACTION_RESET_TYPES[String(entity.type)]
    if (faction) counts[faction]++
  }))
  return counts
}

function dzFactionUnitResetLoaded(server) {
  let victims = [], before = dzFactionUnitCounts(server)
  dzFactionUnitLevels(server).forEach(level => level.entities.forEach(entity => {
    if (DZ_FACTION_RESET_TYPES[String(entity.type)]) victims.push(entity)
  }))
  victims.forEach(entity => entity.discard())
  return {discarded: victims.length, before: before, after: dzFactionUnitCounts(server)}
}

function dzFactionUnitTell(source, message, color) {
  let player = null
  try { player = source.player } catch (ignored) {}
  if (player) player.tell(Text.of(message)[color || 'white']())
  else console.info('[PDZ FACTION UNIT ADMIN] ' + message)
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonefactionunits').requires(source => source.hasPermission(2))

  root.then(Commands.literal('status').executes(ctx => {
    let counts = dzFactionUnitCounts(ctx.source.server)
    dzFactionUnitTell(ctx.source, 'loaded US=' + counts.us + ' / RU=' + counts.ru, 'aqua')
    return counts.us + counts.ru
  }))

  root.then(Commands.literal('reset').executes(ctx => {
    let result = dzFactionUnitResetLoaded(ctx.source.server)
    dzFactionUnitTell(ctx.source, 'reset discarded US=' + result.before.us + ' / RU=' + result.before.ru +
      ' ; remaining US=' + result.after.us + ' / RU=' + result.after.ru, 'yellow')
    return result.discarded
  }))

  root.then(Commands.literal('arm_next_login').executes(ctx => {
    ctx.source.server.persistentData.putBoolean(DZ_FACTION_RESET_ON_LOGIN_KEY, true)
    dzFactionUnitTell(ctx.source, 'one-shot faction reset armed for the next player login', 'yellow')
    return 1
  }))

  event.register(root)
})

PlayerEvents.loggedIn(event => {
  let server = event.server
  if (!server.persistentData.getBoolean(DZ_FACTION_RESET_ON_LOGIN_KEY)) return
  // Consume first so simultaneous logins cannot schedule duplicate resets.
  server.persistentData.putBoolean(DZ_FACTION_RESET_ON_LOGIN_KEY, false)
  server.scheduleInTicks(200, callback => {
    let result = dzFactionUnitResetLoaded(server)
    console.info('[PDZ FACTION UNIT ADMIN] one-shot login reset discarded US=' + result.before.us +
      ' / RU=' + result.before.ru + ' ; remaining US=' + result.after.us + ' / RU=' + result.after.ru)
    server.players.forEach(player => player.tell(Text.of(
      '【部隊リセット完了】旧US ' + result.before.us + '体 / RU ' + result.before.ru +
      '体を無ドロップで整理しました。新規部隊は通常どおり再生成されます。').yellow()))
  })
})

console.info('[PROJECT DEADZONE] faction-unit admin reset v0.1 loaded')
