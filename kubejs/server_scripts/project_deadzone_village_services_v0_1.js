// PROJECT DEADZONE village public services v0.1
//
// Village detection is supplied by the existing wilderness-site scan. That
// scan only samples already-loaded terrain when a player changes chunks, so
// this feature adds no global chunk walk, forced loads, or per-tick block scan.
// One successful installation is recorded by the exact structure start and is
// shared by every player through server persistent data.

const PDZ_VILLAGE_SERVICES_REGISTRY = 'dz_village_services_registry_v1'
const PDZ_VILLAGE_BLOCKPOS = Java.loadClass('net.minecraft.core.BlockPos')
const PDZ_VILLAGE_POI_TYPES = Java.loadClass('net.minecraft.world.entity.ai.village.poi.PoiTypes')
const PDZ_VILLAGE_POI_OCCUPANCY = Java.loadClass('net.minecraft.world.entity.ai.village.poi.PoiManager$Occupancy')
const PDZ_VILLAGE_HEIGHTMAP = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')

function pdzVillageIsVillageStructure(siteId) {
  siteId = String(siteId || '')
  if (siteId.indexOf('minecraft:village_') === 0) return true
  if (siteId.indexOf('ctov:') === 0 && siteId.indexOf('/village_') >= 0) return true
  if (siteId.indexOf('towns_and_towers:village_') === 0) return true
  return siteId.indexOf('towns_and_towers:exclusives/village_') === 0 &&
    siteId.indexOf('wandering_trader_camp') < 0 && siteId.indexOf('piglin') < 0
}

function pdzVillageReadServices(server) {
  let raw = server.persistentData.getString(PDZ_VILLAGE_SERVICES_REGISTRY)
  if (!raw) return {}
  try { return JSON.parse(raw) }
  catch (err) {
    console.error('[PDZ VILLAGE] Invalid service registry: ' + err)
    return {}
  }
}

function pdzVillageWriteServices(server, registry) {
  server.persistentData.putString(PDZ_VILLAGE_SERVICES_REGISTRY, JSON.stringify(registry))
}

function pdzVillageStructureKey(player, siteId, start) {
  let box = start.getBoundingBox()
  return String(player.level.dimension) + '|village|' + siteId + '|' +
    Number(box.minX()) + '|' + Number(box.minY()) + '|' + Number(box.minZ())
}

function pdzVillageAir(level, x, y, z) {
  let id = String(level.getBlock(x, y, z).id)
  return id === 'minecraft:air' || id === 'minecraft:cave_air' ||
    id === 'minecraft:void_air' || id === 'minecraft:grass' ||
    id === 'minecraft:tall_grass' || id === 'minecraft:fern' ||
    id === 'minecraft:large_fern' || id === 'minecraft:snow' ||
    id.indexOf('minecraft:dandelion') === 0 || id.indexOf('minecraft:poppy') === 0
}

function pdzVillageBadFloor(id) {
  id = String(id)
  return id === 'minecraft:air' || id === 'minecraft:cave_air' ||
    id === 'minecraft:void_air' || id.indexOf('water') >= 0 ||
    id.indexOf('lava') >= 0 || id.indexOf('leaves') >= 0 ||
    id.indexOf('fence') >= 0 || id.indexOf('_wall') >= 0 ||
    id.indexOf('pane') >= 0 || id.indexOf('bars') >= 0
}

