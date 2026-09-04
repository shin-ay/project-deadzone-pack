// PROJECT DEADZONE Recipe Knowledge v0.5 (local candidate)
// Large story beats, not JOB/Talent micro-gates, own technology progression.
// RecipeStages 8 gates crafting-table recipes. Create processing recipes and
// TaCZ gun-smith recipes need their own runtime authorization bridge.

// S0: ordinary survival, basic Create, ordinary IE/Mekanism and simple guns.
// S1 / Gas Station: the complete brass-era Create toolset opens at once.
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:brass_casing>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:brass_funnel>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:brass_tunnel>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:smart_chute>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:mechanical_arm>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:mechanical_crafter>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:rotation_speed_controller>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:stockpile_switch>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:content_observer>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:display_link>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:nixie_tube>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:elevator_pulley>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:steam_engine>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:steam_whistle>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:track_station>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:track_signal>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:track_observer>);
mods.recipestages.Recipes.setRecipeStage("dz_story_create_advanced", <item:create:schedule>);

// S1 / Gas Station: ground transport. S2 / Police Station: aviation.
// Blocky Bikes remains a simple S0 option for early scouting.
mods.recipestages.Recipes.setRecipeStageByMod("dz_story_vehicle_ground", "vehicle");
mods.recipestages.Recipes.setRecipeStageByMod("dz_story_vehicle_air", "immersive_aircraft");

// S3 / Radio Tower: heavy combined-arms manufacturing begins here.
mods.recipestages.Recipes.setRecipeStageByMod("dz_story_superb_warfare", "superbwarfare");
