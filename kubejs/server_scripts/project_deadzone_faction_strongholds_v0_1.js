// PROJECT DEADZONE faction strongholds v0.1
// Lightweight prototype: objectives unlock a core; active sites dispatch
// capped patrols only while players are nearby. No forced chunks.

const DZ_SH = {
  // Doomsday Decoration is intentionally reserved for important faction
  // machinery. The actual state remains on invisible marker entities, so the
  // decorative block can be replaced later without losing stronghold data.
  raider: {
    name:"Raider Roadblock",
    faction:"raider",
    scale:"small",
    scanRadius:20,
    scanHeight:8,
    color:"red",
    patrol:"project_deadzone:factions/squad/raiders",
    core:"doomsday_decoration:generator",
    objectives:["doomsday_decoration:electricbox","doomsday_decoration:radio","easy_npc:group_spawner"]
  },
  raider_medium: {
    name:"Raider Military Outpost",
    faction:"raider",
    scale:"medium",
    scanRadius:48,
    scanHeight:12,
    color:"red",
    patrol:"project_deadzone:factions/squad/raiders",
    core:"doomsday_decoration:generator",
    objectives:[
      "doomsday_decoration:electricbox",
      "doomsday_decoration:radio",
      "doomsday_decoration:broadcaster",
      "easy_npc:default_spawner",
      "easy_npc:group_spawner",
      "easy_npc:single_spawner"
    ]
  },
  raider_large: {
    name:"Raider Fortress",
    faction:"raider",
    scale:"large",
    scanRadius:64,
    scanHeight:24,
    color:"dark_red",
    patrol:"project_deadzone:factions/squad/raiders",
    core:"doomsday_decoration:generator",
    objectives:[
      "doomsday_decoration:electricbox",
      "doomsday_decoration:radio",
      "doomsday_decoration:broadcaster",
      "doomsday_decoration:monitor_3",
      "easy_npc:default_spawner",
      "easy_npc:group_spawner",
      "easy_npc:single_spawner",
      "easy_npc:boss_spawner"
    ]
  },
  remnant:{
    name:"Remnant Relay",
    faction:"remnant",
    scale:"small",
    scanRadius:20,
    scanHeight:8,
    color:"dark_red",
    patrol:"project_deadzone:factions/squad/remnant",
    core:"doomsday_decoration:theserver",
    objectives:["doomsday_decoration:broadcaster","doomsday_decoration:monitor_3","easy_npc:group_spawner"]
  }
}

function dzShNearest(player, distance) {
  let found=null, best=distance*distance
  player.level.entities.forEach(e => {
    if (!e.tags || !e.tags.contains("dz_stronghold_core")) return
    let dx=e.x-player.x, dy=e.y-player.y, dz=e.z-player.z, d=dx*dx+dy*dy+dz*dz
    if (d<best) { best=d; found=e }
  })
  return found
}

function dzShType(core) {
  let stored=core.persistentData.getString("dz_stronghold_type")
  if (stored && DZ_SH[stored]) return stored
  if (core.tags.contains("dz_stronghold_remnant")) return "remnant"
  return "raider"
}

function dzShFaction(core) {
  let type=dzShType(core)
  return DZ_SH[type].faction || type
}

function dzShRemaining(core) {
  let count=0
  core.level.entities.forEach(e => {
    if (!e.tags || !e.tags.contains("dz_stronghold_objective")) return
    if (e.persistentData.getString("dz_stronghold_id") === core.persistentData.getString("dz_stronghold_id")) count++
  })
  return count
}

function dzShDefendersRemaining(core) {
  let type=dzShType(core), faction=DZ_SH[type].faction, radius=DZ_SH[type].scanRadius+12
  let count=0
  core.level.entities.forEach(e => {
    if (!e.tags || !e.tags.contains("dz_stronghold_defender")) return
    if (!e.tags.contains("dz_"+faction)) return
    let dx=e.x-core.x, dy=e.y-core.y, dz=e.z-core.z
    if (dx*dx+dy*dy+dz*dz<=radius*radius) count++
  })
  return count
}

