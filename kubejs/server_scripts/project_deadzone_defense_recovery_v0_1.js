// PROJECT DEADZONE defense and recovery bridge v0.1
// Camp faction raids, wilderness Hordes and MineColonies support have separate ownership.

const DZ_DEFENSE_MC_MANAGER = Java.loadClass("com.minecolonies.api.colony.IColonyManager")

const DZ_DEFENSE_KEYS = {
  fortify: "dz_defense_prep_fortify",
  provisions: "dz_defense_prep_provisions",
  medical: "dz_defense_prep_medical",
  playerLoss: "dz_defense_player_losses",
  guardLoss: "dz_defense_guard_losses",
  debt: "dz_defense_repair_debt",
  disrupted: "dz_camp_services_disrupted",
  completions: "dz_defense_completions",
  nextContract: "dz_defense_next_contract_time",
  eventSerial: "dz_defense_event_serial"
}

const DZ_DEFENSE_QUESTS = {
  intro: "6D50010000000101",
  responsibility: "6D50010000000102",
  fortify: "6D50010000000103",
  provisions: "6D50010000000104",
  medical: "6D50010000000105",
  defended: "6D50010000000106",
  noLoss: "6D50010000000107",
  colony: "6D50010000000108",
  recovery: "6D50010000000109",
  wilderness: "6D5001000000010A",
  complete: "6D5001000000010B"
}

const DZ_DEFENSE_PREP = {
  fortify: {
    label: "外周補強",
    costs: [["minecraft:stone_bricks", 64], ["minecraft:iron_ingot", 16]],
    quest: DZ_DEFENSE_QUESTS.fortify
  },
  provisions: {
    label: "食料備蓄",
    costs: [["minecraft:bread", 16], ["minecraft:cooked_beef", 8]],
    quest: DZ_DEFENSE_QUESTS.provisions
  },
  medical: {
    label: "救護所準備",
    costs: [["legendarysurvivaloverhaul:bandage", 4], ["apocalypsenow:antibiotics", 1]],
    quest: DZ_DEFENSE_QUESTS.medical
  }
}

let dzDefenseTick = 0
let dzDefenseColonyErrorLogged = false

function dzDefenseGameTime(server) {
  let value = Number(server.runCommandSilent("time query gametime"))
  return Number.isFinite(value) ? value : 0
}

function dzDefenseRaidState(server) {
  return server.persistentData.getInt("dz_basecamp_first_raid_state")
}

function dzDefenseAtCamp(player, radius) {
  return player.runCommandSilent(
    "execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,distance=.." + radius + ",limit=1]"
  ) > 0
}

function dzDefenseHasCamp(server) {
  return server.runCommandSilent("execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1]") > 0
}

function dzDefenseComplete(player, quest) {
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + quest)
}

function dzDefenseCompleteNearby(server, quest) {
  server.runCommandSilent(
    "execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1] " +
    "run ftbquests change_progress @a[distance=..112] complete " + quest
  )
}

function dzDefenseForParticipants(server, action) {
  server.players.forEach(player => {
    if (dzDefenseAtCamp(player, 112)) action(player)
  })
}

function dzDefenseCount(player, item) {
  return player.server.runCommandSilent("clear " + player.username + " " + item + " 0")
}

function dzDefenseCanPay(player, costs) {
  return costs.every(cost => dzDefenseCount(player, cost[0]) >= cost[1])
}

function dzDefenseConsume(player, costs) {
  costs.forEach(cost => player.runCommandSilent("clear @s " + cost[0] + " " + cost[1]))
}

function dzDefenseCostText(costs) {
  return costs.map(cost => cost[0] + " x" + cost[1]).join(" / ")
}

