// PROJECT DEADZONE territory grid and local hostile patrols v0.1
//
// Territory is derived from the persistent wilderness-site ledger.  The old
// virtual convoy director remains retired; only players standing inside an
// actually hostile cell can materialise a patrol, keeping unloaded areas free
// from pathfinding work.

const PDZ_TERR_LEDGER = 'dz_activity_outpost_ledger_v1'
const PDZ_TERR_CELLS = 'dz_territory_cells_v1'
const PDZ_TERR_LEDGER_HASH = 'dz_territory_ledger_snapshot_v1'
const PDZ_TERR_ACTIVE_TICKS = 'dz_territory_active_ticks_v1'
const PDZ_TERR_CELL_SIZE = 128
const PDZ_TERR_PATROL_CHECK = 1200       // one minute of online-active time
const PDZ_TERR_PATROL_COOLDOWN = 18000   // fifteen online-active minutes
const PDZ_TERR_PATROL_CAP = 24

function pdzTerrReadArray(server, key) {
  let raw = server.persistentData.getString(key)
  if (!raw) return []
  try {
    let value = JSON.parse(raw)
    return Array.isArray(value) ? value : []
  } catch (ignored) { return [] }
}

function pdzTerrNormalizeFaction(value) {
  let faction = String(value || 'independent').toLowerCase()
  if (faction === 'cdf' || faction === 'civildef' || faction === 'survivor') return 'survivor'
  if (faction === 'aegis') return 'remnant'
  return faction
}

function pdzTerrInfluenceRadius(site) {
  let size = String(site.size || 'small').toLowerCase()
  if (size === 'large') return 3
  if (size === 'medium') return 2
  return 1
}

function pdzTerrRebuild(server, forceScan) {
  // Loaded site markers are folded into the ledger by the established scanner.
  // The call is optional so this file remains independently reloadable.
  if (forceScan) {
    try { if (typeof pdzActScan === 'function') pdzActScan(server) } catch (ignored) {}
  }
  let raw = server.persistentData.getString(PDZ_TERR_LEDGER)
  let ledger = pdzTerrReadArray(server, PDZ_TERR_LEDGER)
  let winners = {}

  ledger.forEach(site => {
    if (site.coreAlive === false) return
    let x = Number(site.x), z = Number(site.z)
    if (!isFinite(x) || !isFinite(z)) return
    let dimension = String(site.dimension || 'minecraft:overworld')
    let centerX = Math.floor(x / PDZ_TERR_CELL_SIZE)
    let centerZ = Math.floor(z / PDZ_TERR_CELL_SIZE)
    let radius = pdzTerrInfluenceRadius(site)
    let faction = pdzTerrNormalizeFaction(site.faction)
    for (let ox = -radius; ox <= radius; ox++) for (let oz = -radius; oz <= radius; oz++) {
      let distance = Math.sqrt(ox * ox + oz * oz)
      if (distance > radius + 0.35) continue
      let strength = (radius + 1 - distance) * 100 + Math.min(99, Number(site.defenders || 0))
      let key = dimension + '|' + (centerX + ox) + '|' + (centerZ + oz)
      if (!winners[key] || strength > winners[key].strength) {
        winners[key] = {
          dimension: dimension,
          gx: centerX + ox,
          gz: centerZ + oz,
          faction: faction,
          siteId: String(site.id || ''),
          role: String(site.role || 'outpost'),
          strength: Math.floor(strength)
        }
      }
    }
  })

  let cells = Object.keys(winners).sort().map(key => winners[key])
  server.persistentData.putString(PDZ_TERR_CELLS, JSON.stringify(cells))
  server.persistentData.putString(PDZ_TERR_LEDGER_HASH, raw)
  console.info('[PROJECT DEADZONE][Territory] rebuilt ' + cells.length + ' cells from ' + ledger.length + ' sites')
  return cells
}