function dzShHint(player, core) {
  let faction=dzShFaction(core)
  let id=core.persistentData.getString("dz_stronghold_id")
  let key="dz_stronghold_hint_last_"+faction
  // One hint per physical site. A time-only cooldown could be consumed during
  // creation before the player noticed the chat line, then hide it in the
  // next test site as well.
  if (player.persistentData.getString(key)===id) return
  player.persistentData.putString(key,id)
  if (faction==="raider") {
    player.tell(Text.of("[ハンク] ").gold().append(Text.of("あの発電機が拠点のCoreだ。先に配電盤と無線機を壊してロックを落とせ。").white()))
  } else {
    player.tell(Text.of("[ユイ] ").aqua().append(Text.of("サーバー本体は外部回線で保護されています。中継器と監視モニターを先に停止してください。").white()))
  }
  player.runCommandSilent("playsound minecraft:block.note_block.chime player @s ~ ~ ~ 0.45 1.25")
}

function dzShObjectiveEffects(player, core) {
  let id=core.persistentData.getString("dz_stronghold_id")
  let now=Date.now()
  let dimension=String(player.level.dimension)
  let server=player.server
  core.level.entities.forEach(e => {
    if (!e.tags || !e.tags.contains("dz_stronghold_objective")) return
    if (e.persistentData.getString("dz_stronghold_id")!==id) return
    let dx=e.x-player.x, dy=e.y-player.y, dz=e.z-player.z
    if (dx*dx+dy*dy+dz*dz>48*48) return
    // Red sparks make the breakable field devices readable without turning
    // the stronghold into a permanent particle fountain.
    let at="execute in "+dimension+" positioned "+e.x+" "+e.y+" "+e.z+" run "
    server.runCommandSilent(at+"particle minecraft:electric_spark ~ ~0.15 ~ 0.22 0.30 0.22 0.02 4 normal")
    server.runCommandSilent(at+"particle minecraft:dust 0.95 0.12 0.05 1.0 ~ ~0.2 ~ 0.16 0.24 0.16 0 3 normal")
    let soundAt=e.persistentData.getLong("dz_stronghold_sound_ms")
    if (now-soundAt>=8000 && dx*dx+dy*dy+dz*dz<=24*24) {
      e.persistentData.putLong("dz_stronghold_sound_ms",now)
      // A short electronic pulse reads as radio/static while remaining a
      // lightweight vanilla sound that every client already owns.
      server.runCommandSilent(at+"playsound minecraft:block.note_block.bit player @a[distance=..24] ~ ~ ~ 0.28 0.7")
      server.runCommandSilent(at+"playsound minecraft:block.note_block.hat player @a[distance=..24] ~ ~ ~ 0.16 0.45")
    }
  })
  if (dzShRemaining(core)>0) {
    let coreAt="execute in "+dimension+" positioned "+core.x+" "+core.y+" "+core.z+" run "
    server.runCommandSilent(coreAt+"particle minecraft:dust 0.75 0.0 0.0 1.2 ~ ~0.25 ~ 0.25 0.35 0.25 0 5 normal")
    if (now-core.persistentData.getLong("dz_stronghold_core_sound_ms")>=10000 &&
        (core.x-player.x)*(core.x-player.x)+(core.y-player.y)*(core.y-player.y)+(core.z-player.z)*(core.z-player.z)<=24*24) {
      core.persistentData.putLong("dz_stronghold_core_sound_ms",now)
      server.runCommandSilent(coreAt+"playsound minecraft:block.beacon.ambient player @a[distance=..24] ~ ~ ~ 0.22 0.55")
    }
  }
}

