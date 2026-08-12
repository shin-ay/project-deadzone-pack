// PROJECT DEADZONE dynamic faction territory v0.1
// Coarse 128-block cells derived from persistent faction outposts.
// Biomes influence faction activity elsewhere; ownership itself follows cores,
// supply and connectivity so the political map can change during play.

const PDZ_TERR_STRING = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
const PDZ_TERR_LEDGER = 'dz_activity_outpost_ledger_v1'
const PDZ_TERR_CELLS = 'dz_territory_cells_v1'
const PDZ_TERR_META = 'dz_territory_meta_v1'
const PDZ_TERR_CELL = 128
const PDZ_TERR_CONTEST_MARGIN = 0.12

function pdzTerrRead(server, key) {
  let raw = server.persistentData.getString(key)
  if (!raw) return []
  try { let value = JSON.parse(raw); return Array.isArray(value) ? value : [] }
  catch (err) { console.error('[PDZ TERRITORY] Invalid '+key+': '+err); return [] }
}

function pdzTerrWrite(server, key, value) {
  server.persistentData.putString(key, JSON.stringify(value))
}

function pdzTerrRadius(site) {
  let base = site.size === 'large' ? 640 : (site.size === 'medium' ? 480 : 320)
  let supply = Math.max(0, Math.min(100, Number(site.supply || 0)))
  let alert = Math.max(0, Math.min(100, Number(site.alert || 0)))
  let defenders = Math.max(0, Number(site.defenders || 0))
  return Math.floor(base + supply * 2.4 + Math.min(96, defenders * 6) - alert * 0.6)
}

function pdzTerrCellKey(dimension, gx, gz) {
  return dimension+'|'+gx+'|'+gz
}

function pdzTerrFaction(site) {
  let value = String(site.faction || 'independent').toLowerCase()
  if (value === 'raiders') value = 'raider'
  return value
}

function pdzTerrBuild(server) {
  let sites = pdzTerrRead(server, PDZ_TERR_LEDGER).filter(site => site.coreAlive !== false)
  let candidates = {}

  sites.forEach(site => {
    let radius = pdzTerrRadius(site)
    let minGX = Math.floor((site.x - radius) / PDZ_TERR_CELL)
    let maxGX = Math.floor((site.x + radius) / PDZ_TERR_CELL)
    let minGZ = Math.floor((site.z - radius) / PDZ_TERR_CELL)
    let maxGZ = Math.floor((site.z + radius) / PDZ_TERR_CELL)
    for (let gx = minGX; gx <= maxGX; gx++) for (let gz = minGZ; gz <= maxGZ; gz++) {
      let cx = gx * PDZ_TERR_CELL + PDZ_TERR_CELL / 2
      let cz = gz * PDZ_TERR_CELL + PDZ_TERR_CELL / 2
      let dx = cx - Number(site.x), dz = cz - Number(site.z)
      let distance = Math.sqrt(dx * dx + dz * dz)
      if (distance > radius) continue
      let key = pdzTerrCellKey(site.dimension, gx, gz)
      if (!candidates[key]) candidates[key] = []
      candidates[key].push({
        siteId: site.id,
        faction: pdzTerrFaction(site),
        score: distance / Math.max(1, radius),
        strength: Math.max(0, 1 - distance / Math.max(1, radius)),
        supply: Number(site.supply || 0)
      })
    }
  })

  let cells = []
  Object.keys(candidates).forEach(key => {
    let parts = key.split('|')
    let gz = Number(parts.pop()), gx = Number(parts.pop()), dimension = parts.join('|')
    let list = candidates[key].sort((a, b) => a.score - b.score)
    let first = list[0], second = null
    for (let i = 1; i < list.length; i++) {
      if (list[i].faction !== first.faction) { second = list[i]; break }
    }
    let contested = !!second && Math.abs(second.score - first.score) <= PDZ_TERR_CONTEST_MARGIN
    cells.push({
      id: key, dimension: dimension, gx: gx, gz: gz,
      x: gx * PDZ_TERR_CELL, z: gz * PDZ_TERR_CELL, size: PDZ_TERR_CELL,
      faction: first.faction, siteId: first.siteId,
      strength: Math.round(first.strength * 100), contested: contested,
      rival: contested ? second.faction : '', updated: Date.now()
    })
  })

  pdzTerrWrite(server, PDZ_TERR_CELLS, cells)
  server.persistentData.putString(PDZ_TERR_META, JSON.stringify({
    version: 1, cellSize: PDZ_TERR_CELL, rebuilt: Date.now(), sites: sites.length, cells: cells.length
  }))
  console.info('[PDZ TERRITORY] Rebuilt '+cells.length+' cells from '+sites.length+' active cores')
  return cells
}