function pdzVillageFindMeeting(level, start, hint) {
  let box = start.getBoundingBox()
  let minX = Number(box.minX()), minZ = Number(box.minZ())
  let maxX = Number(box.maxX()), maxZ = Number(box.maxZ())
  let cx = Math.floor((minX + maxX) / 2), cz = Math.floor((minZ + maxZ) / 2)
  let cy = Math.floor((Number(box.minY()) + Number(box.maxY())) / 2)
  let radius = Math.max(48, Math.min(160,
    Math.ceil(Math.max(maxX - minX, maxZ - minZ) / 2) + 24))
  try {
    let found = level.getPoiManager().findClosest(
      holder => holder.is(PDZ_VILLAGE_POI_TYPES.MEETING),
      new PDZ_VILLAGE_BLOCKPOS(cx, cy, cz), radius,
      PDZ_VILLAGE_POI_OCCUPANCY.ANY)
    if (found && found.isPresent()) {
      let pos = found.get(), x = Number(pos.getX()), y = Number(pos.getY()), z = Number(pos.getZ())
      // Do not borrow a neighbouring village's bell when two structures happen
      // to generate close together, or force its still-unloaded chunk.
      if (x >= minX - 16 && x <= maxX + 16 && z >= minZ - 16 && z <= maxZ + 16 &&
          level.hasChunkAt(pos))
        return {x:x, y:y, z:z}
    }
  } catch (err) {
    console.warn('[PDZ VILLAGE] Meeting POI lookup failed; using loaded-surface fallback: ' + err)
  }

  // Compatibility fallback for village mods that do not register a meeting
  // POI correctly. The cap keeps malformed giant structure boxes harmless.
  let fallbackX = hint && Number.isFinite(Number(hint.x)) ? Math.floor(Number(hint.x)) : cx
  let fallbackZ = hint && Number.isFinite(Number(hint.z)) ? Math.floor(Number(hint.z)) : cz
  let scanMinX = Math.max(minX, fallbackX - 48), scanMaxX = Math.min(maxX, fallbackX + 48)
  let scanMinZ = Math.max(minZ, fallbackZ - 48), scanMaxZ = Math.min(maxZ, fallbackZ + 48)
  for (let x = scanMinX; x <= scanMaxX; x++) for (let z = scanMinZ; z <= scanMaxZ; z++) {
    let probe = new PDZ_VILLAGE_BLOCKPOS(x, 64, z)
    if (!level.hasChunkAt(probe)) continue
    let surface = Number(level.getHeight(PDZ_VILLAGE_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, x, z))
    for (let y = surface + 2; y >= surface - 5; y--)
      if (String(level.getBlock(x, y, z).id) === 'minecraft:bell') return {x:x, y:y, z:z}
  }
  return null
}

function pdzVillageFindServiceSpot(level, bell) {
  let directions = [
    {dx:0, dz:-1, ax:1, az:0, facing:'south'},
    {dx:1, dz:0, ax:0, az:1, facing:'west'},
    {dx:0, dz:1, ax:1, az:0, facing:'north'},
    {dx:-1, dz:0, ax:0, az:1, facing:'east'}
  ]
  for (let radius = 3; radius <= 9; radius++) for (let d = 0; d < directions.length; d++) {
    let dir = directions[d]
    for (let lateral = -4; lateral <= 3; lateral++) {
      let bx = bell.x + dir.dx * radius + dir.ax * lateral
      let bz = bell.z + dir.dz * radius + dir.az * lateral
      let ax = bx + dir.ax, az = bz + dir.az
      if (!level.hasChunkAt(new PDZ_VILLAGE_BLOCKPOS(bx, bell.y, bz)) ||
          !level.hasChunkAt(new PDZ_VILLAGE_BLOCKPOS(ax, bell.y, az))) continue
      let by = Number(level.getHeight(PDZ_VILLAGE_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, bx, bz))
      let ay = Number(level.getHeight(PDZ_VILLAGE_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, ax, az))
      if (by !== ay || Math.abs(by - bell.y) > 3) continue
      if (!pdzVillageAir(level, bx, by, bz) || !pdzVillageAir(level, bx, by + 1, bz)) continue
      if (!pdzVillageAir(level, ax, ay, az) || !pdzVillageAir(level, ax, ay + 1, az)) continue
      if (pdzVillageBadFloor(level.getBlock(bx, by - 1, bz).id) ||
          pdzVillageBadFloor(level.getBlock(ax, ay - 1, az).id)) continue
      return {boardX:bx, atmX:ax, y:by, boardZ:bz, atmZ:az, facing:dir.facing}
    }
  }
  return null
}

