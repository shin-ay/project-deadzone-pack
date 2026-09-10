// PROJECT DEADZONE per-facility story boss triggers v0.1
// Existing mods own world structures, entities and combat AI. PDZ only bridges
// story authorization + a discovered facility marker to the existing boss
// summon functions. Each boss may appear once per physical facility instance.

const DZ_SITE_BOSS_LEDGER = 'dz_story_site_boss_ledger_v1'
const DZ_SITE_BOSS_ALERT_RANGE = 128
const DZ_SITE_BOSS_RANGE = 96
const DZ_SITE_BOSS_DUPLICATE_RANGE = 160
const DZ_SITE_BOSS_FAILURE_RETRY_MS = 60000
const DZ_SITE_BOSS_FAILURE_RETRY = {}

const DZ_SITE_BOSSES = [
  {key:'gasstation', tag:'dz_story_boss_gasstation', fn:'project_deadzone:story/spawn_gasstation_boss',
    ready:p => p.persistentData.getBoolean('dz_story_auto_v3_preparation'),
    site:d => d.type.indexOf('gas_station') >= 0 || d.structure.indexOf('gas_station') >= 0},
  {key:'gunshop', tag:'dz_story_boss_gunshop', fn:'project_deadzone:story/spawn_gunshop_boss',
    ready:p => p.server.persistentData.getBoolean('dz_story_boss_complete_gasstation'),
    site:d => d.type.indexOf('gun_store') >= 0 || d.type.indexOf('gunshop') >= 0 ||
      d.structure.indexOf('gun_store') >= 0 || d.structure.indexOf('gunshop') >= 0},
  {key:'policestation', tag:'dz_story_boss_policestation', fn:'project_deadzone:story/spawn_policestation_boss',
    ready:p => p.server.persistentData.getBoolean('dz_story_boss_complete_gunshop'),
    site:d => d.type.indexOf('police') >= 0 || d.structure.indexOf('police') >= 0},
  {key:'hospital', tag:'dz_story_boss_hospital', fn:'project_deadzone:story/spawn_hospital_boss',
    ready:p => p.server.persistentData.getBoolean('dz_story_boss_complete_policestation'),
    site:d => d.type.indexOf('hospital') >= 0 || d.type.indexOf('clinic') >= 0 || d.role === 'medical'},
  {key:'firestation', tag:'dz_story_boss_firestation', fn:'project_deadzone:story/spawn_firestation_boss',
    ready:p => p.server.persistentData.getBoolean('dz_story_boss_complete_policestation'),
    site:d => d.type.indexOf('fire_station') >= 0 || d.type.indexOf('firestation') >= 0 ||
      d.structure.indexOf('fire_station') >= 0},
  {key:'radio_tower', tag:'dz_story_boss_radio_tower', fn:'project_deadzone:story/spawn_radio_tower_boss',
    ready:p => p.server.persistentData.getBoolean('dz_story_boss_complete_firestation'),
    site:d => d.type.indexOf('radio') >= 0 || d.role === 'communications'},
  {key:'primordial', tag:'dz_story_boss_primordial', fn:'project_deadzone:story/spawn_primordial_boss',
    ready:p => p.persistentData.getBoolean('dz_story_auto_v3_t2_aegis_record'),
    site:d => d.role === 'research' || d.type.indexOf('laboratory') >= 0 ||
      (d.faction === 'aegis' && d.type.indexOf('underground') >= 0)},
  {key:'reactor_saint', tag:'dz_story_boss_reactor_saint', fn:'project_deadzone:story/spawn_reactor_saint',
    ready:p => p.persistentData.getBoolean('dz_story_auto_v3_t3_laboratory'),
    site:d => d.role === 'research' || d.type.indexOf('laboratory') >= 0 || d.type.indexOf('reactor') >= 0},
  {key:'argus_fragment', tag:'dz_story_boss_argus_fragment', fn:'project_deadzone:story/spawn_argus_fragment',
    ready:p => p.server.persistentData.getBoolean('dz_story_boss_complete_reactor_saint') &&
      p.persistentData.getInt('dz_story_warden_core_count') >= 3,
    site:d => d.faction === 'warden' || d.role === 'machine_node' || d.type.indexOf('warden') >= 0},
  {key:'choir_vessel', tag:'dz_story_boss_choir_vessel', fn:'project_deadzone:story/spawn_choir_vessel',
    ready:p => p.persistentData.getBoolean('dz_story_auto_v3_t3_choir_discovery'),
    site:d => d.role === 'nest' || d.type.indexOf('infect') >= 0 || d.type.indexOf('spore_') >= 0}
]

