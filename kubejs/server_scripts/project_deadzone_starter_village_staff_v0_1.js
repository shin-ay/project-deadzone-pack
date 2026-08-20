// PROJECT DEADZONE starter-village building-bound staff v1.0
// Easy NPC performs the actual NPC creation. PDZ only resolves a safe floor
// inside each mandatory building and binds one service role to that building.

const DZ_SV_STAFF_VERSION = 1
const DZ_SV_STAFF_STATE = "dz_starter_village_staff_version"

const DZ_SV_STAFF = [
  {
    building:"hq", role:"guide", preset:"deadzone_minato_job.npc.nbt",
    serviceTag:"dz_basecamp_job_guide", name:"ミナト｜初期村案内官"
  },
  {
    building:"clinic", role:"medical", preset:"deadzone_shiori_medical.npc.nbt",
    serviceTag:"dz_basecamp_trader_medical", name:"シオリ｜医療担当"
  },
  {
    building:"workshop", role:"parts", preset:"deadzone_goro_parts.npc.nbt",
    serviceTag:"dz_basecamp_trader_parts", name:"ゴロウ｜整備担当"
  },
  {
    building:"market", role:"food", preset:"deadzone_maya_food.npc.nbt",
    serviceTag:"dz_basecamp_trader_food", name:"マヤ｜食料担当"
  }
]

function dzSvStaffOverworld(server) {
  try {
    let level = server.getLevel("minecraft:overworld")
    if (level) return level
  } catch (ignored) {}
  try { return server.overworld() } catch (ignored) {}
  return null
}

function dzSvStaffBlockId(level, x, y, z) {
  try { return String(level.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)).id) }
  catch (ignored) { return "minecraft:void_air" }
}

function dzSvStaffIsAir(id) {
  return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air"
}

function dzSvStaffSafeFloor(level, x, y, z) {
  let feet = dzSvStaffBlockId(level, x, y, z)
  let head = dzSvStaffBlockId(level, x, y + 1, z)
  let floor = dzSvStaffBlockId(level, x, y - 1, z)
  if (!dzSvStaffIsAir(feet) || !dzSvStaffIsAir(head) || dzSvStaffIsAir(floor)) return false
  if (floor.indexOf("water") >= 0 || floor.indexOf("lava") >= 0 || floor.indexOf("leaves") >= 0) return false
  return true
}

function dzSvStaffAnchor(data, building) {
  let prefix = "dz_starter_building_" + building + "_"
  return {x:data.getInt(prefix + "x"), y:data.getInt(prefix + "y"), z:data.getInt(prefix + "z")}
}

// Vanilla village buildings always expose a door. Search around the stored
// building quadrant, then choose a safe tile directly beside the door. This
// prevents roof, cave and player-position spawning.
function dzSvStaffFindDoorStand(level, anchor) {
  let best = null, bestScore = 999999
  for (let y = anchor.y - 7; y <= anchor.y + 14; y++) {
    for (let x = anchor.x - 18; x <= anchor.x + 18; x++) {
      for (let z = anchor.z - 18; z <= anchor.z + 18; z++) {
        let id = dzSvStaffBlockId(level, x, y, z)
        if (id.indexOf("_door") < 0) continue
        let options = [[x+1,y,z],[x-1,y,z],[x,y,z+1],[x,y,z-1]]
        for (let i = 0; i < options.length; i++) {
          let p = options[i]
          if (!dzSvStaffSafeFloor(level, p[0], p[1], p[2])) continue
          let score = Math.abs(p[0]-anchor.x) + Math.abs(p[1]-anchor.y)*2 + Math.abs(p[2]-anchor.z)
          if (score < bestScore) { bestScore = score; best = {x:p[0],y:p[1],z:p[2],source:"door"} }
        }
      }
    }
  }
  if (best) return best

  // Conservative fallback: stay close to the building anchor and only accept
  // two air blocks over a solid, non-liquid floor.
  for (let r = 0; r <= 10; r++) {
    for (let y = anchor.y - 5; y <= anchor.y + 8; y++) {
      for (let x = anchor.x - r; x <= anchor.x + r; x++) {
        for (let z = anchor.z - r; z <= anchor.z + r; z++) {
          if (Math.max(Math.abs(x-anchor.x), Math.abs(z-anchor.z)) !== r) continue
          if (dzSvStaffSafeFloor(level, x, y, z)) return {x:x,y:y,z:z,source:"safe_floor"}
        }
      }
    }
  }
  return null
}