function pdzTerrAt(server, player) {
  let dimension = String(player.level.dimension)
  let gx = Math.floor(player.x / PDZ_TERR_CELL), gz = Math.floor(player.z / PDZ_TERR_CELL)
  let key = pdzTerrCellKey(dimension, gx, gz)
  return pdzTerrRead(server, PDZ_TERR_CELLS).filter(cell => cell.id === key)[0] || null
}

function pdzTerrCaptureNearest(server, player, faction) {
  let dimension = String(player.level.dimension), sites = pdzTerrRead(server, PDZ_TERR_LEDGER)
  let nearest = null, best = 96 * 96
  sites.forEach(site => {
    if (site.dimension !== dimension) return
    let dx = Number(site.x) - player.x, dz = Number(site.z) - player.z, d = dx * dx + dz * dz
    if (d < best) { best = d; nearest = site }
  })
  if (!nearest) return null
  nearest.faction = String(faction).toLowerCase()
  nearest.coreAlive = true
  nearest.supply = Math.max(30, Number(nearest.supply || 0))
  nearest.alert = 0
  nearest.lastActivity = Date.now()
  pdzTerrWrite(server, PDZ_TERR_LEDGER, sites)
  pdzTerrBuild(server)
  return nearest
}

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  let root = Commands.literal('deadzoneterritory').requires(source => source.hasPermission(2))

  root.then(Commands.literal('rebuild').executes(ctx => {
    let cells = pdzTerrBuild(ctx.source.server)
    ctx.source.player.tell(Text.of('[TERRITORY] Rebuilt '+cells.length+' map cells.').green())
    return cells.length
  }))

  root.then(Commands.literal('status').executes(ctx => {
    let cell = pdzTerrAt(ctx.source.server, ctx.source.player)
    if (!cell) {
      ctx.source.player.tell(Text.of('[TERRITORY] Neutral / unclaimed region').gray())
      return 0
    }
    let state = cell.contested ? 'CONTESTED vs '+cell.rival : 'CONTROLLED'
    ctx.source.player.tell(Text.of('[TERRITORY] '+cell.faction+' | '+state+' | strength '+cell.strength+'%').yellow())
    return 1
  }))

  root.then(Commands.literal('list').executes(ctx => {
    let cells = pdzTerrRead(ctx.source.server, PDZ_TERR_CELLS), count = {}, contested = 0
    cells.forEach(cell => { count[cell.faction] = (count[cell.faction] || 0) + 1; if (cell.contested) contested++ })
    ctx.source.player.tell(Text.of('=== DYNAMIC TERRITORY ===').gold())
    Object.keys(count).sort().forEach(faction => ctx.source.player.tell(Text.of(faction+': '+count[faction]+' cells').aqua()))
    ctx.source.player.tell(Text.of('Contested: '+contested+' / Cell size: '+PDZ_TERR_CELL+'m').yellow())
    return cells.length
  }))

  root.then(Commands.literal('capture').then(Commands.argument('faction', PDZ_TERR_STRING.word()).executes(ctx => {
    let faction = PDZ_TERR_STRING.getString(ctx, 'faction')
    let site = pdzTerrCaptureNearest(ctx.source.server, ctx.source.player, faction)
    if (!site) {
      ctx.source.player.tell(Text.of('[TERRITORY] No registered core within 96m.').red())
      return 0
    }
    ctx.source.player.tell(Text.of('[TERRITORY] '+site.structure+' captured by '+faction+'.').green())
    return 1
  })))

  event.register(root)
})

console.info('[PROJECT DEADZONE] Dynamic faction territory v0.1 loaded')
