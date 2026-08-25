// PROJECT DEADZONE regional logistics contracts v0.1
// A contract is a real Camp round trip. Cargo inputs are consumed at dispatch;
// the manifest is only a non-economic proof token, preventing storage duplication.

const DZ_LOGISTICS_MANIFEST = "kubejs:logistics_manifest"
const DZ_LOGISTICS_MODES = ["road", "rail", "sea", "air"]
const DZ_LOGISTICS_QUESTS = {
  intro: "6D51010000000101",
  demand: "6D51010000000102",
  road: "6D51010000000103",
  rail: "6D51010000000104",
  sea: "6D51010000000105",
  air: "6D51010000000106",
  matched: "6D51010000000107",
  fuel: "6D51010000000108",
  colony: "6D51010000000109",
  complete: "6D5101000000010A"
}

const DZ_LOGISTICS = {
  road: {
    label: "道路・重量輸送", radius: 512, travel: 320, deadline: 14400, money: 6,
    costs: [["minecraft:stone_bricks", 32], ["minecraft:iron_ingot", 8]],
    hint: "MTS / Blocky Bikes / Vehicle Modの陸上車両",
    reputation: [0, 2, 0]
  },
  rail: {
    label: "鉄道・大宗貨物", radius: 768, travel: 512, deadline: 24000, money: 10,
    costs: [["minecraft:stone_bricks", 64], ["minecraft:iron_ingot", 16]],
    hint: "Createの組立済み列車",
    reputation: [0, 3, 0]
  },
  sea: {
    label: "沿岸・食料輸送", radius: 640, travel: 420, deadline: 24000, money: 8,
    costs: [["minecraft:bread", 16], ["minecraft:cooked_cod", 16]],
    hint: "Small ShipsまたはVehicle Modの船舶",
    reputation: [0, 0, 3]
  },
  air: {
    label: "航空・緊急医療便", radius: 1024, travel: 640, deadline: 9600, money: 8,
    costs: [["legendarysurvivaloverhaul:bandage", 4], ["apocalypsenow:antibiotics", 1]],
    hint: "Immersive AircraftまたはVehicle Modの航空機",
    reputation: [2, 0, 1]
  }
}

function dzLogTime(server) {
  let value = Number(server.runCommandSilent("time query gametime"))
  return Number.isFinite(value) ? value : 0
}

function dzLogAtCamp(player, radius) {
  return player.runCommandSilent("execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,distance=.." + radius + ",limit=1]") > 0
}

function dzLogCount(player, item) {
  return player.server.runCommandSilent("clear " + player.username + " " + item + " 0")
}

function dzLogCanPay(player, costs) {
  return costs.every(cost => dzLogCount(player, cost[0]) >= cost[1])
}

function dzLogConsume(player, costs) {
  costs.forEach(cost => player.runCommandSilent("clear @s " + cost[0] + " " + cost[1]))
}

function dzLogCostText(costs) {
  return costs.map(cost => cost[0] + " x" + cost[1]).join(" / ")
}

function dzLogComplete(player, quest) {
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + quest)
}

function dzLogDemand(server) {
  return DZ_LOGISTICS_MODES[Math.floor(dzLogTime(server) / 24000) % DZ_LOGISTICS_MODES.length]
}

function dzLogVehicleType(player) {
  if (!player.isPassenger()) return ""
  try {
    let vehicle = player.getRootVehicle()
    return vehicle ? String(vehicle.type) : ""
  } catch (ignored) {
    try {
      let vehicle = player.getVehicle()
      return vehicle ? String(vehicle.type) : ""
    } catch (ignoredAgain) {
      return ""
    }
  }
}

function dzLogVehicleMatches(mode, type) {
  type = String(type).toLowerCase()
  if (!type) return false
  if (mode === "rail") return type === "create:carriage_contraption"
  if (mode === "sea") return type.indexOf("smallships:") === 0 || type === "vehicle:aluminum_boat" || type === "vehicle:jet_ski"
  if (mode === "air") return type.indexOf("immersive_aircraft:") === 0 || type === "vehicle:compact_helicopter" || type === "vehicle:sports_plane" || type === "vehicle:sofacopter"
  if (mode !== "road") return false
  if (type.indexOf("mts:") === 0 || type.indexOf("blocky_bikes:") === 0) return true
  return type.indexOf("vehicle:") === 0 && !dzLogVehicleMatches("sea", type) && !dzLogVehicleMatches("air", type)
}

