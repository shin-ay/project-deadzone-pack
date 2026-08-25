// PROJECT DEADZONE MineColonies operations bridge v0.1
// Reads the public MineColonies API. No colony NBT mutation and no raid spawning.

const DZ_MC_OPS_COLONY_MANAGER = Java.loadClass("com.minecolonies.api.colony.IColonyManager")

const DZ_MC_OPS_QUESTS = {
  intro: "6D4B010000000101",
  population5: "6D4B010000000102",
  population10: "6D4B010000000103",
  population20: "6D4B010000000104",
  happiness7: "6D4B010000000105",
  research1: "6D4B010000000106",
  logistics1: "6D4B010000000107",
  raid1: "6D4B010000000108",
  regional: "6D4B010000000109"
}

let dzMcOpsTick = 0
let dzMcOpsLookupErrorLogged = false
let dzMcOpsSnapshotErrorLogged = false
let dzMcOpsRaidErrorLogged = false

function dzMcOpsColonyKey(colony, suffix) {
  return "dz_mc_ops_c" + colony.getID() + "_" + suffix
}

function dzMcOpsOwnedColony(player) {
  try {
    return DZ_MC_OPS_COLONY_MANAGER.getInstance().getIColonyByOwner(player.level, player.uuid)
  } catch (error) {
    if (!dzMcOpsLookupErrorLogged) {
      dzMcOpsLookupErrorLogged = true
      console.error("[PROJECT DEADZONE][MineColonies Ops] Colony lookup failed: " + error)
    }
    return null
  }
}

function dzMcOpsSnapshot(colony) {
  let raiders = colony.getRaiderManager()
  return {
    id: colony.getID(),
    name: "" + colony.getName(),
    population: colony.getCitizenManager().getCurrentCitizenCount(),
    capacity: colony.getCitizenManager().getMaxCitizens(),
    happiness: Number(colony.getOverallHappiness()),
    research: colony.getResearchManager().getResearchTree().getCompletedList().size(),
    playerRequests: colony.getRequestManager().getPlayerResolver().getAllAssignedRequests().size(),
    raided: colony.isColonyUnderAttack() || raiders.isRaided(),
    lostCitizen: raiders.getLostCitizen(),
    raidLevel: raiders.getColonyRaidLevel()
  }
}

function dzMcOpsCompleteQuest(player, questId) {
  if (player) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + questId)
}

function dzMcOpsAddReputation(server, supply, security, restoration) {
  if (supply > 0) server.persistentData.putInt("dz_life_supply_reputation", server.persistentData.getInt("dz_life_supply_reputation") + supply)
  if (security > 0) server.persistentData.putInt("dz_camp_security_reputation", server.persistentData.getInt("dz_camp_security_reputation") + security)
  if (restoration > 0) server.persistentData.putInt("dz_camp_restoration_reputation", server.persistentData.getInt("dz_camp_restoration_reputation") + restoration)
  server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
}

function dzMcOpsCommunityRank1(server) {
  return server.persistentData.getInt("dz_camp_development_level") >= 1 &&
    server.persistentData.getInt("dz_life_supply_reputation") >= 10 &&
    server.persistentData.getInt("dz_camp_security_reputation") >= 10 &&
    server.persistentData.getInt("dz_camp_restoration_reputation") >= 10
}

function dzMcOpsGrant(server, player, colony, milestone, title, questId, supply, security, restoration) {
  let key = dzMcOpsColonyKey(colony, "claimed_" + milestone)
  if (server.persistentData.getBoolean(key)) {
    dzMcOpsCompleteQuest(player, questId)
    return false
  }
  server.persistentData.putBoolean(key, true)
  dzMcOpsAddReputation(server, supply, security, restoration)
  dzMcOpsCompleteQuest(player, questId)
  server.players.forEach(target => target.tell(Text.of("[COLONY OPS] " + colony.getName() + "：" + title + "  Supply +" + supply + " / Security +" + security + " / Restoration +" + restoration).green()))
  return true
}

