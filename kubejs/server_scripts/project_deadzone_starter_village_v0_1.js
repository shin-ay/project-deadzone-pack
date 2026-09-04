// PROJECT DEADZONE nearest native village starter-city controller v7.1
// Village generation belongs to Minecraft/CTOV/Towns and Towers. PDZ only
// discovers one real village, registers it once, and reuses it for all players.

const DZ_STARTER_VILLAGE_STATE = "dz_starter_village_state"
const DZ_STARTER_VILLAGE_VERSION = 7
const DZ_STARTER_CITY_NAME = "\u706f\u706b\u5e02"
const DZ_STARTER_SOURCE = "starter_nearest_verified_village_v7"
const DZ_STARTER_HEIGHTMAP = Java.loadClass("net.minecraft.world.level.levelgen.Heightmap$Types")
const DZ_STARTER_BLOCK_POS = Java.loadClass("net.minecraft.core.BlockPos")
const DZ_STARTER_REGISTRIES = Java.loadClass("net.minecraft.core.registries.Registries")
const DZ_STARTER_TAG_KEY = Java.loadClass("net.minecraft.tags.TagKey")
const DZ_STARTER_RESOURCE_LOCATION = Java.loadClass("net.minecraft.resources.ResourceLocation")
const DZ_STARTER_VILLAGE_TAG = DZ_STARTER_TAG_KEY.create(
  DZ_STARTER_REGISTRIES.STRUCTURE,
  new DZ_STARTER_RESOURCE_LOCATION("project_deadzone", "starter_village")
)

function dzStarterOverworld(server) {
  try { let level = server.getLevel("minecraft:overworld"); if (level) return level } catch (ignored) {}
  try { return server.overworld() } catch (ignored) {}
  return null
}

function dzStarterWorldSpawn(level) {
  try {
    let pos = level.getSharedSpawnPos()
    return {x:Number(pos.getX()), y:Number(pos.getY()), z:Number(pos.getZ())}
  } catch (ignored) {}
  return {x:0, y:80, z:0}
}

function dzStarterIsVillageStructureId(id) {
  id = String(id || "").toLowerCase()
  let split = id.split(":"), namespace = split.length > 1 ? split[0] : "", path = split.length > 1 ? split[1] : split[0]
  if (path.indexOf("pillager") >= 0 || path.indexOf("outpost") >= 0 || path.indexOf("wandering_trader") >= 0) return false
  if (namespace === "minecraft") return path.indexOf("village_") === 0
  if (namespace === "ctov" || namespace === "towns_and_towers") return path.indexOf("village") >= 0
  return false
}

function dzStarterPairFirst(pair) {
  try { return pair.getFirst() } catch (ignored) {}
  try { return pair.getA() } catch (ignored) {}
  try { return pair.first } catch (ignored) {}
  return null
}

function dzStarterPairSecond(pair) {
  try { return pair.getSecond() } catch (ignored) {}
  try { return pair.getB() } catch (ignored) {}
  try { return pair.second } catch (ignored) {}
  return null
}

// Resolve a real StructureStart and persist its bounding box. A locate hint by
// itself is never accepted as a settlement.
function dzStarterVerifyVillage(level, foundPos, holder) {
  try {
    let registry = level.registryAccess().registryOrThrow(DZ_STARTER_REGISTRIES.STRUCTURE)
    let manager = level.structureManager()
    let hinted = null
    try { hinted = holder.value() } catch (ignored) {}
    let baseX = Number(foundPos.getX()), baseY = Number(foundPos.getY()), baseZ = Number(foundPos.getZ())
    if (!isFinite(baseY) || baseY <= level.getMinBuildHeight()) {
      try { baseY = Number(level.getHeight(DZ_STARTER_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, Math.floor(baseX), Math.floor(baseZ))) }
      catch (ignored) { baseY = 64 }
    }
    for (let ring = 0; ring <= 64; ring += 16) {
      for (let dx = -ring; dx <= ring; dx += 16) for (let dz = -ring; dz <= ring; dz += 16) {
        if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue
        let px = baseX + dx, pz = baseZ + dz
        let probeChunk = level.getChunk(Math.floor(px / 16), Math.floor(pz / 16))
        let probeY = baseY
        try { probeY = Number(level.getHeight(DZ_STARTER_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, Math.floor(px), Math.floor(pz))) } catch (ignored) {}
        let probe = new DZ_STARTER_BLOCK_POS(Math.floor(px), Math.floor(probeY), Math.floor(pz))
        let candidates = []
        if (hinted) candidates.push(hinted)
        try {
          let starts = manager.getAllStructuresAt(probe)
          if (starts && !starts.isEmpty()) {
            let values = starts.keySet().toArray()
            for (let i = 0; i < values.length; i++) candidates.push(values[i])
          }
        } catch (ignored) {}
        for (let i = 0; i < candidates.length; i++) {
          let structure = candidates[i]
          let structureId = String(registry.getKey(structure))
          if (!dzStarterIsVillageStructureId(structureId)) continue
          let start = null
          // A locate result points at the structure's start chunk, but its
          // returned block position is not guaranteed to lie inside an actual
          // jigsaw piece (and the surface Y may be above its bounding box).
          // Read the StructureStart directly from the loaded chunk first.
          try { start = probeChunk.getStartForStructure(structure) } catch (ignored) {}
          if (!start || !start.isValid()) try { start = manager.getStructureAt(probe, structure) } catch (ignored) {}
          if (!start || !start.isValid()) try { start = manager.getStructureWithPieceAt(probe, structure) } catch (ignored) {}
          if (!start || !start.isValid()) continue
          let box = start.getBoundingBox()
          let minX = Number(box.minX()), minY = Number(box.minY()), minZ = Number(box.minZ())
          let maxX = Number(box.maxX()), maxY = Number(box.maxY()), maxZ = Number(box.maxZ())
          if (maxX - minX < 16 || maxZ - minZ < 16) continue
          return {
            x:Math.floor((minX + maxX) / 2), y:minY + 1, z:Math.floor((minZ + maxZ) / 2),
            structure:structureId,
            bounds:{minX:minX,minY:minY,minZ:minZ,maxX:maxX,maxY:maxY,maxZ:maxZ}
          }
        }
      }
    }
  } catch (error) {
    console.error("[PDZ][Starter City] village verification failed: " + error)
  }
  return null
}