function dzLogAddReputation(server, spec, demandBonus) {
  let security = spec.reputation[0] + (demandBonus && spec === DZ_LOGISTICS.air ? 1 : 0)
  let restoration = spec.reputation[1] + (demandBonus && (spec === DZ_LOGISTICS.road || spec === DZ_LOGISTICS.rail) ? 1 : 0)
  let supply = spec.reputation[2] + (demandBonus && spec === DZ_LOGISTICS.sea ? 1 : 0)
  server.persistentData.putInt("dz_camp_security_reputation", server.persistentData.getInt("dz_camp_security_reputation") + security)
  server.persistentData.putInt("dz_camp_restoration_reputation", server.persistentData.getInt("dz_camp_restoration_reputation") + restoration)
  server.persistentData.putInt("dz_life_supply_reputation", server.persistentData.getInt("dz_life_supply_reputation") + supply)
  server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
}

function dzLogClear(player) {
  player.runCommandSilent("clear @s " + DZ_LOGISTICS_MANIFEST)
  player.persistentData.putString("dz_log_active", "")
  player.persistentData.putLong("dz_log_deadline", 0)
  player.persistentData.putDouble("dz_log_travel", 0)
  player.persistentData.putBoolean("dz_log_far", false)
}

function dzLogFail(player, reason) {
  let mode = player.persistentData.getString("dz_log_active")
  if (!mode) return
  dzLogClear(player)
  player.tell(Text.of("[LOGISTICS] " + reason + "。" + DZ_LOGISTICS[mode].label + "は失敗しました。").red())
}

function dzLogBoard(player, intro) {
  let server = player.server
  let demand = dzLogDemand(server)
  if (intro) {
    dzLogComplete(player, DZ_LOGISTICS_QUESTS.intro)
    dzLogComplete(player, DZ_LOGISTICS_QUESTS.demand)
  }
  player.tell(Text.of("=== PDZ 地域物流ボード ===").gold())
  player.tell(Text.of("本日の優先需要: " + DZ_LOGISTICS[demand].label + "（一致報酬あり）").aqua())
  DZ_LOGISTICS_MODES.forEach(mode => {
    let spec = DZ_LOGISTICS[mode]
    let unlocked = server.persistentData.getBoolean("dz_logistics_route_" + mode)
    player.tell(Text.of("[" + spec.label + "] " + (unlocked ? "航路確立済" : "未確立") + "｜" + spec.hint).gray()
      .clickRunCommand("/deadzonelogistics accept_" + mode))
  })
  let active = player.persistentData.getString("dz_log_active")
  if (active && DZ_LOGISTICS[active]) {
    let spec = DZ_LOGISTICS[active]
    player.tell(Text.of("進行中: " + spec.label + "｜遠征 " + (player.persistentData.getBoolean("dz_log_far") ? "済" : "未") + "｜乗車距離 " + Math.floor(player.persistentData.getDouble("dz_log_travel")) + "/" + spec.travel + "m").yellow())
    player.tell(Text.of("[Campへ納品]").green().clickRunCommand("/deadzonelogistics deliver")
      .append(Text.of("  [契約破棄]").red().clickRunCommand("/deadzonelogistics cancel")))
  }
}

