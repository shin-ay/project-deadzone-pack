// PROJECT DEADZONE verified initial settlement bootstrap v0.4
// Stable onboarding: generate the original EasyNPC camp once after a player
// has selected a JOB. This is separate from each player's MineColonies camp.

const DZ_CAMP_STATE_KEY = "dz_auto_basecamp_state"
const DZ_CAMP_DIRECT_AUTO_ENABLED = true
const DZ_CAMP_LAYOUT_VERSION = 3
// Lobby briefing and JOB selection must not consume the whole generation
// window. Ten in-game days is still conservative enough to avoid mutating an
// established server while making a deliberate first departure reliable.
const DZ_CAMP_FRESH_LIMIT = 240000
const DZ_CAMP_ARRIVAL_X = 13
const DZ_CAMP_ARRIVAL_Y = 2
const DZ_CAMP_ARRIVAL_Z = 20
const DZ_CAMP_LOSTCITIES = Java.loadClass("mcjty.lostcities.LostCities")
const DZ_CAMP_HEIGHTMAP = Java.loadClass("net.minecraft.world.level.levelgen.Heightmap$Types")
const DZ_CAMP_SEARCH_RADII = [256, 384, 512, 640, 768, 1024, 1280]
const DZ_CAMP_DIRECTIONS = [
  [1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]
]
const DZ_CAMP_BAD_SURFACE_HINTS = [
  "water","lava","leaves","log","wood","planks","brick","concrete",
  "glass","road","asphalt","roof","metal","slab","stairs","fence"
]

function dzCampDimension(player) {
  try {
    return String(player.level.dimension)
  } catch (error) {
    return ""
  }
}

function dzCampIsOverworld(player) {
  return dzCampDimension(player).indexOf("minecraft:overworld") >= 0
}

function dzCampWorldAge(player) {
  try {
    let methodValue = Number(player.level.getGameTime())
    if (Number.isFinite(methodValue)) return methodValue
  } catch (error) {
    // Some KubeJS Level wrappers do not expose the Java getter.
  }
  try {
    let propertyValue = Number(player.level.gameTime)
    if (Number.isFinite(propertyValue)) return propertyValue
  } catch (error) {
    // Fall through to the vanilla command query.
  }
  try {
    let commandValue = Number(player.server.runCommandSilent("time query gametime"))
    if (Number.isFinite(commandValue)) return commandValue
  } catch (error) {
    console.error(
      "[PROJECT DEADZONE][Camp Auto] failed to query gameTime: " + error
    )
  }
  return NaN
}

function dzCampLostInfo(player) {
  try {
    return DZ_CAMP_LOSTCITIES.lostCitiesImp.getLostInfo(player.level)
  } catch (error) {
    console.error("[PROJECT DEADZONE][Camp Auto] Lost Cities API failed: " + error)
    return null
  }
}

function dzCampCityFree(info, x, z, radius) {
  if (!info) return false
  let cx=Math.floor(x/16), cz=Math.floor(z/16)
  for (let dx=-radius; dx<=radius; dx++) {
    for (let dz=-radius; dz<=radius; dz++) {
      try {
        if (info.getChunkInfo(cx+dx,cz+dz).isCity()) return false
      } catch (error) { return false }
    }
  }
  return true
}

function dzCampSurfaceY(player,x,z) {
  try {
    let blockX=Number(x), blockZ=Number(z)
    if (!Number.isFinite(blockX) || !Number.isFinite(blockZ)) return NaN
    blockX=Math.floor(blockX); blockZ=Math.floor(blockZ)
    // Heightmaps return the dimension minimum for an ungenerated chunk.
    // Force this candidate chunk to generate before asking for its surface.
    player.level.getChunk(Math.floor(blockX/16),Math.floor(blockZ/16))
    let y=Number(player.level.getHeight(
      DZ_CAMP_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES,blockX,blockZ))
    if (!Number.isFinite(y) || y<16 || y>300) return NaN
    return y
  } catch (error) {
    console.error("[PROJECT DEADZONE][Camp Auto] height query failed: " + error)
    return NaN
  }
}