function dzSiteBossRead(server) {
  try {
    let value = JSON.parse(server.persistentData.getString(DZ_SITE_BOSS_LEDGER) || '{}')
    return value && typeof value === 'object' ? value : {}
  } catch (ignored) { return {} }
}

function dzSiteBossWrite(server, ledger) {
  server.persistentData.putString(DZ_SITE_BOSS_LEDGER, JSON.stringify(ledger))
}

function dzSiteBossData(marker) {
  return {
    type:String(marker.persistentData.getString('dz_wild_type') || '').toLowerCase(),
    structure:String(marker.persistentData.getString('dz_wild_structure') || '').toLowerCase(),
    faction:String(marker.persistentData.getString('dz_wild_faction') || '').toLowerCase(),
    role:String(marker.persistentData.getString('dz_wild_role') || '').toLowerCase()
  }
}

function dzSiteBossInstance(marker) {
  let id = String(marker.persistentData.getString('dz_wild_instance') || '')
  if (id) return id
  return String(marker.level.dimension) + '|' + Math.floor(marker.x) + '|' +
    Math.floor(marker.y) + '|' + Math.floor(marker.z) + '|' +
    String(marker.persistentData.getString('dz_wild_structure') || 'site')
}

function dzSiteBossNear(server, marker, tag, distance) {
  return server.runCommandSilent('execute in ' + String(marker.level.dimension) +
    ' positioned ' + marker.x + ' ' + marker.y + ' ' + marker.z +
    ' if entity @e[tag=' + tag + ',distance=..' + distance + ',limit=1]') > 0
}

function dzSiteBossSurfacePrefix(player, marker) {
  return 'execute as ' + player.username + ' in ' + String(marker.level.dimension) +
    ' positioned ' + marker.x + ' 0 ' + marker.z +
    ' positioned over motion_blocking_no_leaves '
}

function dzSiteBossNearSurface(player, marker, tag, distance) {
  return player.server.runCommandSilent(dzSiteBossSurfacePrefix(player, marker) +
    'if entity @e[tag=' + tag + ',distance=..' + distance + ',limit=1]') > 0
}

function dzSiteBossAlert(player, marker, spec, ledger) {
  let instance = dzSiteBossInstance(marker)
  let ledgerKey = spec.key + '|' + instance
  if (ledger[ledgerKey]) return
  ledger[ledgerKey] = {state:'alerted', at:Date.now(), dimension:String(marker.level.dimension),
    x:Math.floor(marker.x), y:Math.floor(marker.y), z:Math.floor(marker.z)}
  dzSiteBossWrite(player.server, ledger)
  player.tell(Text.of('[警戒] 施設方向から強力な敵性反応を検知。接近に注意してください。').red())
  player.server.runCommandSilent(dzSiteBossSurfacePrefix(player, marker) +
    'run playsound minecraft:entity.warden.heartbeat hostile ' + player.username + ' ~ ~ ~ 1 0.75')
}

