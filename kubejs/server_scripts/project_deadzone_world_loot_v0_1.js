// PROJECT DEADZONE - Tier 1 supplies for ordinary vanilla exploration chests.
// Higher-tier weapons, vehicles, and Superb Warfare items stay out of this pool.

LootJS.modifiers(event => {
  const tables = [
    "minecraft:chests/simple_dungeon",
    "minecraft:chests/abandoned_mineshaft",
    "minecraft:chests/shipwreck_supply",
    "minecraft:chests/shipwreck_map",
    "minecraft:chests/ruined_portal",
    "minecraft:chests/stronghold_corridor",
    "minecraft:chests/stronghold_crossing",
    "minecraft:chests/desert_pyramid",
    "minecraft:chests/jungle_temple",
    "minecraft:chests/pillager_outpost"
  ]

  tables.forEach(table => {
    // Keep useful vanilla fundamentals, but remove common low-value filler.
    event.addLootTableModifier(table)
      .removeLoot("minecraft:poisonous_potato")
      .removeLoot("minecraft:beetroot_seeds")
      .removeLoot("minecraft:wheat_seeds")

    // A normal cache should usually contain one useful survival/medical supply.
    event.addLootTableModifier(table)
      .randomChance(0.72)
      .addWeightedLoot(1, [
        Item.of("apocalypsenow:bandage", 2).withChance(28),
        Item.of("apocalypsenow:bandage", 2).withChance(22),
        Item.of("apocalypsenow:pain_killers", 1).withChance(8),
        Item.of("survival_instinct:bean_can", 1).withChance(24),
        Item.of("survival_instinct:gallon_of_water", 1).withChance(18)
      ])

    // A smaller second roll makes modded scavenging materials visible early.
    event.addLootTableModifier(table)
      .randomChance(0.48)
      .addWeightedLoot(1, [
        Item.of("survival_instinct:rope", 2).withChance(34),
        Item.of("create:copper_nugget", 4).withChance(28),
        Item.of("immersiveengineering:hemp_fiber", 3).withChance(26),
        Item.of("minecraft:paper", 3).withChance(12)
      ])

    // Scavenged currency connects ordinary exploration to camp trading.
    // Money stays uncommon; coins are the more frequent low-value find.
    event.addLootTableModifier(table)
      .randomChance(0.24)
      .addWeightedLoot(1, [
        Item.of("apocalypsenow:coins", 4).withChance(72),
        Item.of("apocalypsenow:money", 1).withChance(28)
      ])
  })

  // Residential caches are the intended T0 surface progression. Players can
  // prepare for the first facility without retreating into vanilla mining.
  const residential = [
    "minecraft:chests/village/village_plains_house",
    "minecraft:chests/village/village_taiga_house",
    "minecraft:chests/village/village_savanna_house",
    "minecraft:chests/village/village_snowy_house",
    "minecraft:chests/village/village_desert_house",
    "minecraft:chests/apartament",
    "minecraft:chests/market"
  ]

  residential.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.82)
      .addWeightedLoot(1, [
        Item.of("survival_instinct:bean_can", 2).withChance(30),
        Item.of("survival_instinct:gallon_of_water", 1).withChance(24),
        Item.of("apocalypsenow:bandage", 3).withChance(24),
        Item.of("apocalypsenow:bandage", 2).withChance(22)
      ])

    event.addLootTableModifier(table)
      .randomChance(0.68)
      .addWeightedLoot(1, [
        Item.of("minecraft:iron_ingot", 3).withChance(28),
        Item.of("immersiveengineering:plate_iron", 2).withChance(18),
        Item.of("create:andesite_alloy", 2).withChance(18),
        Item.of("survival_instinct:rope", 3).withChance(20),
        Item.of("minecraft:leather", 3).withChance(16)
      ])

    // Ammunition is common enough to make a found/starter pistol usable, but
    // not enough for sustained automatic fire.
    event.addLootTableModifier(table)
      .randomChance(0.58)
      .addWeightedLoot(1, [
        Item.of("tacz:ammo", 12, '{AmmoId:"tacz:9mm"}').withChance(58),
        Item.of("tacz:ammo", 10, '{AmmoId:"tacz:45acp"}').withChance(27),
        Item.of("tacz:ammo", 6, '{AmmoId:"tacz:12g"}').withChance(15)
      ])

    event.addLootTableModifier(table)
      .randomChance(0.12)
      .addWeightedLoot(1, [
        Item.of("tacz:modern_kinetic_gun", 1,
          '{GunFireMode:"SEMI",GunId:"tacz:glock_17",HasBulletInBarrel:1b}').withChance(55),
        Item.of("tacz:modern_kinetic_gun", 1,
          '{GunFireMode:"SEMI",GunId:"tacz:m1911",HasBulletInBarrel:1b}').withChance(45)
      ])
  })
})