function dzSvStaffRoleSelector(role) {
  return "@e[type=easy_npc:humanoid,tag=dz_starter_village_staff,tag=dz_starter_role_" + role + ",limit=1]"
}

function dzSvStaffConfigureService(server, spec) {
  let selector = dzSvStaffRoleSelector(spec.role)
  if (spec.role === "guide") {
    server.runCommandSilent("data modify entity " + selector + " DialogData.Type set value \"CUSTOM\"")
    server.runCommandSilent("data modify entity " + selector + " DialogData.DialogDataSet[0].Buttons set value " +
      '[{Actions:[{Cmd:"/deadzonecareer status",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_status",Name:"クラスと進捗を確認する"},' +
      '{Actions:[{Cmd:"/deadzonecareer paths",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_paths",Name:"選択できるJOBを確認する"},' +
      '{Actions:[{Cmd:"/ftbquests open_book",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"career_quests",Name:"クエストブックを開く"}]')
  }
  if (spec.role === "workshop") {
    server.runCommandSilent("data modify entity " + selector + " DialogData.Type set value \"CUSTOM\"")
    server.runCommandSilent("data modify entity " + selector + " DialogData.DialogDataSet[0].Buttons append value " +
      '{Actions:[{Cmd:"/deadzonerepair service",ExecAsUser:1b,PermLevel:0,Type:"COMMAND"}],Label:"equipment_repair",Name:"装備の完全修理を依頼する"}')
  }
}

function dzSvStaffSpawn(server, spec, pos) {
  let execution = "execute in minecraft:overworld positioned " + (pos.x+0.5) + " " + pos.y + " " + (pos.z+0.5)
  let before = "@e[type=easy_npc:humanoid,tag=!dz_starter_village_staff,distance=..1.5,sort=nearest,limit=1]"
  let imported = server.runCommandSilent(execution +
    " run easy_npc preset import_new custom easy_npc:preset/humanoid/" + spec.preset + " ~ ~ ~")
  if (imported <= 0) return false

  server.runCommandSilent(execution + " run tag " + before + " add dz_starter_village_staff")
  let importedNpc = "@e[type=easy_npc:humanoid,tag=dz_starter_village_staff,distance=..1.5,sort=nearest,limit=1]"
  let tags = [
    "dz_starter_building_" + spec.building,
    "dz_starter_role_" + spec.role,
    spec.serviceTag
  ]
  for (let i = 0; i < tags.length; i++) {
    server.runCommandSilent(execution + " run tag " + importedNpc + " add " + tags[i])
  }
  let selector = dzSvStaffRoleSelector(spec.role)
  server.runCommandSilent("data merge entity " + selector +
    " {Invulnerable:1b,PersistenceRequired:1b,NoAI:1b,CustomNameVisible:1b,CustomName:'{\"text\":\"" + spec.name + "\",\"color\":\"yellow\"}'}")
  server.runCommandSilent("execute in minecraft:overworld positioned " + (pos.x+0.5) + " " + pos.y + " " + (pos.z+0.5) +
    " run tp " + selector + " ~ ~ ~")
  server.runCommandSilent("team join dz_survivors " + selector)
  dzSvStaffConfigureService(server, spec)
  return server.runCommandSilent("execute if entity " + selector) > 0
}