function dzDefensePrepCosts(server, key) {
  if (key === "fortify" && server.persistentData.getBoolean("dz_logistics_route_rail"))
    return [["minecraft:stone_bricks", 48], ["minecraft:iron_ingot", 12]]
  if (key === "provisions" && server.persistentData.getBoolean("dz_logistics_route_sea"))
    return [["minecraft:bread", 12], ["minecraft:cooked_beef", 6]]
  if (key === "medical" && server.persistentData.getBoolean("dz_logistics_route_air"))
    return [["legendarysurvivaloverhaul:bandage", 3], ["apocalypsenow:antibiotics", 1]]
  return DZ_DEFENSE_PREP[key].costs
}

function dzDefenseColonySupport(server) {
  let result = {score: 0, colonies: [], buildings: 0}
  try {
    DZ_DEFENSE_MC_MANAGER.getInstance().getAllColonies().forEach(colony => {
      let colonyScore = 0
      let buildings = 0
      colony.getServerBuildingManager().getBuildings().values().forEach(building => {
        let type = String(building.getBuildingType().getRegistryName()).toLowerCase()
        if (type.indexOf("guardtower") < 0 && type.indexOf("barracks") < 0) return
        let level = Math.max(0, Number(building.getBuildingLevel()))
        if (level <= 0) return
        colonyScore += level
        buildings++
      })
      if (colonyScore > 0) {
        result.colonies.push(colony)
        result.score += colonyScore
        result.buildings += buildings
      }
    })
  } catch (error) {
    if (!dzDefenseColonyErrorLogged) {
      dzDefenseColonyErrorLogged = true
      console.error("[PROJECT DEADZONE][Defense Recovery] Colony defense lookup failed: " + error)
    }
  }
  result.score = Math.max(0, Math.min(5, result.score))
  return result
}

function dzDefenseNearColony(player) {
  try {
    let near = false
    DZ_DEFENSE_MC_MANAGER.getInstance().getAllColonies().forEach(colony => {
      if (!near && colony.isCoordInColony(player.level, player.blockPosition())) near = true
    })
    return near
  } catch (ignored) {
    return true
  }
}

function dzDefensePrepValue(server, key) {
  return server.persistentData.getBoolean(DZ_DEFENSE_KEYS[key]) ? 1 : 0
}

function dzDefensePreparedCount(server) {
  return dzDefensePrepValue(server, "fortify") + dzDefensePrepValue(server, "provisions") + dzDefensePrepValue(server, "medical")
}

function dzDefenseResetPreparation(server) {
  server.persistentData.putBoolean(DZ_DEFENSE_KEYS.fortify, false)
  server.persistentData.putBoolean(DZ_DEFENSE_KEYS.provisions, false)
  server.persistentData.putBoolean(DZ_DEFENSE_KEYS.medical, false)
  server.persistentData.putInt(DZ_DEFENSE_KEYS.playerLoss, 0)
  server.persistentData.putInt(DZ_DEFENSE_KEYS.guardLoss, 0)
}

function dzDefenseTellPreparation(player) {
  let server = player.server
  player.tell(Text.of("[外周補強 " + (dzDefensePrepValue(server, "fortify") ? "済" : "未") + "]").yellow()
    .clickRunCommand("/deadzonedefense prepare_fortify")
    .append(Text.of("  [食料 " + (dzDefensePrepValue(server, "provisions") ? "済" : "未") + "]").gold()
      .clickRunCommand("/deadzonedefense prepare_provisions"))
    .append(Text.of("  [救護所 " + (dzDefensePrepValue(server, "medical") ? "済" : "未") + "]").aqua()
      .clickRunCommand("/deadzonedefense prepare_medical")))
}