function pdzTerritoryCellAt(server, dimension, x, z) {
  let gx = Math.floor(Number(x) / PDZ_TERR_CELL_SIZE)
  let gz = Math.floor(Number(z) / PDZ_TERR_CELL_SIZE)
  let dim = String(dimension)
  let cells = pdzTerrReadArray(server, PDZ_TERR_CELLS)
  for (let i = 0; i < cells.length; i++) {
    if (String(cells[i].dimension) === dim && Number(cells[i].gx) === gx && Number(cells[i].gz) === gz) return cells[i]
  }
  return null
}

global.pdzTerritoryCellAt = pdzTerritoryCellAt
global.pdzTerritoryFactionAt = function(server, dimension, x, z) {
  let cell = pdzTerritoryCellAt(server, dimension, x, z)
  return cell ? String(cell.faction || '') : ''
}

function pdzTerrWorldTier(player) {
  try {
    if (typeof global.pdzWorldTierAt === 'function')
      return Math.max(0, Math.min(5, Number(global.pdzWorldTierAt(player.server, player.x, player.z))))
  } catch (ignored) {}
  return Math.max(0, Math.min(5, player.persistentData.getInt('dz_world_tier')))
}

function pdzTerrAtProtectedCamp(player) {
  try {
    let inside = player.runCommandSilent('execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,distance=..100,limit=1]') > 0
    let active = true
    if (typeof global.pdzCampProtectionActive === 'function') active = global.pdzCampProtectionActive(player.server)
    return inside && active
  } catch (ignored) { return true }
}

function pdzTerrPatrolCount(player) {
  let count = 0
  try {
    player.level.entities.forEach(entity => {
      if (count < PDZ_TERR_PATROL_CAP && entity.tags && entity.tags.contains('dz_territory_patrol')) count++
    })
    return count
  } catch (ignored) { return PDZ_TERR_PATROL_CAP }
}

function pdzTerrSpawnPatrol(player, faction, activeTicks) {
  let server = player.server
  let tag = 'dz_terr_' + activeTicks + '_' + Math.floor(Math.random() * 10000)
  let tier = pdzTerrWorldTier(player)
  let existing = pdzTerrPatrolCount(player)
  let count = Math.min(5 + Math.min(3, tier) + Math.floor(Math.random() * 3), Math.max(0, PDZ_TERR_PATROL_CAP - existing))
  if (count <= 0) return
  let base = 'execute as ' + player.username + ' at @s run '
  let snipers = 0
  if (faction === 'remnant') {
    for (let i = 0; i < count; i++) {
      server.runCommandSilent(base + 'summon simpleenemymod:ruunit ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_territory_patrol","dz_npc","dz_remnant","dz_hostile","' + tag + '"]}')
    }
    server.runCommandSilent(base + 'team join dz_remnant @e[tag=' + tag + ',distance=..8]')
  } else {
    for (let i = 0; i < count; i++) {
      server.runCommandSilent(base + 'summon tacznpcs:npc ~ ~ ~ {template:"pdz_illager_rifle",PersistenceRequired:1b,Tags:["dz_territory_patrol","dz_npc","dz_raider","dz_hostile","' + tag + '"]}')
    }
    if (existing + count < PDZ_TERR_PATROL_CAP && tier >= 2 && Math.random() < 0.25) {
      server.runCommandSilent(base + 'summon tacznpcs:npc ~ ~ ~ {template:"pdz_illager_rocket",PersistenceRequired:1b,Tags:["dz_territory_patrol","dz_npc","dz_raider","dz_hostile","' + tag + '"]}')
    }
    if (existing + count < PDZ_TERR_PATROL_CAP && tier >= 1 && typeof global.pdzSpawnOverwatchSniper === 'function') {
      let sniperChance = Math.min(0.60, 0.14 + tier * 0.09)
      if (Math.random() < sniperChance) {
        snipers = global.pdzSpawnOverwatchSniper(server, {
          dimension: String(player.level.dimension),
          x: player.x,
          y: player.y,
          z: player.z,
          groupTag: tag,
          waveTag: tag
        })
      }
    }
    server.runCommandSilent(base + 'team join dz_raiders @e[tag=' + tag + ',distance=..8]')
  }
  server.runCommandSilent(base + 'spreadplayers ~ ~ 36 52 false @e[tag=' + tag + ',distance=..12]')
  player.runCommandSilent('tellraw @s [{"text":"[TERRITORY CONTACT] ","color":"red","bold":true},{"text":"敵対勢力の巡回部隊を確認。' + (snipers ? ' 狙撃手の反射光あり。' : '') + '","color":"gold"}]')
  player.runCommandSilent('playsound minecraft:block.note_block.didgeridoo master @s ~ ~ ~ 0.7 0.55')
  console.info('[PROJECT DEADZONE][Territory] spawned ' + faction + ' patrol count=' + count + ' snipers=' + snipers + ' tier=' + tier + ' near ' + player.username)
}