function dzShCreate(player, faction) {
  let id=String(Date.now())+"_"+Math.floor(Math.random()*10000), def=DZ_SH[faction]
  player.runCommandSilent("setblock ~ ~-1 ~ "+def.core)
  player.runCommandSilent("summon minecraft:armor_stand ~ ~ ~ {Invisible:1b,Invulnerable:1b,NoGravity:1b,Marker:1b,Tags:[\"dz_stronghold_core\",\"dz_stronghold_active\",\"dz_stronghold_"+faction+"\"]}")
  let core=dzShNearest(player,4)
  if (!core) return false
  core.persistentData.putString("dz_stronghold_id",id)
  core.persistentData.putString("dz_stronghold_type",faction)
  core.persistentData.putLong("dz_stronghold_next_patrol",Date.now()+120000)
  let testOffsets=[[5,0],[-5,0],[0,5],[0,-5],[7,5],[-7,-5],[7,-5],[-7,5]]
  def.objectives.forEach((blockId,index) => {
    let off=testOffsets[index]
    if (!off) return
    player.runCommandSilent("setblock ~"+off[0]+" ~-1 ~"+off[1]+" "+blockId)
    player.runCommandSilent("summon minecraft:armor_stand ~"+off[0]+" ~ ~"+off[1]+" {Invisible:1b,Invulnerable:1b,NoGravity:1b,Marker:1b,Tags:[\"dz_stronghold_objective\",\"dz_stronghold_obj_"+index+"\"]}")
  })
  // Bind the two newest objective markers to this core.
  core.level.entities.forEach(e => {
    if (e.tags && e.tags.contains("dz_stronghold_objective") &&
        Math.abs(e.x-core.x)<=10 && Math.abs(e.z-core.z)<=10 && !e.persistentData.contains("dz_stronghold_id"))
      e.persistentData.putString("dz_stronghold_id",id)
  })
  player.tell(Text.of("[STRONGHOLD] "+def.name+" を設置。外部装置2基を停止してCoreを解除してね。").red())
  return true
}

function dzShBindNearby(player, faction) {
  let def=DZ_SH[faction]
  let scanRadius=def.scanRadius || 16
  let scanHeight=def.scanHeight || 6
  let wanted=[def.core].concat(def.objectives)
  let found={}
  let px=Math.floor(player.x), py=Math.floor(player.y), pz=Math.floor(player.z)
  // Manual/editor action only: scan a compact 33x13x33 box and remember the
  // nearest block of each required type. This never runs from a tick event.
  for (let x=px-scanRadius;x<=px+scanRadius;x++) for (let y=py-scanHeight;y<=py+scanHeight;y++) for (let z=pz-scanRadius;z<=pz+scanRadius;z++) {
    let blockId=String(player.level.getBlock(x,y,z).id)
    if (wanted.indexOf(blockId)<0) continue
    let d=(x-player.x)*(x-player.x)+(y-player.y)*(y-player.y)+(z-player.z)*(z-player.z)
    if (!found[blockId] || d<found[blockId].distance) found[blockId]={x:x,y:y,z:z,distance:d}
  }
  let missing=wanted.filter(blockId=>!found[blockId])
  if (missing.length>0) {
    player.tell(Text.of("[STRONGHOLD] 接続失敗。16m以内に不足: "+missing.join(", ")).red())
    return false
  }
  // Replace only nearby stronghold control markers. Decorative blocks and
  // unrelated NPC markers are untouched.
  player.level.entities.forEach(e => {
    if (!e.tags || !(e.tags.contains("dz_stronghold_core") || e.tags.contains("dz_stronghold_objective"))) return
    let dx=e.x-player.x, dy=e.y-player.y, dz=e.z-player.z
    if (dx*dx+dy*dy+dz*dz<=(scanRadius+8)*(scanRadius+8)) e.discard()
  })
  let id=String(Date.now())+"_"+Math.floor(Math.random()*10000)
  let dimension=String(player.level.dimension)
  let corePos=found[def.core]
  player.server.runCommandSilent("execute in "+dimension+" run summon minecraft:armor_stand "+(corePos.x+0.5)+" "+(corePos.y+1)+" "+(corePos.z+0.5)+" {Invisible:1b,Invulnerable:1b,NoGravity:1b,Marker:1b,Tags:[\"dz_stronghold_core\",\"dz_stronghold_active\",\"dz_stronghold_"+faction+"\",\"dz_stronghold_pending\"]}")
  def.objectives.forEach((blockId,index) => {
    let pos=found[blockId]
    player.server.runCommandSilent("execute in "+dimension+" run summon minecraft:armor_stand "+(pos.x+0.5)+" "+(pos.y+1)+" "+(pos.z+0.5)+" {Invisible:1b,Invulnerable:1b,NoGravity:1b,Marker:1b,Tags:[\"dz_stronghold_objective\",\"dz_stronghold_obj_"+index+"\",\"dz_stronghold_pending\"]}")
  })
  player.level.entities.forEach(e => {
    if (!e.tags || !e.tags.contains("dz_stronghold_pending")) return
    let dx=e.x-player.x, dy=e.y-player.y, dz=e.z-player.z
    if (dx*dx+dy*dy+dz*dz>(scanRadius+8)*(scanRadius+8)) return
    e.persistentData.putString("dz_stronghold_id",id)
    if (e.tags.contains("dz_stronghold_core")) {
      e.persistentData.putString("dz_stronghold_type",faction)
      e.persistentData.putLong("dz_stronghold_next_patrol",Date.now()+120000)
    }
    e.tags.remove("dz_stronghold_pending")
  })
  player.tell(Text.of("[STRONGHOLD] "+def.name+"のCoreと外部装置を現在位置へ再接続した。").green())
  return true
}