function dzCampTerrainCandidate(player,x,z) {
  let samples=[
    [0,0],[-13,-20],[18,-20],[-13,11],[18,11],
    [-13,-4],[18,-4],[2,-20],[2,11]
  ]
  let minY=999, maxY=-999, total=0
  for (let i=0;i<samples.length;i++) {
    let sx=x+samples[i][0], sz=z+samples[i][1]
    try {
      if (!player.level.hasChunk(Math.floor(sx/16),Math.floor(sz/16))) {
        return null
      }
    } catch (error) {
      return null
    }
    let y=dzCampSurfaceY(player,sx,sz)
    if (!Number.isFinite(y)) return null
    let feet=String(player.level.getBlock(sx,y,sz).id)
    let head=String(player.level.getBlock(sx,y+1,sz).id)
    if (feet!=="minecraft:air" || head!=="minecraft:air") return null
    let ground=String(player.level.getBlock(sx,y-1,sz).id)
    for (let h=0;h<DZ_CAMP_BAD_SURFACE_HINTS.length;h++) {
      if (ground.indexOf(DZ_CAMP_BAD_SURFACE_HINTS[h])>=0) return null
    }
    minY=Math.min(minY,y); maxY=Math.max(maxY,y); total+=y
  }
  if (maxY-minY>8) return null
  return {x:x,y:Math.round(total/samples.length),z:z}
}

// Startup must not generate distant Lost Cities chunks. Only inspect the
// spawn-area chunks the client/server have already prepared.
function dzCampFindLoadedSpawnSite(player) {
  let info=dzCampLostInfo(player)
  let baseX=Math.floor(player.x/16)*16+8
  let baseZ=Math.floor(player.z/16)*16+8
  let offsets=[
    [0,0],[32,0],[-32,0],[0,32],[0,-32],
    [32,32],[32,-32],[-32,32],[-32,-32]
  ]

  // Prefer a compact non-city buffer.
  for (let i=0;i<offsets.length;i++) {
    let x=baseX+offsets[i][0], z=baseZ+offsets[i][1]
    if (!dzCampCityFree(info,x,z,1)) continue
    let site=dzCampTerrainCandidate(player,x,z)
    if (site) return site
  }
  // If the spawn region is close to a city edge, keep startup responsive and
  // use any valid nearby terrain rather than generating a remote region.
  for (let i=0;i<offsets.length;i++) {
    let site=dzCampTerrainCandidate(
      player,baseX+offsets[i][0],baseZ+offsets[i][1])
    if (site) {
      console.warn("[PROJECT DEADZONE][Camp Auto] using loaded spawn fallback")
      return site
    }
  }

  // Guaranteed last resort: the vanilla player spawn itself is already a
  // loaded, survivable surface. The camp foundation can absorb moderate
  // slopes, so do not reject the entire bootstrap only because the 32x32
  // footprint is mountainous.
  let fallbackX=Math.floor(player.x)
  let fallbackZ=Math.floor(player.z)
  let fallbackY=dzCampSurfaceY(player,fallbackX,fallbackZ)
  if (Number.isFinite(fallbackY)) {
    let feet=String(player.level.getBlock(fallbackX,fallbackY,fallbackZ).id)
    let below=String(player.level.getBlock(fallbackX,fallbackY-1,fallbackZ).id)
    let fluid=feet.indexOf("water")>=0 || feet.indexOf("lava")>=0 ||
      below.indexOf("water")>=0 || below.indexOf("lava")>=0
    if (!fluid) {
      console.warn(
        "[PROJECT DEADZONE][Camp Auto] using guaranteed spawn-surface fallback")
      return {x:fallbackX,y:fallbackY,z:fallbackZ}
    }
  }
  return null
}

