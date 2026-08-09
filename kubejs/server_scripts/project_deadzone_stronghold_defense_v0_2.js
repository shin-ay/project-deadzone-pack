// PROJECT DEADZONE stronghold defense v0.2
// Easy NPC spawner blocks are physical objectives. Reinforcement state is
// controlled by the stronghold marker so copied structures remain portable.

const DZ_SH_DEFENSE = {
  raider: {
    factionTag:"dz_raider", radius:32, initial:6, cap:6, reserve:8,
    interval:120000, batch:2, loot:"project_deadzone:chests/raider_roadblock"
  },
  remnant: {
    factionTag:"dz_remnant", radius:32, initial:5, cap:5, reserve:6,
    interval:150000, batch:2, loot:"project_deadzone:chests/remnant_relay"
  }
}

function dzSdType(core) {
  let type=core.persistentData.getString("dz_stronghold_type")
  if (type==="remnant") return "remnant"
  return "raider"
}

function dzSdNearestCore(player, distance) {
  let found=null, best=distance*distance
  player.level.entities.forEach(e => {
    if (!e.tags || !e.tags.contains("dz_stronghold_core") || !e.tags.contains("dz_stronghold_active")) return
    let dx=e.x-player.x, dy=e.y-player.y, dz=e.z-player.z, d=dx*dx+dy*dy+dz*dz
    if (d<best) { best=d; found=e }
  })
  return found
}

function dzSdDefenderCount(core, def) {
  let count=0
  core.level.entities.forEach(e => {
    if (!e.tags || !e.tags.contains("dz_stronghold_defender") || !e.tags.contains(def.factionTag)) return
    let dx=e.x-core.x, dy=e.y-core.y, dz=e.z-core.z
    if (dx*dx+dy*dy+dz*dz<=def.radius*def.radius) count++
  })
  return count
}

function dzSdFindSpawnerAndCaches(core, def) {
  let cx=Math.floor(core.x), cy=Math.floor(core.y), cz=Math.floor(core.z)
  let spawner=null, caches=[]
  for (let x=cx-24;x<=cx+24;x++) for (let y=cy-8;y<=cy+8;y++) for (let z=cz-24;z<=cz+24;z++) {
    let id=String(core.level.getBlock(x,y,z).id)
    if (id==="easy_npc:group_spawner" && !spawner) spawner={x:x,y:y,z:z}
    if ((id==="minecraft:chest" || id==="minecraft:trapped_chest" || id==="minecraft:barrel") && caches.length<4)
      caches.push({x:x,y:y,z:z})
  }
  if (spawner) {
    core.persistentData.putInt("dz_sd_x",spawner.x)
    core.persistentData.putInt("dz_sd_y",spawner.y)
    core.persistentData.putInt("dz_sd_z",spawner.z)
    core.persistentData.putBoolean("dz_sd_has_spawner",true)
  } else {
    core.persistentData.putBoolean("dz_sd_has_spawner",false)
    core.persistentData.putBoolean("dz_sd_disabled",true)
  }
  let dimension=String(core.level.dimension)
  caches.forEach(pos => core.server.runCommandSilent(
    "execute in "+dimension+" run data merge block "+pos.x+" "+pos.y+" "+pos.z+
    ' {LootTable:"'+def.loot+'",LootTableSeed:0L}'
  ))
  core.persistentData.putInt("dz_sd_cache_count",caches.length)
}

function dzSdIsAir(block) {
  let id=String(block.id)
  return id==="minecraft:air" || id==="minecraft:cave_air" || id==="minecraft:void_air"
}

