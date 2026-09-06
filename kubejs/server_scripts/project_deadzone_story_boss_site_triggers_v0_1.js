// PROJECT DEADZONE per-facility story boss triggers v0.1
// Existing mods own world structures, entities and combat AI. PDZ only bridges
// story authorization + a discovered facility marker to the existing boss
// summon functions. Each boss may appear once per physical facility instance.

const DZ_SITE_BOSS_LEDGER = 'dz_story_site_boss_ledger_v1'
const DZ_SITE_BOSS_RANGE = 72
const DZ_SITE_BOSS_DUPLICATE_RANGE = 160

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
    site:d => d.faction === 'aegis' && (d.role === 'research' || d.type.indexOf('laboratory') >= 0 || d.type.indexOf('underground') >= 0)},
  {key:'reactor_saint', tag:'dz_story_boss_reactor_saint', fn:'project_deadzone:story/spawn_reactor_saint',
    ready:p => p.persistentData.getBoolean('dz_story_auto_v3_t3_laboratory'),
    site:d => d.faction === 'aegis' && (d.role === 'research' || d.type.indexOf('laboratory') >= 0 || d.type.indexOf('reactor') >= 0)},
  {key:'argus_fragment', tag:'dz_story_boss_argus_fragment', fn:'project_deadzone:story/spawn_argus_fragment',
    ready:p => p.server.persistentData.getBoolean('dz_story_boss_complete_reactor_saint') &&
      p.persistentData.getInt('dz_story_warden_core_count') >= 3,
    site:d => d.faction === 'warden' || d.role === 'machine_node' || d.type.indexOf('warden') >= 0},
  {key:'choir_vessel', tag:'dz_story_boss_choir_vessel', fn:'project_deadzone:story/spawn_choir_vessel',
    ready:p => p.persistentData.getBoolean('dz_story_auto_v3_t3_choir_discovery'),
    site:d => d.faction === 'infected' && (d.role === 'nest' || d.type.indexOf('infect') >= 0 || d.type.indexOf('laboratory') >= 0)}
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

function dzSiteBossSpawn(player, marker, spec, ledger) {
  let instance = dzSiteBossInstance(marker)
  let ledgerKey = spec.key + '|' + instance
  if (ledger[ledgerKey]) return false
  if (dzSiteBossNear(player.server, marker, spec.tag, DZ_SITE_BOSS_DUPLICATE_RANGE)) return false

  // Reserve first to close the same-tick multiplayer race. Roll back if the
  // existing summon function did not actually create/tag a boss.
  ledger[ledgerKey] = {state:'spawning', at:Date.now(), dimension:String(marker.level.dimension),
    x:Math.floor(marker.x), y:Math.floor(marker.y), z:Math.floor(marker.z)}
  dzSiteBossWrite(player.server, ledger)
  player.server.runCommandSilent('execute in ' + String(marker.level.dimension) +
    ' positioned ' + marker.x + ' ' + (marker.y + 1) + ' ' + marker.z + ' run function ' + spec.fn)
  if (!dzSiteBossNear(player.server, marker, spec.tag, 24)) {
    delete ledger[ledgerKey]
    dzSiteBossWrite(player.server, ledger)
    console.warn('[PDZ STORY BOSS] Spawn failed key=' + spec.key + ' instance=' + instance)
    return false
  }

  marker.level.entities.forEach(entity => {
    if (!entity.tags || !entity.tags.contains(spec.tag)) return
    let dx=entity.x-marker.x, dy=entity.y-marker.y, dz=entity.z-marker.z
    if (dx*dx+dy*dy+dz*dz <= 24*24)
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
      if (dx*dx+dy*dy+dz*dz > DZ_SITE_BOSS_RANGE*DZ_SITE_BOSS_RANGE) return
      let data = dzSiteBossData(marker)
      for (let i=0; i<DZ_SITE_BOSSES.length; i++) {
        let spec=DZ_SITE_BOSSES[i]
        if (spec.ready(player) && spec.site(data)) dzSiteBossSpawn(player, marker, spec, ledger)
      }
    })
  })
})