function dzMcOpsObserveRaid(server, colony, snapshot) {
  let seenKey = dzMcOpsColonyKey(colony, "raid_seen")
  let lossKey = dzMcOpsColonyKey(colony, "raid_loss_seen")
  if (snapshot.raided) {
    server.persistentData.putBoolean(seenKey, true)
    if (snapshot.lostCitizen) server.persistentData.putBoolean(lossKey, true)
    return
  }
  if (!server.persistentData.getBoolean(seenKey)) return
  let hadLoss = server.persistentData.getBoolean(lossKey)
  dzMcOpsGrant(server, null, colony, "raid1", hadLoss ? "襲撃対応完了（犠牲あり）" : "無犠牲で襲撃を防衛", DZ_MC_OPS_QUESTS.raid1, 0, hadLoss ? 2 : 5, 0)
  server.persistentData.putBoolean(seenKey, false)
  server.persistentData.putBoolean(lossKey, false)
}

// MineColonies barbarian spawning is intentionally disabled in PDZ. A real,
// completed Guard Tower or Barracks contributes to the authored Camp defense
// instead, and that participation satisfies the same regional defense audit.
function dzMcOpsRecordPdzDefense(server, colony, hadLoss) {
  if (!colony) return false
  return dzMcOpsGrant(server, null, colony, "raid1", hadLoss ? "地域防衛支援完了（損害あり）" : "地域防衛支援完了（無犠牲）", DZ_MC_OPS_QUESTS.raid1, 0, hadLoss ? 2 : 5, 0)
}

function dzMcOpsSyncClaimedQuests(player, colony) {
  let server = player.server
  Object.keys(DZ_MC_OPS_QUESTS).forEach(milestone => {
    if (server.persistentData.getBoolean(dzMcOpsColonyKey(colony, "claimed_" + milestone))) {
      dzMcOpsCompleteQuest(player, DZ_MC_OPS_QUESTS[milestone])
    }
  })
}

function dzMcOpsAudit(player, announce) {
  let colony = dzMcOpsOwnedColony(player)
  if (!colony) {
    if (announce) {
      player.tell(Text.of("所有しているMineColoniesコロニーを取得できません。コロニー所有者が実行してください。").red())
      player.tell(Text.of("FTBパーティーの進捗は共有されるため、監査は所有者1名だけで大丈夫です。").gray())
    }
    return 0
  }

  let server = player.server
  let snapshot
  try {
    snapshot = dzMcOpsSnapshot(colony)
  } catch (error) {
    if (announce) player.tell(Text.of("MineColonies運営データの読み取りに失敗しました。ログを確認してください。").red())
    if (!dzMcOpsSnapshotErrorLogged) {
      dzMcOpsSnapshotErrorLogged = true
      console.error("[PROJECT DEADZONE][MineColonies Ops] Snapshot failed: " + error)
    }
    return 0
  }

  dzMcOpsObserveRaid(server, colony, snapshot)
  dzMcOpsGrant(server, player, colony, "intro", "地域運営監査を開始", DZ_MC_OPS_QUESTS.intro, 0, 0, 0)
  if (snapshot.population >= 5) dzMcOpsGrant(server, player, colony, "population5", "人口5人へ成長", DZ_MC_OPS_QUESTS.population5, 0, 0, 2)
  if (snapshot.population >= 10) dzMcOpsGrant(server, player, colony, "population10", "人口10人へ成長", DZ_MC_OPS_QUESTS.population10, 1, 0, 3)
  if (snapshot.population >= 20) dzMcOpsGrant(server, player, colony, "population20", "人口20人へ成長", DZ_MC_OPS_QUESTS.population20, 2, 0, 5)
  if (snapshot.happiness >= 7.0) dzMcOpsGrant(server, player, colony, "happiness7", "総合幸福度7.0を達成", DZ_MC_OPS_QUESTS.happiness7, 3, 0, 0)
  if (snapshot.research >= 1) dzMcOpsGrant(server, player, colony, "research1", "最初の研究を完了", DZ_MC_OPS_QUESTS.research1, 0, 0, 3)

  let requestSeenKey = dzMcOpsColonyKey(colony, "player_request_seen")
  if (snapshot.playerRequests > 0) server.persistentData.putBoolean(requestSeenKey, true)
  if (snapshot.playerRequests === 0 && server.persistentData.getBoolean(requestSeenKey)) {
    dzMcOpsGrant(server, player, colony, "logistics1", "プレイヤー待ち要求を解消", DZ_MC_OPS_QUESTS.logistics1, 4, 0, 0)
  }

  let required = ["population20", "happiness7", "research1", "logistics1", "raid1"]
  let regionalReady = required.every(name => server.persistentData.getBoolean(dzMcOpsColonyKey(colony, "claimed_" + name)))
  let communityReady = dzMcOpsCommunityRank1(server)
  if (communityReady) dzMcOpsCompleteQuest(player, "6D4A010000000102")
  if (regionalReady && communityReady) dzMcOpsGrant(server, player, colony, "regional", "地域協力コロニーへ認定", DZ_MC_OPS_QUESTS.regional, 3, 3, 3)
  dzMcOpsSyncClaimedQuests(player, colony)

  if (announce) {
    player.tell(Text.of("=== MineColonies 地域運営監査 ===").aqua())
    player.tell(Text.of(snapshot.name + "  Colony #" + snapshot.id).aqua())
    player.tell(Text.of("人口 " + snapshot.population + "/" + snapshot.capacity + "｜幸福度 " + snapshot.happiness.toFixed(2) + "/10｜完了研究 " + snapshot.research).gray())
    player.tell(Text.of("プレイヤー待ち要求 " + snapshot.playerRequests + "｜Raid " + (snapshot.raided ? "発生中 Lv" + snapshot.raidLevel : "なし")).gray())
    if (!server.persistentData.getBoolean(dzMcOpsColonyKey(colony, "claimed_logistics1"))) {
      player.tell(Text.of("物流試験：要求が1件以上ある時と、解消後の2回監査すると達成になります。").yellow())
    }
    if (!server.persistentData.getBoolean(dzMcOpsColonyKey(colony, "claimed_raid1"))) {
      player.tell(Text.of("防衛試験：完成した監視塔・兵舎でPDZ Camp防衛を支援すると達成。外部設定でMineColonies Raidを有効にした場合も監視します。").yellow())
    }
    player.tell(Text.of("[地域経済を確認]").aqua().clickRunCommand("/deadzonecommunity"))
  }
  return 1
}