function dzDefenseSyncQuests(player, intro) {
  if (intro) {
    dzDefenseComplete(player, DZ_DEFENSE_QUESTS.intro)
    dzDefenseComplete(player, DZ_DEFENSE_QUESTS.responsibility)
  }
  if (player.persistentData.getBoolean("dz_defense_personal_fortified")) dzDefenseComplete(player, DZ_DEFENSE_QUESTS.fortify)
  if (player.persistentData.getBoolean("dz_defense_personal_provisioned")) dzDefenseComplete(player, DZ_DEFENSE_QUESTS.provisions)
  if (player.persistentData.getBoolean("dz_defense_personal_medical")) dzDefenseComplete(player, DZ_DEFENSE_QUESTS.medical)
  if (player.persistentData.getBoolean("dz_defense_personal_defended")) dzDefenseComplete(player, DZ_DEFENSE_QUESTS.defended)
  if (player.persistentData.getBoolean("dz_defense_personal_no_loss")) dzDefenseComplete(player, DZ_DEFENSE_QUESTS.noLoss)
  if (player.persistentData.getBoolean("dz_defense_personal_colony")) dzDefenseComplete(player, DZ_DEFENSE_QUESTS.colony)
  if (player.persistentData.getBoolean("dz_defense_personal_recovered")) dzDefenseComplete(player, DZ_DEFENSE_QUESTS.recovery)
  if (player.persistentData.getBoolean("dz_defense_wilderness_survived")) dzDefenseComplete(player, DZ_DEFENSE_QUESTS.wilderness)
  let complete = player.persistentData.getBoolean("dz_defense_personal_defended") &&
    player.persistentData.getBoolean("dz_defense_personal_recovered") &&
    player.persistentData.getBoolean("dz_defense_personal_colony") &&
    player.persistentData.getBoolean("dz_defense_wilderness_survived")
  if (complete) dzDefenseComplete(player, DZ_DEFENSE_QUESTS.complete)
}

function dzDefenseStatus(player, intro) {
  if (!dzDefenseHasCamp(player.server)) {
    player.tell(Text.of("Survivor Campがまだ稼働していません。").red())
    return 0
  }
  let server = player.server
  let state = dzDefenseRaidState(server)
  let labels = ["待機", "警告・準備", "Wave 1", "Wave 2", "幕間", "防衛完了", "防衛失敗"]
  let support = dzDefenseColonySupport(server)
  let debt = server.persistentData.getInt(DZ_DEFENSE_KEYS.debt)
  if (intro) dzDefenseSyncQuests(player, true)
  player.tell(Text.of("=== PDZ 地域防衛管制 ===").gold())
  player.tell(Text.of("Camp Raid: " + (labels[state] || "不明") + "｜準備 " + dzDefensePreparedCount(server) + "/3").aqua())
  player.tell(Text.of("MineColonies支援: " + support.buildings + "施設 / 戦力" + support.score + "｜復旧負債 " + debt).gray())
  let routeBonuses = []
  if (server.persistentData.getBoolean("dz_logistics_route_road")) routeBonuses.push("道路:復旧")
  if (server.persistentData.getBoolean("dz_logistics_route_rail")) routeBonuses.push("鉄道:補強")
  if (server.persistentData.getBoolean("dz_logistics_route_sea")) routeBonuses.push("海路:食料")
  if (server.persistentData.getBoolean("dz_logistics_route_air")) routeBonuses.push("空路:医療")
  if (routeBonuses.length > 0) player.tell(Text.of("物流支援: " + routeBonuses.join(" / ")).green())
  if (debt > 0) player.tell(Text.of("非緊急の個人配給・整備サービス停止中。救急診療と交易は継続。").red())
  if (state === 1) dzDefenseTellPreparation(player)
  if (debt > 0) player.tell(Text.of("[共同復旧物資を納品]").green().clickRunCommand("/deadzonedefense repair"))
  if (state === 5 && debt === 0) player.tell(Text.of("[反復防衛契約を確認]").yellow().clickRunCommand("/deadzonedefense contract"))
  player.tell(Text.of("[野外Horde契約]").color("dark_red").clickRunCommand("/deadzonedefense wilderness"))
  return 1
}

