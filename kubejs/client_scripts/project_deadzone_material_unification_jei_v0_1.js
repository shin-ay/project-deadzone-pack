// Hide non-canonical duplicates from JEI. Items still exist for old-world and
// mod compatibility, but recipes and drops resolve to the canonical IE item.
JEIEvents.hideItems(event => {
  event.hide([
    "mekanism:ingot_lead", "mekanism:nugget_lead", "mekanism:dust_lead", "mekanism:raw_lead", "mekanism:block_raw_lead", "mekanism:block_lead",
    "mekanism:ingot_uranium", "mekanism:nugget_uranium", "mekanism:dust_uranium", "mekanism:raw_uranium", "mekanism:block_raw_uranium", "mekanism:block_uranium",
    "mekanism:ingot_steel", "mekanism:nugget_steel", "mekanism:dust_steel", "mekanism:block_steel",
    "mekanism:dust_iron", "mekanism:dust_copper",
    "mekanism:lead_ore", "mekanism:deepslate_lead_ore", "mekanism:uranium_ore", "mekanism:deepslate_uranium_ore",
    "tfmg:lead_ingot", "tfmg:lead_nugget", "tfmg:lead_sheet", "tfmg:raw_lead", "tfmg:raw_lead_block", "tfmg:lead_block",
    "tfmg:lead_ore", "tfmg:deepslate_lead_ore",
    "tfmg:nickel_ingot", "tfmg:nickel_nugget", "tfmg:nickel_sheet", "tfmg:raw_nickel", "tfmg:raw_nickel_block", "tfmg:nickel_block",
    "tfmg:nickel_ore", "tfmg:deepslate_nickel_ore",
    "tfmg:aluminum_ingot", "tfmg:aluminum_nugget", "tfmg:aluminum_sheet", "tfmg:aluminum_block",
    "tfmg:constantan_ingot", "tfmg:constantan_nugget", "tfmg:constantan_block",
    "tfmg:steel_ingot", "tfmg:steel_nugget", "tfmg:heavy_plate", "tfmg:steel_block",
    "create:iron_sheet", "create:copper_sheet", "create:golden_sheet"
  ])
})
