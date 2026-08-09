// PROJECT DEADZONE Skill Effects v0.1
// Attribute-only first pass: Fitness, Armor and Melee.
// Recomputed from Puffish Skills reward tags so resets cannot leave stale buffs.

const DZ_EFFECT_MODIFIERS = {
  fitness_health: {
    attribute: "minecraft:generic.max_health",
    uuid: "d34db000-0000-4000-8000-000000000101"
  },
  fitness_speed: {
    attribute: "minecraft:generic.movement_speed",
    uuid: "d34db000-0000-4000-8000-000000000102"
  },
  armor_points: {
    attribute: "minecraft:generic.armor",
    uuid: "d34db000-0000-4000-8000-000000000201"
  },
  armor_knockback: {
    attribute: "minecraft:generic.knockback_resistance",
    uuid: "d34db000-0000-4000-8000-000000000202"
  },
  armor_mobility: {
    attribute: "minecraft:generic.movement_speed",
    uuid: "d34db000-0000-4000-8000-000000000203"
  },
  melee_damage: {
    attribute: "minecraft:generic.attack_damage",
    uuid: "d34db000-0000-4000-8000-000000000301"
  },
  melee_speed: {
    attribute: "minecraft:generic.attack_speed",
    uuid: "d34db000-0000-4000-8000-000000000302"
  },
  melee_knockback: {
    attribute: "minecraft:generic.attack_knockback",
    uuid: "d34db000-0000-4000-8000-000000000303"
  },
  survival_toughness: {
    attribute: "minecraft:generic.armor_toughness",
    uuid: "d34db000-0000-4000-8000-000000000401"
  },
  scavenging_luck: {
    attribute: "minecraft:generic.luck",
    uuid: "d34db000-0000-4000-8000-000000000501"
  },
  scavenging_speed: {
    attribute: "minecraft:generic.movement_speed",
    uuid: "d34db000-0000-4000-8000-000000000502"
  },
  mastery_health: {
    attribute: "minecraft:generic.max_health",
    uuid: "d34db000-0000-4000-8000-000000000601"
  },
  mastery_speed: {
    attribute: "minecraft:generic.movement_speed",
    uuid: "d34db000-0000-4000-8000-000000000602"
  },
  mastery_toughness: {
    attribute: "minecraft:generic.armor_toughness",
    uuid: "d34db000-0000-4000-8000-000000000603"
  },
  mastery_luck: {
    attribute: "minecraft:generic.luck",
    uuid: "d34db000-0000-4000-8000-000000000604"
  }
}

function dzHasTag(player, tag) {
  return player.tags.contains(tag)
}

function dzHighestTier(player, prefix, maxTier) {
  for (let tier = maxTier; tier >= 1; tier--) {
    if (dzHasTag(player, prefix + tier)) return tier
  }
  return 0
}

function dzCoreRank(player, category) {
  return dzHighestTier(player, "dz_" + category + "_core_", 6)
}

function dzSetModifier(player, key, amount, operation) {
  let modifier = DZ_EFFECT_MODIFIERS[key]
  player.removeAttribute(modifier.attribute, modifier.uuid)
  if (Math.abs(amount) > 0.000001) {
    player.modifyAttribute(modifier.attribute, modifier.uuid, amount, operation)
  }
}

function dzRefreshSkillEffects(player) {
  let fitnessCore = dzCoreRank(player, "fitness")
  let fitnessEndurance = dzHighestTier(player, "dz_fitness_endurance_", 3)
  let fitnessMobility = dzHighestTier(player, "dz_fitness_mobility_", 3)

  // Core: +0.5 max health per rank. Endurance: +1 max health per tier.
  dzSetModifier(player, "fitness_health",
    fitnessCore * 0.5 + fitnessEndurance * 1.0, "addition")
  // Core: +0.5% base speed per rank. Mobility: +2% base speed per tier.
  dzSetModifier(player, "fitness_speed",
    fitnessCore * 0.005 + fitnessMobility * 0.02, "multiply_base")

  let armorCore = dzCoreRank(player, "armor")
  let armorProtection = dzHighestTier(player, "dz_armor_protection_", 3)
  let armorRecovery = dzHighestTier(player, "dz_armor_recovery_", 3)
  let armorMobility = dzHighestTier(player, "dz_armor_mobility_", 3)

  // Core: +0.25 armor per rank. Protection: +0.75 armor per tier.
  dzSetModifier(player, "armor_points",
    armorCore * 0.25 + armorProtection * 0.75, "addition")
  // Recovery branch reduces displacement without granting damage immunity.
  dzSetModifier(player, "armor_knockback",
    armorRecovery * 0.05, "addition")
  // Mobility applies only while armor is actually worn.
  dzSetModifier(player, "armor_mobility",
    player.armorValue > 0 ? armorMobility * 0.015 : 0, "multiply_base")

  let meleeCore = dzCoreRank(player, "melee")
  let meleePower = dzHighestTier(player, "dz_melee_power_", 3)
  let meleeControl = dzHighestTier(player, "dz_melee_control_", 3)
  let meleeEfficiency = dzHighestTier(player, "dz_melee_efficiency_", 3)

  // Generic attack damage affects direct melee attacks, not TaCZ projectile damage.
  dzSetModifier(player, "melee_damage",
    meleeCore * 0.15 + meleePower * 0.4, "addition")
  dzSetModifier(player, "melee_knockback",
    meleeControl * 0.1, "addition")
  dzSetModifier(player, "melee_speed",
    meleeEfficiency * 0.04, "multiply_base")

  let survivalCore = dzCoreRank(player, "survival")
  let survivalResistance = dzHighestTier(player, "dz_survival_resistance_", 3)
  // Core supplies a small baseline; the resistance branch matters under heavy hits.
  dzSetModifier(player, "survival_toughness",
    survivalCore * 0.1 + survivalResistance * 0.5, "addition")

  let scavengingCore = dzCoreRank(player, "scavenging")
  let scavengingSearch = dzHighestTier(player, "dz_scavenging_search_", 3)
  let scavengingMapping = dzHighestTier(player, "dz_scavenging_mapping_", 3)
  // Luck affects compatible chest/fishing/loot-table rolls.
  dzSetModifier(player, "scavenging_luck",
    scavengingCore * 0.1 + scavengingSearch * 0.5, "addition")
  dzSetModifier(player, "scavenging_speed",
    scavengingMapping * 0.01, "multiply_base")

  dzSetModifier(player, "mastery_health",
    dzHasTag(player, "dz_mastery_vitality_1") ? 2.0 : 0, "addition")
  dzSetModifier(player, "mastery_speed",
    dzHasTag(player, "dz_mastery_mobility_1") ? 0.02 : 0, "multiply_base")
  dzSetModifier(player, "mastery_toughness",
    dzHasTag(player, "dz_mastery_resilience_1") ? 0.75 : 0, "addition")
  dzSetModifier(player, "mastery_luck",
    dzHasTag(player, "dz_mastery_appraiser_1") ? 0.5 : 0, "addition")

  // Clamp health after a reset removes maximum-health bonuses.
  if (player.health > player.maxHealth) player.health = player.maxHealth
}