function dzSvStaffInstall(server, announce) {
  let data = server.persistentData
  // Layout v2 attaches the proven Survivor Camp. Its activation function
  // already imports the staff; the old building scanner would duplicate them
  // inside unrelated native-village houses.
  if (data.getInt("dz_starter_village_layout_version") >= 2) {
    data.putInt(DZ_SV_STAFF_STATE, DZ_SV_STAFF_VERSION)
    return 1
  }
  if (data.getInt("dz_starter_village_state") !== 2) return 0
  let level = dzSvStaffOverworld(server)
  if (!level) return 0

  let positions = []
  for (let i = 0; i < DZ_SV_STAFF.length; i++) {
    let spec = DZ_SV_STAFF[i]
    let pos = dzSvStaffFindDoorStand(level, dzSvStaffAnchor(data, spec.building))
    if (!pos) {
      console.error("[PDZ][Starter Staff] safe position not found for " + spec.building)
      return 0
    }
    positions.push(pos)
  }

  server.runCommandSilent("kill @e[type=easy_npc:humanoid,tag=dz_starter_village_staff]")
  for (let i = 0; i < DZ_SV_STAFF.length; i++) {
    if (!dzSvStaffSpawn(server, DZ_SV_STAFF[i], positions[i])) {
      console.error("[PDZ][Starter Staff] import failed for " + DZ_SV_STAFF[i].role)
      return 0
    }
    console.info("[PDZ][Starter Staff] " + DZ_SV_STAFF[i].role + " bound to " +
      DZ_SV_STAFF[i].building + " at " + positions[i].x + " " + positions[i].y + " " + positions[i].z +
      " via " + positions[i].source)
  }

  server.runCommandSilent("function project_deadzone:basecamp/apply_trade_economy")
  data.putInt(DZ_SV_STAFF_STATE, DZ_SV_STAFF_VERSION)
  if (announce) server.runCommandSilent(
    'tellraw @a {"text":"[PROJECT DEADZONE] 初期村の案内・医療・整備・食料担当を各施設へ配置しました。","color":"aqua"}')
  return 1
}

let dzSvStaffTicks = 0
ServerEvents.tick(event => {
  if (++dzSvStaffTicks < 20) return
  dzSvStaffTicks = 0
  let server = event.server, data = server.persistentData
  if (data.getInt("dz_starter_village_layout_version") >= 2) return
  if (data.getInt("dz_starter_village_state") !== 2) return
  if (data.getInt(DZ_SV_STAFF_STATE) === DZ_SV_STAFF_VERSION) {
    let complete = true
    for (let i = 0; i < DZ_SV_STAFF.length; i++) {
      if (server.runCommandSilent("execute if entity " + dzSvStaffRoleSelector(DZ_SV_STAFF[i].role)) <= 0) {
        complete = false
        break
      }
    }
    if (complete) return
  }
  let x = data.getInt("dz_starter_village_origin_x")
  let y = data.getInt("dz_starter_village_origin_y")
  let z = data.getInt("dz_starter_village_origin_z")
  // Do not load remote chunks merely to maintain NPCs. Install as soon as the
  // first player reaches the already-generated village.
  let near = server.runCommandSilent("execute in minecraft:overworld positioned " + x + " " + y + " " + z +
    " if entity @a[distance=..128]")
  if (near > 0) dzSvStaffInstall(server, false)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonevillagestaff")
  root.then(Commands.literal("status").executes(ctx => {
    let p = ctx.source.player, d = p.server.persistentData
    p.tell(Text.of("=== 初期村スタッフ ===").gold())
    p.tell(Text.of("配置バージョン: " + d.getInt(DZ_SV_STAFF_STATE) + " / " + DZ_SV_STAFF_VERSION).gray())
    for (let i = 0; i < DZ_SV_STAFF.length; i++) {
      let spec = DZ_SV_STAFF[i]
      let exists = p.server.runCommandSilent("execute if entity " + dzSvStaffRoleSelector(spec.role)) > 0
      p.tell(Text.of(spec.building + " / " + spec.role + ": " + (exists > 0 ? "配置済み" : "未配置"))
        .color(exists > 0 ? "green" : "red"))
    }
    return 1
  }))
  root.then(Commands.literal("install").requires(source => source.hasPermission(2))
    .executes(ctx => dzSvStaffInstall(ctx.source.server, true)))
  root.then(Commands.literal("reset").requires(source => source.hasPermission(2)).executes(ctx => {
    ctx.source.server.runCommandSilent("kill @e[type=easy_npc:humanoid,tag=dz_starter_village_staff]")
    ctx.source.server.persistentData.putInt(DZ_SV_STAFF_STATE, 0)
    ctx.source.player.tell(Text.of("[PDZ] 初期村スタッフの配置状態をリセットしました。").yellow())
    return 1
  }))
  event.register(root)
})
