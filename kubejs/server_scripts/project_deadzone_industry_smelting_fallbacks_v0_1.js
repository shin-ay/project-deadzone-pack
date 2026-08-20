// PROJECT DEADZONE industrial smelting fallbacks v0.2
// Prevents early industry progression from deadlocking behind machines that
// themselves require these basic metals. Machine processing remains faster.

// Disabled 2026-08-12 together with material unification. These fallback
// outputs forced one mod's ingots and hid defects in the original recipes.
if (false) ServerEvents.recipes(event => {
  // Use Forge tags instead of one mod's concrete dust ID. Material
  // unification runs in the same recipe pass, so Mekanism/IE/Create dusts
  // must all remain valid inputs to this bootstrap route.
  const materials = [
    ['steel', 'steel', 'immersiveengineering:ingot_steel'],
    ['iron', 'iron', 'minecraft:iron_ingot'],
    ['copper', 'copper', 'minecraft:copper_ingot'],
    ['gold', 'gold', 'minecraft:gold_ingot'],
    ['lead', 'lead', 'immersiveengineering:ingot_lead'],
    ['nickel', 'nickel', 'immersiveengineering:ingot_nickel'],
    ['aluminum', 'aluminum', 'immersiveengineering:ingot_aluminum'],
    ['silver', 'silver', 'immersiveengineering:ingot_silver'],
    ['uranium', 'uranium', 'immersiveengineering:ingot_uranium'],
    ['tin', 'tin', 'mekanism:ingot_tin'],
    ['osmium', 'osmium', 'mekanism:ingot_osmium'],
    ['zinc', 'zinc', 'create:zinc_ingot'],
    ['bronze', 'bronze', 'mekanism:ingot_bronze'],
    ['constantan', 'constantan', 'immersiveengineering:ingot_constantan'],
    ['electrum', 'electrum', 'immersiveengineering:ingot_electrum']
  ]

  materials.forEach(entry => {
    const name = entry[0]
    const dust = '#forge:dusts/' + entry[1]
    const ingot = entry[2]
    event.smelting(ingot, dust, 0.35, 200)
      .id('project_deadzone:industry/furnace_' + name + '_dust')
    event.blasting(ingot, dust, 0.35, 100)
      .id('project_deadzone:industry/blast_' + name + '_dust')
  })

  console.info('[PROJECT DEADZONE][Industry] tag-based dust smelting fallbacks registered')
})
