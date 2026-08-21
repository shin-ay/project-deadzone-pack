// PROJECT DEADZONE starter colony controller v4.0
// Locate a real village through PDZ's curated starter-village structure tag.
// The curated tag excludes tiny trader camps and hostile novelty villages, then
// the proven Survivor Camp template is attached beside the selected village.

const DZ_STARTER_VILLAGE_STATE = "dz_starter_village_state"
const DZ_STARTER_VILLAGE_VERSION = 4
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

function dzStarterStructureId(holder) {
  try {
    let optional = holder.unwrapKey()
    if (optional && optional.isPresent()) return String(optional.get().location())
  } catch (ignored) {}
  return "#project_deadzone:starter_village"
}

function dzStarterIsVillageStructureId(structureId) {
  structureId = String(structureId || "").toLowerCase()
  let split = structureId.split(":"), namespace = split.length > 1 ? split[0] : "", path = split.length > 1 ? split[1] : split[0]
  if (path.indexOf("pillager") >= 0 || path.indexOf("outpost") >= 0 || path.indexOf("wandering_trader") >= 0) return false
  if (namespace === "minecraft") return path.indexOf("village_") === 0
  if (namespace === "ctov" || namespace === "towns_and_towers") return path.indexOf("village") >= 0
  return false
}

// A locate result is only a search hint. Lobby structures and fallback spawn
// points previously slipped into the colony ledger because their coordinates
// were trusted without checking a real StructureStart. Resolve the actual
// bounding box and use its center as the authoritative village position.
function dzStarterVerifyVillage(level, foundPos, holder) {
  try {
    let registry = level.registryAccess().registryOrThrow(DZ_STARTER_REGISTRIES.STRUCTURE)
    let manager = level.structureManager()
    let hinted = null
    try { hinted = holder.value() } catch (ignored) {}
    let baseX = Number(foundPos.getX()), baseY = Number(foundPos.getY()), baseZ = Number(foundPos.getZ())
    // Forge/KubeJS can expose the locate result as a bare BlockPos. In that
    // form Y is normally 0 and no structure holder is included. Probe at the
    // real surface so StructureManager#getAllStructuresAt can recover the
    // village structure from the located chunk.
    if (!isFinite(baseY) || baseY <= level.getMinBuildHeight()) {
      try { baseY = Number(level.getHeight(DZ_STARTER_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, Math.floor(baseX), Math.floor(baseZ))) }
      catch (ignored) { baseY = 64 }
    }
    // Locate already returns a chunk inside/next to the structure.  A compact
    // verification ring avoids force-loading hundreds of chunks at first join.
    for (let ring = 0; ring <= 64; ring += 16) {
      for (let dx = -ring; dx <= ring; dx += 16) for (let dz = -ring; dz <= ring; dz += 16) {
        if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue
        let px = baseX + dx, pz = baseZ + dz
        level.getChunk(Math.floor(px / 16), Math.floor(pz / 16))
        let probeY = baseY
        try { probeY = Number(level.getHeight(DZ_STARTER_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, Math.floor(px), Math.floor(pz))) }
        catch (ignored) {}
        let probe = new DZ_STARTER_BLOCK_POS(Math.floor(px), Math.floor(probeY), Math.floor(pz))
        let candidates = []
        if (hinted) candidates.push(hinted)
        try {
          let starts = manager.getAllStructuresAt(probe)
          if (starts && !starts.isEmpty()) {
            let arr = starts.keySet().toArray()
            for (let i = 0; i < arr.length; i++) candidates.push(arr[i])
          }
        } catch (ignored) {}
        for (let i = 0; i < candidates.length; i++) {
          let structure = candidates[i]
          let structureId = String(registry.getKey(structure))
          if (!dzStarterIsVillageStructureId(structureId)) continue
          let start = null
          try { start = manager.getStructureAt(probe, structure) } catch (ignored) {}
          if (!start || !start.isValid()) {
            try { start = manager.getStructureWithPieceAt(probe, structure) } catch (ignored) {}
          }
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
    console.error("[PDZ][Starter Colony] village verification failed: " + error)
  }
  return null
}

// ServerLevel.findNearestMapStructure uses Minecraft's structure registry. The
// datapack tag supplies vanilla villages plus the safe CTOV/Towns and Towers
// variants that are large enough to function as the first survivor colony.
function dzStarterFindNativeVillage(level, player) {
  let start = dzStarterWorldSpawn(level)
  try {
    let origin = new DZ_STARTER_BLOCK_POS(Math.floor(start.x), Math.floor(start.y), Math.floor(start.z))
    // Radius is measured in chunks. 32 keeps the first pass bounded; a failure
    // leaves the player safely in Lobby and can be retried explicitly.
    let found = level.findNearestMapStructure(DZ_STARTER_VILLAGE_TAG, origin, 32, false)
    if (!found) return null
    // Vanilla normally returns Pair<BlockPos, Holder<Structure>>, while the
    // current Forge/KubeJS bridge returns BlockPos directly. Accept both so a
    // successful locate is never mistaken for a failed village search.
    let pos = null
    let holder = null
    try {
      pos = found.getFirst()
      holder = found.getSecond()
    } catch (ignored) {
      try {
        found.getX()
        pos = found
      } catch (notBlockPos) {}
    }
    if (!pos) {
      console.error("[PDZ][Starter Colony] unsupported locate result: " + found)
      return null
    }
    let verified = dzStarterVerifyVillage(level, pos, holder)
    if (!verified) {
      console.error("[PDZ][Starter Colony] locate returned an unverified/non-village result at " + pos)
      return null
    }
    return verified
  } catch (error) {
    console.error("[PDZ][Starter Colony] real village locate failed: " + error)
    return null
  }
}

function dzStarterSurfaceY(level, x, z) {
  try {
    x = Math.floor(x); z = Math.floor(z)
    level.getChunk(Math.floor(x / 16), Math.floor(z / 16))
    let y = Number(level.getHeight(DZ_STARTER_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, x, z))
    return Number.isFinite(y) && y >= 35 && y <= 220 ? y : NaN
  } catch (error) {
    console.warn("[PDZ][Starter Colony] height query failed: " + error)
    return NaN
  }
}

function dzStarterBlockId(level, x, y, z) {
  try { return String(level.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)).id) }
  catch (ignored) { return "minecraft:void_air" }
}

function dzStarterNaturalGround(id) {
  let allow = ["grass_block","dirt","coarse_dirt","podzol","mycelium","stone","deepslate","sand","gravel","clay","mud","snow_block"]
  for (let i = 0; i < allow.length; i++) if (id.indexOf(allow[i]) >= 0) return true
  return false
}

// The camp is 32x20x32. Sample the footprint instead of scanning every block;
// this keeps first-world generation cheap while rejecting water, cliffs,
// buildings and tree canopies.
function dzStarterCampSite(level, centerX, centerZ, maxRelief) {
  let originX = Math.floor(centerX) - 16
  let originZ = Math.floor(centerZ) - 16
  let minY = 999, maxY = -999, ys = []
  for (let dx = 2; dx <= 30; dx += 4) {
    for (let dz = 2; dz <= 30; dz += 4) {
      let x = originX + dx, z = originZ + dz
      let y = dzStarterSurfaceY(level, x, z)
      if (!Number.isFinite(y)) return null
      let ground = dzStarterBlockId(level, x, y - 1, z)
      if (!dzStarterNaturalGround(ground)) return null
      let above = dzStarterBlockId(level, x, y, z)
      if (above.indexOf("water") >= 0 || above.indexOf("lava") >= 0 || above.indexOf("log") >= 0) return null
      minY = Math.min(minY, y); maxY = Math.max(maxY, y); ys.push(y)
    }
  }
  if (maxY - minY > (maxRelief || 5)) return null
  ys.sort((a,b) => a-b)
  return {x:originX, y:Math.floor(ys[Math.floor(ys.length / 2)]), z:originZ}
}

function dzStarterFindCampSite(server, forcedSite, player) {
  if (forcedSite) return forcedSite
  let level = dzStarterOverworld(server)
  if (!level) return null
  let village = dzStarterFindNativeVillage(level, player)
  if (!village) return null
  // Attach the headquarters to the OUTSIDE of the verified village bounding
  // box first. This keeps the existing village intact and makes the result read
  // as one colony instead of two unrelated structures hundreds of blocks apart.
  let b = village.bounds || {minX:village.x-32,maxX:village.x+32,minZ:village.z-32,maxZ:village.z+32}
  let edgeCandidates = [
    {x:b.maxX+24,z:village.z},{x:b.minX-24,z:village.z},
    {x:village.x,z:b.maxZ+24},{x:village.x,z:b.minZ-24},
    {x:b.maxX+24,z:b.maxZ+24},{x:b.minX-24,z:b.maxZ+24},
    {x:b.minX-24,z:b.minZ-24},{x:b.maxX+24,z:b.minZ-24}
  ]
  for (let e = 0; e < edgeCandidates.length; e++) {
    let edgeSite = dzStarterCampSite(level, edgeCandidates[e].x, edgeCandidates[e].z, 6)
    if (edgeSite) return {site:edgeSite, village:village}
  }
  let passes = [
    {radii:[48,64,80,96,112,128], relief:6}
  ]
  let dirs = [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1],[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-1,-2],[1,-2],[2,-1]]
  for (let p = 0; p < passes.length; p++) {
    for (let r = 0; r < passes[p].radii.length; r++) {
      for (let d = 0; d < dirs.length; d++) {
        let scale = Math.max(Math.abs(dirs[d][0]), Math.abs(dirs[d][1]))
        let x = village.x + dirs[d][0] * passes[p].radii[r] / scale
        let z = village.z + dirs[d][1] * passes[p].radii[r] / scale
        let site = dzStarterCampSite(level, x, z, passes[p].relief)
        if (site) return {site:site, village:village}
      }
    }
  }
  return null
}

