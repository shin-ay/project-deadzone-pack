// PROJECT DEADZONE fixed Survivor Camp relationships v0.1
// Personal trust is per-player. Camp reputation and shop stock remain shared.

const DZ_PEOPLE_QUESTS = {
  intro: "6D4E010000000101",
  maya1: "6D4E010000000102",
  shiori1: "6D4E010000000103",
  goro1: "6D4E010000000104",
  maya3: "6D4E010000000105",
  shiori3: "6D4E010000000106",
  goro3: "6D4E010000000107",
  circle: "6D4E010000000108"
}

const DZ_PEOPLE = {
  maya: {
    name: "マヤ", role: "補給担当", color: "yellow", trustKey: "dz_trust_maya",
    cooldownKey: "dz_people_service_maya_next", prices: [8, 7, 6, 5],
    lines: [
      "まずは不足を数字で見せて。善意だけでは棚は埋まらないわ。",
      "あなたの納品、ちゃんと誰かの食事になってる。次も頼むわね。",
      "遠征隊の好みまで分かってきた。もう余り物じゃなく、献立を組めるわ。",
      "あなたが持ち帰るなら、私は明日の配給まで計算に入れられる。信用してるわ。"
    ]
  },
  shiori: {
    name: "シオリ", role: "医療担当", color: "aqua", trustKey: "dz_trust_shiori",
    cooldownKey: "dz_people_service_shiori_next", prices: [9, 8, 7, 6],
    lines: [
      "症状と経過を正確に。無理をした話は診断の役に立ちません。",
      "救急物資の使い方は悪くありません。帰還後の報告も続けてください。",
      "あなたなら前線用の処置を任せられます。使う順番を間違えないで。",
      "隠しても分かります。あなたの傷も、仲間の傷も、必ず連れてきてください。"
    ]
  },
  goro: {
    name: "ゴロウ", role: "整備担当", color: "gold", trustKey: "dz_trust_goro",
    cooldownKey: "dz_people_service_goro_next", prices: [10, 9, 8, 7],
    lines: [
      "拾っただけの部品と、使える部品は別物だ。まず規格を覚えろ。",
      "前より選別がマシになった。これなら工具を貸しても壊されん。",
      "配電も車両も止めるな。予備品を切らさない奴は信用できる。",
      "お前の持ち込む部品なら、分解前から使い道を決められる。任せたぞ。"
    ]
  }
}

const DZ_PEOPLE_THRESHOLDS = [0, 5, 15, 30]
const DZ_PEOPLE_SERVICE_COOLDOWN_MS = 60 * 60 * 1000

function dzPeopleAtCamp(player) {
  return player.server.runCommandSilent("execute as " + player.username +
    " at @s if entity @e[tag=dz_basecamp_core_anchor,distance=..32,limit=1]") > 0
}

function dzPeopleTrust(player, key) {
  let person = DZ_PEOPLE[key]
  return person ? Math.max(0, Math.min(30, player.persistentData.getInt(person.trustKey))) : 0
}

function dzPeopleRankForTrust(trust) {
  if (trust >= DZ_PEOPLE_THRESHOLDS[3]) return 3
  if (trust >= DZ_PEOPLE_THRESHOLDS[2]) return 2
  if (trust >= DZ_PEOPLE_THRESHOLDS[1]) return 1
  return 0
}

function dzPeopleRank(player, key) {
  return dzPeopleRankForTrust(dzPeopleTrust(player, key))
}

function dzPeopleRankName(rank) {
  return ["顔見知り", "協力者", "仲間", "信頼できる相棒"][Math.max(0, Math.min(3, rank))]
}

function dzPeopleComplete(player, id) {
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + id)
}

function dzPeopleSyncQuests(player, intro) {
  if (intro) dzPeopleComplete(player, DZ_PEOPLE_QUESTS.intro)
  let ranks = {}
  Object.keys(DZ_PEOPLE).forEach(key => {
    ranks[key] = dzPeopleRank(player, key)
    if (ranks[key] >= 1) dzPeopleComplete(player, DZ_PEOPLE_QUESTS[key + "1"])
    if (ranks[key] >= 3) dzPeopleComplete(player, DZ_PEOPLE_QUESTS[key + "3"])
  })
  if (ranks.maya >= 3 && ranks.shiori >= 3 && ranks.goro >= 3) dzPeopleComplete(player, DZ_PEOPLE_QUESTS.circle)
}

