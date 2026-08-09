// PROJECT DEADZONE repeatable Survivor Camp contracts v0.1
// One active contract per player. Each contract can be completed once every
// 30 real minutes, so multiplayer farming does not turn into free currency.

const DZ_CONTRACT_COOLDOWN_MS = 30 * 60 * 1000
const DZ_CONTRACTS = {
  infected: {
    name: "感染者掃討", target: 18, money: 7, skill: "firearms", xp: 12,
    description: "キャンプ周辺または市街地で感染者を18体排除する。"
  },
  raiders: {
    name: "略奪者の排除", target: 6, money: 11, skill: "firearms", xp: 16,
    description: "Raidersを6人排除する。World Tier 1以降向け。", tier: 1
  },
  medical: {
    name: "医療物資の補充", money: 8, skill: "medical", xp: 14,
    description: "包帯4個と絆創膏6個をシオリへ納品する。",
    items: [["apocalypsenow:bandage", 4], ["apocalypsenow:bandage", 6]]
  },
  salvage: {
    name: "修理資材の回収", money: 9, skill: "scavenging", xp: 14,
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

function dzContractActive(player) {
  return String(player.persistentData.getString("dz_contract_active"))
}

function dzContractTellMenu(player) {
  player.tell(Text.of("=== SURVIVOR CAMP 依頼掲示板 ===").gold())
  let active = dzContractActive(player)
  if (active && DZ_CONTRACTS[active]) {
    let contract = DZ_CONTRACTS[active]
    let progress = player.persistentData.getInt("dz_contract_progress")
    let suffix = contract.target ? "  [" + progress + "/" + contract.target + "]" : ""
    player.tell(Text.of("受注中: " + contract.name + suffix).yellow())
    player.tell(Text.of("[進行状況・納品]").green()
      .clickRunCommand("/deadzonecontracts turnin")
      .hover(Text.of("クリックして確認または納品")))
    player.tell(Text.of("[依頼を破棄]").red()
      .clickRunCommand("/deadzonecontracts abandon"))
    return
  }
  let tier = dzContractTier(player)
  Object.keys(DZ_CONTRACTS).forEach(key => {
    let contract = DZ_CONTRACTS[key]
    if ((contract.tier || 0) > tier) return
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
  let contract = DZ_CONTRACTS[key]
  if (!contract || dzContractActive(player)) return 0
  if ((contract.tier || 0) > dzContractTier(player)) {
    player.tell(Text.of("この依頼はWorld Tier " + contract.tier + "で解放されます。").red())
    return 0
  }
  if (player.persistentData.getLong("dz_contract_next_" + key) > Date.now()) {
    player.tell(Text.of("この依頼はまだ再受注できません。").red())
    return 0
  }
  player.persistentData.putString("dz_contract_active", key)
  player.persistentData.putInt("dz_contract_progress", 0)
  player.tell(Text.of("依頼受注: " + contract.name).green())
  player.tell(Text.of(contract.description).gray())
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
  player.persistentData.remove("dz_contract_active")
  player.persistentData.remove("dz_contract_progress")
  player.tell(Text.of("依頼完了: " + contract.name).gold())
  player.tell(Text.of("報酬: Money " + contract.money + " / " + contract.skill + " XP " + contract.xp).green())
  return 1
}

function dzContractTurnIn(player) {
  let key = dzContractActive(player)
  let contract = DZ_CONTRACTS[key]
  if (!contract) {
    player.tell(Text.of("受注中の依頼はありません。").gray())
    return 0
  }
  if (contract.target) {
    let progress = player.persistentData.getInt("dz_contract_progress")
    if (progress < contract.target) {
      player.tell(Text.of(contract.name + ": " + progress + "/" + contract.target).yellow())
      return 0
    }
  } else {
    if (!dzContractHasItems(player, contract.items)) {
      player.tell(Text.of("納品物資が不足しています。").red())
      contract.items.forEach(entry => player.tell(Text.of("- " + entry[0] + " x" + entry[1]).gray()))
      return 0
    }
    contract.items.forEach(entry => player.server.runCommandSilent(
      "clear " + player.username + " " + entry[0] + " " + entry[1]))
  }
  return dzContractComplete(player, key)
}

EntityEvents.death(event => {
  let player = event.source ? event.source.actual : null
  if (!player || !player.isPlayer || !player.isPlayer()) return
  let key = dzContractActive(player)
  if (key !== "infected" && key !== "raiders") return
  let entity = event.entity
  let qualifies = key === "infected"
    ? (String(entity.type).startsWith("infectious:") || String(entity.type) === "minecraft:zombie" || String(entity.type) === "minecraft:husk" || String(entity.type) === "minecraft:drowned")
    : (entity.tags.contains("dz_raider") || entity.tags.contains("dz_faction_raiders") || entity.tags.contains("dz_basecamp_raider"))
  if (!qualifies) return
  let contract = DZ_CONTRACTS[key]
  let progress = Math.min(contract.target, player.persistentData.getInt("dz_contract_progress") + 1)
  player.persistentData.putInt("dz_contract_progress", progress)
  if (progress === contract.target || progress % 5 === 0)
    player.tell(Text.of(contract.name + ": " + progress + "/" + contract.target).yellow())
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonecontracts")
  root.executes(ctx => { dzContractTellMenu(ctx.source.player); return 1 })
  root.then(Commands.literal("status").executes(ctx => { dzContractTellMenu(ctx.source.player); return 1 }))
  root.then(Commands.literal("turnin").executes(ctx => dzContractTurnIn(ctx.source.player)))
  root.then(Commands.literal("abandon").executes(ctx => {
    let player = ctx.source.player
    player.persistentData.remove("dz_contract_active")
    player.persistentData.remove("dz_contract_progress")
    player.tell(Text.of("依頼を破棄しました。再受注できます。").yellow())
    return 1
  }))
  Object.keys(DZ_CONTRACTS).forEach(key => root.then(
    Commands.literal("accept_" + key).executes(ctx => dzContractAccept(ctx.source.player, key))))
  root.then(Commands.literal("reset_all").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    player.persistentData.remove("dz_contract_active")
    player.persistentData.remove("dz_contract_progress")
    Object.keys(DZ_CONTRACTS).forEach(key => player.persistentData.remove("dz_contract_next_" + key))
    player.tell(Text.of("依頼状態とクールダウンをリセットしました。").aqua())
    return 1
  }))
  event.register(root)
})
