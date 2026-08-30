// PROJECT DEADZONE injury, infection and recovery bridge v0.2
// M&S current/max HP is authoritative. LSO stores localized injury ratios and
// effects only; The Hordes/Infectious stores infection state.

const DZ_HEALTH_BODY_UTIL = Java.loadClass("sfiomn.legendarysurvivaloverhaul.api.bodydamage.BodyDamageUtil")
const DZ_HEALTH_BODY_PART = Java.loadClass("sfiomn.legendarysurvivaloverhaul.api.bodydamage.BodyPartEnum")
const DZ_HEALTH_MNS = Java.loadClass("com.robertx22.mine_and_slash.uncommon.utilityclasses.HealthUtils")

const DZ_HEALTH_QUESTS = {
  intro: "6D4F010000000101",
  lightSeen: "6D4F010000000102",
  severeSeen: "6D4F010000000103",
  lightTreated: "6D4F010000000104",
  traumaTreated: "6D4F010000000105",
  infectionTreated: "6D4F010000000106",
  medic: "6D4F010000000107",
  recoveryMenu: "6D4F010000000108",
  hospital: "6D4F010000000109",
  complete: "6D4F01000000010A"
}

const DZ_HEALTH_PARTS = [
  {part: DZ_HEALTH_BODY_PART.HEAD, name: "頭部"},
  {part: DZ_HEALTH_BODY_PART.CHEST, name: "胴体"},
  {part: DZ_HEALTH_BODY_PART.LEFT_ARM, name: "左腕"},
  {part: DZ_HEALTH_BODY_PART.RIGHT_ARM, name: "右腕"},
  {part: DZ_HEALTH_BODY_PART.LEFT_LEG, name: "左脚"},
  {part: DZ_HEALTH_BODY_PART.RIGHT_LEG, name: "右脚"},
  {part: DZ_HEALTH_BODY_PART.LEFT_FOOT, name: "左足"},
  {part: DZ_HEALTH_BODY_PART.RIGHT_FOOT, name: "右足"}
]

const DZ_HEALTH_INFECTIONS = [
  "hordes:infected",
  "apocalypsenow:infection",
  "apocalypsenow:posinfectioneffect",
  "infectious:infection"
]

let dzHealthApiErrorLogged = false
let dzHealthColonyErrorLogged = false

function dzHealthAtCamp(player) {
  return player.server.runCommandSilent("execute as " + player.username +
    " at @s if entity @e[tag=dz_basecamp_core_anchor,distance=..32,limit=1]") > 0
}

function dzHealthComplete(player, id) {
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + id)
}

function dzHealthSnapshot(player) {
  try {
    let parts = DZ_HEALTH_PARTS.map(entry => {
      let ratio = Math.max(0, Math.min(1, Number(DZ_HEALTH_BODY_UTIL.getHealthRatio(player, entry.part))))
      return {part: entry.part, name: entry.name, ratio: ratio, max: Number(DZ_HEALTH_BODY_UTIL.getMaxHealth(player, entry.part))}
    })
    parts.sort((a, b) => a.ratio - b.ratio)
    let minimum = parts.length > 0 ? parts[0].ratio : 1
    let severity = minimum >= 0.70 ? 0 : minimum >= 0.40 ? 1 : 2
    return {parts: parts, worst: parts[0], minimum: minimum, severity: severity}
  } catch (error) {
    if (!dzHealthApiErrorLogged) {
      dzHealthApiErrorLogged = true
      console.error("[PROJECT DEADZONE][Health Recovery] LSO body damage API failed: " + error)
    }
    return null
  }
}

function dzHealthHasInfection(player) {
  for (let i = 0; i < DZ_HEALTH_INFECTIONS.length; i++) {
    if (player.hasEffect(DZ_HEALTH_INFECTIONS[i])) return true
  }
  return false
}

function dzHealthCureInfection(player) {
  let cured = false
  DZ_HEALTH_INFECTIONS.forEach(id => {
    if (player.hasEffect(id)) {
      player.removeEffect(id)
      cured = true
    }
  })
  if (cured) {
    player.potionEffects.add("hordes:immunity", 6000, 0, false, true)
    dzHealthRecordInfectionTreatment(player)
  }
  return cured
}