function dzStarterStore(server, site, village) {
  let data = server.persistentData
  data.putInt("dz_starter_village_origin_x", site.x)
  data.putInt("dz_starter_village_origin_y", site.y)
  data.putInt("dz_starter_village_origin_z", site.z)
  data.putInt("dz_starter_village_arrival_x", site.x + 13)
  data.putInt("dz_starter_village_arrival_y", site.y + 2)
  data.putInt("dz_starter_village_arrival_z", site.z + 20)
  data.putInt("dz_starter_native_village_x", village.x)
  data.putInt("dz_starter_native_village_y", village.y)
  data.putInt("dz_starter_native_village_z", village.z)
  data.putString("dz_starter_native_village_structure", village.structure || "#minecraft:village")
  data.putString("dz_starter_village_dimension", "minecraft:overworld")
  data.putString("dz_starter_village_id", "restoration_colony_01")
  data.putString("dz_starter_village_source", "starter_verified_mod_village_plus_survivor_camp")
  data.putString("dz_starter_village_faction", "civil_defense")
  data.putString("dz_starter_village_relation", "friendly")
  data.putString("dz_starter_village_economy", "restoration_hub")
  data.putInt("dz_starter_village_layout_version", DZ_STARTER_VILLAGE_VERSION)
  // The camp activation function owns staff placement. Disable the obsolete
  // old-village door scanner so it cannot create duplicates.
  data.putInt("dz_starter_village_staff_version", 3)
  data.putInt("dz_starter_colony_population_version", 0)
  try {
    if (global.pdzRegisterStarterColony) global.pdzRegisterStarterColony(server, site, village)
  } catch (error) {
    console.error("[PDZ][Starter Colony] settlement registration failed: " + error)
  }
}

