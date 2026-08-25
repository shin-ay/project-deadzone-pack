// PROJECT DEADZONE repeatable Survivor Camp contracts v0.6
// Multiple contracts may be active at once. Each contract has its own progress
// and 30 real-minute completion cooldown.

const DZ_CONTRACT_COOLDOWN_MS = 30 * 60 * 1000
const DZ_CONTRACT_MAX_ACTIVE = 4
const DZ_SEASON_HELPER = Java.loadClass("sereneseasons.api.season.SeasonHelper")
const DZ_CONTRACTS = {
  infected: {
    name: "感染者の掃討", target: 18, money: 7, skill: "firearms", xp: 12, killType: "infected", securityRep: 1,
    description: "キャンプ周辺または市街地で感染者を18体排除する。"
  },
  raiders: {
    name: "略奪者の排除", target: 6, money: 11, skill: "firearms", xp: 16, killType: "raiders", securityRep: 3,
    description: "Raider勢力を6体排除する。World Tier 1以降向け。", tier: 1
  },
  medical: {
    name: "医療物資の補充", money: 8, skill: "medical", xp: 14, securityRep: 1,
    description: "包帯を4個、シオリへ納品する。",
    items: [["apocalypsenow:bandage", 4]]
  },
  salvage: {
    name: "修理素材の回収", money: 9, skill: "scavenging", xp: 14, restorationRep: 2,
    description: "鉄インゴット6個と銅インゴット8個をゴロウへ納品する。",
    items: [["minecraft:iron_ingot", 6], ["minecraft:copper_ingot", 8]]
  },
  provisions: {
    name: "共同備蓄", money: 7, skill: "survival", xp: 12, lifeRep: 1,
    description: "パン8個と水1ガロンをマヤへ納品する。",
    items: [["minecraft:bread", 8], ["survival_instinct:gallon_of_water", 1]]
  },
  harvest_mix: {
    name: "生活供給：混合作物", money: 10, skill: "survival", xp: 18, lifeRep: 2,
    description: "主食と野菜を偏りなく共同備蓄へ納品する。生活評判が上昇する。",
    items: [["minecraft:wheat", 16], ["minecraft:carrot", 12], ["minecraft:potato", 12], ["farmersdelight:cabbage", 8], ["farmersdelight:tomato", 8]],
    bonus: [["minecraft:bread", 8]]
  },
  fish_processing: {
    name: "生活供給：漁獲加工", money: 11, skill: "survival", xp: 18, lifeRep: 2,
    description: "魚を規格化し、生食用と保存用をまとめて納品する。生活評判が上昇する。",
    items: [["aquaculture:fish_fillet_raw", 12], ["aquaculture:fish_fillet_cooked", 8]],
    bonus: [["aquaculture:fish_fillet_cooked", 8]]
  },
  balanced_meals: {
    name: "生活供給：共同調理", money: 15, skill: "survival", xp: 24, lifeRep: 3, menuContract: true,
    description: "肉・野菜・魚の料理を作り、住民と遠征隊へ供給する。生活評判が大きく上昇する。",
    items: [["farmersdelight:beef_stew", 2], ["farmersdelight:vegetable_soup", 2], ["aquaculturedelight:fish_and_chips", 2]],
    bonus: [["farmersdelight:beef_stew", 2], ["farmersdelight:vegetable_soup", 2]]
  },
  seasonal_reserve: {
    name: "生活供給：季節備蓄", money: 18, skill: "survival", xp: 28, lifeRep: 4, tier: 1,
    description: "不作の季節に備え、保存しやすい主食と調理済みタンパク源を大量備蓄する。",
    seasons: ["AUTUMN", "WINTER"],
    items: [["minecraft:bread", 24], ["minecraft:baked_potato", 24], ["minecraft:cooked_beef", 12], ["aquaculture:fish_fillet_cooked", 12]],
    bonus: [["farmersdelight:beef_stew", 4], ["aquaculture:fish_fillet_cooked", 8]]
  },
  quality_supply: {
    name: "生活品質：旬の検品ロット", money: 10, skill: "survival", xp: 18, lifeRep: 2, qualityCategory: "supply",
    description: "旬の多品種供給を検品ロットにまとめてマヤへ納品する。等級が高いほど報酬と生活評判が増える。",
    qualityLots: [
      {item: "kubejs:seasonal_supply_lot_prime", grade: "特選", moneyBonus: 10, xpBonus: 10, repBonus: 3, bonus: [["minecolonies:veggie_soup", 3]]},
      {item: "kubejs:seasonal_supply_lot_select", grade: "選別", moneyBonus: 5, xpBonus: 5, repBonus: 1, bonus: [["farmersdelight:vegetable_soup", 2]]},
      {item: "kubejs:seasonal_supply_lot_standard", grade: "標準", moneyBonus: 0, xpBonus: 0, repBonus: 0, bonus: [["minecraft:bread", 4]]}
    ]
  },
  quality_catch: {
    name: "生活品質：多魚種の漁獲ロット", money: 11, skill: "survival", xp: 18, lifeRep: 2, qualityCategory: "catch",
    description: "異なる魚種を漁獲ロットにまとめてマヤへ納品する。特選には大型・危険水域の希少魚も必要。",
    qualityLots: [
      {item: "kubejs:catch_lot_prime", grade: "特選", moneyBonus: 11, xpBonus: 10, repBonus: 3, bonus: [["minecolonies:fish_n_chips", 3]]},
      {item: "kubejs:catch_lot_select", grade: "選別", moneyBonus: 5, xpBonus: 5, repBonus: 1, bonus: [["aquaculturedelight:fish_and_chips", 2]]},
      {item: "kubejs:catch_lot_standard", grade: "標準", moneyBonus: 0, xpBonus: 0, repBonus: 0, bonus: [["aquaculture:fish_fillet_cooked", 4]]}
    ]
  },
  elite_patrol: {
    name: "治安維持：危険個体巡回", target: 4, money: 16, skill: "firearms", xp: 24, securityRep: 4, killType: "elite", tier: 1,
    description: "Rare級以上のEliteまたはNamed危険個体を4体排除し、キャンプ周辺の安全を確保する。"
  },
  workshop_resupply: {
    name: "復旧支援：工房補修材", money: 14, skill: "engineering", xp: 22, restorationRep: 3,
    description: "工房・住宅・物流設備の補修に使う規格部品をゴロウへ納品する。",
    items: [["immersiveengineering:hemp_fiber", 16], ["immersiveengineering:treated_wood_horizontal", 8], ["immersiveengineering:component_iron", 4]],
    bonus: [["kubejs:field_repair_kit", 1]]
  },
  grid_spares: {
    name: "復旧支援：配電予備品", money: 18, skill: "engineering", xp: 28, restorationRep: 4, tier: 1,
    description: "キャンプ配電網とMineColonies工房の停止に備え、交換部品を共同倉庫へ納品する。",
    items: [["createaddition:copper_wire", 8], ["immersiveengineering:component_electronic", 2], ["minecraft:redstone", 16]],
    bonus: [["immersiveengineering:component_electronic", 1]]
  },
  colony_relief: {
    name: "生活供給：コロニー炊き出し", money: 18, skill: "survival", xp: 26, lifeRep: 4, tier: 1, colonyMealContract: true,
    description: "MineColonies厨房で加工した食事をキャンプの住民・建設班・警備班へ供給する。",
    items: [["minecolonies:potato_soup", 4], ["minecolonies:veggie_soup", 4], ["minecolonies:fish_n_chips", 4]],
    bonus: [["minecolonies:stew_trencher", 2]]
  }
}