function dzHealthRecordInfectionTreatment(player) {
  player.persistentData.putBoolean("dz_health_infection_treated", true)
  dzHealthComplete(player, DZ_HEALTH_QUESTS.infectionTreated)
  dzHealthSyncQuests(player)
}

function dzHealthSeverityName(severity) {
  return ["安定", "軽傷", "重傷"][Math.max(0, Math.min(2, severity))]
}

function dzHealthSeverityColor(severity) {
  return ["green", "yellow", "red"][Math.max(0, Math.min(2, severity))]
}

function dzHealthMarkSeen(player, snapshot) {
  dzHealthComplete(player, DZ_HEALTH_QUESTS.intro)
  if (snapshot.severity >= 1) {
    player.persistentData.putBoolean("dz_health_light_seen", true)
    dzHealthComplete(player, DZ_HEALTH_QUESTS.lightSeen)
  }
  if (snapshot.severity >= 2) {
    player.persistentData.putBoolean("dz_health_severe_seen", true)
    dzHealthComplete(player, DZ_HEALTH_QUESTS.severeSeen)
  }
}

function dzHealthShioriRank(player) {
  if (typeof dzPeopleRank === "function") return dzPeopleRank(player, "shiori")
  let trust = Math.max(0, player.persistentData.getInt("dz_trust_shiori"))
  return trust >= 30 ? 3 : trust >= 15 ? 2 : trust >= 5 ? 1 : 0
}

function dzHealthHospitalLevel(player) {
  try {
    if (typeof dzMcOpsOwnedColony !== "function") return 0
    let colony = dzMcOpsOwnedColony(player)
    if (!colony) return 0
    let level = 0
    colony.getServerBuildingManager().getBuildings().values().forEach(building => {
      let type = String(building.getBuildingType().getRegistryName())
      if (type.indexOf("hospital") >= 0) level = Math.max(level, Number(building.getBuildingLevel()))
    })
    return Math.max(0, Math.min(5, level))
  } catch (error) {
    if (!dzHealthColonyErrorLogged) {
      dzHealthColonyErrorLogged = true
      console.error("[PROJECT DEADZONE][Health Recovery] MineColonies hospital lookup failed: " + error)
    }
    return 0
  }
}

function dzHealthItemCount(player, id) {
  return player.server.runCommandSilent("clear " + player.username + " " + id + " 0")
}

function dzHealthCanPay(player, items, money) {
  for (let i = 0; i < items.length; i++) {
    if (dzHealthItemCount(player, items[i][0]) < items[i][1]) return false
  }
  return dzHealthItemCount(player, "apocalypsenow:money") >= money
}

function dzHealthConsume(player, items, money) {
  items.forEach(entry => player.runCommandSilent("clear @s " + entry[0] + " " + entry[1]))
  if (money > 0) player.runCommandSilent("clear @s apocalypsenow:money " + money)
}

function dzHealthTellCost(player, items, money) {
  items.forEach(entry => player.tell(Text.of("- " + entry[0] + " " + dzHealthItemCount(player, entry[0]) + "/" + entry[1]).gray()))
  player.tell(Text.of("- Money " + dzHealthItemCount(player, "apocalypsenow:money") + "/" + money).gray())
}

function dzHealthHealOverTime(player, part, amount, ticks) {
  DZ_HEALTH_BODY_UTIL.applyHealingTimeBodyPart(player, part, Number(amount), Number(ticks))
}

function dzHealthMnsCurrent(player) {
  try { return Math.max(0, Number(DZ_HEALTH_MNS.getCurrentHealth(player))) }
  catch (ignored) { return Math.max(0, Number(player.health)) }
}

function dzHealthMnsMax(player) {
  try { return Math.max(1, Number(DZ_HEALTH_MNS.getMaxHealth(player))) }
  catch (ignored) { return Math.max(1, Number(player.maxHealth)) }
}

function dzHealthHealMnsRatio(player, ratio) {
  let safeRatio = Math.max(0, Math.min(1, Number(ratio)))
  if (safeRatio <= 0) return
  // HealthUtils#heal consumes vanilla-space health. realToVanilla converts a
  // requested M&S amount without creating a second HP pool.
  let mnsAmount = dzHealthMnsMax(player) * safeRatio
  let vanillaAmount = Number(DZ_HEALTH_MNS.realToVanilla(player, mnsAmount))
  DZ_HEALTH_MNS.heal(player, Math.max(0, vanillaAmount))
}

