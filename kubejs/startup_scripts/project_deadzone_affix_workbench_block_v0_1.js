// Dedicated PROJECT DEADZONE Affix Workbench.
// Enchanting remains a separate vanilla/modded system.
StartupEvents.registry('block', event => {
  event.create('affix_workbench')
    .displayName('Affix Workbench')
    .hardness(4.0)
    .resistance(8.0)
    .requiresTool(true)
    .tagBlock('minecraft:mineable/pickaxe')
    .tagBlock('minecraft:needs_iron_tool')
    .texture('down', 'minecraft:block/deepslate_tiles')
    .texture('up', 'minecraft:block/smithing_table_top')
    .texture('north', 'minecraft:block/smithing_table_front')
    .texture('south', 'minecraft:block/smithing_table_front')
    .texture('east', 'minecraft:block/smithing_table_side')
    .texture('west', 'minecraft:block/smithing_table_side')
})