function dzLifeReputation(server) {
  return Math.max(0, server.persistentData.getInt("dz_life_supply_reputation"))
}

function dzLifeRank(server) {
  let reputation = dzLifeReputation(server)
  if (reputation >= 50) return 3
  if (reputation >= 25) return 2
  if (reputation >= 10) return 1
  return 0
}

function dzLifeRankName(rank) {
  return ["その日暮らし", "安定供給", "共同炊事", "地域食料網"][Math.max(0, Math.min(3, rank))]
}

function dzContractSharedReputation(server, key) {
  return Math.max(0, server.persistentData.getInt(key))
}

function dzContractAddSharedReputation(server, key, amount) {
  if (amount <= 0) return dzContractSharedReputation(server, key)
  let value = Math.min(999, dzContractSharedReputation(server, key) + amount)
  server.persistentData.putInt(key, value)
  server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
  return value
}

function dzCurrentSeason(player) {
  try {
    return String(DZ_SEASON_HELPER.getSeasonState(player.level).getSeason()).toUpperCase()
  } catch (error) {
    console.warn("[PROJECT DEADZONE][Contracts] season lookup failed: " + error)
    return "UNKNOWN"
  }
}

const DZ_LIFE_QUESTS = {
  intro: "6D45010000000101",
  rank1: "6D45010000000102",
  rank2: "6D45010000000103",
  rank3: "6D45010000000104",
  colony: "6D45010000000105"
}

