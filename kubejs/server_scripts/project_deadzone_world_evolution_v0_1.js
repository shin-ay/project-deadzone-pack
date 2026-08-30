// Story Unlock owns narrative gates. World Tier owns geography. Threat owns the
// global difficulty floor and is derived from the strongest online player's
// M&S level. Minecraft world days are deliberately informational only: a
// dedicated server must never become harder just because it stayed online.

// The world never forgets story unlocks, but the director temporarily lowers
// ambient pressure after repeated combat losses so a struggling party can
// recover. Geographic World Tiers remain an independent floor in the combat
// scaling script, so this cannot make end-game regions into T0 farms.
const DZ_THREAT_DEATH_WINDOW_MS = 30 * 60 * 1000
const DZ_THREAT_RELIEF_DURATION_MS = 45 * 60 * 1000
const DZ_THREAT_PLAYER_DEATH_COOLDOWN_MS = 5 * 60 * 1000
const DZ_THREAT_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const DZ_THREAT_LEVEL_FLOORS = [56,43,31,19,9]

function dzThreatDay(server) {
  try {
    if (server.players.length > 0)
      return Math.floor(Number(server.players[0].level.getDayTime()) / 24000) + 1
  } catch (ignored) {}
  return 1
}

function dzThreatHighestPlayerLevel(server) {
  let highest = 1
  try {
    server.players.forEach(player => {
      let level = Number(DZ_THREAT_ENTITY_DATA.get(player).getLevel())
      if (isFinite(level)) highest = Math.max(highest, Math.round(level))
    })
  } catch (ignored) {}
  return highest
}

function dzThreatPlayerFloor(server) {
  let level = dzThreatHighestPlayerLevel(server)
  for (let i = 0; i < DZ_THREAT_LEVEL_FLOORS.length; i++)
    if (level >= DZ_THREAT_LEVEL_FLOORS[i]) return 5 - i
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
  return dzThreatPlayerFloor(server)
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
global.pdzThreatHighestPlayerLevel = dzThreatHighestPlayerLevel
global.pdzThreatPlayerFloor = dzThreatPlayerFloor

let DZ_THREAT_TICKS = 0
ServerEvents.tick(event => {
  DZ_THREAT_TICKS++
  if (DZ_THREAT_TICKS % 200 !== 0 || event.server.players.length <= 0) return
  let server = event.server

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
    let message = '[レイ定時通信] 回復猶予が終了。脅威度はT' + dzThreatTier(server) + 'へ復帰しました。'
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
    let message = '[レイ緊急通信] 部隊損耗を検知。45分間、脅威度を-' + after +
      '（現在T' + dzThreatTier(server) + '）へ一時調整します。'
    let safe = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    server.runCommandSilent('title @a actionbar {"text":"' + safe + '","color":"yellow","bold":true}')
    server.runCommandSilent('execute as @a at @s run playsound minecraft:block.note_block.pling player @s ~ ~ ~ 0.8 0.75')
  }
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzoneworld')
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player,day=Math.floor(Number(p.level.getDayTime())/24000)+1
    let story=global.pdzStoryUnlockTier?global.pdzStoryUnlockTier(p.server):p.server.persistentData.getInt('deadzone_world_tier')
    let world=global.pdzWorldTierAt?global.pdzWorldTierAt(p.server,p.x,p.z):p.persistentData.getInt('dz_world_tier')
    p.tell(Text.of('Day '+day+' / World T'+world+' / Story S'+story+
      ' / Highest M&S Lv'+dzThreatHighestPlayerLevel(p.server)+' / Threat T'+dzThreatTier(p.server)+
      ' / Recovery -'+dzThreatRelief(p.server)).gold())
    p.tell(Text.of('World Tier: distance / Threat: highest online M&S level - recovery / Days: informational only').gray());return 1
  }))
  root.then(Commands.literal('reset_threat')
    .requires(source=>source.hasPermission(2))
    .executes(ctx=>{
      let data=ctx.source.server.persistentData
      data.putInt('dz_threat_death_count_v1',0)
      data.putLong('dz_threat_last_valid_death_ms_v1',0)
      data.putInt('dz_threat_applied_relief_v1',0)
      data.putBoolean('dz_threat_relief_initialized_v1',false)
      // Clear the retired day-floor cache so old worlds cannot display or
      // restore it if a previous script version is inspected.
      data.putInt('dz_threat_day_floor_v1',0)
      data.putBoolean('dz_threat_floor_initialized_v1',false)
      ctx.source.server.tell(Text.of('Threat履歴をリセットしました。現在値は最高オンラインM&Sレベルから再計算されます。').green())
      return 1
    }))
  event.register(root)
})