function dzStarterCampReady(server) {
  let data = server.persistentData
  if (!data.contains("dz_starter_village_origin_x")) return false
  let x = data.getInt("dz_starter_village_origin_x")
  let y = data.getInt("dz_starter_village_origin_y")
  let z = data.getInt("dz_starter_village_origin_z")
  let level = dzStarterOverworld(server)
  if (!level) return false
  try {
    let core = String(level.getBlock(x + 24, y + 11, z + 16).id)
    if (core === "kubejs:deadzone_base_core") return true
  } catch (ignored) {}
  let marker = server.runCommandSilent("execute in minecraft:overworld positioned " +
    (x + 24) + " " + (y + 11) + " " + (z + 16) +
    " if entity @e[tag=dz_basecamp_core_anchor,distance=..6,limit=1] run time query daytime")
  return marker > 0
}

function dzStarterCampCoreAt(server, site) {
  let level = dzStarterOverworld(server)
  if (!level || !site) return false
  try {
    let core = String(level.getBlock(site.x + 24, site.y + 11, site.z + 16).id)
    if (core === "kubejs:deadzone_base_core") return true
  } catch (ignored) {}
  let marker = server.runCommandSilent("execute in minecraft:overworld positioned " +
    (site.x + 24) + " " + (site.y + 11) + " " + (site.z + 16) +
    " if entity @e[tag=dz_basecamp_core_anchor,distance=..6,limit=1] run gamerule doDaylightCycle")
  return marker > 0
}