function dzLifeSyncQuests(player) {
  let reputation = dzLifeReputation(player.server)
  if (reputation <= 0) return
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_LIFE_QUESTS.intro)
  if (reputation >= 10) {
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_LIFE_QUESTS.rank1)
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_LIFE_QUESTS.colony)
  }
  if (reputation >= 25)
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_LIFE_QUESTS.rank2)
  if (reputation >= 50)
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_LIFE_QUESTS.rank3)
}

function dzContractTier(player) {
  return Math.max(0, player.server.persistentData.getInt("deadzone_world_tier"))
}

function dzContractActiveKey(key) {
  return "dz_contract_active_" + key
}

function dzContractProgressKey(key) {
  return "dz_contract_progress_" + key
}

function dzContractIsActive(player, key) {
  return player.persistentData.getBoolean(dzContractActiveKey(key))
}

function dzContractActiveKeys(player) {
  return Object.keys(DZ_CONTRACTS).filter(key => dzContractIsActive(player, key))
}

// One-time migration from the former single-contract save layout.
function dzContractMigrateLegacy(player) {
  let legacy = String(player.persistentData.getString("dz_contract_active"))
  if (legacy && DZ_CONTRACTS[legacy] && !dzContractIsActive(player, legacy)) {
    player.persistentData.putBoolean(dzContractActiveKey(legacy), true)
    player.persistentData.putInt(
      dzContractProgressKey(legacy),
      player.persistentData.getInt("dz_contract_progress")
    )
    player.tell(Text.of("受注中だった依頼を複数依頼システムへ移行しました。" ).aqua())
  }
  player.persistentData.remove("dz_contract_active")
  player.persistentData.remove("dz_contract_progress")
}

