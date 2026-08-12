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

function pdzJmSync(player) {
  let server = player.server
  let cells = pdzJmRead(server, PDZ_JM_CELLS).filter(cell => {
    let center = {dimension:cell.dimension,x:Number(cell.x || 0)+Number(cell.size || 128)/2,z:Number(cell.z || 0)+Number(cell.size || 128)/2}
    return pdzJmNear(player, center, PDZ_JM_TERRITORY_RANGE)
  })
  let sites = pdzJmRead(server, PDZ_JM_SITES).filter(site => pdzJmNear(player, site, PDZ_JM_TERRITORY_RANGE))
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
      ctx.source.player.tell(Text.of('[PDZ MAP] JourneyMap synchronized: '+result.cells+' territory cells / '+result.sites+' sites / '+result.activities+' activities.').green())
      return 1
    })))
})

console.info('[PROJECT DEADZONE] JourneyMap strategic sync v0.1 loaded')