function dzStarterPopulationReady(server, repair) {
  try {
    if (!global.pdzEnsureStarterPopulation) return false
    return global.pdzEnsureStarterPopulation(server, !!repair) > 0
  } catch (error) {
    console.error("[PDZ][Starter Colony] population verification error: " + error)
    return false
  }
}

function dzStarterKitReady(player) {
  try {
    if (global.pdzEnsureStarterKit) return !!global.pdzEnsureStarterKit(player)
  } catch (error) {
    console.error("[PDZ][Starter Colony] starter-kit verification error: " + error)
  }
  player.runCommandSilent("deadzonejob starter_claim")
  return player.persistentData.getBoolean("dz_starter_received")
}

function dzStarterReadiness(player, repairPopulation) {
  return {
    camp: dzStarterCampReady(player.server),
    population: dzStarterPopulationReady(player.server, repairPopulation),
    kit: dzStarterKitReady(player)
  }
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
  player.tell(Text.of("[PROJECT DEADZONE] 復興コロニーへ到着しました。キャンプ本部で状況を確認してください。").green())
  return 1
}

function dzStarterGenerate(player, forcedSite) {
  let server = player.server, data = server.persistentData
  if (data.getInt(DZ_STARTER_VILLAGE_STATE) === 1) {
    player.tell(Text.of("[PDZ] 復興コロニーを準備中です。ロビーでお待ちください。").yellow())
    return 0
  }
  data.putInt(DZ_STARTER_VILLAGE_STATE, 1)
  let found = dzStarterFindCampSite(server, forcedSite, player)
  if (!found) {
    data.putInt(DZ_STARTER_VILLAGE_STATE, 0)
    player.persistentData.remove("dz_starter_depart_requested")
    player.tell(Text.of("[PDZ] 条件を満たす生存者集落を発見できませんでした。安全のためロビーに留まります。").red())
    player.tell(Text.of("[ 初期村の探索を再試行 ]").gold().bold().clickRunCommand("/deadzonevillage retry"))
    player.tell(Text.of("[PDZ] 管理者は村付近で /deadzonevillage generate_here を使用できます。").red())
    console.error("[PDZ][Starter Colony] no safe camp site beside native village")
    return 0
  }
  let site = found.site, village = found.village
  let minX = site.x - 32, minZ = site.z - 32, maxX = site.x + 64, maxZ = site.z + 64
  server.runCommandSilent("execute in minecraft:overworld run forceload add " + minX + " " + minZ + " " + maxX + " " + maxZ)
  let command = "execute in minecraft:overworld positioned " + site.x + " " + site.y + " " + site.z + " run function project_deadzone:building_edit/load_survivor_camp_active"
  // A mcfunction returns the result of its final command. The camp loader used
  // to end in `tellraw @s`, which correctly returned 0 for a server source even
  // after the template and core were placed. Never trust that command result as
  // the placement verdict; inspect the actual camp core instead.
  let functionResult = server.runCommandSilent(command)
  let coreReady = dzStarterCampCoreAt(server, site)
  if (!coreReady) {
    data.putInt(DZ_STARTER_VILLAGE_STATE, 0)
    player.persistentData.remove("dz_starter_depart_requested")
    server.runCommandSilent("execute in minecraft:overworld run forceload remove " + minX + " " + minZ + " " + maxX + " " + maxZ)
    player.tell(Text.of("[PDZ] 復興キャンプの配置に失敗しました。ロビーから移動していません。").red())
    console.error("[PDZ][Starter Colony] camp core missing after loader: result=" + functionResult +
      " site=" + site.x + " " + site.y + " " + site.z)
    player.tell(Text.of("[ 初期村の探索を再試行 ]").gold().bold().clickRunCommand("/deadzonevillage retry"))
    return 0
  }
  dzStarterStore(server, site, village)
  data.putInt(DZ_STARTER_VILLAGE_STATE, 2)
  let ready = dzStarterReadiness(player, false)
  if (!ready.camp || !ready.population || !ready.kit) {
    player.persistentData.remove("dz_starter_depart_requested")
    player.tell(Text.of("[PDZ] 初期コロニーの検証が完了していないため、ロビーに留まります。").red())
    player.tell(Text.of("キャンプ=" + ready.camp + " / 住民と護衛=" + ready.population + " / スターターキット=" + ready.kit).yellow())
    player.tell(Text.of("[ 再検証する ]").gold().bold().clickRunCommand("/deadzonevillage depart"))
    console.error("[PDZ][Starter Colony] readiness failed camp=" + ready.camp + " population=" + ready.population + " kit=" + ready.kit)
    server.scheduleInTicks(80, callback => server.runCommandSilent("execute in minecraft:overworld run forceload remove " + minX + " " + minZ + " " + maxX + " " + maxZ))
    return 0
  }
  let bounds = village.bounds || {}
  console.info("[PDZ][Starter Colony] structure=" + village.structure +
    " bounds=" + bounds.minX + "," + bounds.minZ + ".." + bounds.maxX + "," + bounds.maxZ +
    " native village=" + village.x + "," + village.y + "," + village.z +
    " camp=" + site.x + "," + site.y + "," + site.z + " loaderResult=" + functionResult)
  server.scheduleInTicks(80, callback => server.runCommandSilent("execute in minecraft:overworld run forceload remove " + minX + " " + minZ + " " + maxX + " " + maxZ))
  return dzStarterTeleport(player)
}