function dzContractTellMenu(player) {
  dzContractMigrateLegacy(player)
  player.tell(Text.of("=== SURVIVOR CAMP 依頼掲示板 ===").gold())
  let lifeRep = dzLifeReputation(player.server)
  let lifeRank = dzLifeRank(player.server)
  player.tell(Text.of("生活評判: " + lifeRep + " / Rank " + lifeRank + "「" + dzLifeRankName(lifeRank) + "」").green())
  player.tell(Text.of("[Camp地域経済: Supply / Security / Restoration]").aqua()
    .clickRunCommand("/deadzonecommunity status"))
  let active = dzContractActiveKeys(player)
  player.tell(Text.of("受注中: " + active.length + "/" + DZ_CONTRACT_MAX_ACTIVE).yellow())

  active.forEach(key => {
    let contract = DZ_CONTRACTS[key]
    let progress = player.persistentData.getInt(dzContractProgressKey(key))
    let suffix = contract.target ? "  [" + progress + "/" + contract.target + "]" : contract.qualityLots ? "  [検品ロット待ち]" : "  [納品待ち]"
    player.tell(Text.of("● " + contract.name + suffix).yellow())
    player.tell(Text.of("  [納品] ").green()
      .clickRunCommand("/deadzonecontracts turnin_" + key)
      .hover(Text.of("この依頼だけ進捗確認・納品する"))
      .append(Text.of("[破棄]").red()
        .clickRunCommand("/deadzonecontracts abandon_" + key)
        .hover(Text.of("この依頼だけ破棄する"))))
  })

  if (active.length > 1) {
    player.tell(Text.of("[完了可能な依頼をまとめて納品]").green()
      .clickRunCommand("/deadzonecontracts turnin"))
  }

  let tier = dzContractTier(player)
  Object.keys(DZ_CONTRACTS).forEach(key => {
    let contract = DZ_CONTRACTS[key]
    if (dzContractIsActive(player, key) || (contract.tier || 0) > tier) return
    if (contract.seasons && contract.seasons.indexOf(dzCurrentSeason(player)) < 0) {
      player.tell(Text.of("[季節外 " + dzCurrentSeason(player) + "] " + contract.name + "（秋・冬限定）").gray())
      return
    }
    let next = player.persistentData.getLong("dz_contract_next_" + key)
    let remaining = Math.max(0, next - Date.now())
    if (remaining > 0) {
      player.tell(Text.of("[待機 " + Math.ceil(remaining / 60000) + "分] " + contract.name).gray())
      return
    }
    player.tell(Text.of("[受注] " + contract.name).aqua()
      .clickRunCommand("/deadzonecontracts accept_" + key)
      .hover(Text.of(contract.description + " 報酬: Money " + contract.money + " / " + contract.skill + " XP " + contract.xp)))
  })
}

function dzContractAccept(player, key) {
  dzContractMigrateLegacy(player)
  let contract = DZ_CONTRACTS[key]
  if (!contract) return 0
  if (dzContractIsActive(player, key)) {
    player.tell(Text.of("その依頼はすでに受注しています。" ).yellow())
    return 0
  }
  if (dzContractActiveKeys(player).length >= DZ_CONTRACT_MAX_ACTIVE) {
    player.tell(Text.of("同時に受注できる依頼は" + DZ_CONTRACT_MAX_ACTIVE + "件までです。" ).red())
    return 0
  }
  if ((contract.tier || 0) > dzContractTier(player)) {
    player.tell(Text.of("この依頼はWorld Tier " + contract.tier + "で解放されます。" ).red())
    return 0
  }
  if (contract.seasons && contract.seasons.indexOf(dzCurrentSeason(player)) < 0) {
    player.tell(Text.of("この依頼は秋または冬に受注できます。現在: " + dzCurrentSeason(player)).red())
    return 0
  }
  if (player.persistentData.getLong("dz_contract_next_" + key) > Date.now()) {
    player.tell(Text.of("この依頼はまだ再受注できません。" ).red())
    return 0
  }
  player.persistentData.putBoolean(dzContractActiveKey(key), true)
  player.persistentData.putInt(dzContractProgressKey(key), 0)
  player.tell(Text.of("依頼受注: " + contract.name).green())
  player.tell(Text.of(contract.description).gray())
  player.tell(Text.of("同時受注数: " + dzContractActiveKeys(player).length + "/" + DZ_CONTRACT_MAX_ACTIVE).aqua())
  return 1
}

function dzContractHasItems(player, items) {
  for (let i = 0; i < items.length; i++) {
    let entry = items[i]
    let count = player.server.runCommandSilent("clear " + player.username + " " + entry[0] + " 0")
    if (count < entry[1]) return false
  }
  return true
}