function dzDefensePrepare(player, key) {
  let spec = DZ_DEFENSE_PREP[key]
  let server = player.server
  if (!spec || !dzDefenseAtCamp(player, 64) || dzDefenseRaidState(server) !== 1) {
    player.tell(Text.of("準備納品はCampの襲撃警告中だけ受け付けます。").red())
    return 0
  }
  if (server.persistentData.getBoolean(DZ_DEFENSE_KEYS[key])) {
    player.tell(Text.of(spec.label + "はすでに共有準備済みです。二重納品はされません。").yellow())
    return 0
  }
  let costs = dzDefensePrepCosts(server, key)
  if (!dzDefenseCanPay(player, costs)) {
    player.tell(Text.of(spec.label + "に必要: " + dzDefenseCostText(costs)).red())
    return 0
  }
  dzDefenseConsume(player, costs)
  server.persistentData.putBoolean(DZ_DEFENSE_KEYS[key], true)
  server.persistentData.putBoolean("dz_defense_ever_" + (key === "fortify" ? "fortified" : key === "provisions" ? "provisioned" : "medical"), true)
  player.persistentData.putBoolean("dz_defense_personal_" + (key === "fortify" ? "fortified" : key === "provisions" ? "provisioned" : "medical"), true)
  dzDefenseComplete(player, spec.quest)
  server.players.forEach(target => target.tell(Text.of("[DEFENSE] " + player.username + "が" + spec.label + "を完了。共有準備 " + dzDefensePreparedCount(server) + "/3").green()))
  return 1
}

function dzDefenseSetDebt(server, debt) {
  debt = Math.max(0, Math.min(8, debt))
  server.persistentData.putInt(DZ_DEFENSE_KEYS.debt, debt)
  server.persistentData.putBoolean(DZ_DEFENSE_KEYS.disrupted, debt > 0)
  server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
}

function dzDefenseAddReputation(server, security, restoration) {
  server.persistentData.putInt("dz_camp_security_reputation", server.persistentData.getInt("dz_camp_security_reputation") + security)
  server.persistentData.putInt("dz_camp_restoration_reputation", server.persistentData.getInt("dz_camp_restoration_reputation") + restoration)
  server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
}

function dzDefenseOnWarning(server) {
  dzDefenseResetPreparation(server)
  server.persistentData.putInt(DZ_DEFENSE_KEYS.eventSerial, server.persistentData.getInt(DZ_DEFENSE_KEYS.eventSerial) + 1)
  server.players.forEach(player => {
    if (!dzDefenseAtCamp(player, 112)) return
    player.tell(Text.of("[防衛準備を開く]").yellow().bold().clickRunCommand("/deadzonedefense status"))
  })
}

function dzDefenseOnWave(server, wave) {
  if (wave !== 1) return
  let support = dzDefenseColonySupport(server)
  if (support.score > 0) {
    server.runCommandSilent('tellraw @a [{"text":"[DEFENSE] ","color":"aqua","bold":true},{"text":"MineColonies監視塔・兵舎から戦況情報を受信。支援戦力 ' + support.score + '/5","color":"aqua"}]')
  }
}

