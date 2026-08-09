// PROJECT DEADZONE Seafood Bridge v0.1
// Connect Hybrid Aquatic -> Aquaculture fillets -> Farmer's Delight cooking.

ServerEvents.tags("item", event => {
  // Hybrid Aquatic already exposes a broad conventional raw-fish tag. Build a
  // PDZ processing tag from it, then keep shellfish on a separate production line.
  event.add("project_deadzone:raw_fish", [
    "hybrid_aquatic:anglerfish", "hybrid_aquatic:carp",
    "hybrid_aquatic:trout", "hybrid_aquatic:sunfish",
    "hybrid_aquatic:mackerel", "hybrid_aquatic:herring",
    "hybrid_aquatic:damselfish", "hybrid_aquatic:sea_bass",
    "hybrid_aquatic:parrotfish", "hybrid_aquatic:sheepshead_wrasse",
    "hybrid_aquatic:seahorse", "hybrid_aquatic:barreleye",
    "hybrid_aquatic:betta", "hybrid_aquatic:stingray",
    "hybrid_aquatic:tuna", "hybrid_aquatic:surgeonfish",
    "hybrid_aquatic:pearlfish", "hybrid_aquatic:snailfish",
    "hybrid_aquatic:clownfish", "hybrid_aquatic:boxfish",
    "hybrid_aquatic:stonefish", "hybrid_aquatic:blowfish",
    "hybrid_aquatic:oarfish", "hybrid_aquatic:ocean_sunfish",
    "hybrid_aquatic:danio", "hybrid_aquatic:discus",
    "hybrid_aquatic:dragonfish", "hybrid_aquatic:flashlight_fish",
    "hybrid_aquatic:flying_fish", "hybrid_aquatic:golden_dorado",
    "hybrid_aquatic:coelacanth", "hybrid_aquatic:squirrelfish",
    "hybrid_aquatic:gourami", "hybrid_aquatic:lionfish",
    "hybrid_aquatic:mahi", "hybrid_aquatic:moray_eel",
    "hybrid_aquatic:needlefish", "hybrid_aquatic:opah",
    "hybrid_aquatic:cichlid", "hybrid_aquatic:piranha",
    "hybrid_aquatic:ratfish", "hybrid_aquatic:rockfish",
    "hybrid_aquatic:tetra", "hybrid_aquatic:tiger_barb",
    "hybrid_aquatic:triggerfish", "hybrid_aquatic:trevally",
    "hybrid_aquatic:john_dory", "hybrid_aquatic:goldfish",
    "hybrid_aquatic:raw_fish_meat", "hybrid_aquatic:raw_fish_steak"
  ])

  event.add("project_deadzone:raw_shellfish", [
    "hybrid_aquatic:raw_crab",
    "hybrid_aquatic:raw_shrimp",
    "hybrid_aquatic:raw_lobster",
    "hybrid_aquatic:raw_crayfish",
    "hybrid_aquatic:raw_lobster_tail"
  ])

  // Aquaculture Delight recipes use Forge species tags. These bridges allow
  // equivalent Hybrid Aquatic catches to enter the same recipes.
  event.add("forge:raw_fishes/tuna", "hybrid_aquatic:tuna")
  event.add("forge:raw_fishes/bass", "hybrid_aquatic:sea_bass")
  event.add("forge:raw_fishes/trout", "hybrid_aquatic:trout")
  event.add("forge:raw_fishes/herring", "hybrid_aquatic:herring")
  event.add("forge:raw_fishes/carp", "hybrid_aquatic:carp")
})

ServerEvents.recipes(event => {
  // Any ordinary Hybrid Aquatic fish can be standardized for the shared camp
  // pantry. Rare whole-fish quests remain valid because processing is optional.
  event.custom({
    type: "farmersdelight:cutting",
    ingredients: [{tag: "project_deadzone:raw_fish"}],
    tool: [{tag: "forge:tools/knives"}],
    result: [
      {item: "aquaculture:fish_fillet_raw", count: 2},
      {item: "aquaculture:fish_bones", chance: 0.35}
    ],
    sound: "minecraft:entity.fishing_bobber.retrieve"
  }).id("project_deadzone:cutting/hybrid_fish_to_aquaculture_fillet")

  // A flexible early meal: any standardized fillet can replace a specific
  // species, so multiplayer cooks are not blocked by biome RNG.
  event.custom({
    type: "farmersdelight:cooking",
    cookingtime: 180,
    experience: 0.6,
    ingredients: [
      {item: "aquaculture:fish_fillet_raw"},
      {item: "minecraft:potato"},
      {tag: "forge:crops/onion"}
    ],
    recipe_book_tab: "meals",
    result: {item: "aquaculturedelight:poor_fisher_chowder"},
    container: {item: "minecraft:bowl"}
  }).id("project_deadzone:cooking/field_fisher_chowder")

  // Crab, shrimp and lobster keep their identity and lead to a higher-value
  // meal instead of being flattened into ordinary fish fillets.
  event.custom({
    type: "farmersdelight:cooking",
    cookingtime: 220,
    experience: 1.0,
    ingredients: [
      {tag: "project_deadzone:raw_shellfish"},
      {tag: "forge:crops/tomato"},
      {tag: "forge:crops/onion"},
      {tag: "forge:crops/rice"}
    ],
    recipe_book_tab: "meals",
    result: {item: "aquaculturedelight:unusual_fish_soup"},
    container: {item: "minecraft:bowl"}
  }).id("project_deadzone:cooking/shellfish_expedition_soup")
})