function dzHealthAdminRestoreLimbs(player) {
  DZ_HEALTH_PARTS.forEach(entry => {
    let max = Number(DZ_HEALTH_BODY_UTIL.getMaxHealth(player, entry.part))
    DZ_HEALTH_BODY_UTIL.healBodyPart(player, entry.part, max * 2)
  })
  dzHealthHealMnsRatio(player, 1)
}

function dzHealthStatus(player, completeIntro) {
  let snapshot = dzHealthSnapshot(player)
  if (!snapshot) {
    player.tell(Text.of("部位負傷データを取得できません。latest.logを確認してください。").red())
    return 0
  }
  if (completeIntro) dzHealthMarkSeen(player, snapshot)
  let infected = dzHealthHasInfection(player)
  let hospital = dzHealthHospitalLevel(player)
  let shiori = dzHealthShioriRank(player)
  player.tell(Text.of("=== PDZ 診断記録 ===").aqua())
  player.tell(Text.of("M&S HP: " + dzHealthMnsCurrent(player) + " / " + dzHealthMnsMax(player) + "（死亡判定の正本）").aqua())
  player.tell(Text.of("総合判定: " + dzHealthSeverityName(snapshot.severity) + "｜最低部位 " + snapshot.worst.name + " " + Math.round(snapshot.minimum * 100) + "%").color(dzHealthSeverityColor(snapshot.severity)))
  player.tell(Text.of("感染検査: " + (infected ? "陽性" : "陰性")).color(infected ? "red" : "green"))
  player.tell(Text.of("シオリ信頼 Rank " + shiori + "｜MineColonies病院 Lv" + hospital).gray())
  snapshot.parts.forEach(entry => {
    let color = entry.ratio < 0.40 ? "red" : entry.ratio < 0.70 ? "yellow" : "green"
    player.tell(Text.of(entry.name + "  " + Math.round(entry.ratio * 100) + "%").color(color))
  })
  if (dzHealthAtCamp(player)) {
    player.tell(Text.of("[軽傷処置]").yellow().clickRunCommand("/deadzonehealth treat_light")
      .append(Text.of("  [重傷処置]").red().clickRunCommand("/deadzonehealth treat_trauma"))
      .append(Text.of("  [感染治療]").lightPurple().clickRunCommand("/deadzonehealth treat_infection")))
  } else player.tell(Text.of("Camp外ではLSO包帯・Medkit・抗生物質で応急処置し、重傷なら帰還してください。").yellow())
  player.tell(Text.of("睡眠は部位を45%、体力を75%まで回復。回復献立のComfort/Regenerationでも部位回復が進みます。").green())
  return 1
}

function dzHealthTreatLight(player) {
  if (!dzHealthAtCamp(player)) { player.tell(Text.of("軽傷処置はSurvivor Campで受けてください。").red()); return 0 }
  let snapshot = dzHealthSnapshot(player)
  if (!snapshot || snapshot.severity === 0) { player.tell(Text.of("処置が必要な部位負傷はありません。").green()); return 0 }
  let price = Math.max(1, 4 - dzHealthShioriRank(player))
  let items = [["legendarysurvivaloverhaul:bandage", 1]]
  if (!dzHealthCanPay(player, items, price)) {
    player.tell(Text.of("軽傷処置の物資が不足しています。").red()); dzHealthTellCost(player, items, price); return 0
  }
  dzHealthConsume(player, items, price)
  dzHealthHealOverTime(player, snapshot.worst.part, snapshot.worst.max * 0.35, 600)
  dzHealthHealMnsRatio(player, 0.15)
  player.persistentData.putBoolean("dz_health_light_treated", true)
  dzHealthComplete(player, DZ_HEALTH_QUESTS.lightTreated)
  dzHealthSyncQuests(player)
  player.tell(Text.of("シオリが" + snapshot.worst.name + "を処置しました。30秒かけて回復します。Money -" + price).green())
  return 1
}