BlockEvents.broken(event => {
  let block=event.block, player=event.player
  if (!player || player.level.clientSide) return
  let blockId=String(block.id)
  let isObjective=false
  Object.keys(DZ_SH).forEach(key => {
    if (DZ_SH[key].objectives.indexOf(blockId)>=0) isObjective=true
  })
  if (isObjective) {
    let removed=false
    player.level.entities.forEach(e => {
      if (!e.tags || !e.tags.contains("dz_stronghold_objective")) return
      if (Math.abs(e.x-(block.x+0.5))<1.5 && Math.abs(e.y-block.y)<2 && Math.abs(e.z-(block.z+0.5))<1.5) {
        e.discard(); removed=true
      }
    })
    if (removed) player.tell(Text.of("[STRONGHOLD] 防衛設備を停止した。").yellow())
    return
  }
  let isCore=false
  Object.keys(DZ_SH).forEach(key => {
    if (DZ_SH[key].core===blockId) isCore=true
  })
  if (!isCore) return
  let core=dzShNearest(player,5)
  if (!core || !core.tags.contains("dz_stronghold_active")) return
  let remaining=dzShRemaining(core)
  if (remaining>0) {
    event.cancel()
    player.tell(Text.of("Coreはロック中。残り防衛設備: "+remaining).red())
    return
  }
  let defenders=dzShDefendersRemaining(core)
  if (defenders>0) {
    event.cancel()
    player.tell(Text.of("Coreはまだ防衛部隊に保護されている。残存戦力: "+defenders).red())
    return
  }
  let type=dzShType(core), faction=dzShFaction(core), id=core.persistentData.getString("dz_stronghold_id")
  core.tags.remove("dz_stronghold_active"); core.addTag("dz_stronghold_captured")
  player.server.persistentData.putInt("dz_stronghold_"+faction+"_captured",player.server.persistentData.getInt("dz_stronghold_"+faction+"_captured")+1)
  player.persistentData.putBoolean("dz_story_branch_first_core",true)
  player.addTag("dz_captured_"+faction+"_core")
  player.server.runCommandSilent('tellraw @a [{"text":"[FACTION] ","color":"gold","bold":true},{"text":"'+DZ_SH[type].name+'を制圧した。敵の巡回が停止する。","color":"green"}]')
  player.runCommandSilent("playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 0.8 1")
  player.level.players.forEach(member => {
    let dx=member.x-core.x, dy=member.y-core.y, dz=member.z-core.z
    if (dx*dx+dy*dy+dz*dz>80*80) return
    if (faction==="raider") {
      member.runCommandSilent("give @s apocalypsenow:money 6")
      member.runCommandSilent('give @s tacz:ammo{AmmoId:"tacz:9mm"} 24')
      member.runCommandSilent("give @s apocalypsenow:bandage 2")
    } else {
      member.runCommandSilent("give @s apocalypsenow:money 10")
      member.runCommandSilent('give @s tacz:ammo{AmmoId:"tacz:45acp"} 24')
      member.runCommandSilent("give @s create:electron_tube 2")
    }
    member.tell(Text.of("[制圧報酬] "+DZ_SH[type].name+" の戦果を受領した。").gold())
    member.runCommandSilent("playsound minecraft:entity.player.levelup player @s ~ ~ ~ 0.45 1.2")
  })
  console.info("[PDZ STRONGHOLD] captured id="+id+" faction="+faction+" by="+player.username)
  core.discard()
})