function dzStarterDepart(player) {
  if (!player.persistentData.getBoolean("dz_job_chosen")) {
    player.tell(Text.of("[PDZ] 先に登録受付官アオイへ話しかけ、初期JOBを選択してください。").red())
    return 0
  }
  if (!dzStarterKitReady(player)) {
    player.runCommandSilent("deadzonejob starter_claim")
    if (!player.persistentData.getBoolean("dz_starter_received")) {
      player.tell(Text.of("[PDZ] スターターキット支給を確認できないため出発を中止しました。").red())
      return 0
    }
  }
  if (!dzStarterIsLobby(player)) {
    player.tell(Text.of("[PDZ] 初回出発はロビーからのみ実行できます。").yellow())
    return 0
  }
  let data = player.server.persistentData
  if (data.getInt(DZ_STARTER_VILLAGE_STATE) === 2 && data.getInt("dz_starter_village_layout_version") !== DZ_STARTER_VILLAGE_VERSION) {
    console.warn("[PDZ][Starter Colony] obsolete v1 village state ignored")
    data.putInt(DZ_STARTER_VILLAGE_STATE, 0)
  }
  let state = data.getInt(DZ_STARTER_VILLAGE_STATE)
  player.persistentData.putBoolean("dz_starter_depart_requested", true)
  player.runCommandSilent("effect give @s minecraft:resistance 120 255 true")
  if (state === 2) {
    let ready = dzStarterReadiness(player, false)
    if (!ready.camp || !ready.population || !ready.kit) {
      player.persistentData.remove("dz_starter_depart_requested")
      player.tell(Text.of("[PDZ] 初期コロニーが未完成です。安全のためロビーから出発しません。").red())
      player.tell(Text.of("キャンプ=" + ready.camp + " / 住民と護衛=" + ready.population + " / スターターキット=" + ready.kit).yellow())
      return 0
    }
    return dzStarterTeleport(player)
  }
  if (state === 1) { player.tell(Text.of("[PDZ] 復興コロニーを準備中です。少しお待ちください。").aqua()); return 0 }
  if (state === 3) {
    data.putInt(DZ_STARTER_VILLAGE_STATE, 0)
    player.tell(Text.of("[PDZ] 前回の生成失敗状態を解除しました。再試行します。").yellow())
    return dzStarterGenerate(player, null)
  }
  player.tell(Text.of("[PDZ] MOD村を確認し、隣接地へ復興キャンプを展開しています…").aqua())
  return dzStarterGenerate(player, null)
}

