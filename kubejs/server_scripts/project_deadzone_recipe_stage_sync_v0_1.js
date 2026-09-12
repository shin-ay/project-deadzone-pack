// PROJECT DEADZONE Recipe Stage Sync v0.7
// Story milestones are the only source of non-TaCZ technology authorization.
// JOB and Talent choices improve a play style; they no longer decide whether
// a player is allowed to build a whole technology family. TaCZ weapon crafting
// is owned by Weapon Research + the story gateway bridge instead.

const DZ_RECIPE_MILESTONES = [
  {id:'dz_story_create_advanced', tier:1, label:'Create 真鍮時代・自動化設備'},
  {id:'dz_story_vehicle_ground', tier:1, label:'陸上車両'},
  {id:'dz_story_vehicle_air', tier:2, label:'航空機・ヘリコプター'},
  {id:'dz_story_superb_warfare', tier:3, label:'Superb Warfare'}
]

// Remove stale permissions from the former 12-way JOB/Talent recipe grid.
const DZ_RECIPE_LEGACY_STAGES = [
  'dz_engineering_industry_1','dz_engineering_industry_2','dz_engineering_industry_3',
  'dz_engineering_fortification_1','dz_engineering_fortification_2','dz_engineering_fortification_3',
  'dz_engineering_weapons_1','dz_engineering_weapons_2','dz_engineering_weapons_3',
  'dz_mechanics_vehicle_1','dz_mechanics_vehicle_2','dz_mechanics_vehicle_3',
  'dz_story_vehicle_advanced',
  // Replaced by Weapon Research exact blueprints. Remove them from old player
  // data so no second TaCZ progression owner survives the migration.
  'dz_story_tacz_field','dz_story_tacz_military','dz_story_tacz_experimental'
]

function dzRecipeStoryUnlock(player) {
  try {
    if (global.pdzStoryUnlockTier) return Math.max(0, Number(global.pdzStoryUnlockTier(player.server)) || 0)
  } catch (ignored) {}
  for (let i = 5; i >= 0; i--) if (player.stages.has('deadzone_tier_' + i)) return i
  return Math.max(0, player.server.persistentData.getInt('deadzone_story_unlock_tier'))
}

function dzRecipeSetStage(player, id, unlocked, notify, label) {
  let active = player.stages.has(id)
  let changed = false
  if (unlocked) {
    if (!player.tags.contains(id)) player.addTag(id)
    if (!active) {
      player.stages.add(id)
      changed = true
      if (notify) player.tell(Text.of('技術解禁: ' + label).gold())
    }
  } else {
    if (player.tags.contains(id)) player.removeTag(id)
    if (active) {
      player.stages.remove(id)
      changed = true
    }
  }
  return changed
}

function dzSyncRecipeStages(player, notify) {
  let storyUnlock = dzRecipeStoryUnlock(player)
  let changed = 0
  DZ_RECIPE_LEGACY_STAGES.forEach(id => {
    if (dzRecipeSetStage(player, id, false, false, id)) changed++
  })
  DZ_RECIPE_MILESTONES.forEach(entry => {
    if (dzRecipeSetStage(player, entry.id, storyUnlock >= entry.tier, notify !== false, entry.label)) changed++
  })
  return changed
}

PlayerEvents.loggedIn(event => dzSyncRecipeStages(event.player, true))
PlayerEvents.respawned(event => dzSyncRecipeStages(event.player, false))
PlayerEvents.tick(event => {
  // Self-heal within ten seconds if another mod, a stale player capability or
  // an older server update removed a shared technology stage.
  if (!event.player.level.clientSide && event.player.age % 200 === 0)
    dzSyncRecipeStages(event.player, false)
})

ServerEvents.loaded(event => {
  event.server.scheduleInTicks(40, () =>
    event.server.players.forEach(player => dzSyncRecipeStages(player, false)))
})

global.pdzSyncRecipeStages = dzSyncRecipeStages

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  // Every player needs to be able to inspect progression. Only mutation and
  // diagnostics stay behind operator permission.
  let root = Commands.literal('deadzoneprogression')

  root.then(Commands.literal('sync').requires(source => source.hasPermission(2)).executes(ctx => {
    dzSyncRecipeStages(ctx.source.player, false)
    ctx.source.player.tell(Text.of('ストーリー技術解禁を同期しました。').aqua())
    return 1
  }))

  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    let repaired = dzSyncRecipeStages(player, false)
    let story = dzRecipeStoryUnlock(player)
    player.tell(Text.of('=== 技術解禁 / Story S' + story + ' ===').gold())
    if (repaired > 0) player.tell(Text.of('技術フラグを ' + repaired + ' 件修復しました。').aqua())
    player.tell(Text.of('✓ S0  基礎工業・拳銃/SMG・Small Ships').green())
    DZ_RECIPE_MILESTONES.forEach(entry => {
      let active = player.stages.has(entry.id)
      let line = Text.of((active ? '✓ ' : '－ ') + 'S' + entry.tier + '  ' + entry.label)
      player.tell(active ? line.green() : line.gray())
    })
    player.tell(Text.of('銃本体: Jキー／兵器研究ベンチで研究系統を確認').aqua())
    player.tell(Text.of('弾薬・アタッチメント・Small Ships: ストーリー制限なし').gray())
    if (story < 3) {
      let next = story + 1
      let nextNames = ['','Gas Station作戦','Police Station作戦','Radio Tower作戦']
      player.tell(Text.of('次の段階: S' + next + ' / ' + nextNames[next] + 'のボス撃破').gold())
    } else {
      player.tell(Text.of('S3までの基礎技術を解禁済み').green())
    }
    return 1
  }))

  root.then(Commands.literal('audit').requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    let story = dzRecipeStoryUnlock(player), mismatches = 0, legacy = 0
    DZ_RECIPE_MILESTONES.forEach(entry => {
      let expected = story >= entry.tier
      if (player.stages.has(entry.id) !== expected || player.tags.contains(entry.id) !== expected) mismatches++
    })
    DZ_RECIPE_LEGACY_STAGES.forEach(id => {
      if (player.stages.has(id) || player.tags.contains(id)) legacy++
    })
    player.tell(Text.of('Story S' + story + ' / 不一致 ' + mismatches + ' / 旧権限 ' + legacy)
      .color(mismatches === 0 && legacy === 0 ? 'green' : 'red'))
    return mismatches === 0 && legacy === 0 ? 1 : 0
  }))

  root.then(Commands.literal('sync_all').requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    try { dzStoryApplyPlayer(player, dzStoryTier(player.server)) } catch (ignored) {}
    try { dzSyncSkillTierGates(player, false) } catch (ignored) {}
    dzSyncRecipeStages(player, false)
    try { dzSyncStoryResearchGateways(player, false) } catch (ignored) {}
    player.tell(Text.of('ストーリー・Talent Gate・技術・兵器研究を一括同期しました。').green())
    return 1
  }))

  event.register(root)
})