function dzPeopleAddTrust(player, key, amount, reason) {
  let person = DZ_PEOPLE[key]
  if (!person || amount <= 0) return 0
  let before = dzPeopleTrust(player, key)
  let beforeRank = dzPeopleRankForTrust(before)
  let after = Math.min(30, before + amount)
  if (after === before) return after
  player.persistentData.putInt(person.trustKey, after)
  let afterRank = dzPeopleRankForTrust(after)
  player.tell(Text.of(person.name + "との信頼 +" + (after - before) + "（" + after + "/30）")[person.color]())
  if (reason) player.tell(Text.of("  " + reason).gray())
  if (afterRank > beforeRank) {
    player.tell(Text.of(person.name + "：『" + person.lines[afterRank] + "』")[person.color]())
    player.tell(Text.of("関係 Rank " + afterRank + "「" + dzPeopleRankName(afterRank) + "」へ上昇。専用サービスが改善しました。").green())
    player.runCommandSilent("playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 0.8 1.2")
  }
  dzPeopleSyncQuests(player, false)
  return after
}

// Called by project_deadzone_camp_contracts_v0_1.js after a contract is paid.
function dzPeopleRecordContract(player, key, contract, quality) {
  let personKey = null
  let amount = 0
  if ((contract.lifeRep || 0) > 0) {
    personKey = "maya"
    amount = Math.min(3, Math.max(1, contract.lifeRep + (quality ? quality.repBonus || 0 : 0)))
  } else if ((contract.securityRep || 0) > 0) {
    personKey = "shiori"
    amount = Math.min(3, Math.max(1, contract.securityRep))
  } else if ((contract.restorationRep || 0) > 0) {
    personKey = "goro"
    amount = Math.min(3, Math.max(1, contract.restorationRep))
  }
  if (personKey) dzPeopleAddTrust(player, personKey, amount, "依頼「" + contract.name + "」を完了")
}

function dzPeopleTimeText(ms) {
  return Math.max(1, Math.ceil(ms / 60000)) + "分"
}

function dzPeopleTellLine(player, key) {
  let person = DZ_PEOPLE[key]
  let trust = dzPeopleTrust(player, key)
  let rank = dzPeopleRankForTrust(trust)
  let next = rank >= 3 ? "MAX" : trust + "/" + DZ_PEOPLE_THRESHOLDS[rank + 1]
  let nextService = player.persistentData.getLong(person.cooldownKey) - Date.now()
  player.tell(Text.of(person.name + "｜" + person.role + "  Rank " + rank + "「" + dzPeopleRankName(rank) + "」  " + next)[person.color]())
  player.tell(Text.of("  『" + person.lines[rank] + "』").gray())
  player.tell(Text.of("  専用サービス Credit " + person.prices[rank] + (nextService > 0 ? "｜再利用まで " + dzPeopleTimeText(nextService) : "｜利用可能")).yellow())
}

function dzPeopleStatus(player, intro) {
  if (!dzPeopleAtCamp(player)) {
    player.tell(Text.of("生存者との相談はSurvivor Camp内で行ってください。").red())
    return 0
  }
  if (intro) dzPeopleSyncQuests(player, true)
  player.tell(Text.of("=== SURVIVOR CAMP 生存者記録 ===").gold())
  Object.keys(DZ_PEOPLE).forEach(key => dzPeopleTellLine(player, key))
  player.tell(Text.of("信頼は個人別です。Camp評判・在庫・価格はパーティー共有のまま維持されます。").aqua())
  player.tell(Text.of("[マヤの遠征配給]").yellow().clickRunCommand("/deadzonepeople service_maya")
    .append(Text.of("  [シオリの診療]").aqua().clickRunCommand("/deadzonepeople service_shiori"))
    .append(Text.of("  [ゴロウの整備箱]").gold().clickRunCommand("/deadzonepeople service_goro")))
  return 1
}

function dzPeopleTakeMoney(player, count) {
  return global.pdzCreditTake(player, count)
}

function dzPeopleGive(player, item, count) {
  player.server.runCommandSilent("give " + player.username + " " + item + " " + count)
}

