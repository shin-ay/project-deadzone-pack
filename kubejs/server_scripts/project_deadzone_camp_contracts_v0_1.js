// PROJECT DEADZONE repeatable Survivor Camp contracts v0.2
// Multiple contracts may be active at once. Each contract has its own progress
// and 30 real-minute completion cooldown.

const DZ_CONTRACT_COOLDOWN_MS = 30 * 60 * 1000
const DZ_CONTRACT_MAX_ACTIVE = 4
const DZ_CONTRACTS = {
  infected: {
    name: "感染者の掃討", target: 18, money: 7, skill: "firearms", xp: 12,
    description: "キャンプ周辺または市街地で感染者を18体排除する。"
  },
  raiders: {
    name: "略奪者の排除", target: 6, money: 11, skill: "firearms", xp: 16,
    description: "Raider勢力を6体排除する。World Tier 1以降向け。", tier: 1
  },
  medical: {
    name: "医療物資の補充", money: 8, skill: "medical", xp: 14,
    description: "包帯を4個、シオリへ納品する。",
    items: [["apocalypsenow:bandage", 4]]
  },
  salvage: {
    name: "修理素材の回収", money: 9, skill: "scavenging", xp: 14,
    description: "鉄インゴット6個と銅インゴット8個をゴロウへ納品する。",
    items: [["minecraft:iron_ingot", 6], ["minecraft:copper_ingot", 8]]
  },
  provisions: {
    name: "共同備蓄", money: 7, skill: "survival", xp: 12,
    description: "パン8個と水1ガロンをマヤへ納品する。",
    items: [["minecraft:bread", 8], ["survival_instinct:gallon_of_water", 1]]
  }
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
  let active = dzContractActiveKeys(player)
  player.tell(Text.of("受注中: " + active.length + "/" + DZ_CONTRACT_MAX_ACTIVE).yellow())

  active.forEach(key => {
    let contract = DZ_CONTRACTS[key]
    let progress = player.persistentData.getInt(dzContractProgressKey(key))
    let suffix = contract.target ? "  [" + progress + "/" + contract.target + "]" : "  [納品待ち]"
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

function dzContractComplete(player, key) {
  let contract = DZ_CONTRACTS[key]
  player.server.runCommandSilent("give " + player.username + " apocalypsenow:money " + contract.money)
  player.server.runCommandSilent("puffish_skills experience add " + player.username + " " + contract.skill + " " + contract.xp)
  player.persistentData.putLong("dz_contract_next_" + key, Date.now() + DZ_CONTRACT_COOLDOWN_MS)
  player.persistentData.remove(dzContractActiveKey(key))
  player.persistentData.remove(dzContractProgressKey(key))
  player.tell(Text.of("依頼完了: " + contract.name).gold())
  player.tell(Text.of("報酬: Money " + contract.money + " / " + contract.skill + " XP " + contract.xp).green())
  return 1
}

function dzContractTurnInKey(player, key, quiet) {
  let contract = DZ_CONTRACTS[key]
  if (!contract || !dzContractIsActive(player, key)) {
    if (!quiet) player.tell(Text.of("その依頼は受注していません。" ).gray())
    return 0
  }
  if (contract.target) {
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
  return dzContractComplete(player, key)
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

  ;["infected", "raiders"].forEach(key => {
    if (!dzContractIsActive(player, key)) return
    let qualifies = key === "infected"
      ? (String(entity.type).startsWith("infectious:") || String(entity.type) === "minecraft:zombie" || String(entity.type) === "minecraft:husk" || String(entity.type) === "minecraft:drowned")
      : (entity.tags.contains("dz_raider") || entity.tags.contains("dz_faction_raiders") || entity.tags.contains("dz_basecamp_raider"))
    if (!qualifies) return
    let contract = DZ_CONTRACTS[key]
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
  event.register(root)
})

console.info("[PROJECT DEADZONE][Contracts] v0.2 multi-contract system loaded (max " + DZ_CONTRACT_MAX_ACTIVE + ").")
