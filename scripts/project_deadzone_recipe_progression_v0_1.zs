// PROJECT DEADZONE Recipe Progression v0.1
// RecipeStages only affects crafting-table recipes. Machine recipes remain
// available once the corresponding machine itself has been unlocked.

// Engineering: Industry
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_1", <item:create:depot>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_1", <item:create:mechanical_press>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_1", <item:create:mechanical_mixer>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_1", <item:immersiveengineering:workbench>);
// IE multiblocks are formed in-world and have no craftable controller output.
// Gate the defining structure blocks instead of the unobtainable display item.
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_1", <item:immersiveengineering:blastbrick>);

mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_2", <item:create:crushing_wheel>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_2", <item:create:deployer>);
// Metal Press, Mixer and Auto Workbench share IE's engineering blocks. Heavy
// Engineering is the common progression choke point used by these machines.
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_2", <item:immersiveengineering:heavy_engineering>);

mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_3", <item:create:mechanical_crafter>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_3", <item:create:steam_engine>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_3", <item:immersiveengineering:blastbrick_reinforced>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_3", <item:immersiveengineering:radiator>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_industry_3", <item:immersiveengineering:generator>);

// Engineering: Fortification
mods.recipestages.Recipes.setRecipeStage("dz_engineering_fortification_1", <item:buildinggadgets2:gadget_building>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_fortification_1", <item:buildinggadgets2:gadget_exchanging>);

mods.recipestages.Recipes.setRecipeStage("dz_engineering_fortification_2", <item:buildinggadgets2:gadget_copy_paste>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_fortification_2", <item:buildinggadgets2:gadget_cut_paste>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_fortification_2", <item:immersiveengineering:turret_gun>);

mods.recipestages.Recipes.setRecipeStage("dz_engineering_fortification_3", <item:buildinggadgets2:gadget_destruction>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_fortification_3", <item:immersiveengineering:turret_chem>);

// Engineering: Weapons
mods.recipestages.Recipes.setRecipeStage("dz_engineering_weapons_1", <item:immersiveengineering:gunpart_hammer>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_weapons_1", <item:immersiveengineering:gunpart_drum>);
mods.recipestages.Recipes.setRecipeStage("dz_engineering_weapons_2", <item:immersiveengineering:gunpart_barrel>);
mods.recipestages.Recipes.setRecipeStageByMod("dz_engineering_weapons_3", "superbwarfare");

// Mechanics: Vehicle
mods.recipestages.Recipes.setRecipeStageByMod("dz_mechanics_vehicle_1", "blocky_bikes");
mods.recipestages.Recipes.setRecipeStageByMod("dz_mechanics_vehicle_2", "vehicle");
mods.recipestages.Recipes.setRecipeStageByMod("dz_mechanics_vehicle_3", "immersive_aircraft");