function dzCampVanillaSurfaceSite(player,x,z) {
  let server=player.server
  server.runCommandSilent("kill @e[type=minecraft:marker,tag=dz_camp_site_probe]")
  server.runCommandSilent("forceload add "+x+" "+z)
  server.runCommandSilent(
    "summon minecraft:marker "+x+" 320 "+z+" {Tags:[\"dz_camp_site_probe\"]}")
  let spread=server.runCommandSilent(
    "spreadplayers "+x+" "+z+" 0 4 false @e[type=minecraft:marker,tag=dz_camp_site_probe,limit=1]")
  if (spread<=0) {
    server.runCommandSilent("kill @e[type=minecraft:marker,tag=dz_camp_site_probe]")
    server.runCommandSilent("forceload remove "+x+" "+z)
    return null
  }
  let probe=null
  player.level.entities.forEach(entity => {
    if (!probe && entity.tags.contains("dz_camp_site_probe")) probe=entity
  })
  if (!probe) {
    server.runCommandSilent("forceload remove "+x+" "+z)
    return null
  }
  let site={x:Math.floor(probe.x),y:Math.floor(probe.y),z:Math.floor(probe.z)}
  probe.kill()
  // spreadplayers already selects a safe top surface. Checking all nine
  // footprint samples here forced Lost Cities to generate up to nine chunks
  // synchronously and froze the integrated server. Keep the center fluid
  // guard; the foundation is placed one block above this selected surface.
  let atFeet=String(player.level.getBlock(site.x,site.y,site.z).id)
  let below=String(player.level.getBlock(site.x,site.y-1,site.z).id)
  let wet=atFeet.indexOf("water")>=0 || atFeet.indexOf("lava")>=0 ||
    below.indexOf("water")>=0 || below.indexOf("lava")>=0
  server.runCommandSilent("forceload remove "+x+" "+z)
  if (site.y<16 || site.y>300 || wet) return null
  return site
}

function dzCampFindSafeSite(player) {
  let info=dzCampLostInfo(player)
  if (!info) return null
  let baseX=Math.floor(player.x), baseZ=Math.floor(player.z)
  let cityClearCount=0
  for (let r=0;r<DZ_CAMP_SEARCH_RADII.length;r++) {
    let radius=DZ_CAMP_SEARCH_RADII[r]
    for (let d=0;d<DZ_CAMP_DIRECTIONS.length;d++) {
      let dir=DZ_CAMP_DIRECTIONS[d]
      let scale=Math.max(Math.abs(dir[0]),Math.abs(dir[1]))
      let x=Math.floor((baseX+radius*dir[0]/scale)/16)*16+8
      let z=Math.floor((baseZ+radius*dir[1]/scale)/16)*16+8
      // Two non-city chunks around the whole 32x32 footprint leave a practical
      // buffer from Lost Cities buildings without making ChaosZ searches fail.
      if (!dzCampCityFree(info,x,z,2)) continue
      cityClearCount++
      let site=dzCampVanillaSurfaceSite(player,x,z)
      if (site) return site
    }
  }
  // Dense ChaosZ seeds may not have a 5x5 non-city area. Fall back to a 3x3
  // non-city area, still far from the initial spawn and never in a city chunk.
  for (let r=0;r<DZ_CAMP_SEARCH_RADII.length;r++) {
    let radius=DZ_CAMP_SEARCH_RADII[r]
    for (let d=0;d<DZ_CAMP_DIRECTIONS.length;d++) {
      let dir=DZ_CAMP_DIRECTIONS[d]
      let scale=Math.max(Math.abs(dir[0]),Math.abs(dir[1]))
      let x=Math.floor((baseX+radius*dir[0]/scale)/16)*16+8
      let z=Math.floor((baseZ+radius*dir[1]/scale)/16)*16+8
      if (!dzCampCityFree(info,x,z,1)) continue
      cityClearCount++
      let site=dzCampVanillaSurfaceSite(player,x,z)
      if (site) {
        console.info("[PROJECT DEADZONE][Camp Auto] using compact city buffer")
        return site
      }
    }
  }
  console.warn("[PROJECT DEADZONE][Camp Auto] no terrain site; city-clear candidates="+
    cityClearCount)
  return null
}

