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

function dzStarterIsLobby(player) {
  try { return String(player.level.dimension).indexOf("lobby:lobby_dimension") >= 0 }
  catch (ignored) { return false }
}

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
        level.getChunk(Math.floor(px / 16), Math.floor(pz / 16))
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
          try { start = manager.getStructureAt(probe, structure) } catch (ignored) {}
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
  server.runCommandSilent("execute in minecraft:overworld run setworldspawn " + arrival.x + " " + arrival.y + " " + arrival.z)
  server.scheduleInTicks(20, callback => {
    try { server.players.forEach(p => { if (global.pdzJourneyMapSync) global.pdzJourneyMapSync(p) }) } catch (ignored) {}
  })
}

function dzStarterKitReady(player) {
  let data = player.persistentData
  return data.getBoolean("dz_starter_received") && data.getInt("dz_starter_grant_version") >= 6
}

function dzStarterTeleport(player) {
  let data = player.server.persistentData
  if (data.getInt(DZ_STARTER_VILLAGE_STATE) !== 2 || data.getInt("dz_starter_village_layout_version") !== DZ_STARTER_VILLAGE_VERSION) return 0
  let x = data.getInt("dz_starter_village_arrival_x") + 0.5
  let y = data.getInt("dz_starter_village_arrival_y")
  let z = data.getInt("dz_starter_village_arrival_z") + 0.5
  let result = player.runCommandSilent("execute in minecraft:overworld run tp @s " + x + " " + y + " " + z)
  if (result <= 0) return 0
  player.runCommandSilent("effect give @s minecraft:resistance 12 4 true")
  player.runCommandSilent("effect give @s minecraft:slow_falling 12 0 true")
  player.runCommandSilent("effect clear @s minecraft:blindness")
  player.persistentData.putBoolean("dz_starter_depart_complete", true)
  player.persistentData.remove("dz_starter_depart_requested")
  player.tell(Text.of("[PROJECT DEADZONE] \u521d\u671f\u8857\u300c" + DZ_STARTER_CITY_NAME + "\u300d\u3078\u5230\u7740\u3057\u307e\u3057\u305f\u3002").green())
  return 1
}

function dzStarterRegisterNearest(player, radiusChunks) {
  let server = player.server, data = server.persistentData
  if (data.getInt(DZ_STARTER_VILLAGE_STATE) === 2 && data.getInt("dz_starter_village_layout_version") === DZ_STARTER_VILLAGE_VERSION && data.getString("dz_starter_village_source") === DZ_STARTER_SOURCE) return 1
  if (data.getInt(DZ_STARTER_VILLAGE_STATE) === 1) return 0
  data.putInt(DZ_STARTER_VILLAGE_STATE, 1)
  try {
    let level = dzStarterOverworld(server)
    if (!level) {
      data.putInt(DZ_STARTER_VILLAGE_STATE, 0)
      return 0
    }
    player.tell(Text.of("[PDZ] \u6700\u5bc4\u308a\u306e\u751f\u6210\u6e08\u307f\u306e\u6751\u3092\u78ba\u8a8d\u3057\u3066\u3044\u307e\u3059\u3002\u521d\u56de\u3060\u3051\u5c11\u3057\u5f85\u3063\u3066\u306d\u3002").aqua())
    let village = dzStarterLocate(level, radiusChunks || 128)
    if (!village) {
      data.putInt(DZ_STARTER_VILLAGE_STATE, 0)
      player.tell(Text.of("[PDZ] \u5b9f\u5728\u3059\u308b\u6751\u3092\u78ba\u8a8d\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u30ed\u30d3\u30fc\u306b\u7559\u307e\u308a\u307e\u3059\u3002").red())
      player.tell(Text.of("[ \u521d\u671f\u8857\u306e\u63a2\u7d22\u3092\u518d\u8a66\u884c ]").gold().bold().clickRunCommand("/deadzonevillage retry"))
      console.error("[PDZ][Starter City] no verified village found within " + (radiusChunks || 128) + " chunks")
      return 0
    }
    let arrival = dzStarterSafeArrival(level, village)
    dzStarterStore(server, arrival, village)
    console.info("[PDZ][Starter City] registered " + DZ_STARTER_CITY_NAME + " structure=" + village.structure + " village=" + village.x + "," + village.y + "," + village.z + " arrival=" + arrival.x + "," + arrival.y + "," + arrival.z)
    player.tell(Text.of("[PDZ] " + DZ_STARTER_CITY_NAME + "\u3092\u521d\u671f\u8857\u3068\u3057\u3066\u767b\u9332\u3057\u307e\u3057\u305f\u3002\u4ee5\u5f8c\u306e\u53c2\u52a0\u8005\u3082\u540c\u3058\u8857\u3092\u4f7f\u7528\u3057\u307e\u3059\u3002").green())
    return 1
  } catch (error) {
    data.putInt(DZ_STARTER_VILLAGE_STATE, 0)
    console.error("[PDZ][Starter City] registration failed and state was reset: " + error)
    player.tell(Text.of("[PDZ] \u521d\u671f\u8857\u306e\u78ba\u5b9a\u4e2d\u306b\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u30ed\u30d3\u30fc\u306b\u7559\u307e\u308a\u307e\u3059\u3002").red())
    return 0
  }
}