function dzLogAccept(player, mode) {
  let server = player.server
  let spec = DZ_LOGISTICS[mode]
  if (!spec || !dzLogAtCamp(player, 48)) {
    player.tell(Text.of("輸送契約はSurvivor CampのBase Core付近で受けてください。").red())
    return 0
  }
  if (server.persistentData.getInt("dz_defense_completions") <= 0) {
    player.tell(Text.of("先にSurvivor Campの初回防衛・地域管制を完了してください。").red())
    return 0
  }
  if (player.persistentData.getString("dz_log_active")) {
    player.tell(Text.of("すでに輸送契約が進行中です。").yellow())
    return 0
  }
  let now = dzLogTime(server)
  let next = player.persistentData.getLong("dz_log_next_" + mode)
  if (now < next) {
    player.tell(Text.of("この輸送種別は再受諾まで約 " + Math.ceil((next - now) / 24000) + "日です。").yellow())
    return 0
  }
  if (!dzLogCanPay(player, spec.costs)) {
    player.tell(Text.of("積載物資が不足: " + dzLogCostText(spec.costs)).red())
    return 0
  }
  dzLogConsume(player, spec.costs)
  player.runCommandSilent("clear @s " + DZ_LOGISTICS_MANIFEST)
  player.give(Item.of(DZ_LOGISTICS_MANIFEST))
  let data = player.persistentData
  data.putString("dz_log_active", mode)
  data.putLong("dz_log_deadline", now + spec.deadline)
  data.putDouble("dz_log_origin_x", player.x)
  data.putDouble("dz_log_origin_z", player.z)
  data.putString("dz_log_origin_dimension", String(player.level.dimension))
  data.putDouble("dz_log_last_x", player.x)
  data.putDouble("dz_log_last_z", player.z)
  data.putDouble("dz_log_travel", 0)
  data.putBoolean("dz_log_far", false)
  player.tell(Text.of("[LOGISTICS] " + spec.label + "を受諾。" + spec.radius + "m圏外へ出て、指定車両で" + spec.travel + "m以上走行後にCampへ帰投。").green())
  return 1
}

function dzLogDeliver(player) {
  let data = player.persistentData
  let mode = data.getString("dz_log_active")
  let spec = DZ_LOGISTICS[mode]
  if (!spec) {
    player.tell(Text.of("進行中の輸送契約はありません。").yellow())
    return 0
  }
  if (!dzLogAtCamp(player, 48)) {
    player.tell(Text.of("貨物はSurvivor CampのBase Coreへ納品してください。").red())
    return 0
  }
  if (dzLogCount(player, DZ_LOGISTICS_MANIFEST) < 1 || !data.getBoolean("dz_log_far") || data.getDouble("dz_log_travel") < spec.travel) {
    player.tell(Text.of("未達: マニフェスト / 指定半径への遠征 / 指定車両の走行距離を確認してください。").red())
    return 0
  }
  let server = player.server
  let demandBonus = dzLogDemand(server) === mode
  let first = !server.persistentData.getBoolean("dz_logistics_route_" + mode)
  dzLogClear(player)
  data.putLong("dz_log_next_" + mode, dzLogTime(server) + 72000)
  data.putInt("dz_log_runs_" + mode, data.getInt("dz_log_runs_" + mode) + 1)
  server.persistentData.putInt("dz_logistics_runs_" + mode, server.persistentData.getInt("dz_logistics_runs_" + mode) + 1)
  server.persistentData.putBoolean("dz_logistics_route_" + mode, true)
  server.persistentData.putBoolean("dz_logistics_ever_completed", true)
  if (demandBonus) server.persistentData.putBoolean("dz_logistics_ever_demand_match", true)
  dzLogAddReputation(server, spec, demandBonus)
  player.give(Item.of("apocalypsenow:money", spec.money + (demandBonus ? 4 : 0)))
  dzLogComplete(player, DZ_LOGISTICS_QUESTS[mode])
  if (demandBonus) dzLogComplete(player, DZ_LOGISTICS_QUESTS.matched)
  if (server.persistentData.getBoolean("dz_camp_fuel_route_restored")) dzLogComplete(player, DZ_LOGISTICS_QUESTS.fuel)
  if (typeof dzMcOpsAddReputation === "function") {
    try {
      dzMcOpsAddReputation(server, demandBonus ? 2 : 1, 0, 0)
      dzLogComplete(player, DZ_LOGISTICS_QUESTS.colony)
    } catch (ignored) {}
  }
  let all = DZ_LOGISTICS_MODES.every(key => data.getInt("dz_log_runs_" + key) > 0)
  if (all) dzLogComplete(player, DZ_LOGISTICS_QUESTS.complete)
  player.tell(Text.of("[LOGISTICS] " + spec.label + "を完遂。" + (demandBonus ? "優先需要一致ボーナス。" : "") + (first ? " 地域航路を新規確立。" : "")).green())
  return 1
}