function dzContractComplete(player, key, quality) {
  let contract = DZ_CONTRACTS[key]
  let money = contract.money + (quality ? quality.moneyBonus || 0 : 0)
  let xp = contract.xp + (quality ? quality.xpBonus || 0 : 0)
  let lifeRepGain = (contract.lifeRep || 0) + (quality ? quality.repBonus || 0 : 0)
  let bonus = quality && quality.bonus ? quality.bonus : (contract.bonus || [])
  player.server.runCommandSilent("give " + player.username + " apocalypsenow:money " + money)
  player.server.runCommandSilent("puffish_skills experience add " + player.username + " " + contract.skill + " " + xp)
  ;(bonus || []).forEach(entry => player.server.runCommandSilent(
    "give " + player.username + " " + entry[0] + " " + entry[1]))
  if (lifeRepGain > 0) {
    let oldRank = dzLifeRank(player.server)
    let reputation = Math.min(999, dzLifeReputation(player.server) + lifeRepGain)
    player.server.persistentData.putInt("dz_life_supply_reputation", reputation)
    let newRank = dzLifeRank(player.server)
    player.tell(Text.of("生活評判 +" + lifeRepGain + "（現在 " + reputation + "）").green())
    if (newRank > oldRank) {
      player.server.runCommandSilent('tellraw @a {"text":"生活供給 Rank ' + newRank + '：' + dzLifeRankName(newRank) + 'へ発展しました。食料商人の品揃えと価格が改善されます。","color":"green"}')
      player.server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
    }
    dzLifeSyncQuests(player)
  }
  if ((contract.securityRep || 0) > 0) {
    let value = dzContractAddSharedReputation(player.server, "dz_camp_security_reputation", contract.securityRep)
    player.tell(Text.of("治安評判 +" + contract.securityRep + "（現在 " + value + "）").aqua())
  }
  if ((contract.restorationRep || 0) > 0) {
    let value = dzContractAddSharedReputation(player.server, "dz_camp_restoration_reputation", contract.restorationRep)
    player.tell(Text.of("復旧評判 +" + contract.restorationRep + "（現在 " + value + "）").gold())
  }
  if (typeof dzCommunityEconomyRefresh === "function") dzCommunityEconomyRefresh(player.server, player, true)
  if (contract.qualityCategory) {
    let qualityKey = "dz_quality_" + contract.qualityCategory + "_contracts"
    player.persistentData.putInt(qualityKey, player.persistentData.getInt(qualityKey) + 1)
    let qualityQuest = contract.qualityCategory === "supply" ? "6D4C010000000108" : "6D4C010000000109"
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + qualityQuest)
  }
  if (contract.menuContract) {
    player.persistentData.putInt("dz_menu_community_contracts", player.persistentData.getInt("dz_menu_community_contracts") + 1)
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete 6D4D010000000108")
  }
  if (contract.colonyMealContract) {
    player.persistentData.putInt("dz_menu_colony_contracts", player.persistentData.getInt("dz_menu_colony_contracts") + 1)
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete 6D4D010000000109")
  }
  player.persistentData.putLong("dz_contract_next_" + key, Date.now() + DZ_CONTRACT_COOLDOWN_MS)
  player.persistentData.remove(dzContractActiveKey(key))
  player.persistentData.remove(dzContractProgressKey(key))
  try {
    if (typeof dzPeopleRecordContract === "function") dzPeopleRecordContract(player, key, contract, quality)
  } catch (error) {
    console.error("[PROJECT DEADZONE][Contracts] Relationship hook failed after safe contract close: " + error)
  }
  player.tell(Text.of("依頼完了: " + contract.name + (quality ? "（" + quality.grade + "）" : "")).gold())
  player.tell(Text.of("報酬: Money " + money + " / " + contract.skill + " XP " + xp
    + (lifeRepGain > 0 ? " / 生活評判 +" + lifeRepGain : "")
    + ((contract.securityRep || 0) > 0 ? " / 治安評判 +" + contract.securityRep : "")
    + ((contract.restorationRep || 0) > 0 ? " / 復旧評判 +" + contract.restorationRep : "")).green())
  return 1
}