function dzHealthTreatTrauma(player) {
  if (!dzHealthAtCamp(player)) { player.tell(Text.of("重傷処置はSurvivor Campで受けてください。").red()); return 0 }
  let snapshot = dzHealthSnapshot(player)
  if (!snapshot || snapshot.severity < 2) { player.tell(Text.of("重傷処置が必要な部位はありません。軽傷処置か休養を選んでください。").yellow()); return 0 }
  let trust = dzHealthShioriRank(player)
  let hospital = dzHealthHospitalLevel(player)
  let price = Math.max(4, 10 - trust - Math.min(2, hospital))
  let items = [["legendarysurvivaloverhaul:medkit", 1], ["apocalypsenow:medicalkit", 1]]
  if (!dzHealthCanPay(player, items, price)) {
    player.tell(Text.of("重傷処置の物資が不足しています。").red()); dzHealthTellCost(player, items, price); return 0
  }
  dzHealthConsume(player, items, price)
  let ratio = 0.35 + Math.min(0.20, hospital * 0.04)
  let ticks = Math.max(500, 1000 - hospital * 100)
  snapshot.parts.filter(entry => entry.ratio < 0.85).forEach(entry => dzHealthHealOverTime(player, entry.part, entry.max * ratio, ticks))
  dzHealthHealMnsRatio(player, ratio)
  player.persistentData.putBoolean("dz_health_trauma_treated", true)
  dzHealthComplete(player, DZ_HEALTH_QUESTS.traumaTreated)
  if (hospital > 0) {
    player.persistentData.putBoolean("dz_health_hospital_used", true)
    dzHealthComplete(player, DZ_HEALTH_QUESTS.hospital)
  }
  dzHealthSyncQuests(player)
  player.tell(Text.of("全身の重傷処置を開始しました。MineColonies病院 Lv" + hospital + "補正 / Money -" + price).green())
  return 1
}

function dzHealthTreatInfection(player) {
  if (!dzHealthAtCamp(player)) { player.tell(Text.of("感染治療はSurvivor Campで受けてください。").red()); return 0 }
  if (!dzHealthHasInfection(player)) { player.tell(Text.of("感染検査は陰性です。").green()); return 0 }
  let hospital = dzHealthHospitalLevel(player)
  let price = Math.max(3, 8 - dzHealthShioriRank(player) - Math.min(2, hospital))
  let items = [["apocalypsenow:antibiotics", 1]]
  if (!dzHealthCanPay(player, items, price)) {
    player.tell(Text.of("感染治療の物資が不足しています。").red()); dzHealthTellCost(player, items, price); return 0
  }
  dzHealthConsume(player, items, price)
  if (!dzHealthCureInfection(player)) return 0
  player.tell(Text.of("感染症を治療し、5分間の再感染免疫を付与しました。Money -" + price).green())
  return 1
}

// Called by the Field Medical Kit when a Medic treats another player.
function dzHealthMedicStabilize(healer, target) {
  let snapshot = dzHealthSnapshot(target)
  if (!snapshot || snapshot.severity === 0) return false
  let tier = typeof dzMedicalTier === "function" ? dzMedicalTier(healer, "treatment") : 0
  let ratio = [0.12, 0.18, 0.24, 0.30][Math.max(0, Math.min(3, tier))]
  let ticks = [1000, 800, 650, 500][Math.max(0, Math.min(3, tier))]
  dzHealthHealOverTime(target, snapshot.worst.part, snapshot.worst.max * ratio, ticks)
  healer.persistentData.putBoolean("dz_health_medic_stabilized", true)
  dzHealthComplete(healer, DZ_HEALTH_QUESTS.medic)
  dzHealthSyncQuests(healer)
  healer.tell(Text.of(target.username + " の" + snapshot.worst.name + "を安定化。Treatment Tier " + tier).aqua())
  target.tell(Text.of("Medic " + healer.username + " が" + snapshot.worst.name + "を安定化しました。").green())
  return true
}

// Called after the cooking system completes its Recovery menu.
function dzHealthRecordRecoveryMenu(player) {
  player.persistentData.putBoolean("dz_health_recovery_menu", true)
  dzHealthComplete(player, DZ_HEALTH_QUESTS.recoveryMenu)
  dzHealthSyncQuests(player)
  player.tell(Text.of("回復献立のComfort効果により、LSOの部位回復速度が上がります。").green())
}