function dzLogTick(player) {
  if (player.age % 20 !== 0) return
  let data = player.persistentData
  let mode = data.getString("dz_log_active")
  let spec = DZ_LOGISTICS[mode]
  if (!spec) return
  if (dzLogTime(player.server) > data.getLong("dz_log_deadline")) {
    dzLogFail(player, "契約期限切れ")
    return
  }
  if (dzLogCount(player, DZ_LOGISTICS_MANIFEST) < 1) {
    dzLogFail(player, "封印マニフェストを紛失")
    return
  }
  if (String(player.level.dimension) !== data.getString("dz_log_origin_dimension")) {
    dzLogFail(player, "次元移動で航路を離脱")
    return
  }
  let x = Number(player.x), z = Number(player.z)
  let ox = data.getDouble("dz_log_origin_x"), oz = data.getDouble("dz_log_origin_z")
  let radial = Math.sqrt((x - ox) * (x - ox) + (z - oz) * (z - oz))
  if (radial >= spec.radius) data.putBoolean("dz_log_far", true)
  let lastX = data.getDouble("dz_log_last_x"), lastZ = data.getDouble("dz_log_last_z")
  let moved = Math.sqrt((x - lastX) * (x - lastX) + (z - lastZ) * (z - lastZ))
  let type = dzLogVehicleType(player)
  if (moved <= 32 && dzLogVehicleMatches(mode, type)) data.putDouble("dz_log_travel", data.getDouble("dz_log_travel") + moved)
  data.putDouble("dz_log_last_x", x)
  data.putDouble("dz_log_last_z", z)
}

PlayerEvents.tick(event => dzLogTick(event.player))

PlayerEvents.respawned(event => {
  if (event.player.persistentData.getString("dz_log_active")) dzLogFail(event.player, "死亡により貨物を喪失")
})

EntityEvents.spawned("minecraft:item", event => {
  let entity = event.entity
  event.server.scheduleInTicks(1, () => {
    if (entity && entity.alive && String(entity.item.id) === DZ_LOGISTICS_MANIFEST) entity.kill()
  })
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonelogistics")
  root.executes(ctx => {
    let player = ctx.source.player
    if (!dzLogAtCamp(player, 64)) {
      player.tell(Text.of("地域物流ボードはSurvivor Campで確認してください。").red())
      return 0
    }
    dzLogBoard(player, true)
    return 1
  })
  root.then(Commands.literal("board").executes(ctx => {
    dzLogBoard(ctx.source.player, true)
    return 1
  }))
  root.then(Commands.literal("status").executes(ctx => {
    dzLogBoard(ctx.source.player, false)
    return 1
  }))
  DZ_LOGISTICS_MODES.forEach(mode => root.then(Commands.literal("accept_" + mode).executes(ctx => dzLogAccept(ctx.source.player, mode))))
  root.then(Commands.literal("deliver").executes(ctx => dzLogDeliver(ctx.source.player)))
  root.then(Commands.literal("cancel").executes(ctx => {
    let player = ctx.source.player
    if (!player.persistentData.getString("dz_log_active")) return 0
    dzLogFail(player, "プレイヤーが契約を破棄")
    return 1
  }))
  root.then(Commands.literal("reset_test").requires(source => source.hasPermission(2)).executes(ctx => {
    let server = ctx.source.server, player = ctx.source.player
    dzLogClear(player)
    DZ_LOGISTICS_MODES.forEach(mode => {
      server.persistentData.putBoolean("dz_logistics_route_" + mode, false)
      server.persistentData.putInt("dz_logistics_runs_" + mode, 0)
      player.persistentData.putLong("dz_log_next_" + mode, 0)
      player.persistentData.putInt("dz_log_runs_" + mode, 0)
    })
    server.persistentData.putBoolean("dz_logistics_ever_completed", false)
    server.persistentData.putBoolean("dz_logistics_ever_demand_match", false)
    player.tell(Text.of("物流テスト状態をリセットしました。").yellow())
    return 1
  }))
  event.register(root)
})

console.info("[PROJECT DEADZONE][Logistics] v0.1 loaded.")