// The EasyNPC spawner is an objective/anchor, not the literal spawn square.
// Pick a nearby column with a floor and two blocks of clear standing room so
// defenders do not appear inside a hidden spawner compartment, wall or roof.
function dzSdFindOpenSpawn(core) {
  let sx=core.persistentData.getInt("dz_sd_x")
  let sy=core.persistentData.getInt("dz_sd_y")
  let sz=core.persistentData.getInt("dz_sd_z")
  let candidates=[]
  for (let x=sx-12;x<=sx+12;x++) for (let z=sz-12;z<=sz+12;z++) {
    // Prefer the same floor as the spawner, but allow modest terrain/building variation.
    for (let y=sy-3;y<=sy+5;y++) {
      let floor=core.level.getBlock(x,y-1,z)
      let feet=core.level.getBlock(x,y,z)
      let head=core.level.getBlock(x,y+1,z)
      let floorId=String(floor.id)
      if (dzSdIsAir(floor) || floorId==="easy_npc:group_spawner") continue
      if (!dzSdIsAir(feet) || !dzSdIsAir(head)) continue
      let exits=0
      ;[[1,0],[-1,0],[0,1],[0,-1]].forEach(dir => {
        if (dzSdIsAir(core.level.getBlock(x+dir[0],y,z+dir[1])) &&
            dzSdIsAir(core.level.getBlock(x+dir[0],y+1,z+dir[1]))) exits++
      })
      // Reject one-block shafts and sealed display recesses.
      if (exits<2) continue
      let dx=x-sx, dz=z-sz
      // Do not select the concealed spawner shaft or its immediate edge.
      if (dx*dx+dz*dz<9) continue
      candidates.push({x:x+0.5,y:y,z:z+0.5})
    }
  }
  if (candidates.length>0) return candidates[Math.floor(Math.random()*candidates.length)]
  return {x:sx+0.5,y:sy+1,z:sz+0.5}
}

function dzSdSpawnOne(core, type, role) {
  let def=DZ_SH_DEFENSE[type]
  let spawnPos=dzSdFindOpenSpawn(core)
  let x=spawnPos.x
  let y=spawnPos.y
  let z=spawnPos.z
  let fn
  if (type==="raider") {
    if (role===0) fn="project_deadzone:factions/spawn/raider_scout"
    else if (role===1) fn="project_deadzone:factions/spawn/raider_medic"
    else if (role===2) fn="project_deadzone:factions/spawn/raider_enforcer"
    else fn="project_deadzone:factions/spawn/raider"
  } else {
    if (role===1) fn="project_deadzone:factions/spawn/remnant_medic"
    else if (role===2) fn="project_deadzone:factions/spawn/remnant_officer"
    else fn="project_deadzone:factions/spawn/remnant_soldier"
  }
  let dimension=String(core.level.dimension)
  core.server.runCommandSilent("execute in "+dimension+" positioned "+x+" "+y+" "+z+" run function "+fn)
  core.server.runCommandSilent("execute in "+dimension+" positioned "+x+" "+y+" "+z+
    " run tag @e[tag="+def.factionTag+",tag=!dz_stronghold_defender,sort=nearest,limit=1,distance=..8] add dz_stronghold_defender")
}

function dzSdSpawnBatch(core, type, amount, initial) {
  for (let i=0;i<amount;i++) {
    let role=3
    if (type==="raider") {
      if (initial && i<2) role=0
      else if (initial && i===4) role=1
      else if (Math.random()<0.14) role=2
    } else {
      if (initial && i===3) role=1
      else if (initial && i===4) role=2
      else if (Math.random()<0.12) role=1
    }
    dzSdSpawnOne(core,type,role)
  }
}

function dzSdInitialize(core) {
  let type=dzSdType(core), def=DZ_SH_DEFENSE[type]
  dzSdFindSpawnerAndCaches(core,def)
  core.persistentData.putBoolean("dz_sd_initialized",true)
  core.persistentData.putInt("dz_sd_reserve",def.reserve)
  core.persistentData.putLong("dz_sd_next",Date.now()+def.interval)
  if (!core.persistentData.getBoolean("dz_sd_disabled")) dzSdSpawnBatch(core,type,def.initial,true)
  console.info("[PDZ STRONGHOLD] defense initialized type="+type+" caches="+core.persistentData.getInt("dz_sd_cache_count"))
}