function pdzTerrPatrolPulse(server, activeTicks) {
  server.players.forEach(player => {
    if (!player || player.level.clientSide || player.isCreative() || player.isSpectator()) return
    if (String(player.level.dimension) !== 'minecraft:overworld' || pdzTerrAtProtectedCamp(player)) return
    if (activeTicks < player.persistentData.getLong('dz_territory_patrol_next_v1')) return
    let cell = pdzTerritoryCellAt(server, player.level.dimension, player.x, player.z)
    let faction = cell ? pdzTerrNormalizeFaction(cell.faction) : ''
    if (faction !== 'raider' && faction !== 'remnant') return
    if (pdzTerrPatrolCount(player) >= PDZ_TERR_PATROL_CAP) return
    // One check per minute, approximately one contact every 8-12 minutes while
    // continuously operating inside enemy territory.
    if (Math.random() >= 0.11) return
    player.persistentData.putLong('dz_territory_patrol_next_v1', activeTicks + PDZ_TERR_PATROL_COOLDOWN)
    pdzTerrSpawnPatrol(player, faction, activeTicks)
  })
}

let PDZ_TERR_TICKS = 0
ServerEvents.tick(event => {
  PDZ_TERR_TICKS++
  if (PDZ_TERR_TICKS % 20 !== 0) return
  let server = event.server
  if (server.players.length <= 0) return
  let active = server.persistentData.getLong(PDZ_TERR_ACTIVE_TICKS) + 20
  server.persistentData.putLong(PDZ_TERR_ACTIVE_TICKS, active)

  if (active % 12000 === 0) {
    // Scan first: a newly discovered village/site has no reason to alter the
    // prior snapshot until its loaded marker has been folded into the ledger.
    // Once per ten minutes is cheap and prevents that discovery deadlock.
    pdzTerrRebuild(server, true)
  }
  if (active % PDZ_TERR_PATROL_CHECK === 0) {
    pdzTerrPatrolPulse(server, active)
    ;['minecraft:overworld','minecraft:the_nether','minecraft:the_end'].forEach(dimension => {
      server.runCommandSilent('execute in ' + dimension + ' as @e[tag=dz_territory_patrol] at @s unless entity @a[distance=..160] run kill @s')
    })
  }
})

ServerEvents.loaded(event => {
  // Existing worlds normally already have these teams.  Add silently for a
  // fresh test world without replaying the setup function's player broadcast.
  event.server.runCommandSilent('team add dz_raiders')
  event.server.runCommandSilent('team modify dz_raiders friendlyFire false')
  event.server.runCommandSilent('team add dz_remnant')
  event.server.runCommandSilent('team modify dz_remnant friendlyFire false')
  pdzTerrRebuild(event.server, true)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzoneterritory').requires(source => source.hasPermission(2))
  root.then(Commands.literal('rebuild').executes(ctx => {
    let cells = pdzTerrRebuild(ctx.source.server, true)
    if (ctx.source.player) ctx.source.player.tell(Text.of('[TERRITORY] ' + cells.length + 'セルを再構築しました。').green())
    return cells.length
  }))
  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    if (!player) return 0
    let cell = pdzTerritoryCellAt(ctx.source.server, player.level.dimension, player.x, player.z)
    if (!cell) player.tell(Text.of('[TERRITORY] 中立・未掌握地域').gray())
    else player.tell(Text.of('[TERRITORY] ' + cell.faction + ' / ' + cell.role + ' / 拠点 ' + cell.siteId).gold())
    return cell ? 1 : 0
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Territory grid and local patrols v0.1 loaded')
