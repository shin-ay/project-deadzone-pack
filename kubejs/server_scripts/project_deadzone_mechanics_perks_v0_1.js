// PROJECT DEADZONE Mechanics Perks v0.1
// Repair changes how maintenance is performed; Salvage rewards deliberate
// dismantling without returning enough material to duplicate full machines.

const DZ_MECHANICS_REPAIR_TOOLS = [
  "blocky_bikes:toolkit",
  "vehicle:wrench",
  "vehicle:hammer"
]

const DZ_MECHANICS_SALVAGE_NAMESPACES = [
  "blocky_bikes",
  "vehicle",
  "mts",
  "create",
  "immersiveengineering",
  "superbwarfare"
]

function dzMechanicsTier(player, branch) {
  for (let tier = 3; tier >= 1; tier--) {
    if (player.tags.contains("dz_mechanics_" + branch + "_" + tier)) return tier
  }
  return 0
}

function dzMechanicsCooldown(player, key, milliseconds) {
  let now = Date.now()
  let nbtKey = "dz_mechanics_cd_" + key
  let last = player.persistentData.getLong(nbtKey)
  if (now - last < milliseconds) return false
  player.persistentData.putLong(nbtKey, now)
  return true
}

function dzMechanicsAddXp(player, amount) {
  player.server.runCommandSilent(
    "puffish_skills experience add " + player.username + " mechanics " + amount
  )
}

ItemEvents.rightClicked(event => {
  let player = event.player
  if (!player || player.level.clientSide || !player.isCrouching()) return

  let repairTier = dzMechanicsTier(player, "repair")
  if (repairTier <= 0) return
  if (!DZ_MECHANICS_REPAIR_TOOLS.includes(String(event.item.id))) return

  let target = player.offHandItem
  if (!target || target.empty || target.maxDamage <= 0 || target.damageValue <= 0) {
    if (dzMechanicsCooldown(player, "repair_notice", 2000)) {
      player.tell(Text.of("オフハンドに耐久の減った装備を持ってください。").gray())
    }
    return
  }
  if (!dzMechanicsCooldown(player, "field_repair", 5000)) return

  let repairAmount = [0, 8, 16, 32][repairTier]
  let before = target.damageValue
  target.damageValue = Math.max(0, before - repairAmount)
  let repaired = before - target.damageValue

  player.tell(Text.of("現場修理: 耐久を " + repaired + " 回復").green())
  dzMechanicsAddXp(player, 1)
})

BlockEvents.broken(event => {
  let player = event.player
  if (!player || player.level.clientSide || !player.isCrouching()) return

  let salvageTier = dzMechanicsTier(player, "salvage")
  if (salvageTier <= 0) return

  let blockId = String(event.block.id)
  let separator = blockId.indexOf(":")
  if (separator <= 0) return
  let namespace = blockId.substring(0, separator)
  if (!DZ_MECHANICS_SALVAGE_NAMESPACES.includes(namespace)) return
  if (!dzMechanicsCooldown(player, "salvage_roll", 350)) return

  let chance = [0, 0.25, 0.40, 0.60][salvageTier]
  if (Math.random() >= chance) return

  let ironNuggets = salvageTier === 1 ? 1
    : salvageTier === 2 ? 1 + Math.floor(Math.random() * 2)
    : 2 + Math.floor(Math.random() * 2)
  event.block.popItem(Item.of("minecraft:iron_nugget", ironNuggets))

  // Higher tiers occasionally recover a conductive component as well.
  if (salvageTier >= 2 && Math.random() < 0.20 + salvageTier * 0.05) {
    event.block.popItem(Item.of("create:copper_nugget", 1))
  }

  if (dzMechanicsCooldown(player, "salvage_xp", 10000)) {
    dzMechanicsAddXp(player, 1)
  }
  player.tell(Text.of("Salvage成功: 小部品を回収").gold())
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonemechanics")
    .requires(source => source.hasPermission(2))

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of(
      "Mechanics Repair " + dzMechanicsTier(player, "repair")
      + " / Salvage " + dzMechanicsTier(player, "salvage")
      + " / Vehicle " + dzMechanicsTier(player, "vehicle")
    ).aqua())
    return 1
  }))

  event.register(root)
})
