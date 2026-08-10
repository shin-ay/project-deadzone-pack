// PROJECT DEADZONE Recipe Stage Sync v0.2
// Mirrors Puffish Skills reward tags into the active KubeJS/GameStages provider.

const DZ_RECIPE_SKILL_STAGES = [
  "dz_engineering_industry_1", "dz_engineering_industry_2", "dz_engineering_industry_3",
  "dz_engineering_fortification_1", "dz_engineering_fortification_2", "dz_engineering_fortification_3",
  "dz_engineering_weapons_1", "dz_engineering_weapons_2", "dz_engineering_weapons_3",
  "dz_mechanics_vehicle_1", "dz_mechanics_vehicle_2", "dz_mechanics_vehicle_3"
]

const DZ_RECIPE_STAGE_UNLOCK_TEXT = {
  dz_engineering_industry_1: "工房基礎設備",
  dz_engineering_industry_2: "中級自動化設備",
  dz_engineering_industry_3: "高度自動化設備",
  dz_engineering_fortification_1: "野戦建築ガジェット",
  dz_engineering_fortification_2: "複製建築・Gun Turret",
  dz_engineering_fortification_3: "解体建築・Chemical Turret",
  dz_engineering_weapons_1: "基本兵器部品",
  dz_engineering_weapons_2: "上位兵器部品",
  dz_engineering_weapons_3: "Superb Warfare製造",
  dz_mechanics_vehicle_1: "Blocky Bikes",
  dz_mechanics_vehicle_2: "Vehicle Mod地上車両",
  dz_mechanics_vehicle_3: "Immersive Aircraft"
}

const DZ_RECIPE_TALENT_UNLOCKS = {
  dz_engineering_industry_1: ['talent_recipe_industry_1', 0],
  dz_engineering_industry_2: ['talent_recipe_industry_2', 1],
  dz_engineering_industry_3: ['talent_recipe_industry_3', 2],
  dz_engineering_fortification_1: ['talent_recipe_fortification_1', 0],
  dz_engineering_fortification_2: ['talent_recipe_fortification_2', 1],
  dz_engineering_fortification_3: ['talent_recipe_fortification_3', 2],
  dz_engineering_weapons_1: ['talent_recipe_weapons_1', 0],
  dz_engineering_weapons_2: ['talent_recipe_weapons_2', 1],
  dz_engineering_weapons_3: ['talent_recipe_weapons_3', 2],
  dz_mechanics_vehicle_1: ['talent_recipe_vehicle_1', 0],
  dz_mechanics_vehicle_2: ['talent_recipe_vehicle_2', 1],
  dz_mechanics_vehicle_3: ['talent_recipe_vehicle_3', 2]
}

const DZ_RECIPE_JOB_UNLOCKS = {
  ground_tech: [['dz_mechanics_vehicle_1', 0]],
  convoy_master: [['dz_mechanics_vehicle_2', 1]],
  armor_mechanic: [['dz_mechanics_vehicle_2', 1]],
  ace_pilot: [['dz_mechanics_vehicle_3', 2]],
  crew_chief: [['dz_mechanics_vehicle_3', 2]],
  automation: [['dz_engineering_industry_1', 0]],
  systems_engineer: [['dz_engineering_industry_2', 1]],
  industrial_architect: [['dz_engineering_industry_2', 1], ['dz_engineering_industry_3', 2], ['dz_engineering_fortification_1', 1], ['dz_engineering_fortification_2', 2]],
  gunsmith: [['dz_engineering_weapons_1', 0]],
  weapon_engineer: [['dz_engineering_weapons_2', 1], ['dz_engineering_weapons_3', 2]],
  ordnance_specialist: [['dz_engineering_weapons_2', 1], ['dz_engineering_weapons_3', 2], ['dz_engineering_fortification_2', 1], ['dz_engineering_fortification_3', 2]]
}

function dzRecipeWorldTier(player) {
  for (let i = 5; i >= 0; i--) if (player.stages.has('deadzone_tier_' + i)) return i
  return 0
}

function dzRecipeCareerOwns(player, stage, worldTier) {
  let careers = [String(player.persistentData.getString('dz_career_t2')), String(player.persistentData.getString('dz_career_t3'))]
  return careers.some(id => (DZ_RECIPE_JOB_UNLOCKS[id] || []).some(entry => entry[0] === stage && worldTier >= entry[1]))
}

function dzRecipeTalentOwns(player, stage, worldTier) {
  let entry = DZ_RECIPE_TALENT_UNLOCKS[stage]
  return !!entry && worldTier >= entry[1] && player.tags.contains('pdz_talent_node_' + entry[0])
}

