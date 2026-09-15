// PROJECT DEADZONE Recipe Knowledge v0.7 (local candidate)
// Large story beats, not JOB/Talent micro-gates, own technology progression.
// RecipeStages 8 gates crafting-table recipes. Create processing recipes and
// TaCZ gun-smith recipes need their own runtime authorization bridge.

// S0: ordinary survival, basic Create, ordinary IE/Mekanism and simple guns.
// S1 / Gas Station: Create's advanced era is gated at brass production by
// Recipe Machine Stages. Every advanced crafting recipe then depends on brass.
// Do not wrap individual Create crafting recipes with RecipeStages: in this
// pack those wrappers could return an empty result even for an authorized
// player, and setRecipeStageByInput also captured unrelated compat recipes.

// S1 / Gas Station: ground transport. S2 / Police Station: aviation.
// Blocky Bikes remains a simple S0 option for early scouting.
mods.recipestages.Recipes.setRecipeStageByMod("dz_story_vehicle_ground", "vehicle");
mods.recipestages.Recipes.setRecipeStageByMod("dz_story_vehicle_air", "immersive_aircraft");

// S3 / Radio Tower: heavy combined-arms manufacturing begins here.
mods.recipestages.Recipes.setRecipeStageByMod("dz_story_superb_warfare", "superbwarfare");

// RecipeStages requires a crafting player when assembling its wrapped recipe.
// Create Mechanical Crafters have no player context, so wrapped infrastructure
// recipes assemble to ItemStack.EMPTY and consume the ingredients. Keep these
// entry-point machines progression-gated by their physical prerequisites
// (SWF steel, battery and Ancient CPU), not by a player-bound recipe wrapper.
mods.recipestages.Recipes.clearRecipeStage(<resource:superbwarfare:vehicle_assembling_table>);
mods.recipestages.Recipes.clearRecipeStage(<resource:superbwarfare:blueprint_research_table>);
mods.recipestages.Recipes.clearRecipeStage(<resource:superbwarfare:reforging_table>);
