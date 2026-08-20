// PROJECT DEADZONE JourneyMap sync v0.1
// Sends only nearby/revealed strategic data; JourneyMap rendering stays client-side.

const PDZ_JM_CELLS = 'dz_territory_cells_v1'
const PDZ_JM_SITES = 'dz_activity_outpost_ledger_v1'
const PDZ_JM_ACTIVITIES = 'dz_activity_list_v1'
const PDZ_JM_TERRITORY_RANGE = 2048
const PDZ_JM_ACTIVITY_RANGE = 1536
let PDZ_JM_BAD_KEYS = {}

function pdzJmRead(server, key) {
  let raw = server.persistentData.getString(key)
  if (!raw) return []
  try { let value = JSON.parse(raw); return Array.isArray(value) ? value : [] }
  catch (err) {
    if (!PDZ_JM_BAD_KEYS[key]) console.warn('[PDZ MAP] Reset invalid '+key+': '+err)
    PDZ_JM_BAD_KEYS[key] = true
    server.persistentData.putString(key, '[]')
    return []
  }
}

function pdzJmNear(player, value, range) {
  if (String(player.level.dimension) !== String(value.dimension)) return false
  let dx = Number(value.x || 0) - player.x, dz = Number(value.z || 0) - player.z
  return dx * dx + dz * dz <= range * range
}

// Do not turn a stale ledger row into a visible map settlement.  Native MCA
// residents can be loaded before their village centre is known, and older PDZ
// builds consequently left faction labels behind after the entity moved or the
// provisional site was merged.  A nearby player has the chunks loaded, so the
// presence of a real resident, defender, staff NPC or wilderness-site marker is
// the authoritative visibility check.
function pdzJmSiteHasAnchor(player, site, loadedEntities) {
  let siteId = String(site.id || '')
  let settlementType = String(site.settlementType || '')
  let settlement = siteId.indexOf('settlement_') === 0 || settlementType !== ''
  // Only the fixed starter colony and records tied to a verified StructureStart
  // may be rendered as settlements. Residents alone never create a map label.
  if (settlement) {
    let starterValid = settlementType === 'starter_colony' &&
      siteId === 'settlement_restoration_colony_01' && String(site.source || '').indexOf('starter') >= 0
    let villageValid = settlementType === 'survivor_colony' && site.structureVerified === true &&
      String(site.structureId || '') !== '' && String(site.structureInstance || '') !== ''
    if (!starterValid && !villageValid) return false
  }
  // v0.3 village records are tied to an actual StructureStart.  They remain a
  // valid settlement even while residents are outside the loaded entity list.
  // Legacy coordinate-cell records intentionally fail this check.
  if (site.structureVerified === true) return true
  if (settlementType === 'starter_colony') return true
  if (siteId.indexOf('settlement_native_') === 0) return false
  let sx = Number(site.x || 0), sz = Number(site.z || 0)
  for (let i = 0; i < loadedEntities.length; i++) {
    let entity = loadedEntities[i]
    let dx = Number(entity.x) - sx, dz = Number(entity.z) - sz
    let max = settlement ? 160 : 96
    if (dx * dx + dz * dz > max * max) continue
    let type = String(entity.type || '')
    let tags = entity.tags
    let linked = false
    try { linked = String(entity.persistentData.getString('dz_settlement_site') || '') === siteId } catch (ignored) {}
    if (linked) return true
    if (tags && (tags.contains('dz_wilderness_site') || tags.contains('dz_basecamp_staff') || tags.contains('dz_settlement_force'))) return true
    if (settlement && (type.indexOf('mca:') === 0 || type.indexOf('recruits:') === 0 || type.indexOf('village_recruits:') === 0)) return true
  }
  return false
}

function pdzJmSync(player) {
  let server = player.server
  let loadedEntities = []
  player.level.entities.forEach(entity => loadedEntities.push(entity))
  let cells = pdzJmRead(server, PDZ_JM_CELLS).filter(cell => {
    let center = {dimension:cell.dimension,x:Number(cell.x || 0)+Number(cell.size || 128)/2,z:Number(cell.z || 0)+Number(cell.size || 128)/2}
    return pdzJmNear(player, center, PDZ_JM_TERRITORY_RANGE)
  })
  let sites = pdzJmRead(server, PDZ_JM_SITES).filter(site =>
    pdzJmNear(player, site, PDZ_JM_TERRITORY_RANGE) && pdzJmSiteHasAnchor(player, site, loadedEntities))
  let activities = pdzJmRead(server, PDZ_JM_ACTIVITIES).filter(activity => {
    if (['ARRIVED','DESTROYED','CANCELLED','RETREATED'].indexOf(String(activity.state)) >= 0) return false
    // Radio/Scout talents can extend this later. MVP avoids revealing the whole world.
    return pdzJmNear(player, activity, PDZ_JM_ACTIVITY_RANGE)
  })
  player.sendData('pdz_journeymap_sync', {payload:JSON.stringify({version:1,cells:cells,sites:sites,activities:activities})})
  return {cells:cells.length,sites:sites.length,activities:activities.length}
}

let PDZ_JM_TICKS = 0
ServerEvents.tick(event => {
  PDZ_JM_TICKS++
  if (PDZ_JM_TICKS % 600 !== 0) return
  event.server.players.forEach(player => pdzJmSync(player))
})

PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(100, () => pdzJmSync(event.player))
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands} = event
  // Sync only sends already range-filtered strategic data to the caller, so it
  // is safe for normal players and can also be used by automatic refreshes.
  event.register(Commands.literal('deadzonemap')
    .then(Commands.literal('sync').executes(ctx => {
      let result=pdzJmSync(ctx.source.player)
      ctx.source.player.tell(Text.of('[PDZ MAP] 同期完了: 勢力圏 '+result.cells+' / 実在拠点 '+result.sites+' / 活動 '+result.activities).green())
      return 1
    })))
})

console.info('[PROJECT DEADZONE] JourneyMap strategic sync v0.1 loaded')
