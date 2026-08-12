// PROJECT DEADZONE material unification v0.1
// IE is the canonical source for shared industrial metals. Mekanism-only
// processing intermediates and TFMG machine parts intentionally remain intact.

const DZ_MATERIAL_EQUIVALENTS = {
  "immersiveengineering:ingot_lead": ["mekanism:ingot_lead", "tfmg:lead_ingot"],
  "immersiveengineering:nugget_lead": ["mekanism:nugget_lead", "tfmg:lead_nugget"],
  "immersiveengineering:dust_lead": ["mekanism:dust_lead"],
  "immersiveengineering:plate_lead": ["tfmg:lead_sheet"],
  "immersiveengineering:raw_lead": ["mekanism:raw_lead", "tfmg:raw_lead"],
  "immersiveengineering:raw_block_lead": ["mekanism:block_raw_lead", "tfmg:raw_lead_block"],
  "immersiveengineering:storage_lead": ["mekanism:block_lead", "tfmg:lead_block"],

  "immersiveengineering:ingot_uranium": ["mekanism:ingot_uranium"],
  "immersiveengineering:nugget_uranium": ["mekanism:nugget_uranium"],
  "immersiveengineering:dust_uranium": ["mekanism:dust_uranium"],
  "immersiveengineering:raw_uranium": ["mekanism:raw_uranium"],
  "immersiveengineering:raw_block_uranium": ["mekanism:block_raw_uranium"],
  "immersiveengineering:storage_uranium": ["mekanism:block_uranium"],

  "immersiveengineering:ingot_nickel": ["tfmg:nickel_ingot"],
  "immersiveengineering:nugget_nickel": ["tfmg:nickel_nugget"],
  "immersiveengineering:plate_nickel": ["tfmg:nickel_sheet"],
  "immersiveengineering:raw_nickel": ["tfmg:raw_nickel"],
  "immersiveengineering:raw_block_nickel": ["tfmg:raw_nickel_block"],
  "immersiveengineering:storage_nickel": ["tfmg:nickel_block"],

  "immersiveengineering:ingot_aluminum": ["tfmg:aluminum_ingot"],
  "immersiveengineering:nugget_aluminum": ["tfmg:aluminum_nugget"],
  "immersiveengineering:plate_aluminum": ["tfmg:aluminum_sheet"],
  "immersiveengineering:storage_aluminum": ["tfmg:aluminum_block"],

  "immersiveengineering:ingot_constantan": ["tfmg:constantan_ingot"],
  "immersiveengineering:nugget_constantan": ["tfmg:constantan_nugget"],
  "immersiveengineering:storage_constantan": ["tfmg:constantan_block"],

  "immersiveengineering:ingot_steel": ["mekanism:ingot_steel", "tfmg:steel_ingot"],
  "immersiveengineering:nugget_steel": ["mekanism:nugget_steel", "tfmg:steel_nugget"],
  "immersiveengineering:dust_steel": ["mekanism:dust_steel"],
  "immersiveengineering:plate_steel": ["tfmg:heavy_plate"],
  "immersiveengineering:storage_steel": ["mekanism:block_steel", "tfmg:steel_block"],

  "immersiveengineering:dust_iron": ["mekanism:dust_iron"],
  "immersiveengineering:dust_copper": ["mekanism:dust_copper"],
  "immersiveengineering:plate_iron": ["create:iron_sheet"],
  "immersiveengineering:plate_copper": ["create:copper_sheet"],
  "immersiveengineering:plate_gold": ["create:golden_sheet"]
}

ServerEvents.recipes(event => {
  Object.keys(DZ_MATERIAL_EQUIVALENTS).forEach(canonical => {
    DZ_MATERIAL_EQUIVALENTS[canonical].forEach(duplicate => {
      // Existing recipes may name the duplicate directly instead of using a
      // Forge material tag, so normalize both consumption and production.
      event.replaceInput({}, duplicate, canonical)
      event.replaceOutput({}, duplicate, canonical)
    })
  })

  // Basic bootstrap route for unified industrial dusts.  These recipes must
  // not depend on an Arc Furnace that itself requires the resulting metals.
  // Advanced machines remain faster and more efficient; this is the 1:1
  // progression-safe fallback.
  const furnaceDusts = {
    "immersiveengineering:dust_iron": "minecraft:iron_ingot",
    "immersiveengineering:dust_gold": "minecraft:gold_ingot",
    "immersiveengineering:dust_copper": "minecraft:copper_ingot",
    "immersiveengineering:dust_lead": "immersiveengineering:ingot_lead",
    "immersiveengineering:dust_nickel": "immersiveengineering:ingot_nickel",
    "immersiveengineering:dust_aluminum": "immersiveengineering:ingot_aluminum",
    "immersiveengineering:dust_steel": "immersiveengineering:ingot_steel"
  }
  Object.keys(furnaceDusts).forEach(dust => {
    event.smelting(furnaceDusts[dust], dust).xp(0.15).id("project_deadzone:smelting/" + dust.split(":")[1])
  })
  console.info("[PROJECT DEADZONE][Materials] shared ore and metal recipe outputs unified to Immersive Engineering")
})

LootJS.modifiers(event => {
  const duplicateOreDrops = {
    "mekanism:lead_ore": ["mekanism:raw_lead", "mekanism:lead_ore"],
    "mekanism:deepslate_lead_ore": ["mekanism:raw_lead", "mekanism:deepslate_lead_ore"],
    "tfmg:lead_ore": ["tfmg:raw_lead", "tfmg:lead_ore"],
    "tfmg:deepslate_lead_ore": ["tfmg:raw_lead", "tfmg:deepslate_lead_ore"],
    "mekanism:uranium_ore": ["mekanism:raw_uranium", "mekanism:uranium_ore"],
    "mekanism:deepslate_uranium_ore": ["mekanism:raw_uranium", "mekanism:deepslate_uranium_ore"],
    "tfmg:nickel_ore": ["tfmg:raw_nickel", "tfmg:nickel_ore"],
    "tfmg:deepslate_nickel_ore": ["tfmg:raw_nickel", "tfmg:deepslate_nickel_ore"]
  }
  Object.keys(duplicateOreDrops).forEach(block => {
    let modifier = event.addBlockLootModifier(block)
    let canonical = block.includes("uranium")
      ? "immersiveengineering:raw_uranium"
      : block.includes("nickel")
        ? "immersiveengineering:raw_nickel"
        : "immersiveengineering:raw_lead"
    duplicateOreDrops[block].forEach(drop => modifier.replaceLoot(drop, canonical))
  })
})