function dzDefenseOnComplete(server) {
  let players = server.persistentData.getInt(DZ_DEFENSE_KEYS.playerLoss)
  let guards = server.persistentData.getInt(DZ_DEFENSE_KEYS.guardLoss)
  let support = dzDefenseColonySupport(server)
  let reduction = dzDefensePreparedCount(server) + (support.score >= 3 ? 1 : 0)
  let debt = Math.max(0, Math.min(8, 2 + players + guards - reduction))
  let noLoss = players === 0 && guards === 0
  dzDefenseSetDebt(server, debt)
  server.persistentData.putInt(DZ_DEFENSE_KEYS.completions, server.persistentData.getInt(DZ_DEFENSE_KEYS.completions) + 1)
  server.persistentData.putLong(DZ_DEFENSE_KEYS.nextContract, dzDefenseGameTime(server) + 72000)
  server.persistentData.putBoolean("dz_defense_ever_defended", true)
  if (noLoss) server.persistentData.putBoolean("dz_defense_ever_no_loss", true)
  if (support.score > 0) server.persistentData.putBoolean("dz_defense_ever_colony_support", true)
  dzDefenseAddReputation(server, noLoss ? 4 : 2, 0)
  dzDefenseForParticipants(server, player => {
    player.persistentData.putBoolean("dz_defense_personal_defended", true)
    dzDefenseComplete(player, DZ_DEFENSE_QUESTS.defended)
    if (noLoss) {
      player.persistentData.putBoolean("dz_defense_personal_no_loss", true)
      dzDefenseComplete(player, DZ_DEFENSE_QUESTS.noLoss)
    }
    if (support.score > 0) {
      player.persistentData.putBoolean("dz_defense_personal_colony", true)
      dzDefenseComplete(player, DZ_DEFENSE_QUESTS.colony)
    }
  })
  if (typeof dzMcOpsRecordPdzDefense === "function") support.colonies.forEach(colony => dzMcOpsRecordPdzDefense(server, colony, !noLoss))
  if (debt === 0) {
    server.persistentData.putBoolean("dz_defense_ever_recovered", true)
    dzDefenseForParticipants(server, player => {
      player.persistentData.putBoolean("dz_defense_personal_recovered", true)
      dzDefenseComplete(player, DZ_DEFENSE_QUESTS.recovery)
      dzDefenseSyncQuests(player, false)
    })
    server.runCommandSilent('tellraw @a {"text":"[DEFENSE] 準備が被害を吸収。Campは通常運営を継続する。","color":"green"}')
  } else {
    server.runCommandSilent('tellraw @a {"text":"[DEFENSE] 復旧負債 ' + debt + '。非緊急サービスを一時停止。","color":"red"}')
  }
}

function dzDefenseOnFail(server) {
  let debt = 5 + server.persistentData.getInt(DZ_DEFENSE_KEYS.playerLoss) + server.persistentData.getInt(DZ_DEFENSE_KEYS.guardLoss)
  dzDefenseSetDebt(server, debt)
  server.runCommandSilent('tellraw @a {"text":"[DEFENSE] Campは壊滅しない。共同物資でCoreとサービスを復旧できる。","color":"yellow"}')
}

function dzDefenseRepair(player) {
  let server = player.server
  let debt = server.persistentData.getInt(DZ_DEFENSE_KEYS.debt)
  let road = server.persistentData.getBoolean("dz_logistics_route_road")
  let costs = [["minecraft:stone_bricks", road ? 12 : 16], ["minecraft:iron_ingot", road ? 3 : 4], ["minecraft:bread", 4], ["legendarysurvivaloverhaul:bandage", 1]]
  if (!dzDefenseAtCamp(player, 64) || debt <= 0) {
    player.tell(Text.of(debt <= 0 ? "Campに復旧負債はありません。" : "共同復旧はCamp内で行ってください。").yellow())
    return 0
  }
  if (!dzDefenseCanPay(player, costs)) {
    player.tell(Text.of("復旧1段階に必要: " + dzDefenseCostText(costs)).red())
    return 0
  }
  dzDefenseConsume(player, costs)
  debt--
  dzDefenseSetDebt(server, debt)
  server.players.forEach(target => target.tell(Text.of("[RECOVERY] " + player.username + "が復旧物資を納品。残り " + debt).green()))
  if (debt > 0) return 1
  server.runCommandSilent("execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1] run setblock ~ ~ ~ kubejs:deadzone_base_core")
  server.runCommandSilent("execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1] run function project_deadzone:basecamp/restore_guards_at_core")
  server.persistentData.putBoolean("dz_defense_ever_recovered", true)
  dzDefenseAddReputation(server, 0, 2)
  player.persistentData.putBoolean("dz_defense_personal_recovered", true)
  dzDefenseComplete(player, DZ_DEFENSE_QUESTS.recovery)
  dzDefenseSyncQuests(player, false)
  let nextState = server.persistentData.getInt(DZ_DEFENSE_KEYS.completions) > 0 ? 5 : 0
  server.persistentData.putInt("dz_basecamp_first_raid_state", nextState)
  server.runCommandSilent('tellraw @a {"text":"[RECOVERY] Base Core、警備配置、非緊急サービスが復旧した。","color":"green","bold":true}')
  return 1
}

