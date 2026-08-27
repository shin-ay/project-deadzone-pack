// Story Tier owns unlocks. Threat Tier owns minimum outdoor pressure.
// Elapsed days never unlock quests, recipes or facilities, but waiting forever
// can no longer freeze hostile pressure at T0.

const DZ_THREAT_DAY_FLOORS = [
  [55, 5],
  [35, 4],
  [20, 3],
  [10, 2],
  [4, 1]
]

// The world never forgets story unlocks, but the director temporarily lowers
// ambient pressure after repeated combat losses so a struggling party can
// recover.  Distance/region tiers remain an independent floor in the combat
// scaling script, so this cannot make end-game regions into T0 farms.
const DZ_THREAT_DEATH_WINDOW_MS = 30 * 60 * 1000
const DZ_THREAT_RELIEF_DURATION_MS = 45 * 60 * 1000
const DZ_THREAT_PLAYER_DEATH_COOLDOWN_MS = 5 * 60 * 1000

function dzThreatDay(server) {
  try {
    if (server.players.length > 0)
      return Math.floor(Number(server.players[0].level.getDayTime()) / 24000) + 1
  } catch (ignored) {}
  return 1
}

function dzThreatDayFloor(server) {
  let day = dzThreatDay(server)
  for (let i = 0; i < DZ_THREAT_DAY_FLOORS.length; i++)
    if (day >= DZ_THREAT_DAY_FLOORS[i][0]) return DZ_THREAT_DAY_FLOORS[i][1]
  return 0
}

function dzThreatRelief(server) {
  let last = Number(server.persistentData.getLong('dz_threat_last_valid_death_ms_v1'))
  if (last <= 0 || Date.now() - last > DZ_THREAT_RELIEF_DURATION_MS) return 0
  let deaths = Math.max(0, server.persistentData.getInt('dz_threat_death_count_v1'))
  if (deaths >= 6) return 2
  if (deaths >= 3) return 1
  return 0
}

function dzThreatBaseTier(server) {
  let story = Math.max(0, Math.min(5, server.persistentData.getInt('deadzone_world_tier')))
  return Math.max(story, dzThreatDayFloor(server))
}

function dzThreatTier(server) {
  return Math.max(0, dzThreatBaseTier(server) - dzThreatRelief(server))
}

function dzThreatInsideCamp(player) {
  let data = player.server.persistentData
  if (data.getInt('dz_auto_basecamp_layout_version') <= 0) return false
  let cx = data.getInt('dz_auto_basecamp_origin_x') + 16
  let cy = data.getInt('dz_auto_basecamp_origin_y')
  let cz = data.getInt('dz_auto_basecamp_origin_z') + 16
  let dx = Number(player.x) - cx, dy = Number(player.y) - cy, dz = Number(player.z) - cz
  return Math.abs(dy) <= 40 && dx * dx + dz * dz <= 100 * 100
}

function dzThreatHasInfection(player) {
  let infected = false
  try {
    player.potionEffects.active.forEach(effect => {
      let id = String(effect.effect).toLowerCase()
      if (id.indexOf('infect') >= 0) infected = true
    })
  } catch (ignored) {}
  return infected
}

function dzThreatCombatDeath(event, player) {
  let source = ''
  try { source = String(event.source.type()).toLowerCase() } catch (ignored) {
    try { source = String(event.source).toLowerCase() } catch (ignoredAgain) {}
  }
  if (source.indexOf('outofworld') >= 0 || source.indexOf('out_of_world') >= 0 ||
      source.indexOf('generic_kill') >= 0) return false
  if (dzThreatHasInfection(player) || source.indexOf('infect') >= 0) return true
  try {
    let actual = event.source.actual
    if (actual && (!actual.isPlayer || !actual.isPlayer())) return true
  } catch (ignored) {}
  // A mob may knock a player into a fall/fire hazard.  The damage audit keeps
  // the lethal or last large hostile hit, so credit that death for 15 seconds.
  try {
    let age = Number(player.level.gameTime) - Number(player.persistentData.getLong('dz_last_damage_tick'))
    let attacker = String(player.persistentData.getString('dz_last_damage_attacker')).toLowerCase()
    if (age >= 0 && age <= 300 && attacker !== '' && attacker !== 'none' &&
        attacker !== 'minecraft:player') return true
  } catch (ignored) {}
  return false
}

global.pdzThreatTier = dzThreatTier
global.pdzThreatRelief = dzThreatRelief

