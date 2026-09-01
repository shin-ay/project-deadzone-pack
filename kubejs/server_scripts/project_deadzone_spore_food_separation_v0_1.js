// PROJECT DEADZONE Spore food separation v0.1
// Spore appears only in T3+ regions. Its biological drops are reserved for
// contamination research, decontamination and infected equipment—not meals.

const PDZ_SPORE_FOOD_OUTPUTS = [
  "spore:amalgamated_roast",
  "spore:biomass_bacon",
  "spore:brain_noodles",
  "spore:cooked_torso",
  "spore:eldritch_sushi",
  "spore:fiber_stew",
  "spore:fleshy_ribs",
  "spore:fried_wing_membrane",
  "spore:fungal_burger",
  "spore:fungal_sauce",
  "spore:heart_kebab",
  "spore:heart_pie",
  "spore:meaty_icecream",
  "spore:milky_sack",
  "spore:organoid_soup",
  "spore:roasted_heart_kebab",
  "spore:roasted_tumor",
  "spore:sausage",
  "spore:skull_soup",
  "spore:slice_of_heartpie",
  "spore:stuffed_abomination",
  "spore:stuffed_torso",
  "spore:vigil_eye_soup"
]

ServerEvents.recipes(event => {
  // Remove every crafting, furnace, campfire, smoker, Farmer's Delight and
  // Create route that produces a Spore dish. Filtering by output also catches
  // addon-provided duplicate/alternate recipes without touching research uses.
  PDZ_SPORE_FOOD_OUTPUTS.forEach(itemId => event.remove({output: itemId}))

  // Spore also adds a cross-mod route that digests infected body parts into
  // Biomancy nutrient paste. It is still food, so remove only that compat
  // recipe while preserving Biomancy's ordinary nutrient-paste progression.
  event.remove({id: "spore:nutrient_paste_from_digesting_bodyparts"})

  // TBMG replaces Farmer's Delight's normal mushroom-rice recipe with a Spore
  // biomass version under the same ID. Restore the original clean recipe.
  event.remove({id: "farmersdelight:cooking/mushroom_rice"})
  event.custom({
    type: "farmersdelight:cooking",
    cookingtime: 200,
    experience: 1.0,
    ingredients: [
      {item: "minecraft:brown_mushroom"},
      {item: "minecraft:red_mushroom"},
      {tag: "forge:crops/rice"},
      [
        {item: "minecraft:carrot"},
        {item: "minecraft:potato"}
      ]
    ],
    recipe_book_tab: "meals",
    result: {item: "farmersdelight:mushroom_rice"}
  }).id("project_deadzone:cooking/clean_mushroom_rice")
})

console.info("[PROJECT DEADZONE][Spore Food Separation] v0.1 loaded: Spore biology removed from cooking progression.")