function dzContractTurnInKey(player, key, quiet) {
  let contract = DZ_CONTRACTS[key]
  if (!contract || !dzContractIsActive(player, key)) {
    if (!quiet) player.tell(Text.of("その依頼は受注していません。" ).gray())
    return 0
  }
  let quality = null
  if (contract.qualityLots) {
    for (let i = 0; i < contract.qualityLots.length; i++) {
      if (player.server.runCommandSilent("clear " + player.username + " " + contract.qualityLots[i].item + " 0") > 0) {
        quality = contract.qualityLots[i]
        break
      }
    }
    if (!quality) {
      if (!quiet) {
    player.tell(Text.of("認定済みの検品ロットがありません。Base Coreの『食材検品』から作成してください。").red())
        contract.qualityLots.forEach(lot => player.tell(Text.of("- " + lot.grade + "：" + lot.item).gray()))
      }
      return 0
    }
    player.server.runCommandSilent("clear " + player.username + " " + quality.item + " 1")
  } else if (contract.target) {
    let progress = player.persistentData.getInt(dzContractProgressKey(key))
    if (progress < contract.target) {
      if (!quiet) player.tell(Text.of(contract.name + ": " + progress + "/" + contract.target).yellow())
      return 0
    }
  } else {
    if (!dzContractHasItems(player, contract.items)) {
      if (!quiet) {
        player.tell(Text.of("納品物資が不足しています。" ).red())
        contract.items.forEach(entry => player.tell(Text.of("- " + entry[0] + " x" + entry[1]).gray()))
      }
      return 0
    }
    contract.items.forEach(entry => player.server.runCommandSilent(
      "clear " + player.username + " " + entry[0] + " " + entry[1]))
  }
  return dzContractComplete(player, key, quality)
}

function dzContractTurnInAll(player) {
  dzContractMigrateLegacy(player)
  let active = dzContractActiveKeys(player)
  if (active.length === 0) {
    player.tell(Text.of("受注中の依頼はありません。" ).gray())
    return 0
  }
  let completed = 0
  active.forEach(key => { completed += dzContractTurnInKey(player, key, true) })
  if (completed === 0) player.tell(Text.of("完了条件を満たした依頼はありません。" ).yellow())
  else player.tell(Text.of(completed + "件の依頼をまとめて納品しました。" ).aqua())
  return 1
}