ServerEvents.tick(event => {
  let server=event.server
  let now=Date.now()
  if (now-server.persistentData.getLong("dz_stronghold_scan_ms")<10000) return
  server.persistentData.putLong("dz_stronghold_scan_ms",now)
  server.players.forEach(player => {
    let core=dzShNearest(player,128)
    if (!core || !core.tags.contains("dz_stronghold_active")) return
    let next=core.persistentData.getLong("dz_stronghold_next_patrol")
    if (now<next) return
    let hostileCount=player.server.runCommandSilent("execute as "+player.username+" at @s if entity @e[tag=dz_npc,distance=..96,limit=7]")
    if (hostileCount<=0) return
    let type=dzShType(core)
    core.runCommandSilent("function "+DZ_SH[type].patrol)
    core.persistentData.putLong("dz_stronghold_next_patrol",now+180000)
    player.tell(Text.of("[RADIO] "+DZ_SH[type].name+"から巡回部隊が出た。").red())
  })
})

// Local readability pass. It only scans around online players and never
// force-loads chunks; 2 seconds is frequent enough to notice without adding a
// per-tick NPC/particle cost.
ServerEvents.tick(event => {
  let server=event.server
  let now=Date.now()
  if (now-server.persistentData.getLong("dz_stronghold_fx_scan_ms")<2000) return
  server.persistentData.putLong("dz_stronghold_fx_scan_ms",now)
  server.players.forEach(player => {
    let core=dzShNearest(player,96)
    if (!core || !core.tags.contains("dz_stronghold_active")) return
    dzShHint(player,core)
    dzShObjectiveEffects(player,core)
  })
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal("deadzonecore").requires(s=>s.hasPermission(2))
  ;["raider","raider_medium","raider_large","remnant"].forEach(f => root.then(Commands.literal("create_"+f).executes(ctx=>dzShCreate(ctx.source.player,f)?1:0)))
  root.then(Commands.literal("build_raider").executes(ctx=>{
    let p=ctx.source.player
    p.runCommandSilent("place template project_deadzone:raider_roadblock_edit ~ ~ ~")
    return dzShBindNearby(p,"raider")?1:0
  }))
  root.then(Commands.literal("build_remnant").executes(ctx=>{
    let p=ctx.source.player
    p.runCommandSilent("place template project_deadzone:remnant_relay_edit ~ ~ ~")
    return dzShBindNearby(p,"remnant")?1:0
  }))
  root.then(Commands.literal("build_raider_medium").executes(ctx=>{
    let p=ctx.source.player
    p.runCommandSilent("function project_deadzone:factions/stronghold/build_raider_military_medium_test")
    return dzShBindNearby(p,"raider_medium")?1:0
  }))
  ;["raider","raider_medium","raider_large","remnant"].forEach(f => root.then(Commands.literal("bind_"+f).executes(ctx=>dzShBindNearby(ctx.source.player,f)?1:0)))
  root.then(Commands.literal("status").executes(ctx=>{
    let p=ctx.source.player, core=dzShNearest(p,160)
    p.tell(Text.of("=== FACTION STRONGHOLD ===").gold())
    p.tell(Text.of("Raider制圧数: "+p.server.persistentData.getInt("dz_stronghold_raider_captured")).aqua())
    p.tell(Text.of("Remnant制圧数: "+p.server.persistentData.getInt("dz_stronghold_remnant_captured")).aqua())
    if (core) p.tell(Text.of("最寄り: "+DZ_SH[dzShType(core)].name+" / 防衛設備 "+dzShRemaining(core)).yellow())
    else p.tell(Text.of("160m以内にCoreなし").gray())
    return 1
  }))
  event.register(root)
})