function dzCampGenerateAtSite(player, site, automatic) {
  let server = player.server
  let data = server.persistentData
  let originX = Math.floor(site.x) - DZ_CAMP_ARRIVAL_X
  // Keep the structure foundation above the selected terrain surface.
  let originY = Math.floor(site.y) - DZ_CAMP_ARRIVAL_Y + 1
  let originZ = Math.floor(site.z) - DZ_CAMP_ARRIVAL_Z

  data.putInt(DZ_CAMP_STATE_KEY, 1)

  let endX=originX+31, endZ=originZ+31
  let placed = player.runCommandSilent(
    "execute in minecraft:overworld positioned " +
    originX + " " + originY + " " + originZ +
    " run place template project_deadzone:deadzone_survivor_camp_edit ~ ~ ~"
  )
  let activated=0
  if (placed>0) {
    activated=player.runCommandSilent(
      "execute in minecraft:overworld positioned " +
      originX + " " + originY + " " + originZ +
      " run function project_deadzone:basecamp/activate"
    )
  }
  server.runCommandSilent(
    "execute in minecraft:overworld run forceload remove "+
    originX+" "+originZ+" "+endX+" "+endZ)
  console.info("[PROJECT DEADZONE][Camp Auto] place="+placed+
    ", activate="+activated+", origin="+originX+" "+originY+" "+originZ)

  // `/function` may return 0 even when every command in the function ran
  // successfully (for example when its final selector has no recipients).
  // The template placement is the authoritative generation result; treating
  // the function return value as a hard failure leaves a valid camp in the
  // world but skips saving its origin and teleporting the player.
  if (placed > 0) {
    if (activated <= 0) {
      console.warn("[PROJECT DEADZONE][Camp Auto] activation returned 0; " +
        "continuing because the camp template was placed successfully")
    }
    data.putInt(DZ_CAMP_STATE_KEY, 2)
    data.putInt("dz_auto_basecamp_layout_version",DZ_CAMP_LAYOUT_VERSION)
    data.putInt("dz_auto_basecamp_origin_x", originX)
    data.putInt("dz_auto_basecamp_origin_y", originY)
    data.putInt("dz_auto_basecamp_origin_z", originZ)
    data.putString("dz_auto_basecamp_owner", String(player.uuid))
    player.persistentData.putBoolean("dz_starter_depart_complete", true)
    player.persistentData.remove("dz_starter_depart_requested")
    player.teleportTo(site.x+0.5,site.y+1,site.z+0.5)
    player.runCommandSilent("effect clear @s minecraft:blindness")
    player.runCommandSilent("effect clear @s minecraft:resistance")
    player.runCommandSilent("title @s times 10 70 30")
    player.runCommandSilent(
      'title @s subtitle {"text":"DAY 1 — 生存者拠点","color":"gray"}')
    player.runCommandSilent(
      'title @s title {"text":"SURVIVOR CAMP","color":"gold","bold":true}')
    player.tell(Text.of(
      automatic
        ? "[PROJECT DEADZONE] 初期スポーン地点にSurvivor Campを展開しました。"
        : "[PROJECT DEADZONE] 現在地を到着地点としてSurvivor Campを展開しました。"
    ).green())
    return 1
  }

  data.putInt(DZ_CAMP_STATE_KEY, 0)
  player.persistentData.remove("dz_starter_depart_requested")
  player.runCommandSilent("effect clear @s minecraft:blindness")
  player.runCommandSilent("effect clear @s minecraft:resistance")
  player.tell(Text.of(
    "[PROJECT DEADZONE] Survivor Campの生成に失敗しました。latest.logを確認してください。"
  ).red())
  return 0
}