function dzSiteBossSpawn(player, marker, spec, ledger) {
  // A Lost Cities facility exposes several part markers. When a summon fails,
  // retrying once per marker every two seconds floods latest.log and burns a
  // large amount of server time. One retry window per boss type is enough;
  // successful encounters are still tracked per physical facility below.
  let retryKey = spec.key
  let now = Date.now()
  if ((DZ_SITE_BOSS_FAILURE_RETRY[retryKey] || 0) > now) return false
  let instance = dzSiteBossInstance(marker)
  let ledgerKey = spec.key + '|' + instance
  // One encounter per physical facility. A different facility of the same
  // type gets its own ledger key and can still create its own encounter.
  if (ledger[ledgerKey] && ledger[ledgerKey].state === 'spawned') return false
  if (ledger[ledgerKey] && ledger[ledgerKey].state === 'spawning' &&
      Number(ledger[ledgerKey].at || 0) > now - 30000) return false
  if (dzSiteBossNear(player.server, marker, spec.tag, DZ_SITE_BOSS_DUPLICATE_RANGE)) return false

  // Reserve first to close the same-tick multiplayer race. Roll back if the
  // existing summon function did not actually create/tag a boss.
  ledger[ledgerKey] = {state:'spawning', at:Date.now(), dimension:String(marker.level.dimension),
    x:Math.floor(marker.x), y:Math.floor(marker.y), z:Math.floor(marker.z)}
  dzSiteBossWrite(player.server, ledger)
  // Lost Cities part markers can be inside a wall/floor. Keep the encounter at
  // the facility, but lift its X/Z anchor to a safe motion-blocking surface.
  player.server.runCommandSilent(dzSiteBossSurfacePrefix(player, marker) + 'run function ' + spec.fn)
  if (!dzSiteBossNearSurface(player, marker, spec.tag, 24)) {
    delete ledger[ledgerKey]
    dzSiteBossWrite(player.server, ledger)
    DZ_SITE_BOSS_FAILURE_RETRY[retryKey] = now + DZ_SITE_BOSS_FAILURE_RETRY_MS
    console.warn('[PDZ STORY BOSS] Spawn failed key=' + spec.key + ' instance=' + instance)
    return false
  }

  delete DZ_SITE_BOSS_FAILURE_RETRY[retryKey]

  marker.level.entities.forEach(entity => {
    if (!entity.tags || !entity.tags.contains(spec.tag)) return
    let dx=entity.x-marker.x, dz=entity.z-marker.z
    if (dx*dx+dz*dz <= 24*24)
      entity.persistentData.putString('dz_story_site_instance', instance)
  })
  ledger[ledgerKey].state = 'spawned'
  dzSiteBossWrite(player.server, ledger)
  player.server.runCommandSilent('execute in ' + String(marker.level.dimension) +
    ' positioned ' + marker.x + ' ' + marker.y + ' ' + marker.z +
    ' run tellraw @a[distance=..96] [{"text":"[BOSS] ","color":"red","bold":true},' +
    '{"text":"施設防衛個体を検知。作戦区域を確保せよ。","color":"gold"}]')
  console.info('[PDZ STORY BOSS] Spawned key=' + spec.key + ' instance=' + instance)
  return true
}

let DZ_SITE_BOSS_TICKS = 0
ServerEvents.tick(event => {
  // Two seconds is responsive enough for an encounter boundary and avoids a
  // full loaded-entity scan for every player on every game second.
  if (++DZ_SITE_BOSS_TICKS % 40 !== 0) return
  let server = event.server
  let ledger = dzSiteBossRead(server)
  server.players.forEach(player => {
    if (player.level.clientSide || player.spectator) return
    player.level.entities.forEach(marker => {
      if (!marker.tags || !marker.tags.contains('dz_wilderness_site')) return
      let dx=marker.x-player.x, dy=marker.y-player.y, dz=marker.z-player.z
      let distanceSquared=dx*dx+dy*dy+dz*dz
      if (distanceSquared > DZ_SITE_BOSS_ALERT_RANGE*DZ_SITE_BOSS_ALERT_RANGE) return
      let data = dzSiteBossData(marker)
      for (let i=0; i<DZ_SITE_BOSSES.length; i++) {
        let spec=DZ_SITE_BOSSES[i]
        if (!spec.ready(player) || !spec.site(data)) continue
        dzSiteBossAlert(player, marker, spec, ledger)
        if (distanceSquared <= DZ_SITE_BOSS_RANGE*DZ_SITE_BOSS_RANGE)
          dzSiteBossSpawn(player, marker, spec, ledger)
      }
    })
  })
})
