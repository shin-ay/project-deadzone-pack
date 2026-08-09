// PROJECT DEADZONE industrial smelting fallbacks v0.1
// Prevents early industry progression from deadlocking behind machines that
// themselves require these basic metals. Machine processing remains faster.

ServerEvents.recipes(event => {
  const materials = [
    ['steel', 'immersiveengineering:dust_steel', 'immersiveengineering:ingot_steel'],
    ['iron', 'immersiveengineering:dust_iron', 'minecraft:iron_ingot'],
    ['copper', 'immersiveengineering:dust_copper', 'minecraft:copper_ingot'],
    ['gold', 'immersiveengineering:dust_gold', 'minecraft:gold_ingot'],
    ['lead', 'immersiveengineering:dust_lead', 'immersiveengineering:ingot_lead'],
    ['nickel', 'immersiveengineering:dust_nickel', 'immersiveengineering:ingot_nickel'],
    ['aluminum', 'immersiveengineering:dust_aluminum', 'immersiveengineering:ingot_aluminum'],
    ['silver', 'immersiveengineering:dust_silver', 'immersiveengineering:ingot_silver'],
    ['uranium', 'immersiveengineering:dust_uranium', 'immersiveengineering:ingot_uranium']
  ]

  materials.forEach(entry => {
    const name = entry[0]
    const dust = entry[1]
    const ingot = entry[2]
    event.smelting(ingot, dust, 0.35, 200)
      .id('project_deadzone:industry/furnace_' + name + '_dust')
    event.blasting(ingot, dust, 0.35, 100)
      .id('project_deadzone:industry/blast_' + name + '_dust')
  })

  console.info('[PROJECT DEADZONE][Industry] basic dust smelting fallbacks registered')
})