// A single ranged forceload made Lost Cities generate the whole footprint in
// one server tick. Prepare one chunk per tick to avoid multi-minute freezes.
function dzCampLoadSiteThenGenerate(player, site, automatic) {
  let server=player.server
  let originX=Math.floor(site.x)-DZ_CAMP_ARRIVAL_X
  let originZ=Math.floor(site.z)-DZ_CAMP_ARRIVAL_Z
  let minCX=Math.floor(originX/16)
  let maxCX=Math.floor((originX+31)/16)
  let minCZ=Math.floor(originZ/16)
  let maxCZ=Math.floor((originZ+31)/16)
  let chunks=[]
  for (let cx=minCX;cx<=maxCX;cx++) {
    for (let cz=minCZ;cz<=maxCZ;cz++) chunks.push([cx,cz])
  }

  let index=0
  function loadNext() {
    if (index>=chunks.length) {
      dzCampGenerateAtSite(player,site,automatic)
      return
    }
    let chunk=chunks[index++]
    let prologue=[
      "崩壊から72時間。通信網は沈黙した。",
      "残された周波数が、生存者の存在を告げている。",
      "物資は少ない。だが、まだ終わってはいない。",
      "あなたの役割が、ここからの生存率を変える。"
    ]
    let scene=Math.min(prologue.length-1,
      Math.floor((index-1)*prologue.length/chunks.length))
    player.runCommandSilent(
      'title @s subtitle {"text":"'+prologue[scene]+'","color":"gray"}')
    player.runCommandSilent(
      'title @s title {"text":"PROJECT DEADZONE","color":"gold","bold":true}')
    server.runCommandSilent(
      "execute in minecraft:overworld run forceload add "+
      (chunk[0]*16)+" "+(chunk[1]*16))
    console.info("[PROJECT DEADZONE][Camp Auto] prepared chunk "+
      index+"/"+chunks.length+": "+chunk[0]+" "+chunk[1])
    server.scheduleInTicks(2,loadNext)
  }
  loadNext()
}

function dzCampGenerateAtPlayer(player, automatic) {
  return dzCampGenerateAtSite(player,{
    x:Math.floor(player.x),y:Math.floor(player.y),z:Math.floor(player.z)
  },automatic)
}