let DZ_THREAT_TICKS = 0
ServerEvents.tick(event => {
  DZ_THREAT_TICKS++
  if (DZ_THREAT_TICKS % 200 !== 0 || event.server.players.length <= 0) return
  let server = event.server
  let floor = dzThreatDayFloor(server)
  let initialized = server.persistentData.getBoolean('dz_threat_floor_initialized_v1')
  let previous = server.persistentData.getInt('dz_threat_day_floor_v1')
  server.persistentData.putBoolean('dz_threat_floor_initialized_v1', true)
  server.persistentData.putInt('dz_threat_day_floor_v1', floor)
  if (initialized && floor > previous) {
    let message = '[レイ緊急通信] 経過日数による脅威下限がT' + floor + 'へ上昇。ストーリー解放Tierは変化しません。'
    let safe = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    server.runCommandSilent('title @a actionbar {"text":"' + safe + '","color":"red","bold":true}')
    server.runCommandSilent('execute as @a at @s run playsound minecraft:block.note_block.didgeridoo player @s ~ ~ ~ 0.7 0.65')
  }

  let relief = dzThreatRelief(server)
  let reliefInitialized = server.persistentData.getBoolean('dz_threat_relief_initialized_v1')
  let previousRelief = server.persistentData.getInt('dz_threat_applied_relief_v1')
  server.persistentData.putBoolean('dz_threat_relief_initialized_v1', true)
  server.persistentData.putInt('dz_threat_applied_relief_v1', relief)
  if (reliefInitialized && relief < previousRelief) {
    if (relief === 0) {
      server.persistentData.putInt('dz_threat_death_count_v1', 0)
      server.persistentData.putLong('dz_threat_last_valid_death_ms_v1', 0)
    }
    let message = '[レイ定時通信] 回復猶予が終了。Threat TierはT' + dzThreatTier(server) + 'へ復帰しました。'
    let safe = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    server.runCommandSilent('title @a actionbar {"text":"' + safe + '","color":"gold"}')
  }
})

EntityEvents.death(event => {
  let player = event.entity
  if (!player || !player.isPlayer || !player.isPlayer() || player.level.clientSide) return
  if (!player.persistentData.getBoolean('dz_job_chosen') || dzThreatInsideCamp(player)) return
  if (!dzThreatCombatDeath(event, player)) return

  let now = Date.now()
  if (now < Number(player.persistentData.getLong('dz_threat_next_death_credit_ms_v1'))) return
  player.persistentData.putLong('dz_threat_next_death_credit_ms_v1', now + DZ_THREAT_PLAYER_DEATH_COOLDOWN_MS)

  let server = player.server
  let before = dzThreatRelief(server)
  let last = Number(server.persistentData.getLong('dz_threat_last_valid_death_ms_v1'))
  let count = last > 0 && now - last <= DZ_THREAT_DEATH_WINDOW_MS
    ? server.persistentData.getInt('dz_threat_death_count_v1') + 1 : 1
  server.persistentData.putInt('dz_threat_death_count_v1', count)
  server.persistentData.putLong('dz_threat_last_valid_death_ms_v1', now)
  let after = dzThreatRelief(server)
  server.persistentData.putInt('dz_threat_applied_relief_v1', after)
  server.persistentData.putBoolean('dz_threat_relief_initialized_v1', true)

  if (after > before) {
    let message = '[レイ緊急通信] 部隊損耗を検知。45分間、Threat Tierを-' + after +
      '（現在T' + dzThreatTier(server) + '）へ一時調整します。'
    let safe = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    server.runCommandSilent('title @a actionbar {"text":"' + safe + '","color":"yellow","bold":true}')
    server.runCommandSilent('execute as @a at @s run playsound minecraft:block.note_block.pling player @s ~ ~ ~ 0.8 0.75')
  }
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  event.register(Commands.literal('deadzoneworld').then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player,day=Math.floor(Number(p.level.getDayTime())/24000)+1
    p.tell(Text.of('Day '+day+' / Story Tier T'+p.server.persistentData.getInt('deadzone_world_tier')+
      ' / Threat Tier T'+dzThreatTier(p.server)+' / Recovery -'+dzThreatRelief(p.server)).gold())
    p.tell(Text.of('Unlocks: story objectives / Threat: max(story, days) - recovery / Region pressure: distance floor').gray());return 1
  })))
})
