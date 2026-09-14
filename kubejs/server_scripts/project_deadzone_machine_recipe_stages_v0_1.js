// PROJECT DEADZONE Machine Recipe Stages v0.2 (local candidate)
//
// RecipeStages owns ordinary crafting-table locks. SDM Recipe Machine Stages
// extends the same GameStages permission to supported machine recipes.
// Keep this file limited to recipe types that RecipeStages cannot enforce.

if (Platform.isLoaded('recipemachinestage')) {
  // S1 / Gas Station: brass production is the entrance to advanced Create.
  RecipeMachineStage.addRecipe(
    'create:mixing',
    'create:mixing/brass_ingot',
    'dz_story_create_advanced'
  )
  RecipeMachineStage.addRecipe(
    'create:pressing',
    'create:pressing/brass_ingot',
    'dz_story_create_advanced'
  )
} else {
  console.error('[PDZ PROGRESSION] recipemachinestage is missing; Create machine recipe gates are inactive.')
}

ServerEvents.recipes(event => {
  // These four vanilla Create recipes did not naturally consume brass. Give
  // each a tiny brass dependency so all advanced Create crafting follows the
  // same reliable S1 entry gate without RecipeStages wrapping the result.
  event.remove({id: 'create:crafting/kinetics/nixie_tube'})
  event.shapeless('4x create:nixie_tube', [
    'create:electron_tube',
    'create:electron_tube',
    'create:brass_nugget'
  ]).id('project_deadzone:create_nixie_tube_s1')

  event.remove({id: 'create:crafting/kinetics/steam_engine'})
  event.shaped('create:steam_engine', [
    'PB',
    'A ',
    'C '
  ], {
    P: '#forge:plates/gold',
    B: 'create:brass_nugget',
    A: 'create:andesite_alloy',
    C: '#forge:storage_blocks/copper'
  }).id('project_deadzone:create_steam_engine_s1')

  event.remove({id: 'create:crafting/kinetics/steam_whistle'})
  event.shaped('create:steam_whistle', [
    'P',
    'C',
    'B'
  ], {
    P: '#forge:plates/gold',
    C: '#forge:ingots/copper',
    B: 'create:brass_nugget'
  }).id('project_deadzone:create_steam_whistle_s1')

  event.remove({id: 'create:crafting/kinetics/schedule'})
  event.shapeless('4x create:schedule', [
    '#forge:plates/obsidian',
    'minecraft:paper',
    'create:brass_nugget'
  ]).id('project_deadzone:create_schedule_s1')
})