function dzHealthSyncQuests(player) {
  let flags = [
    ["dz_health_light_seen", "lightSeen"], ["dz_health_severe_seen", "severeSeen"],
    ["dz_health_light_treated", "lightTreated"], ["dz_health_trauma_treated", "traumaTreated"],
    ["dz_health_infection_treated", "infectionTreated"], ["dz_health_medic_stabilized", "medic"],
    ["dz_health_recovery_menu", "recoveryMenu"], ["dz_health_hospital_used", "hospital"]
  ]
  flags.forEach(entry => { if (player.persistentData.getBoolean(entry[0])) dzHealthComplete(player, DZ_HEALTH_QUESTS[entry[1]]) })
  let complete = flags.slice(2).every(entry => player.persistentData.getBoolean(entry[0]))
  if (complete) dzHealthComplete(player, DZ_HEALTH_QUESTS.complete)
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonehealth")
  root.executes(ctx => dzHealthStatus(ctx.source.player, true))
  root.then(Commands.literal("status").executes(ctx => dzHealthStatus(ctx.source.player, true)))
  root.then(Commands.literal("treat_light").executes(ctx => dzHealthTreatLight(ctx.source.player)))
  root.then(Commands.literal("treat_trauma").executes(ctx => dzHealthTreatTrauma(ctx.source.player)))
  root.then(Commands.literal("treat_infection").executes(ctx => dzHealthTreatInfection(ctx.source.player)))
  root.then(Commands.literal("hospital").executes(ctx => {
    let player = ctx.source.player
    let level = dzHealthHospitalLevel(player)
    player.tell(Text.of("所有コロニーのMineColonies病院: Lv" + level).aqua())
    if (level > 0) {
      player.persistentData.putBoolean("dz_health_hospital_used", true)
      dzHealthComplete(player, DZ_HEALTH_QUESTS.hospital)
      dzHealthSyncQuests(player)
      player.tell(Text.of("病院は重傷処置の価格、回復量、所要時間を改善します。").green())
      return 1
    }
    player.tell(Text.of("完成済みの病院を検出できません。コロニー所有者が実行してください。").yellow())
    return 0
  }))
  root.then(Commands.literal("reset_test").requires(source => source.hasPermission(2)).executes(ctx => {
    ;["dz_health_light_seen", "dz_health_severe_seen", "dz_health_light_treated", "dz_health_trauma_treated",
      "dz_health_infection_treated", "dz_health_medic_stabilized", "dz_health_recovery_menu", "dz_health_hospital_used"
    ].forEach(key => ctx.source.player.persistentData.remove(key))
    ctx.source.player.tell(Text.of("医療ループの個人試験記録を初期化しました。部位HPと感染状態は変更していません。").yellow())
    return 1
  }))
  root.then(Commands.literal("test_light").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    dzHealthAdminRestoreLimbs(player)
    let max = Number(DZ_HEALTH_BODY_UTIL.getMaxHealth(player, DZ_HEALTH_BODY_PART.LEFT_ARM))
    DZ_HEALTH_BODY_UTIL.hurtBodyPart(player, DZ_HEALTH_BODY_PART.LEFT_ARM, max * 0.45)
    player.tell(Text.of("医療テスト用に左腕を軽傷相当へ設定しました。").yellow())
    return 1
  }))
  root.then(Commands.literal("test_severe").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    dzHealthAdminRestoreLimbs(player)
    let max = Number(DZ_HEALTH_BODY_UTIL.getMaxHealth(player, DZ_HEALTH_BODY_PART.CHEST))
    DZ_HEALTH_BODY_UTIL.hurtBodyPart(player, DZ_HEALTH_BODY_PART.CHEST, max * 0.75)
    player.tell(Text.of("医療テスト用に胴体を重傷相当へ設定しました。").red())
    return 1
  }))
  root.then(Commands.literal("test_clear").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    dzHealthAdminRestoreLimbs(player)
    DZ_HEALTH_INFECTIONS.forEach(id => { if (player.hasEffect(id)) player.removeEffect(id) })
    player.tell(Text.of("実部位HPと感染Effectを試験前の健康状態へ戻しました。").green())
    return 1
  }))
  event.register(root)
})

PlayerEvents.loggedIn(event => event.player.server.scheduleInTicks(180, callback => dzHealthSyncQuests(event.player)))

console.info("[PROJECT DEADZONE][Health Recovery] v0.2 loaded: M&S HP / LSO injury ratios / infection / Camp clinic.")
