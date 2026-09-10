// PROJECT DEADZONE Forge-event skill effects v0.1
// ForgeEvents is only available to startup scripts. Requires one game restart.

function dzForgeHasTag(entity, tag) {
  return entity.tags.contains(tag)
}

function dzForgeHighestTier(entity, prefix, maxTier) {
  for (let tier = maxTier; tier >= 1; tier--) {
    if (dzForgeHasTag(entity, prefix + tier)) return tier
  }
  return 0
}

function dzForgeCoreRank(entity, category) {
  return dzForgeHighestTier(entity, "dz_" + category + "_core_", 6)
}

ForgeEvents.onEvent("net.minecraftforge.event.entity.living.LivingHealEvent", event => {
  let entity = event.entity
  if (!entity || !entity.isPlayer()) return

  let core = dzForgeCoreRank(entity, "medical")
  let tier = dzForgeHighestTier(entity, "dz_medical_treatment_", 3)
  if (core <= 0 && tier <= 0) return

  // +2% per Medical core rank and +8% per Treatment tier.
  event.setAmount(event.amount * (1.0 + core * 0.02 + tier * 0.08))
})

ForgeEvents.onEvent("net.minecraftforge.event.entity.player.PlayerEvent$BreakSpeed", event => {
  let player = event.entity
  let tier = dzForgeHighestTier(player, "dz_scavenging_yield_", 3)
  if (tier <= 0) return

  // Careful salvage improves recovery pace without duplicating valuable blocks.
  event.setNewSpeed(event.newSpeed * (1.0 + tier * 0.08))
})

// Fitness Mobility softens falls; Tier 3 also grants a brief landing burst
// after a meaningful drop so parkour keeps its forward momentum.
ForgeEvents.onEvent("net.minecraftforge.event.entity.living.LivingFallEvent", event => {
  let player = event.entity
  if (!player || !player.isPlayer() || player.level.clientSide) return

  let tier = dzForgeHighestTier(player, "dz_fitness_mobility_", 3)
  if (tier <= 0 || event.distance <= 3.0) return

  let originalDistance = event.distance
  let multiplier = [1.0, 0.85, 0.70, 0.50][tier]
  event.setDamageMultiplier(event.damageMultiplier * multiplier)

  if (tier >= 3 && originalDistance >= 4.0) {
    player.server.runCommandSilent(
      "effect give " + player.username + " minecraft:speed 3 0 true"
    )
  }
})

// Medical Revive is resolved after PlayerRevive has created its downed state.
// See project_deadzone_playerrevive_skill_bridge_v0_1.js.  Never cancel a
// LivingDeathEvent here: PlayerRevive is the sole owner of down/revive state.

ForgeEvents.onEvent("net.minecraftforge.event.entity.living.LivingHurtEvent", event => {
  let player = event.entity
  if (!player || !player.isPlayer() || player.level.clientSide) return
  if (player.armorValue <= 0 || event.amount <= 0) return

  let protectionTier = dzForgeHighestTier(player, "dz_armor_protection_", 3)
  if (protectionTier > 0 && player.isCrouching()) {
    let reduction = [0, 0.05, 0.08, 0.12][protectionTier]
    event.setAmount(event.amount * (1.0 - reduction))
  }

  let recoveryTier = dzForgeHighestTier(player, "dz_armor_recovery_", 3)
  if (recoveryTier >= 2 && player.health <= player.maxHealth * 0.35) {
    let now = Date.now()
    let lastRecovery = player.persistentData.getLong("dz_armor_last_stand_ms")
    if (now - lastRecovery >= 60000) {
      player.persistentData.putLong("dz_armor_last_stand_ms", now)
      player.server.runCommandSilent(
        "effect give " + player.username + " minecraft:regeneration 5 0 true"
      )
      player.tell(Text.of("ラストスタンド発動").gold())
    }
  }

})

// Survival Resistance covers hazards without replacing Armor in direct combat.
ForgeEvents.onEvent("net.minecraftforge.event.entity.living.LivingHurtEvent", event => {
  let player = event.entity
  if (!player || !player.isPlayer() || player.level.clientSide) return
  if (event.amount <= 0 || event.source.entity) return

  let tier = dzForgeHighestTier(player, "dz_survival_resistance_", 3)
  if (tier <= 0) return

  let reduction = [0, 0.08, 0.15, 0.22][tier]
  event.setAmount(event.amount * (1.0 - reduction))
})