function dzDefenseContract(player) {
  let server = player.server
  let now = dzDefenseGameTime(server)
  let next = server.persistentData.getLong(DZ_DEFENSE_KEYS.nextContract)
  if (!dzDefenseAtCamp(player, 64) || dzDefenseRaidState(server) !== 5 || server.persistentData.getInt(DZ_DEFENSE_KEYS.debt) > 0) {
    player.tell(Text.of("反復防衛契約は、防衛済みかつ復旧完了したCampで受けられます。").red())
    return 0
  }
  if (now < next) {
    player.tell(Text.of("次の防衛契約まで約 " + Math.ceil((next - now) / 24000) + "日です。").yellow())
    return 0
  }
  if (typeof dzRaidStartWarning !== "function") return 0
  dzRaidStartWarning(server, now)
  return 1
}

function dzDefenseWilderness(player) {
  let server = player.server
  if (server.persistentData.getInt(DZ_DEFENSE_KEYS.completions) <= 0) {
    player.tell(Text.of("先にSurvivor Campの初回防衛を完了してください。").red())
    return 0
  }
  if (player.persistentData.getBoolean("dz_defense_wilderness_active")) {
    player.tell(Text.of("すでに野外Horde契約が進行中です。").yellow())
    return 0
  }
  if (dzDefenseAtCamp(player, 160) || dzDefenseNearColony(player)) {
    player.tell(Text.of("The Hordesは野外担当です。Campから160m以上離れ、MineColonies領域外で開始してください。").red())
    return 0
  }
  let now = dzDefenseGameTime(server)
  let next = player.persistentData.getLong("dz_defense_wilderness_next")
  if (now < next) {
    player.tell(Text.of("次の野外Horde契約まで約 " + Math.ceil((next - now) / 24000) + "日です。").yellow())
    return 0
  }
  let result = server.runCommandSilent("execute as " + player.username + " at @s run hordes start 3000 hordes:default")
  if (result <= 0) {
    player.tell(Text.of("The Hordesの開始に失敗しました。サーバーログを確認してください。").red())
    return 0
  }
  player.persistentData.putBoolean("dz_defense_wilderness_active", true)
  player.persistentData.putInt("dz_defense_wilderness_remaining", 3000)
  player.tell(Text.of("野外Horde契約開始。150秒生存せよ。Camp・コロニーへ敵を持ち帰ると失敗。").color("dark_red").bold())
  return 1
}

function dzDefenseStopWilderness(player, success, reason) {
  player.server.runCommandSilent("hordes stop " + player.username)
  player.persistentData.putBoolean("dz_defense_wilderness_active", false)
  player.persistentData.putInt("dz_defense_wilderness_remaining", 0)
  player.persistentData.putLong("dz_defense_wilderness_next", dzDefenseGameTime(player.server) + 72000)
  if (success) {
    player.persistentData.putBoolean("dz_defense_wilderness_survived", true)
    dzDefenseComplete(player, DZ_DEFENSE_QUESTS.wilderness)
    player.give(Item.of("apocalypsenow:money", 8))
    player.tell(Text.of("野外Hordeを生還。感染者を居住圏へ誘導せず排除した。Money x8").green().bold())
    dzDefenseSyncQuests(player, false)
  } else player.tell(Text.of("野外Horde契約失敗: " + reason).red())
}

function dzDefenseAdminReset(server) {
  dzDefenseResetPreparation(server)
  dzDefenseSetDebt(server, 0)
}