function dzPeopleService(player, key) {
  let person = DZ_PEOPLE[key]
  if (!person || !dzPeopleAtCamp(player)) {
    player.tell(Text.of("このサービスはSurvivor Camp内でのみ利用できます。").red())
    return 0
  }
  if (player.server.persistentData.getBoolean("dz_camp_services_disrupted")) {
    player.tell(Text.of("襲撃被害の復旧中です。非緊急の個人配給・整備箱はBase Coreの共同復旧が完了するまで停止しています。").red())
    player.tell(Text.of("シオリの救急診療と通常交易は継続しています。").aqua())
    return 0
  }
  let remaining = player.persistentData.getLong(person.cooldownKey) - Date.now()
  if (remaining > 0) {
    player.tell(Text.of(person.name + "の専用サービスは再利用まで " + dzPeopleTimeText(remaining) + "です。").yellow())
    return 0
  }
  let rank = dzPeopleRank(player, key)
  let price = person.prices[rank]
  if (!dzPeopleTakeMoney(player, price)) {
    player.tell(Text.of("Creditが不足しています。必要: " + price).red())
    return 0
  }
  if (key === "maya") {
    if (rank === 0) { dzPeopleGive(player, "minecraft:bread", 4); dzPeopleGive(player, "survival_instinct:gallon_of_water", 1) }
    if (rank === 1) { dzPeopleGive(player, "farmersdelight:vegetable_soup", 1); dzPeopleGive(player, "minecraft:bread", 4); dzPeopleGive(player, "survival_instinct:gallon_of_water", 1) }
    if (rank === 2) { dzPeopleGive(player, "farmersdelight:beef_stew", 1); dzPeopleGive(player, "farmersdelight:vegetable_soup", 1); dzPeopleGive(player, "survival_instinct:gallon_of_water", 1) }
    if (rank === 3) { dzPeopleGive(player, "minecolonies:stew_trencher", 2); dzPeopleGive(player, "minecolonies:fish_n_chips", 1); dzPeopleGive(player, "survival_instinct:gallon_of_water", 1) }
  } else if (key === "shiori") {
    if (rank === 0) dzPeopleGive(player, "apocalypsenow:bandage", 2)
    if (rank === 1) dzPeopleGive(player, "apocalypsenow:bandage", 4)
    if (rank === 2) { dzPeopleGive(player, "apocalypsenow:bandage", 4); dzPeopleGive(player, "apocalypsenow:pain_killers", 1) }
    if (rank === 3) { dzPeopleGive(player, "apocalypsenow:medicalkit", 1); dzPeopleGive(player, "apocalypsenow:bandage", 2) }
    player.runCommandSilent("effect give @s minecraft:regeneration 12 1 true")
    player.runCommandSilent("effect give @s minecraft:absorption 120 0 true")
  } else if (key === "goro") {
    if (rank === 0) { dzPeopleGive(player, "minecraft:iron_ingot", 4); dzPeopleGive(player, "immersiveengineering:hemp_fiber", 4) }
    if (rank === 1) dzPeopleGive(player, "kubejs:field_repair_kit", 1)
    if (rank === 2) { dzPeopleGive(player, "kubejs:field_repair_kit", 1); dzPeopleGive(player, "immersiveengineering:component_electronic", 1) }
    if (rank === 3) { dzPeopleGive(player, "mts:mtsofficialpack.repairkit", 1); dzPeopleGive(player, "immersiveengineering:component_electronic", 1) }
  }
  player.persistentData.putLong(person.cooldownKey, Date.now() + DZ_PEOPLE_SERVICE_COOLDOWN_MS)
  player.tell(Text.of(person.name + "の専用サービスを利用しました。Credit -" + price)[person.color]())
  player.tell(Text.of(person.lines[rank]).gray())
  return 1
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonepeople")
  root.executes(ctx => dzPeopleStatus(ctx.source.player, true))
  root.then(Commands.literal("status").executes(ctx => dzPeopleStatus(ctx.source.player, true)))
  Object.keys(DZ_PEOPLE).forEach(key => {
    root.then(Commands.literal(key).executes(ctx => {
      let player = ctx.source.player
      if (!dzPeopleAtCamp(player)) { player.tell(Text.of("Survivor Campへ戻ってください。").red()); return 0 }
      dzPeopleTellLine(player, key)
      player.tell(Text.of("[専用サービスを利用]").green().clickRunCommand("/deadzonepeople service_" + key))
      return 1
    }))
    root.then(Commands.literal("service_" + key).executes(ctx => dzPeopleService(ctx.source.player, key)))
    ;[0, 5, 15, 30].forEach(value => root.then(Commands.literal("set_" + key + "_" + value)
      .requires(source => source.hasPermission(2)).executes(ctx => {
        ctx.source.player.persistentData.putInt(DZ_PEOPLE[key].trustKey, value)
        dzPeopleSyncQuests(ctx.source.player, false)
        ctx.source.player.tell(Text.of(DZ_PEOPLE[key].name + "との信頼を" + value + "へ設定しました。").aqua())
        return 1
      })))
  })
  root.then(Commands.literal("reset_test").requires(source => source.hasPermission(2)).executes(ctx => {
    Object.keys(DZ_PEOPLE).forEach(key => {
      ctx.source.player.persistentData.remove(DZ_PEOPLE[key].trustKey)
      ctx.source.player.persistentData.remove(DZ_PEOPLE[key].cooldownKey)
    })
    ctx.source.player.tell(Text.of("固定NPC3人の個人信頼とサービス待機時間を初期化しました。").yellow())
    return 1
  }))
  event.register(root)
})

PlayerEvents.loggedIn(event => event.player.server.scheduleInTicks(160, callback => {
  dzPeopleSyncQuests(event.player, false)
  // Existing worlds do not rebuild staff on every restart. Reapply only the
  // dialog buttons when a player loads the active camp chunk.
  if (dzPeopleAtCamp(event.player)) event.player.server.runCommandSilent("function project_deadzone:basecamp/repair_staff_service_ui")
}))

console.info("[PROJECT DEADZONE][Survivor Relationships] v0.1 loaded: Maya / Shiori / Goro.")