function dzCampStartBootstrap(player) {
  let server = player.server
  let data = server.persistentData

  let existingState=data.getInt(DZ_CAMP_STATE_KEY)
  if (existingState===2 && (
      data.getInt("dz_auto_basecamp_origin_y")<0 ||
      data.getInt("dz_auto_basecamp_layout_version")<DZ_CAMP_LAYOUT_VERSION)) {
    // Recover worlds created by the old unloaded-height or unloaded-template bugs.
    data.putInt(DZ_CAMP_STATE_KEY,0)
    server.runCommandSilent("kill @e[tag=dz_basecamp_staff]")
    server.runCommandSilent("kill @e[tag=dz_basecamp_guard]")
    server.runCommandSilent("kill @e[tag=dz_basecamp_raid_anchor]")
    let recoveryY=dzCampSurfaceY(player,Math.floor(player.x),Math.floor(player.z))
    if (Number.isFinite(recoveryY)) {
      player.teleportTo(Math.floor(player.x)+0.5,recoveryY+1,Math.floor(player.z)+0.5)
    }
    player.tell(Text.of(
      "[PROJECT DEADZONE] 旧キャンプの不完全な配置を無効化し、安全な再配置を試行します。"
    ).yellow())
  } else if (existingState!==0) {
    return
  }
  let dimension = dzCampDimension(player)
  if (!dzCampIsOverworld(player)) {
    console.info(
      "[PROJECT DEADZONE][Camp Auto] skipped: dimension=" + dimension
    )
    return
  }

  let worldAge = dzCampWorldAge(player)
  console.info(
    "[PROJECT DEADZONE][Camp Auto] first-login check: dimension=" +
    dimension + ", gameTime=" + worldAge
  )
  if (!Number.isFinite(worldAge) || worldAge > DZ_CAMP_FRESH_LIMIT) {
    // Never place a 32x20x32 structure automatically into an established world.
    data.putInt(DZ_CAMP_STATE_KEY, 3)
    console.info(
      "[PROJECT DEADZONE][Camp Auto] skipped established world: gameTime=" + worldAge
    )
    player.persistentData.remove("dz_starter_depart_requested")
    player.runCommandSilent("effect clear @s minecraft:blindness")
    player.runCommandSilent("effect clear @s minecraft:resistance")
    player.tell(Text.of(
      "[PROJECT DEADZONE] このワールドは既に進行しているため、初期拠点の自動配置を中止しました。管理者へ連絡してください。"
    ).red())
    return
  }

  // Claim the one-time bootstrap before scheduling so simultaneous joins cannot duplicate it.
  data.putInt(DZ_CAMP_STATE_KEY, 1)
  let loadedSiteAttempts=0
  function bootstrapCamp() {
    if (!player || !player.alive || !dzCampIsOverworld(player)) {
      data.putInt(DZ_CAMP_STATE_KEY, 0)
      return
    }
    if (!player.persistentData.getBoolean("dz_job_chosen")) {
      server.scheduleInTicks(20,bootstrapCamp)
      return
    }
    player.runCommandSilent("effect give @s minecraft:blindness 180 0 true")
    player.runCommandSilent("effect give @s minecraft:resistance 180 255 true")
    player.runCommandSilent("title @s times 20 100 20")
    player.runCommandSilent(
      'title @s subtitle {"text":"PROLOGUE — 最後の周波数","color":"gray"}')
    player.runCommandSilent(
      'title @s title {"text":"PROJECT DEADZONE","color":"gold","bold":true}')
    let site=dzCampFindLoadedSpawnSite(player)
    if (!site) {
      loadedSiteAttempts++
      if (loadedSiteAttempts<15) {
        player.runCommandSilent(
          'title @s subtitle {"text":"周辺地形を確認中……","color":"gray"}')
        player.runCommandSilent(
          'title @s title {"text":"PROJECT DEADZONE","color":"gold","bold":true}')
        server.scheduleInTicks(20,bootstrapCamp)
        return
      }
      data.putInt(DZ_CAMP_STATE_KEY,0)
      player.runCommandSilent("effect clear @s minecraft:blindness")
      player.runCommandSilent("effect clear @s minecraft:resistance")
      player.tell(Text.of(
        "[PROJECT DEADZONE] 市街地から離れた安全なキャンプ候補地を発見できませんでした。"
      ).red())
      return
    }
    console.info("[PROJECT DEADZONE][Camp Auto] safe site: "+
      site.x+" "+site.y+" "+site.z)
    dzCampGenerateAtSite(player,site,true)
  }
  server.scheduleInTicks(1,bootstrapCamp)
  return true
}

