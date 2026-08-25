// PROJECT DEADZONE Survivor Camp community economy v0.1
// Shared, event-driven reputation. No NPC spawning and no continuous simulation.

const DZ_COMMUNITY_QUESTS = {
  intro: "6D4A010000000101",
  rank1: "6D4A010000000102",
  rank2: "6D4A010000000103",
  rank3: "6D4A010000000104",
  colony: "6D4A010000000105"
}

const DZ_COMMUNITY_THRESHOLDS = [0, 10, 25, 50]

function dzCommunityEconomyValue(server, key) {
  return Math.max(0, server.persistentData.getInt(key))
}

function dzCommunityEconomySectorRank(value) {
  if (value >= DZ_COMMUNITY_THRESHOLDS[3]) return 3
  if (value >= DZ_COMMUNITY_THRESHOLDS[2]) return 2
  if (value >= DZ_COMMUNITY_THRESHOLDS[1]) return 1
  return 0
}

function dzCommunityEconomyState(server) {
  let supply = dzCommunityEconomyValue(server, "dz_life_supply_reputation")
  let security = dzCommunityEconomyValue(server, "dz_camp_security_reputation")
  let restoration = dzCommunityEconomyValue(server, "dz_camp_restoration_reputation")
  let campLevel = Math.max(0, Math.min(3, server.persistentData.getInt("dz_camp_development_level")))
  let supplyRank = dzCommunityEconomySectorRank(supply)
  let securityRank = dzCommunityEconomySectorRank(security)
  let restorationRank = dzCommunityEconomySectorRank(restoration)
  return {
    supply: supply,
    security: security,
    restoration: restoration,
    supplyRank: supplyRank,
    securityRank: securityRank,
    restorationRank: restorationRank,
    campLevel: campLevel,
    rank: Math.min(campLevel, supplyRank, securityRank, restorationRank)
  }
}

function dzCommunityEconomyRankName(rank) {
  return ["寄せ集め", "常連の拠点", "地域協力拠点", "共同運営ハブ"][Math.max(0, Math.min(3, rank))]
}

function dzCommunityEconomySyncPlayer(player, completeIntro) {
  let state = dzCommunityEconomyState(player.server)
  if (completeIntro) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_COMMUNITY_QUESTS.intro)
  if (state.rank >= 1) {
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_COMMUNITY_QUESTS.rank1)
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_COMMUNITY_QUESTS.colony)
  }
  if (state.rank >= 2) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_COMMUNITY_QUESTS.rank2)
  if (state.rank >= 3) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_COMMUNITY_QUESTS.rank3)
}

function dzCommunityEconomyEffects(rank) {
  if (rank >= 3) return "全店9%追加割引、最高級医療・整備品、最大在庫"
  if (rank >= 2) return "全店6%追加割引、販売・買取枠増加、専門用品"
  if (rank >= 1) return "全店3%追加割引、MineColonies加工食、基礎サービス"
  return "3部門をRank 1へ育て、Camp Lv1を完成させると地域サービスが始まる"
}

function dzCommunityEconomyRefresh(server, player, announce) {
  let state = dzCommunityEconomyState(server)
  let oldRank = Math.max(0, Math.min(3, server.persistentData.getInt("dz_camp_community_announced_rank")))
  if (state.rank < oldRank) {
    server.persistentData.putInt("dz_camp_community_announced_rank", state.rank)
    oldRank = state.rank
  }
  if (state.rank > oldRank) {
    server.persistentData.putInt("dz_camp_community_announced_rank", state.rank)
    server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
    server.runCommandSilent('tellraw @a [{"text":"[COMMUNITY] ","color":"gold","bold":true},{"text":"Survivor Campが総合Rank ' + state.rank + '「' + dzCommunityEconomyRankName(state.rank) + '」へ成長しました。' + dzCommunityEconomyEffects(state.rank) + '","color":"green"}]')
  }
  if (player) dzCommunityEconomySyncPlayer(player, false)
  if (announce && player && state.rank <= oldRank) player.tell(Text.of("Camp総合Rankは " + state.rank + "「" + dzCommunityEconomyRankName(state.rank) + "」です。").green())
  return state
}

