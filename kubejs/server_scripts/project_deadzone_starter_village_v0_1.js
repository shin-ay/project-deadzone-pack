// PROJECT DEADZONE starter colony controller v2.0
// Village Spawn Point + CTOV/Towns and Towers select and generate the native
// village. PDZ only attaches the proven Survivor Camp template beside it.

const DZ_STARTER_VILLAGE_STATE = "dz_starter_village_state"
const DZ_STARTER_VILLAGE_VERSION = 2
const DZ_STARTER_HEIGHTMAP = Java.loadClass("net.minecraft.world.level.levelgen.Heightmap$Types")

function dzStarterIsLobby(player) {
  try { return String(player.level.dimension).indexOf("lobby:lobby_dimension") >= 0 }
  catch (ignored) { return false }
}

function dzStarterOverworld(server) {
  try { let level = server.getLevel("minecraft:overworld"); if (level) return level } catch (ignored) {}
  try { return server.overworld() } catch (ignored) {}
  return null
}

function dzStarterSpawn(level) {
  try {
    let pos = level.getSharedSpawnPos()
    return {x:Number(pos.getX()), y:Number(pos.getY()), z:Number(pos.getZ())}
  } catch (ignored) {}
  return {x:0, y:80, z:0}
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
function dzStarterCampSite(level, centerX, centerZ) {
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
  if (maxY - minY > 5) return null
  ys.sort((a,b) => a-b)
  return {x:originX, y:Math.floor(ys[Math.floor(ys.length / 2)]), z:originZ}
}

function dzStarterFindCampSite(server, forcedSite) {
  if (forcedSite) return forcedSite
  let level = dzStarterOverworld(server)
  if (!level) return null
  let village = dzStarterSpawn(level)
  let radii = [48, 64, 80, 96, 112]
  let dirs = [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]]
  for (let r = 0; r < radii.length; r++) {
    for (let d = 0; d < dirs.length; d++) {
      let site = dzStarterCampSite(level, village.x + dirs[d][0] * radii[r], village.z + dirs[d][1] * radii[r])
      if (site) return {site:site, village:village}
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
  data.putString("dz_starter_village_dimension", "minecraft:overworld")
  data.putString("dz_starter_village_id", "restoration_colony_01")
  data.putString("dz_starter_village_source", "mod_village_plus_survivor_camp")
  data.putString("dz_starter_village_faction", "civil_defense")
  data.putString("dz_starter_village_relation", "friendly")
  data.putString("dz_starter_village_economy", "restoration_hub")
  data.putInt("dz_starter_village_layout_version", DZ_STARTER_VILLAGE_VERSION)
  // The camp activation function owns staff placement. Disable the obsolete
  // old-village door scanner so it cannot create duplicates.
  data.putInt("dz_starter_village_staff_version", 2)
  try {
    if (global.pdzRegisterStarterColony) global.pdzRegisterStarterColony(server, site, village)
  } catch (error) {
    console.error("[PDZ][Starter Colony] settlement registration failed: " + error)
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
  let found = dzStarterFindCampSite(server, forcedSite)
  if (!found) {
    data.putInt(DZ_STARTER_VILLAGE_STATE, 3)
    player.persistentData.remove("dz_starter_depart_requested")
    player.tell(Text.of("[PDZ] MOD村の近くにキャンプ用地を確保できませんでした。管理者は /deadzonevillage generate_here を使用してください。").red())
    console.error("[PDZ][Starter Colony] no safe camp site beside native village")
    return 0
  }
  let site = found.site, village = found.village
  let minX = site.x - 32, minZ = site.z - 32, maxX = site.x + 64, maxZ = site.z + 64
  server.runCommandSilent("execute in minecraft:overworld run forceload add " + minX + " " + minZ + " " + maxX + " " + maxZ)
  let command = "execute in minecraft:overworld positioned " + site.x + " " + site.y + " " + site.z + " run function project_deadzone:building_edit/load_survivor_camp_active"
  let result = server.runCommandSilent(command)
  if (result <= 0) {
    data.putInt(DZ_STARTER_VILLAGE_STATE, 3)
    player.persistentData.remove("dz_starter_depart_requested")
    server.runCommandSilent("execute in minecraft:overworld run forceload remove " + minX + " " + minZ + " " + maxX + " " + maxZ)
    player.tell(Text.of("[PDZ] 復興キャンプの配置に失敗しました。ロビーから移動していません。").red())
    console.error("[PDZ][Starter Colony] camp function failed at " + site.x + " " + site.y + " " + site.z)
    return 0
  }
  dzStarterStore(server, site, village)
  data.putInt(DZ_STARTER_VILLAGE_STATE, 2)
  console.info("[PDZ][Starter Colony] native village=" + village.x + "," + village.y + "," + village.z + " camp=" + site.x + "," + site.y + "," + site.z)
  server.scheduleInTicks(80, callback => server.runCommandSilent("execute in minecraft:overworld run forceload remove " + minX + " " + minZ + " " + maxX + " " + maxZ))
  return dzStarterTeleport(player)
}

function dzStarterDepart(player) {
  if (!player.persistentData.getBoolean("dz_job_chosen")) {
    player.tell(Text.of("[PDZ] 先に登録受付官アオイへ話しかけ、初期JOBを選択してください。").red())
    return 0
  }
  if (!player.persistentData.getBoolean("dz_starter_received")) {
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
  if (state === 2) return dzStarterTeleport(player)
  if (state === 1) { player.tell(Text.of("[PDZ] 復興コロニーを準備中です。少しお待ちください。").aqua()); return 0 }
  if (state === 3) { player.tell(Text.of("[PDZ] 前回の生成に失敗しています。管理者は /deadzonevillage reset を実行してください。").red()); return 0 }
  player.tell(Text.of("[PDZ] MOD村を確認し、隣接地へ復興キャンプを展開しています…").aqua())
  return dzStarterGenerate(player, null)
}

ServerEvents.commandRegistry(event => {
  const {commands:Commands} = event
  let root = Commands.literal("deadzonevillage")
  root.then(Commands.literal("status").executes(ctx => {
    let p=ctx.source.player,d=p.server.persistentData
    p.tell(Text.of("=== PDZ STARTER COLONY ===").gold())
    p.tell(Text.of("状態: " + d.getInt(DZ_STARTER_VILLAGE_STATE) + " / layout v" + d.getInt("dz_starter_village_layout_version")).gray())
    p.tell(Text.of("方式: " + d.getString("dz_starter_village_source")).aqua())
    p.tell(Text.of("勢力: 友好・民間防衛隊 / 経済: 復興ハブ").green())
    return 1
  }))
  root.then(Commands.literal("depart").executes(ctx => dzStarterDepart(ctx.source.player)))
  root.then(Commands.literal("teleport").requires(s=>s.hasPermission(2)).executes(ctx => dzStarterTeleport(ctx.source.player)))
  root.then(Commands.literal("generate_here").requires(s=>s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player,level=dzStarterOverworld(p.server),village=dzStarterSpawn(level)
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