// The lobby flow is retired. Probe once per second and let the first player
// who has completed JOB selection start the one-time world camp bootstrap.
PlayerEvents.tick(event => {
  if (!DZ_CAMP_DIRECT_AUTO_ENABLED) return
  let player=event.player
  if (!player || !player.alive) return
  let probe=player.persistentData.getInt("dz_camp_entry_probe")+1
  if (probe<20) {
    player.persistentData.putInt("dz_camp_entry_probe",probe)
    return
  }
  player.persistentData.putInt("dz_camp_entry_probe",0)
  if (!dzCampIsOverworld(player)) return
  if (!player.persistentData.getBoolean("dz_job_chosen")) return
  if (player.server.persistentData.getInt(DZ_CAMP_STATE_KEY)!==0) return
  dzCampStartBootstrap(player)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonecampauto")

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let data = player.server.persistentData
    let state = data.getInt(DZ_CAMP_STATE_KEY)
    let labels = ["未処理", "生成待機中", "生成済み", "既存ワールドのため自動生成を見送り"]
    player.tell(Text.of(
      "[PROJECT DEADZONE] Camp Auto: " + (labels[state] || ("不明(" + state + ")"))
    ).aqua())
    if (state === 2) {
      player.tell(Text.of(
        "Origin: " +
        data.getInt("dz_auto_basecamp_origin_x") + " " +
        data.getInt("dz_auto_basecamp_origin_y") + " " +
        data.getInt("dz_auto_basecamp_origin_z")
      ).gray())
    }
    return 1
  }))

  root.then(Commands.literal("generate_here")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player = ctx.source.player
      if (player.server.persistentData.getInt(DZ_CAMP_STATE_KEY) === 2) {
        player.tell(Text.of(
          "[PROJECT DEADZONE] このワールドではキャンプが生成済みです。"
        ).yellow())
        return 0
      }
      return dzCampGenerateAtPlayer(player, false)
    }))

  // Recover a camp whose template was placed but whose `/function` return
  // value was reported as 0. Run while standing on the intended arrival spot;
  // this only activates/adopts the existing structure and never places a
  // second copy over it.
  root.then(Commands.literal("recover_here")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player=ctx.source.player
      let server=player.server
      let data=server.persistentData
      let siteX=Math.floor(player.x)
      let siteY=Math.floor(player.y)-1
      let siteZ=Math.floor(player.z)
      let originX=siteX-DZ_CAMP_ARRIVAL_X
      let originY=siteY-DZ_CAMP_ARRIVAL_Y+1
      let originZ=siteZ-DZ_CAMP_ARRIVAL_Z
      let activated=player.runCommandSilent(
        "execute in minecraft:overworld positioned "+originX+" "+originY+" "+originZ+
        " run function project_deadzone:basecamp/activate")

      data.putInt(DZ_CAMP_STATE_KEY,2)
      data.putInt("dz_auto_basecamp_layout_version",DZ_CAMP_LAYOUT_VERSION)
      data.putInt("dz_auto_basecamp_origin_x",originX)
      data.putInt("dz_auto_basecamp_origin_y",originY)
      data.putInt("dz_auto_basecamp_origin_z",originZ)
      data.putString("dz_auto_basecamp_owner",String(player.uuid))
      player.runCommandSilent("effect clear @s minecraft:blindness")
      player.runCommandSilent("effect clear @s minecraft:resistance")
      player.tell(Text.of(
        "[PROJECT DEADZONE] Existing Survivor Camp was activated and adopted."
      ).green())
      console.info("[PROJECT DEADZONE][Camp Auto] recovered existing camp: activate="+
        activated+", origin="+originX+" "+originY+" "+originZ)
      return 1
    }))

  // Re-run only the activation phase at the origin saved by auto generation.
  // This repairs worlds where the template was placed while activate.mcfunction
  // was unavailable, without placing a second camp over the existing one.
  root.then(Commands.literal("repair_npcs")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player=ctx.source.player
      let server=player.server
      let data=server.persistentData
      let originX=data.getInt("dz_auto_basecamp_origin_x")
      let originY=data.getInt("dz_auto_basecamp_origin_y")
      let originZ=data.getInt("dz_auto_basecamp_origin_z")
      let endX=originX+31
      let endZ=originZ+31

      server.runCommandSilent("execute in minecraft:overworld run forceload add "+
        originX+" "+originZ+" "+endX+" "+endZ)
      let activated=player.runCommandSilent(
        "execute in minecraft:overworld positioned "+originX+" "+originY+" "+originZ+
        " run function project_deadzone:basecamp/activate")
      server.runCommandSilent("execute in minecraft:overworld run forceload remove "+
        originX+" "+originZ+" "+endX+" "+endZ)

      player.tell(Text.of(
        "[PROJECT DEADZONE] Camp NPC activation was re-run at saved origin: "+
        originX+" "+originY+" "+originZ
      ).green())
      console.info("[PROJECT DEADZONE][Camp Auto] repaired camp NPCs: activate="+
        activated+", origin="+originX+" "+originY+" "+originZ)
      return 1
    }))

  root.then(Commands.literal("reset_flag")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player = ctx.source.player
      player.server.persistentData.putInt(DZ_CAMP_STATE_KEY, 0)
      player.tell(Text.of(
        "[PROJECT DEADZONE] 自動生成フラグだけをリセットしました。建物は削除されません。"
      ).yellow())
      return 1
    }))

  event.register(root)
})