BlockEvents.broken(event => {
  if (String(event.block.id)!=="easy_npc:group_spawner" || !event.player || event.player.level.clientSide) return
  let core=dzSdNearestCore(event.player,80)
  if (!core) return
  let sx=core.persistentData.getInt("dz_sd_x"), sy=core.persistentData.getInt("dz_sd_y"), sz=core.persistentData.getInt("dz_sd_z")
  if (Math.abs(event.block.x-sx)>1 || Math.abs(event.block.y-sy)>1 || Math.abs(event.block.z-sz)>1) return
  core.persistentData.putBoolean("dz_sd_disabled",true)
  core.persistentData.putInt("dz_sd_reserve",0)
  event.player.tell(Text.of("[拠点] 増援スポナーを停止した。残存部隊を排除せよ。").yellow())
})

ServerEvents.tick(event => {
  let now=Date.now(), server=event.server
  if (now-server.persistentData.getLong("dz_sd_tick")<5000) return
  server.persistentData.putLong("dz_sd_tick",now)
  let handled={}
  server.players.forEach(player => {
    let core=dzSdNearestCore(player,96)
    if (!core) return
    let id=core.persistentData.getString("dz_stronghold_id")
    if (handled[id]) return
    handled[id]=true
    if (!core.persistentData.getBoolean("dz_sd_initialized")) dzSdInitialize(core)
    if (core.persistentData.getBoolean("dz_sd_disabled")) return
    if (now<core.persistentData.getLong("dz_sd_next")) return
    let type=dzSdType(core), def=DZ_SH_DEFENSE[type]
    let alive=dzSdDefenderCount(core,def), reserve=core.persistentData.getInt("dz_sd_reserve")
    if (reserve<=0 || alive>=def.cap) {
      core.persistentData.putLong("dz_sd_next",now+def.interval)
      return
    }
    let amount=Math.min(def.batch,def.cap-alive,reserve)
    dzSdSpawnBatch(core,type,amount,false)
    core.persistentData.putInt("dz_sd_reserve",reserve-amount)
    core.persistentData.putLong("dz_sd_next",now+def.interval)
    player.tell(Text.of("[RADIO] 敵拠点から増援反応。残り予備戦力: "+(reserve-amount)).red())
  })
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal("deadzonestronghold").requires(s=>s.hasPermission(2))
  root.then(Commands.literal("status").executes(ctx=>{
    let p=ctx.source.player, core=dzSdNearestCore(p,160)
    if (!core) { p.tell(Text.of("160m以内に有効な拠点Coreがない。").gray()); return 0 }
    let type=dzSdType(core), def=DZ_SH_DEFENSE[type]
    p.tell(Text.of("=== STRONGHOLD DEFENSE ===").gold())
    p.tell(Text.of("勢力: "+type+" / 防衛兵: "+dzSdDefenderCount(core,def)+" / 予備: "+core.persistentData.getInt("dz_sd_reserve")).yellow())
    p.tell(Text.of("スポナー: "+(core.persistentData.getBoolean("dz_sd_disabled")?"停止":"稼働")+" / Loot収納: "+core.persistentData.getInt("dz_sd_cache_count")).aqua())
    return 1
  }))
  root.then(Commands.literal("refill_test").executes(ctx=>{
    let p=ctx.source.player, core=dzSdNearestCore(p,160)
    if (!core) return 0
    let type=dzSdType(core), def=DZ_SH_DEFENSE[type]
    if (!core.persistentData.getBoolean("dz_sd_initialized")) dzSdInitialize(core)
    dzSdSpawnBatch(core,type,Math.min(2,def.cap-dzSdDefenderCount(core,def)),false)
    return 1
  }))
  event.register(root)
})