function dzMcOpsObserveAllRaids(server) {
  try {
    let colonies = DZ_MC_OPS_COLONY_MANAGER.getInstance().getAllColonies()
    colonies.forEach(colony => dzMcOpsObserveRaid(server, colony, dzMcOpsSnapshot(colony)))
  } catch (error) {
    if (!dzMcOpsRaidErrorLogged) {
      dzMcOpsRaidErrorLogged = true
      console.error("[PROJECT DEADZONE][MineColonies Ops] Raid observer failed: " + error)
    }
  }
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonecolonyops")
  root.executes(ctx => dzMcOpsAudit(ctx.source.player, true))
  root.then(Commands.literal("status").executes(ctx => dzMcOpsAudit(ctx.source.player, true)))
  root.then(Commands.literal("audit").executes(ctx => dzMcOpsAudit(ctx.source.player, true)))
  root.then(Commands.literal("reset_test").requires(source => source.hasPermission(2)).executes(ctx => {
    let colony = dzMcOpsOwnedColony(ctx.source.player)
    if (!colony) return 0
    let names = Object.keys(DZ_MC_OPS_QUESTS)
    names.forEach(name => ctx.source.server.persistentData.putBoolean(dzMcOpsColonyKey(colony, "claimed_" + name), false))
    ctx.source.server.persistentData.putBoolean(dzMcOpsColonyKey(colony, "player_request_seen"), false)
    ctx.source.server.persistentData.putBoolean(dzMcOpsColonyKey(colony, "raid_seen"), false)
    ctx.source.server.persistentData.putBoolean(dzMcOpsColonyKey(colony, "raid_loss_seen"), false)
    ctx.source.player.tell(Text.of("このコロニーの運営監査フラグだけをテスト用に初期化しました。評判値は戻していません。").yellow())
    return 1
  }))
  event.register(root)
})

ServerEvents.tick(event => {
  dzMcOpsTick++
  if (dzMcOpsTick % 100 === 0) dzMcOpsObserveAllRaids(event.server)
  if (dzMcOpsTick % 600 === 0) event.server.players.forEach(player => dzMcOpsAudit(player, false))
})

PlayerEvents.loggedIn(event => event.player.server.scheduleInTicks(200, callback => dzMcOpsAudit(event.player, false)))

console.info("[PROJECT DEADZONE][MineColonies Ops] v0.1 loaded.")