function dzSyncRecipeStages(player) {
  let worldTier = dzRecipeWorldTier(player)
  DZ_RECIPE_SKILL_STAGES.forEach(stage => {
    let unlocked = true // recipes are baseline; talents now grant efficiency/yield
    if (unlocked && !player.tags.contains(stage)) player.addTag(stage)
    if (!unlocked && player.tags.contains(stage)) player.removeTag(stage)
    let active = player.stages.has(stage)
    if (unlocked && !active) {
      player.stages.add(stage)
      player.tell(Text.of("新規解禁: " + DZ_RECIPE_STAGE_UNLOCK_TEXT[stage]).gold())
    }
    if (!unlocked && active) player.stages.remove(stage)
  })
}

PlayerEvents.tick(event => {
  // Recipes are now baseline. A once-per-minute repair pass is enough; the
  // previous two-second loop needlessly repeated 24 stage checks per player.
  if (event.player.age % 1200 === 0) dzSyncRecipeStages(event.player)
})
PlayerEvents.loggedIn(event => dzSyncRecipeStages(event.player))
PlayerEvents.respawned(event => dzSyncRecipeStages(event.player))

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzoneprogression").requires(source => source.hasPermission(2))

  root.then(Commands.literal("sync").executes(ctx => {
    dzSyncRecipeStages(ctx.source.player)
    ctx.source.player.tell(Text.of("レシピ解禁ステージを同期しました。").aqua())
    return 1
  }))

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    DZ_RECIPE_SKILL_STAGES.forEach(stage => {
      let tagged = player.tags.contains(stage)
      let active = player.stages.has(stage)
      let line = Text.of((tagged ? "TAG" : "---") + " / " +
        (active ? "STAGE" : "-----") + "  " + stage)
      player.tell(tagged && active ? line.green() : line.gray())
    })
    return 1
  }))

  root.then(Commands.literal("audit").executes(ctx => {
    let player = ctx.source.player
    let worldTier = 0
    try { worldTier = dzStoryTier(player.server) } catch (ignored) {
      worldTier = player.server.persistentData.getInt("deadzone_world_tier")
    }
    let stageTier = -1
    for (let i = 5; i >= 0; i--) {
      if (player.stages.has("deadzone_tier_" + i)) { stageTier = i; break }
    }
    let skillTier = player.persistentData.getInt("dz_skill_gate_world_tier")
    let recipeTags = 0, recipeStages = 0, recipeMismatch = 0
    DZ_RECIPE_SKILL_STAGES.forEach(stage => {
      let tagged = player.tags.contains(stage)
      let active = player.stages.has(stage)
      if (tagged) recipeTags++
      if (active) recipeStages++
      if (tagged !== active) recipeMismatch++
    })
    let consistent = worldTier === stageTier && worldTier === skillTier && recipeMismatch === 0
    player.tell(Text.of("=== 進行同期監査 ===").gold())
    player.tell(Text.of("World T" + worldTier + " / Stage T" + stageTier +
      " / Skill Gate T" + skillTier).aqua())
    player.tell(Text.of("Recipe: TAG " + recipeTags + " / STAGE " +
      recipeStages + " / 不一致 " + recipeMismatch).gray())
    player.tell(consistent ? Text.of("同期: OK").green() : Text.of("同期: 修復が必要").red())
    return consistent ? 1 : 0
  }))

  root.then(Commands.literal("sync_all").executes(ctx => {
    let player = ctx.source.player
    try { dzStoryApplyPlayer(player, dzStoryTier(player.server)) } catch (ignored) {}
    try { dzSyncSkillTierGates(player, false) } catch (ignored) {}
    dzSyncRecipeStages(player)
    player.tell(Text.of("World Tier・Skill Gate・Recipe Stageを一括同期しました。").green())
    return 1
  }))

  root.then(Commands.literal("test_menu").executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of("=== 進行テスト ===").gold())
    ;[
      ["AUDIT", "/deadzoneprogression audit"], ["SYNC ALL", "/deadzoneprogression sync_all"],
      ["WORLD TIER", "/deadzonestory status"], ["SKILL GATE", "/deadzoneskillgate status"],
      ["RECIPE STAGES", "/deadzoneprogression status"]
    ].forEach(entry => player.tell(Text.of("[ " + entry[0] + " ]").aqua()
      .clickRunCommand(entry[1]).hover(Text.of(entry[1]))))
    return 1
  }))
  event.register(root)
})