function pdzVillagePlaceServices(player, spot) {
  let server = player.server, level = player.level
  let atmBottom = 'lightmanscurrency:atm[bottom=true,facing=' + spot.facing + ']'
  let atmTop = 'lightmanscurrency:atm[bottom=false,facing=' + spot.facing + ']'
  server.runCommandSilent('setblock ' + spot.atmX + ' ' + spot.y + ' ' + spot.atmZ + ' ' + atmBottom)
  server.runCommandSilent('setblock ' + spot.atmX + ' ' + (spot.y + 1) + ' ' + spot.atmZ + ' ' + atmTop)
  let atmOk = String(level.getBlock(spot.atmX, spot.y, spot.atmZ).id) === 'lightmanscurrency:atm' &&
    String(level.getBlock(spot.atmX, spot.y + 1, spot.atmZ).id) === 'lightmanscurrency:atm'
  if (!atmOk) {
    // Some tall-block implementations validate the other half immediately.
    // A reverse-order retry covers both update orders.
    server.runCommandSilent('setblock ' + spot.atmX + ' ' + (spot.y + 1) + ' ' + spot.atmZ + ' ' + atmTop)
    server.runCommandSilent('setblock ' + spot.atmX + ' ' + spot.y + ' ' + spot.atmZ + ' ' + atmBottom)
    atmOk = String(level.getBlock(spot.atmX, spot.y, spot.atmZ).id) === 'lightmanscurrency:atm' &&
      String(level.getBlock(spot.atmX, spot.y + 1, spot.atmZ).id) === 'lightmanscurrency:atm'
  }
  if (!atmOk) return false
  server.runCommandSilent('setblock ' + spot.boardX + ' ' + spot.y + ' ' + spot.boardZ + ' bountiful:bountyboard')
  if (String(level.getBlock(spot.boardX, spot.y, spot.boardZ).id) === 'bountiful:bountyboard') return true
  server.runCommandSilent('setblock ' + spot.atmX + ' ' + spot.y + ' ' + spot.atmZ + ' minecraft:air')
  server.runCommandSilent('setblock ' + spot.atmX + ' ' + (spot.y + 1) + ' ' + spot.atmZ + ' minecraft:air')
  return false
}

function pdzVillageEnsureServices(player, siteId, start, hint) {
  if (!pdzVillageIsVillageStructure(siteId) || !start || !start.isValid()) return false
  let key = pdzVillageStructureKey(player, siteId, start)
  let registry = pdzVillageReadServices(player.server)
  if (registry[key] && registry[key].placed) return true
  // Claim before placement so two players discovering one village on the same
  // server tick cannot create duplicate terminals.
  registry[key] = {placed:false, claimedAt:Date.now(), structure:String(siteId)}
  pdzVillageWriteServices(player.server, registry)
  let bell = pdzVillageFindMeeting(player.level, start, hint)
  let spot = bell ? pdzVillageFindServiceSpot(player.level, bell) : null
  if (!spot || !pdzVillagePlaceServices(player, spot)) {
    delete registry[key]
    pdzVillageWriteServices(player.server, registry)
    return false
  }
  registry[key] = {
    placed:true, structure:String(siteId), placedAt:Date.now(),
    bell:{x:bell.x,y:bell.y,z:bell.z},
    board:{x:spot.boardX,y:spot.y,z:spot.boardZ},
    atm:{x:spot.atmX,y:spot.y,z:spot.atmZ}
  }
  pdzVillageWriteServices(player.server, registry)
  console.info('[PDZ VILLAGE] Installed Bountiful Board + ATM at ' +
    spot.boardX + ',' + spot.y + ',' + spot.boardZ + ' for ' + siteId)
  return true
}