function dzStarterBlockId(level, x, y, z) {
  try { return String(level.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)).id) }
  catch (ignored) { return "minecraft:void_air" }
}

function dzStarterPassable(id) {
  return id.indexOf("air") >= 0 || id.indexOf("grass") >= 0 || id.indexOf("flower") >= 0 ||
    id.indexOf("fern") >= 0 || id.indexOf("snow") >= 0
}

function dzStarterBadGround(id) {
  return id.indexOf("water") >= 0 || id.indexOf("lava") >= 0 || id.indexOf("leaves") >= 0 ||
    id.indexOf("log") >= 0 || id.indexOf("cactus") >= 0 || id.indexOf("fire") >= 0 || id.indexOf("void_air") >= 0
}

function dzStarterSafeArrival(level, village) {
  let offsets = [[0,0],[8,0],[-8,0],[0,8],[0,-8],[12,12],[-12,12],[12,-12],[-12,-12],[20,0],[-20,0],[0,20],[0,-20],[24,16],[-24,16],[24,-16],[-24,-16]]
  for (let i = 0; i < offsets.length; i++) {
    let x = Math.floor(village.x + offsets[i][0]), z = Math.floor(village.z + offsets[i][1])
    try {
      level.getChunk(Math.floor(x / 16), Math.floor(z / 16))
      let y = Number(level.getHeight(DZ_STARTER_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, x, z))
      if (!isFinite(y) || y < 35 || y > 220) continue
      let ground = dzStarterBlockId(level, x, y - 1, z)
      let body = dzStarterBlockId(level, x, y, z)
      let head = dzStarterBlockId(level, x, y + 1, z)
      if (dzStarterBadGround(ground) || !dzStarterPassable(body) || !dzStarterPassable(head)) continue
      return {x:x,y:Math.floor(y),z:z}
    } catch (ignored) {}
  }
  return {x:village.x,y:Math.max(65,village.y + 3),z:village.z}
}

function dzStarterLocate(level, radiusChunks) {
  let spawn = dzStarterWorldSpawn(level)
  let origin = new DZ_STARTER_BLOCK_POS(Math.floor(spawn.x), Math.floor(spawn.y), Math.floor(spawn.z))
  let pair = null
  try { pair = level.findNearestMapStructure(DZ_STARTER_VILLAGE_TAG, origin, radiusChunks, false) }
  catch (error) { console.error("[PDZ][Starter City] locate API failed: " + error); return null }
  if (!pair) return null
  let pos = dzStarterPairFirst(pair), holder = dzStarterPairSecond(pair)
  if (!pos) return null
  return dzStarterVerifyVillage(level, pos, holder)
}