PlayerEvents.tick(event => {
  let player = event.player
  if (player.age % 100 === 0) dzRefreshSkillEffects(player)
})

PlayerEvents.loggedIn(event => {
  dzRefreshSkillEffects(event.player)
})

PlayerEvents.respawned(event => {
  dzRefreshSkillEffects(event.player)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzoneskills")
    .requires(source => source.hasPermission(2))

  root.then(Commands.literal("effects_refresh").executes(ctx => {
    dzRefreshSkillEffects(ctx.source.player)
    ctx.source.player.tell(Text.of("DEADZONE skill attribute effects refreshed.").aqua())
    return 1
  }))

  root.then(Commands.literal("effects_status").executes(ctx => {
    let p = ctx.source.player
    p.tell(Text.of("Fitness core " + dzCoreRank(p, "fitness")
      + " / endurance " + dzHighestTier(p, "dz_fitness_endurance_", 3)
      + " / mobility " + dzHighestTier(p, "dz_fitness_mobility_", 3)).gray())
    p.tell(Text.of("Armor core " + dzCoreRank(p, "armor")
      + " / protection " + dzHighestTier(p, "dz_armor_protection_", 3)
      + " / recovery " + dzHighestTier(p, "dz_armor_recovery_", 3)
      + " / mobility " + dzHighestTier(p, "dz_armor_mobility_", 3)).gray())
    p.tell(Text.of("Melee core " + dzCoreRank(p, "melee")
      + " / power " + dzHighestTier(p, "dz_melee_power_", 3)
      + " / control " + dzHighestTier(p, "dz_melee_control_", 3)
      + " / efficiency " + dzHighestTier(p, "dz_melee_efficiency_", 3)).gray())
    p.tell(Text.of("Survival core " + dzCoreRank(p, "survival")
      + " / metabolism " + dzHighestTier(p, "dz_survival_metabolism_", 3)
      + " / resistance " + dzHighestTier(p, "dz_survival_resistance_", 3)).gray())
    p.tell(Text.of("Medical core " + dzCoreRank(p, "medical")
      + " / treatment " + dzHighestTier(p, "dz_medical_treatment_", 3)
      + " / conservation " + dzHighestTier(p, "dz_medical_conservation_", 3)
      + " / revive " + dzHighestTier(p, "dz_medical_revive_", 3)).gray())
    p.tell(Text.of("Scavenging core " + dzCoreRank(p, "scavenging")
      + " / search " + dzHighestTier(p, "dz_scavenging_search_", 3)
      + " / yield " + dzHighestTier(p, "dz_scavenging_yield_", 3)
      + " / mapping " + dzHighestTier(p, "dz_scavenging_mapping_", 3)).gray())
    return 1
  }))

  root.then(Commands.literal("armor_status").executes(ctx => {
    let p = ctx.source.player
    let lastStandElapsed = Date.now() - p.persistentData.getLong("dz_armor_last_stand_ms")
    let secondWindElapsed = Date.now() - p.persistentData.getLong("dz_armor_second_wind_ms")
    let lastStandRemaining = Math.max(0, Math.ceil((60000 - lastStandElapsed) / 1000))
    let secondWindRemaining = Math.max(0, Math.ceil((900000 - secondWindElapsed) / 1000))
    p.tell(Text.of(
      "Armor Mobility " + dzHighestTier(p, "dz_armor_mobility_", 3)
      + " / Protection " + dzHighestTier(p, "dz_armor_protection_", 3)
      + " / Recovery " + dzHighestTier(p, "dz_armor_recovery_", 3)
    ).aqua())
    p.tell(Text.of(
      "Last Stand " + (lastStandRemaining > 0 ? lastStandRemaining + "s" : "READY")
      + " / Second Wind " + (secondWindRemaining > 0 ? secondWindRemaining + "s" : "READY")
    ).gray())
    return 1
  }))

  event.register(root)
})