function dzCommunityEconomyLine(player, label, npc, value, rank) {
  let next = rank >= 3 ? "MAX" : value + "/" + DZ_COMMUNITY_THRESHOLDS[rank + 1]
  player.tell(Text.of(label + " Rank " + rank + "｜" + npc + "との信頼｜" + next).gray())
}

function dzCommunityEconomyStatus(player, completeIntro) {
  let state = dzCommunityEconomyRefresh(player.server, player, false)
  if (completeIntro) dzCommunityEconomySyncPlayer(player, true)
  player.tell(Text.of("=== SURVIVOR CAMP 地域経済 ===").gold())
  player.tell(Text.of("総合Rank " + state.rank + "「" + dzCommunityEconomyRankName(state.rank) + "」 / Camp Lv" + state.campLevel).aqua())
  dzCommunityEconomyLine(player, "Supply", "マヤ", state.supply, state.supplyRank)
  dzCommunityEconomyLine(player, "Security", "シオリ", state.security, state.securityRank)
  dzCommunityEconomyLine(player, "Restoration", "ゴロウ", state.restoration, state.restorationRank)
  player.tell(Text.of("現在効果: " + dzCommunityEconomyEffects(state.rank)).green())
  let defenseDebt = player.server.persistentData.getInt("dz_defense_repair_debt")
  if (defenseDebt > 0) player.tell(Text.of("防衛被害：復旧負債 " + defenseDebt + "｜非緊急個人サービス停止中").red()
    .append(Text.of("  [復旧管制]").yellow().clickRunCommand("/deadzonedefense status")))
  if (state.rank < 3) player.tell(Text.of("総合RankはCamp Lvと3部門Rankのうち、一番低い値に揃います。").yellow())
  player.tell(Text.of("[依頼掲示板を開く]").aqua().clickRunCommand("/deadzonecontracts"))
  player.tell(Text.of("[マヤ・シオリ・ゴロウとの個人信頼]").lightPurple().clickRunCommand("/deadzonepeople"))
  return 1
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonecommunity")
  root.executes(ctx => dzCommunityEconomyStatus(ctx.source.player, true))
  root.then(Commands.literal("status").executes(ctx => dzCommunityEconomyStatus(ctx.source.player, true)))
  root.then(Commands.literal("refresh").requires(source => source.hasPermission(2)).executes(ctx => {
    let state = dzCommunityEconomyRefresh(ctx.source.server, ctx.source.player, true)
    ctx.source.server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
    ctx.source.player.tell(Text.of("地域経済を再集計し、ショップ更新を予約しました。Rank " + state.rank).aqua())
    return 1
  }))
  ;[
    ["supply", "dz_life_supply_reputation"],
    ["security", "dz_camp_security_reputation"],
    ["restoration", "dz_camp_restoration_reputation"]
  ].forEach(entry => {
    ;[0, 10, 25, 50].forEach(value => root.then(Commands.literal("set_" + entry[0] + "_" + value)
      .requires(source => source.hasPermission(2)).executes(ctx => {
        ctx.source.server.persistentData.putInt(entry[1], value)
        ctx.source.server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
        ctx.source.player.tell(Text.of(entry[0] + "評判を" + value + "へ設定しました。").aqua())
        dzCommunityEconomyRefresh(ctx.source.server, ctx.source.player, false)
        return 1
      })))
  })
  event.register(root)
})

PlayerEvents.loggedIn(event => event.player.server.scheduleInTicks(140, callback => {
  dzCommunityEconomyRefresh(event.player.server, event.player, false)
}))

console.info("[PROJECT DEADZONE][Community Economy] v0.1 loaded.")