global.pdzRegisterNearestStarterCity = function(player) {
  try { return dzStarterRegisterNearest(player, 128) }
  catch (error) {
    try { player.server.persistentData.putInt(DZ_STARTER_VILLAGE_STATE, 0) } catch (ignored) {}
    console.error("[PDZ][Starter City] registration trigger failed: " + error)
    return 0
  }
}

function dzStarterDepart(player) {
  if (!player.persistentData.getBoolean("dz_job_chosen")) {
    player.tell(Text.of("[PDZ] \u5148\u306b\u767b\u9332\u53d7\u4ed8\u5b98\u30a2\u30aa\u30a4\u3078\u8a71\u3057\u304b\u3051\u3001\u521d\u671fJOB\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002").red())
    return 0
  }
  if (!dzStarterKitReady(player)) {
    player.runCommandSilent("deadzonejob starter_claim")
    if (!player.persistentData.getBoolean("dz_starter_received")) {
      player.tell(Text.of("[PDZ] \u30b9\u30bf\u30fc\u30bf\u30fc\u30ad\u30c3\u30c8\u652f\u7d66\u3092\u78ba\u8a8d\u3067\u304d\u306a\u3044\u305f\u3081\u3001\u51fa\u767a\u3092\u4e2d\u6b62\u3057\u307e\u3057\u305f\u3002").red())
      return 0
    }
  }
  if (!dzStarterIsLobby(player)) {
    player.tell(Text.of("[PDZ] \u521d\u56de\u51fa\u767a\u306f\u30ed\u30d3\u30fc\u304b\u3089\u306e\u307f\u5b9f\u884c\u3067\u304d\u307e\u3059\u3002").yellow())
    return 0
  }
  let data = player.server.persistentData
  if (data.getInt(DZ_STARTER_VILLAGE_STATE) === 2 && data.getInt("dz_starter_village_layout_version") !== DZ_STARTER_VILLAGE_VERSION) data.putInt(DZ_STARTER_VILLAGE_STATE, 0)
  player.persistentData.putBoolean("dz_starter_depart_requested", true)
  player.runCommandSilent("effect give @s minecraft:resistance 120 255 true")
  if (data.getInt(DZ_STARTER_VILLAGE_STATE) !== 2 && !dzStarterRegisterNearest(player, 128)) return 0
  return dzStarterTeleport(player)
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
  root.then(Commands.literal("depart").executes(ctx => dzStarterDepart(ctx.source.player)))
  root.then(Commands.literal("retry").executes(ctx => {
    let p=ctx.source.player,d=p.server.persistentData
    d.putInt(DZ_STARTER_VILLAGE_STATE,0); d.putInt("dz_starter_village_layout_version",0)
    return dzStarterRegisterNearest(p,256)
  }))
  root.then(Commands.literal("teleport").requires(s=>s.hasPermission(2)).executes(ctx => dzStarterTeleport(ctx.source.player)))
  root.then(Commands.literal("generate_here").requires(s=>s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player,d=p.server.persistentData
    d.putInt(DZ_STARTER_VILLAGE_STATE,0); d.putInt("dz_starter_village_layout_version",0)
    p.tell(Text.of("[PDZ] \u73fe\u5728\u5730\u3067\u306f\u306a\u304f\u3001\u30ef\u30fc\u30eb\u30c9\u30b9\u30dd\u30fc\u30f3\u304b\u3089\u6700\u5bc4\u308a\u306e\u5b9f\u5728\u6751\u3092\u518d\u691c\u7d22\u3057\u307e\u3059\u3002").aqua())
    return dzStarterRegisterNearest(p,256)
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