function dzStarterStore(server, arrival, village) {
  let data = server.persistentData
  data.putInt("dz_starter_village_origin_x", arrival.x)
  data.putInt("dz_starter_village_origin_y", arrival.y)
  data.putInt("dz_starter_village_origin_z", arrival.z)
  data.putInt("dz_starter_village_arrival_x", arrival.x)
  data.putInt("dz_starter_village_arrival_y", arrival.y)
  data.putInt("dz_starter_village_arrival_z", arrival.z)
  data.putInt("dz_starter_native_village_x", village.x)
  data.putInt("dz_starter_native_village_y", village.y)
  data.putInt("dz_starter_native_village_z", village.z)
  data.putString("dz_starter_native_village_structure", village.structure)
  data.putString("dz_starter_native_village_bounds", JSON.stringify(village.bounds || {}))
  data.putString("dz_starter_village_dimension", "minecraft:overworld")
  data.putString("dz_starter_village_id", "starter_city_01")
  data.putString("dz_starter_village_name", DZ_STARTER_CITY_NAME)
  data.putString("dz_starter_village_source", DZ_STARTER_SOURCE)
  data.putString("dz_starter_village_faction", "civil_defense")
  data.putString("dz_starter_village_relation", "friendly")
  data.putString("dz_starter_village_economy", "regional_hub")
  data.putInt("dz_starter_village_layout_version", DZ_STARTER_VILLAGE_VERSION)
  data.putInt("dz_starter_village_staff_version", 3)
  // Native village mods own population. Block the old 13-NPC camp installer.
  data.putInt("dz_starter_colony_population_version", 999)
  data.putInt(DZ_STARTER_VILLAGE_STATE, 2)
  try { if (global.pdzRegisterStarterColony) global.pdzRegisterStarterColony(server, arrival, village) }
  catch (error) { console.error("[PDZ][Starter City] settlement registration failed: " + error) }
  // Village Spawn Point owns world-spawn selection. PDZ only records the
  // selected village and attaches settlement/faction policy to it.
  server.scheduleInTicks(20, callback => {
    try { server.players.forEach(p => { if (global.pdzJourneyMapSync) global.pdzJourneyMapSync(p) }) } catch (ignored) {}
  })
}

function dzStarterKitReady(player) {
  let data = player.persistentData
  return data.getBoolean("dz_starter_received") && data.getInt("dz_starter_grant_version") >= 6
}

// Prefer a village already proven by the settlement scanner. This avoids a
// second broad locate when the player happened to load a CTOV village first.
global.pdzAdoptVerifiedRescueVillage = function(player, site) {
  try {
    if (!player || !site || site.structureVerified !== true) return 0
    let structure=String(site.structureId || "")
    if (!structure || String(site.settlementType || "") !== "survivor_colony") return 0
    let village={
      x:Math.floor(Number(site.x)), y:Math.floor(Number(site.y)), z:Math.floor(Number(site.z)),
      structure:structure, instance:String(site.structureInstance || ""), bounds:site.structureBounds || null
    }
    let arrival=dzStarterSafeArrival(player.level,village)
    dzStarterStore(player.server,arrival,village)
    console.info("[PDZ][Starter City] adopted verified rescue village " + structure +
      " at " + village.x + "," + village.y + "," + village.z)
    return 1
  } catch (error) {
    console.error("[PDZ][Starter City] verified village adoption failed: " + error)
    return 0
  }
}

ServerEvents.commandRegistry(event => {
  const {commands:Commands} = event
  let root = Commands.literal("deadzonevillage")
  root.then(Commands.literal("status").executes(ctx => {
    let p=ctx.source.player,d=p.server.persistentData
    p.tell(Text.of("=== PDZ \u521d\u671f\u8857\u72b6\u614b ===").gold())
    p.tell(Text.of("\u72b6\u614b: " + d.getInt(DZ_STARTER_VILLAGE_STATE) + " / layout v" + d.getInt("dz_starter_village_layout_version")).gray())
    p.tell(Text.of("\u90fd\u5e02\u540d: " + (d.getString("dz_starter_village_name") || "\u672a\u767b\u9332")).aqua())
    p.tell(Text.of("\u69cb\u9020\u7269: " + d.getString("dz_starter_native_village_structure")).aqua())
    p.tell(Text.of("\u52e2\u529b: \u53cb\u597d\u30fb\u6c11\u9593\u9632\u885b\u968a / \u7d4c\u6e08: \u5730\u57df\u5fa9\u8208\u30cf\u30d6").green())
    return 1
  }))
  root.then(Commands.literal("reset").requires(s=>s.hasPermission(2)).executes(ctx => {
    let d=ctx.source.server.persistentData
    d.putInt(DZ_STARTER_VILLAGE_STATE,0); d.putInt("dz_starter_village_layout_version",0)
    d.putString("dz_starter_village_source","")
    ctx.source.player.tell(Text.of("[PDZ] \u521d\u671f\u8857\u306e\u767b\u9332\u60c5\u5831\u3092\u30ea\u30bb\u30c3\u30c8\u3057\u307e\u3057\u305f\u3002\u6751\u305d\u306e\u3082\u306e\u306f\u524a\u9664\u3057\u307e\u305b\u3093\u3002").yellow())
    return 1
  }))
  event.register(root)
})

console.info("[PROJECT DEADZONE] nearest native starter city controller v7.1 loaded")