EntityEvents.death(event => {
  let entity = event.entity
  if (!entity || !event.server) return
  let server = event.server
  let state = dzDefenseRaidState(server)
  if (String(entity.type) === "minecraft:player" && entity.persistentData.getBoolean("dz_defense_wilderness_active")) {
    dzDefenseStopWilderness(entity, false, "契約中に死亡")
  }
  if (state < 1 || state > 4) return
  if (String(entity.type) === "minecraft:player" && dzDefenseAtCamp(entity, 112)) {
    server.persistentData.putInt(DZ_DEFENSE_KEYS.playerLoss, server.persistentData.getInt(DZ_DEFENSE_KEYS.playerLoss) + 1)
  } else if (entity.tags && entity.tags.contains("dz_basecamp_guard")) {
    server.persistentData.putInt(DZ_DEFENSE_KEYS.guardLoss, server.persistentData.getInt(DZ_DEFENSE_KEYS.guardLoss) + 1)
  }
})

ServerEvents.tick(event => {
  dzDefenseTick++
  if (dzDefenseTick % 20 !== 0) return
  event.server.players.forEach(player => {
    if (!player.persistentData.getBoolean("dz_defense_wilderness_active")) return
    if (dzDefenseAtCamp(player, 160) || dzDefenseNearColony(player)) {
      dzDefenseStopWilderness(player, false, "居住圏へ帰還した")
      return
    }
    let remaining = Math.max(0, player.persistentData.getInt("dz_defense_wilderness_remaining") - 20)
    player.persistentData.putInt("dz_defense_wilderness_remaining", remaining)
    if (remaining === 0) dzDefenseStopWilderness(player, true, "")
  })
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonedefense")
  root.executes(ctx => dzDefenseStatus(ctx.source.player, true))
  root.then(Commands.literal("status").executes(ctx => dzDefenseStatus(ctx.source.player, true)))
  root.then(Commands.literal("prepare_fortify").executes(ctx => dzDefensePrepare(ctx.source.player, "fortify")))
  root.then(Commands.literal("prepare_provisions").executes(ctx => dzDefensePrepare(ctx.source.player, "provisions")))
  root.then(Commands.literal("prepare_medical").executes(ctx => dzDefensePrepare(ctx.source.player, "medical")))
  root.then(Commands.literal("repair").executes(ctx => dzDefenseRepair(ctx.source.player)))
  root.then(Commands.literal("contract").executes(ctx => dzDefenseContract(ctx.source.player)))
  root.then(Commands.literal("wilderness").executes(ctx => dzDefenseWilderness(ctx.source.player)))
  root.then(Commands.literal("reset_test").requires(source => source.hasPermission(2)).executes(ctx => {
    let server = ctx.source.server
    dzDefenseAdminReset(server)
    ;["dz_defense_ever_fortified", "dz_defense_ever_provisioned", "dz_defense_ever_medical", "dz_defense_ever_defended", "dz_defense_ever_no_loss", "dz_defense_ever_colony_support", "dz_defense_ever_recovered"].forEach(key => server.persistentData.putBoolean(key, false))
    server.persistentData.putInt(DZ_DEFENSE_KEYS.completions, 0)
    server.persistentData.putLong(DZ_DEFENSE_KEYS.nextContract, 0)
    ctx.source.player.persistentData.putBoolean("dz_defense_wilderness_survived", false)
    ;["fortified", "provisioned", "medical", "defended", "no_loss", "colony", "recovered"].forEach(key => ctx.source.player.persistentData.putBoolean("dz_defense_personal_" + key, false))
    if (ctx.source.player.persistentData.getBoolean("dz_defense_wilderness_active")) dzDefenseStopWilderness(ctx.source.player, false, "管理者リセット")
    ctx.source.player.tell(Text.of("地域防衛の試験フラグを初期化しました。評判は戻していません。").yellow())
    return 1
  }))
  event.register(root)
})

PlayerEvents.loggedIn(event => event.player.server.scheduleInTicks(220, callback => dzDefenseSyncQuests(event.player, false)))

console.info("[PROJECT DEADZONE][Defense Recovery] v0.1 loaded.")
