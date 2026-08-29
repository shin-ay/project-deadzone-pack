// PROJECT DEADZONE Scavenging Perks v0.1

function dzScavengingTier(player, branch) {
  for (let tier = 3; tier >= 1; tier--) {
    if (player.tags.contains("dz_scavenging_" + branch + "_" + tier)) return tier
  }
  return 0
}

function dzScavengingCooldown(player, key, milliseconds) {
  let now = Date.now()
  let nbtKey = "dz_scavenging_cd_" + key
  let last = player.persistentData.getLong(nbtKey)
  if (now - last < milliseconds) return false
  player.persistentData.putLong(nbtKey, now)
  return true
}

function dzScavengingAddXp(player, amount) {
  if(global.pdzUnifiedProgressionAward)global.pdzUnifiedProgressionAward(player,'scavenging',amount,true)
}

function dzScavengingSearchReward(tier) {
  let pool = [
    Item.of("minecraft:string", 1),
    Item.of("minecraft:paper", 1),
    Item.of("minecraft:coal", 1),
    Item.of("minecraft:iron_nugget", 2)
  ]
  if (tier >= 2) {
    pool = pool.concat([
      Item.of("minecraft:leather", 1),
      Item.of("minecraft:redstone", 2),
      Item.of("minecraft:gunpowder", 1)
    ])
  }
  if (tier >= 3) {
    pool = pool.concat([
      Item.of("minecraft:copper_ingot", 1),
      Item.of("minecraft:iron_ingot", 1),
      Item.of("minecraft:gold_nugget", 2)
    ])
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

EntityEvents.death(event => {
  let victim = event.entity
  let player = event.source.player
  if (!player || player.level.clientSide || !victim || !victim.isMonster()) return

  let tier = dzScavengingTier(player, "search")
  if (tier <= 0 || !dzScavengingCooldown(player, "search_supply", 15000)) return
  if (Math.random() >= [0, 0.12, 0.20, 0.30][tier]) return

  let reward = dzScavengingSearchReward(tier)
  player.give(reward)
  player.tell(Text.of("現地物資を発見: " + reward.displayName.getString()).gold())
  dzScavengingAddXp(player, 1)
})

BlockEvents.broken(event => {
  let player = event.player
  if (!player || player.level.clientSide) return

  let tier = dzScavengingTier(player, "yield")
  if (tier <= 0 || !dzScavengingCooldown(player, "yield_roll", 500)) return

  let block = event.block
  let byproduct = null
  if (block.hasTag("minecraft:logs")) {
    byproduct = Item.of("minecraft:stick", tier)
  } else if (block.hasTag("forge:ores")) {
    byproduct = Math.random() < 0.65
      ? Item.of("minecraft:coal", 1)
      : Item.of("minecraft:flint", 1)
  } else if (block.hasTag("minecraft:crops") || block.hasTag("forge:crops")) {
    byproduct = Item.of("minecraft:bone_meal", 1)
  }
  if (!byproduct || Math.random() >= [0, 0.15, 0.25, 0.40][tier]) return

  block.popItem(byproduct)
  if (dzScavengingCooldown(player, "yield_xp", 15000)) {
    dzScavengingAddXp(player, 1)
  }
})

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 40 !== 0) return

  let tier = dzScavengingTier(player, "mapping")
  if (tier < 2) return

  let mainId = String(player.mainHandItem.id)
  let offId = String(player.offHandItem.id)
  let hasCompass = mainId === "minecraft:compass"
    || mainId === "minecraft:recovery_compass"
    || offId === "minecraft:compass"
    || offId === "minecraft:recovery_compass"
  if (!hasCompass) return

  player.server.runCommandSilent(
    "effect give " + player.username + " minecraft:night_vision 12 0 true"
  )
  if (tier < 3) return

  try {
    let nearby = player.level.getEntities(player, player.boundingBox.inflate(12))
    nearby.forEach(entity => {
      if (entity && entity.isMonster && entity.isMonster()) {
        entity.potionEffects.add("minecraft:glowing", 60, 0, false, false)
      }
    })
  } catch (error) {
    // Other mods may replace entity lookup; navigation still remains active.
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonescavenging")
    .requires(source => source.hasPermission(2))

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of(
      "Scavenging Search " + dzScavengingTier(player, "search")
      + " / Yield " + dzScavengingTier(player, "yield")
      + " / Mapping " + dzScavengingTier(player, "mapping")
    ).aqua())
    return 1
  }))
  event.register(root)
})