EntityEvents.death(event => {
  let player = event.source ? event.source.actual : null
  if (!player || !player.isPlayer || !player.isPlayer()) return
  dzContractMigrateLegacy(player)
  let entity = event.entity

  Object.keys(DZ_CONTRACTS).forEach(key => {
    if (!dzContractIsActive(player, key)) return
    let contract = DZ_CONTRACTS[key]
    if (!contract.target || !contract.killType) return
    let qualifies = key === "infected"
      ? (String(entity.type).startsWith("infectious:") || String(entity.type) === "minecraft:zombie" || String(entity.type) === "minecraft:husk" || String(entity.type) === "minecraft:drowned")
      : key === "raiders"
        ? (entity.tags.contains("dz_raider") || entity.tags.contains("dz_faction_raiders") || entity.tags.contains("dz_basecamp_raider"))
        : contract.killType === "elite"
          ? (entity.tags.contains("dz_elite") || entity.tags.contains("dz_named") || entity.tags.contains("dz_sideboss"))
          : false
    if (!qualifies) return
    let progressKey = dzContractProgressKey(key)
    let progress = Math.min(contract.target, player.persistentData.getInt(progressKey) + 1)
    player.persistentData.putInt(progressKey, progress)
    if (progress === contract.target || progress % 5 === 0)
      player.tell(Text.of(contract.name + ": " + progress + "/" + contract.target).yellow())
  })
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonecontracts")
  root.executes(ctx => { dzContractTellMenu(ctx.source.player); return 1 })
  root.then(Commands.literal("status").executes(ctx => { dzContractTellMenu(ctx.source.player); return 1 }))
  root.then(Commands.literal("life").executes(ctx => {
    let server = ctx.source.server
    let rep = dzLifeReputation(server)
    let rank = dzLifeRank(server)
    ctx.source.player.tell(Text.of("生活評判 " + rep + " / Rank " + rank + "「" + dzLifeRankName(rank) + "」").green())
    return 1
  }))
  root.then(Commands.literal("turnin").executes(ctx => dzContractTurnInAll(ctx.source.player)))

  // Keep the legacy command safe: it now abandons every active contract.
  root.then(Commands.literal("abandon").executes(ctx => {
    let player = ctx.source.player
    dzContractMigrateLegacy(player)
    dzContractActiveKeys(player).forEach(key => {
      player.persistentData.remove(dzContractActiveKey(key))
      player.persistentData.remove(dzContractProgressKey(key))
    })
    player.tell(Text.of("受注中の依頼をすべて破棄しました。再受注できます。" ).yellow())
    return 1
  }))

  Object.keys(DZ_CONTRACTS).forEach(key => {
    root.then(Commands.literal("accept_" + key).executes(ctx => dzContractAccept(ctx.source.player, key)))
    root.then(Commands.literal("turnin_" + key).executes(ctx => dzContractTurnInKey(ctx.source.player, key, false)))
    root.then(Commands.literal("abandon_" + key).executes(ctx => {
      let player = ctx.source.player
      player.persistentData.remove(dzContractActiveKey(key))
      player.persistentData.remove(dzContractProgressKey(key))
      player.tell(Text.of("依頼を破棄しました: " + DZ_CONTRACTS[key].name).yellow())
      return 1
    }))
  })

  root.then(Commands.literal("reset_all").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    player.persistentData.remove("dz_contract_active")
    player.persistentData.remove("dz_contract_progress")
    Object.keys(DZ_CONTRACTS).forEach(key => {
      player.persistentData.remove(dzContractActiveKey(key))
      player.persistentData.remove(dzContractProgressKey(key))
      player.persistentData.remove("dz_contract_next_" + key)
    })
    player.tell(Text.of("依頼状態とクールダウンをリセットしました。" ).aqua())
    return 1
  }))
  root.then(Commands.literal("reset_life").requires(source => source.hasPermission(2)).executes(ctx => {
    ctx.source.server.persistentData.putInt("dz_life_supply_reputation", 0)
    ctx.source.server.persistentData.putInt("dz_camp_community_announced_rank", 0)
    ctx.source.server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
    ctx.source.player.tell(Text.of("生活評判を0へリセットしました。" ).aqua())
    return 1
  }))
  root.then(Commands.literal("reset_community").requires(source => source.hasPermission(2)).executes(ctx => {
    ctx.source.server.persistentData.putInt("dz_camp_security_reputation", 0)
    ctx.source.server.persistentData.putInt("dz_camp_restoration_reputation", 0)
    ctx.source.server.persistentData.putInt("dz_camp_community_announced_rank", 0)
    ctx.source.server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
    ctx.source.player.tell(Text.of("治安・復旧評判とCamp総合Rank通知状態をリセットしました。生活評判は維持されます。").aqua())
    return 1
  }))
  event.register(root)
})

PlayerEvents.loggedIn(event => event.player.server.scheduleInTicks(80, callback => dzLifeSyncQuests(event.player)))

console.info("[PROJECT DEADZONE][Contracts] v0.6 cooking, quality and relationship hooks loaded (max " + DZ_CONTRACT_MAX_ACTIVE + ").")
