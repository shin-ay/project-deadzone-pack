// PROJECT DEADZONE - Tier 1 supplies for ordinary vanilla exploration chests.
// Higher-tier weapons, vehicles, and Superb Warfare items stay out of this pool.

LootJS.modifiers(event => {
  // Dimension progression is intentionally routed through facilities because
  // PROJECT DEADZONE does not use the Nether or the End as playable worlds.
  // Keep these tables separate from ordinary residential/scavenging loot.
  const netherT1FacilityTables = [
    "minecraft:chests/military",
    "underground_bunkers:chests/underground_bunker/underground_bunker_normal",
    "underground_bunkers:chests/underground_bunker/underground_bunker_supply",
    "jeffs_cursed_walking_structures:chests/ammo_chest",
    "jeffs_cursed_walking_structures:chests/ammo_tacz",
    "jeffs_cursed_walking_structures:chests/ammo_tacz_2",
    "jeffs_cursed_walking_structures:chests/gear_chest",
    "jeffs_cursed_walking_structures:chests/supplychest"
  ]

  netherT1FacilityTables.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.58)
      .addWeightedLoot(1, [
        Item.of("minecraft:quartz", 6).withChance(24),
        Item.of("minecraft:glowstone_dust", 5).withChance(20),
        Item.of("minecraft:nether_wart", 3).withChance(14),
        Item.of("minecraft:nether_brick", 6).withChance(20),
        Item.of("minecraft:magma_block", 2).withChance(12),
        Item.of("minecraft:magma_cream", 2).withChance(10)
      ])
  })

  // T2 treasure rooms contain the heat- and combustion-related materials
  // needed by advanced industry. Netherite remains a jackpot, not a staple.
  const netherT2FacilityTables = [
    "underground_bunkers:chests/underground_bunker/underground_bunker_treasure",
    "jeffs_cursed_walking_structures:chests/resource_chest",
    "jeffs_cursed_walking_structures:chests/gun_2"
  ]

  netherT2FacilityTables.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.74)
      .addWeightedLoot(1, [
        Item.of("minecraft:blaze_powder", 3).withChance(38),
        Item.of("minecraft:blaze_rod", 2).withChance(28),
        Item.of("minecraft:ghast_tear", 1).withChance(20),
        Item.of("minecraft:netherite_scrap", 1).withChance(5),
        Item.of("minecraft:magma_cream", 3).withChance(9)
      ])
  })

  // End materials only enter the economy through T3+ deep/strategic sites.
  // Elytra, dragon eggs, and other dimension trophies are deliberately absent.
  const endT3FacilityTables = [
    "minecraft:chests/stronghold_corridor",
    "minecraft:chests/stronghold_crossing",
    "minecraft:chests/stronghold_library",
    "minecraft:chests/ancient_city",
    "minecraft:chests/ancient_city_ice_box",
    "jeffs_cursed_walking_structures:chests/strange_chest",
    "jeffs_cursed_walking_structures:chests/guntreasure"
  ]

  endT3FacilityTables.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.68)
      .addWeightedLoot(1, [
        Item.of("minecraft:ender_pearl", 3).withChance(29),
        Item.of("minecraft:chorus_fruit", 5).withChance(23),
        Item.of("minecraft:popped_chorus_fruit", 4).withChance(19),
        Item.of("minecraft:end_rod", 3).withChance(15),
        Item.of("minecraft:shulker_shell", 1).withChance(10),
        Item.of("minecraft:dragon_breath", 1).withChance(4)
      ])
  })

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
        Item.of("lightmanscurrency:coin_copper", 4).withChance(72),
        Item.of("lightmanscurrency:coin_copper", 1).withChance(28)
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

  // Vanilla villages also use profession-specific chest tables. These were
  // previously untouched, which made a weaponsmith, temple and fisher feel
  // almost identical to their vanilla versions. Give each district a useful
  // scavenging identity without turning every village into a full arsenal.
  const villageWorkshopTables = [
    "minecraft:chests/village/village_armorer",
    "minecraft:chests/village/village_toolsmith",
    "minecraft:chests/village/village_weaponsmith"
  ]

  villageWorkshopTables.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.88)
      .addWeightedLoot(1, [
        Item.of("minecraft:iron_ingot", 4).withChance(28),
        Item.of("immersiveengineering:plate_iron", 3).withChance(24),
        Item.of("immersiveengineering:ingot_steel", 2).withChance(18),
        Item.of("create:andesite_alloy", 3).withChance(18),
        Item.of("survival_instinct:rope", 3).withChance(12)
      ])

    event.addLootTableModifier(table)
      .randomChance(0.62)
      .addWeightedLoot(1, [
        Item.of("tacz:ammo", 16, '{AmmoId:"tacz:9mm"}').withChance(52),
        Item.of("tacz:ammo", 12, '{AmmoId:"tacz:45acp"}').withChance(30),
        Item.of("tacz:ammo", 8, '{AmmoId:"tacz:12g"}').withChance(18)
      ])

    // A village workshop can occasionally preserve a sidearm, but dedicated
    // military facilities remain the reliable source of stronger firearms.
    event.addLootTableModifier(table)
      .randomChance(0.08)
      .addWeightedLoot(1, [
        Item.of("tacz:modern_kinetic_gun", 1,
          '{GunFireMode:"SEMI",GunId:"tacz:glock_17",HasBulletInBarrel:1b}').withChance(55),
        Item.of("tacz:modern_kinetic_gun", 1,
          '{GunFireMode:"SEMI",GunId:"tacz:m1911",HasBulletInBarrel:1b}').withChance(45)
      ])
  })

  const villageFoodTables = [
    "minecraft:chests/village/village_butcher",
    "minecraft:chests/village/village_fisher"
  ]

  villageFoodTables.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.9)
      .addWeightedLoot(1, [
        Item.of("survival_instinct:bean_can", 3).withChance(34),
        Item.of("survival_instinct:gallon_of_water", 2).withChance(24),
        Item.of("minecraft:cooked_beef", 4).withChance(22),
        Item.of("minecraft:cooked_cod", 5).withChance(20)
      ])

    event.addLootTableModifier(table)
      .randomChance(0.42)
      .addWeightedLoot(1, [
        Item.of("apocalypsenow:bandage", 2).withChance(44),
        Item.of("survival_instinct:rope", 3).withChance(34),
        Item.of("minecraft:leather", 4).withChance(22)
      ])
  })

  const villageTextileTables = [
    "minecraft:chests/village/village_shepherd",
    "minecraft:chests/village/village_tannery"
  ]

  villageTextileTables.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.84)
      .addWeightedLoot(1, [
        Item.of("minecraft:leather", 5).withChance(34),
        Item.of("survival_instinct:rope", 4).withChance(28),
        Item.of("immersiveengineering:hemp_fiber", 5).withChance(24),
        Item.of("apocalypsenow:bandage", 3).withChance(14)
      ])
  })

  const villageCivicTables = [
    "minecraft:chests/village/village_cartographer",
    "minecraft:chests/village/village_fletcher",
    "minecraft:chests/village/village_mason"
  ]

  villageCivicTables.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.78)
      .addWeightedLoot(1, [
        Item.of("minecraft:paper", 6).withChance(28),
        Item.of("minecraft:compass", 1).withChance(17),
        Item.of("minecraft:arrow", 10).withChance(20),
        Item.of("create:copper_nugget", 6).withChance(20),
        Item.of("lightmanscurrency:coin_copper", 5).withChance(15)
      ])
  })

  event.addLootTableModifier("minecraft:chests/village/village_temple")
    .randomChance(0.92)
    .addWeightedLoot(1, [
      Item.of("apocalypsenow:bandage", 4).withChance(38),
      Item.of("apocalypsenow:pain_killers", 2).withChance(24),
      Item.of("survival_instinct:gallon_of_water", 2).withChance(22),
      Item.of("minecraft:golden_apple", 1).withChance(6),
      Item.of("lightmanscurrency:coin_copper", 2).withChance(10)
    ])

  // ChoiceTheorem's Overhauled Village ships its own chest tables, so the
  // vanilla village modifiers above never reached these houses. Keep ordinary
  // CTOV homes modest, then give the four work districts distinct identities.
  const ctovResidentialTables = [
    "ctov:chests/village/village_badlands_house",
    "ctov:chests/village/village_beach_house",
    "ctov:chests/village/village_dark_forest_house",
    "ctov:chests/village/village_jungle_house",
    "ctov:chests/village/village_mountain_house",
    "ctov:chests/village/village_mushroom_house",
    "ctov:chests/village/village_swamp_house"
  ]

  ctovResidentialTables.forEach(table => {
    event.addLootTableModifier(table)
      .removeLoot("minecraft:poisonous_potato")
      .removeLoot("minecraft:beetroot_seeds")
      .removeLoot("minecraft:wheat_seeds")

    event.addLootTableModifier(table)
      .randomChance(0.8)
      .addWeightedLoot(1, [
        Item.of("survival_instinct:bean_can", 2).withChance(30),
        Item.of("survival_instinct:gallon_of_water", 1).withChance(25),
        Item.of("apocalypsenow:bandage", 2).withChance(25),
        Item.of("minecraft:iron_ingot", 2).withChance(20)
      ])

    event.addLootTableModifier(table)
      .randomChance(0.38)
      .addWeightedLoot(1, [
        Item.of("survival_instinct:rope", 3).withChance(38),
        Item.of("immersiveengineering:hemp_fiber", 3).withChance(30),
        Item.of("lightmanscurrency:coin_copper", 4).withChance(22),
        Item.of("lightmanscurrency:coin_copper", 1).withChance(10)
      ])
  })

  const ctovFoodTables = [
    "ctov:chests/village/village_bakery",
    "ctov:chests/village/village_farm"
  ]

  ctovFoodTables.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.88)
      .addWeightedLoot(1, [
        Item.of("survival_instinct:bean_can", 3).withChance(32),
        Item.of("survival_instinct:gallon_of_water", 2).withChance(25),
        Item.of("minecraft:bread", 5).withChance(23),
        Item.of("farmersdelight:cooked_rice", 3).withChance(20)
      ])
  })

  event.addLootTableModifier("ctov:chests/village/village_smith")
    .randomChance(0.9)
    .addWeightedLoot(1, [
      Item.of("minecraft:iron_ingot", 5).withChance(30),
      Item.of("immersiveengineering:plate_iron", 3).withChance(24),
      Item.of("immersiveengineering:ingot_steel", 2).withChance(18),
      Item.of("create:andesite_alloy", 3).withChance(18),
      Item.of("tacz:ammo", 12, '{AmmoId:"tacz:9mm"}').withChance(10)
    ])

  const ctovKnowledgeTables = [
    "ctov:chests/village/village_forager",
    "ctov:chests/village/village_library"
  ]

  ctovKnowledgeTables.forEach(table => {
    event.addLootTableModifier(table)
      .randomChance(0.82)
      .addWeightedLoot(1, [
        Item.of("minecraft:paper", 7).withChance(30),
        Item.of("minecraft:compass", 1).withChance(18),
        Item.of("apocalypsenow:bandage", 2).withChance(20),
        Item.of("survival_instinct:rope", 3).withChance(18),
        Item.of("lightmanscurrency:coin_copper", 5).withChance(14)
      ])
  })
})
