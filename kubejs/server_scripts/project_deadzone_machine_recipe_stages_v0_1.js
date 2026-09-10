// PROJECT DEADZONE Machine Recipe Stages v0.1 (local candidate)
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