ServerEvents.commandRegistry(event => {
  const {commands:Commands} = event
  let root = Commands.literal("deadzonevillage")
  root.then(Commands.literal("status").executes(ctx => {
    let p=ctx.source.player,d=p.server.persistentData
    p.tell(Text.of("=== PDZ 初期コロニー状態 ===").gold())
    p.tell(Text.of("状態: " + d.getInt(DZ_STARTER_VILLAGE_STATE) + " / layout v" + d.getInt("dz_starter_village_layout_version")).gray())
    p.tell(Text.of("生成方式: " + d.getString("dz_starter_village_source")).aqua())
    p.tell(Text.of("対象村: " + d.getString("dz_starter_native_village_structure")).aqua())
    p.tell(Text.of("勢力: 友好・民間防衛隊 / 経済: 復興ハブ").green())
    return 1
  }))
  root.then(Commands.literal("depart").executes(ctx => dzStarterDepart(ctx.source.player)))
  root.then(Commands.literal("retry").executes(ctx => {
    let p=ctx.source.player,d=p.server.persistentData
    d.putInt(DZ_STARTER_VILLAGE_STATE,0)
    d.putInt("dz_starter_village_layout_version",0)
    return dzStarterDepart(p)
  }))
  root.then(Commands.literal("teleport").requires(s=>s.hasPermission(2)).executes(ctx => dzStarterTeleport(ctx.source.player)))
  root.then(Commands.literal("generate_here").requires(s=>s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player,level=dzStarterOverworld(p.server),village=dzStarterFindNativeVillage(level,p)
    if (!village) {
      p.tell(Text.of("[PDZ] 実在する村を確認できないため、キャンプだけの強制生成を中止しました。").red())
      return 0
    }
    p.server.persistentData.putInt(DZ_STARTER_VILLAGE_STATE,0)
    return dzStarterGenerate(p,{site:{x:Math.floor(p.x),y:Math.floor(p.y)-1,z:Math.floor(p.z)},village:village})
  }))
  root.then(Commands.literal("reset").requires(s=>s.hasPermission(2)).executes(ctx => {
    let d=ctx.source.server.persistentData
    d.putInt(DZ_STARTER_VILLAGE_STATE,0); d.putInt("dz_starter_village_layout_version",0)
    ctx.source.player.tell(Text.of("[PDZ] 初期コロニーの管理状態をリセットしました。既存ブロックは削除しません。").yellow())
    return 1
  }))
  event.register(root)
})
