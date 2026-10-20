// PROJECT DEADZONE Story Progression v0.5 - M&S independent
// Story stages unlock content. Enemy and boss numbers do not follow player level.

const DZ_STORY_UNLOCK_KEY = "deadzone_story_unlock_tier"
const DZ_STORY_TIER_KEY = "deadzone_world_tier" // compatibility mirror
const DZ_STORY_MAX_TIER = 5
const DZ_STORY_RECIPE_RECOVERY_SCHEMA = "dz_story_recipe_recovery_v1"
const DZ_STORY_LEVEL_MILESTONES = [
  ["dz_story_boss_complete_gasstation"],
  ["dz_story_boss_complete_gunshop"],
  ["dz_story_boss_complete_policestation"],
  ["dz_story_boss_complete_hospital", "dz_story_boss_complete_firestation"],
  ["dz_story_boss_complete_radio_tower"],
  ["dz_story_boss_complete_primordial"],
  ["dz_story_boss_complete_reactor_saint"],
  ["dz_story_boss_complete_argus_fragment"],
  ["dz_story_boss_complete_choir_vessel"]
]
const DZ_STORY_BOSS_TIER_RECORDS = [
  {flag:"dz_story_boss_complete_gasstation", tier:1},
  {flag:"dz_story_boss_complete_policestation", tier:2},
  {flag:"dz_story_boss_complete_radio_tower", tier:3},
  {flag:"dz_story_boss_complete_primordial", tier:3}
]

function dzStoryCompletedMilestones(server) {
  let completed = 0
  DZ_STORY_LEVEL_MILESTONES.forEach(flags => {
    for (let i = 0; i < flags.length; i++) {
      if (server.persistentData.getBoolean(flags[i])) { completed++; break }
    }
  })
  return completed
}

function dzStoryTier(server) {
  let data = server.persistentData
  if (!data.getBoolean("dz_story_unlock_schema_v1")) {
    data.putInt(DZ_STORY_UNLOCK_KEY, data.getInt(DZ_STORY_TIER_KEY))
    data.putBoolean("dz_story_unlock_schema_v1", true)
  }
  return Math.max(0, Math.min(DZ_STORY_MAX_TIER, data.getInt(DZ_STORY_UNLOCK_KEY)))
}

// Transitional numeric encounter index for logs and fixed boss profiles.
// It is story-derived and never reads Character Level.
function dzStoryBossLevel(server) {
  return 12 + dzStoryCompletedMilestones(server) * 10
}

function dzStoryApplyPlayer(player, tier) {
  for (let i = 0; i <= DZ_STORY_MAX_TIER; i++) {
    let stage = "deadzone_tier_" + i
    if (i <= tier) {
      if (!player.tags.contains(stage)) player.tags.add(stage)
      if (!player.stages.has(stage)) player.stages.add(stage)
    } else {
      if (player.tags.contains(stage)) player.tags.remove(stage)
      if (player.stages.has(stage)) player.stages.remove(stage)
    }
  }
  player.persistentData.putInt(DZ_STORY_UNLOCK_KEY, tier)
  player.persistentData.putInt(DZ_STORY_TIER_KEY, tier)
}

function dzStorySyncDependentProgression(player, notify) {
  try { if (global.pdzSyncRecipeStages) global.pdzSyncRecipeStages(player, notify === true) }
  catch (error) { console.error("[DEADZONE STORY] Recipe-stage sync failed for " + player.username + ": " + error) }
  try { if (global.pdzSyncStoryResearchGateways) global.pdzSyncStoryResearchGateways(player, notify === true) }
  catch (ignored) {}
}

function dzStoryRefreshProgression(server, announce) {
  let tier = dzStoryTier(server)
  server.players.forEach(player => {
    dzStoryApplyPlayer(player, tier)
    dzStorySyncDependentProgression(player, announce === true)
  })
  return tier
}

function dzStoryTierFromBossRecords(server) {
  let recovered = 0
  DZ_STORY_BOSS_TIER_RECORDS.forEach(record => {
    if (server.persistentData.getBoolean(record.flag)) recovered = Math.max(recovered, record.tier)
  })
  return recovered
}

function dzStorySetTier(server, tier, announce) {
  let next = Math.max(0, Math.min(DZ_STORY_MAX_TIER, tier))
  let previous = dzStoryTier(server)
  server.persistentData.putInt(DZ_STORY_UNLOCK_KEY, next)
  server.persistentData.putInt(DZ_STORY_TIER_KEY, next)
  server.persistentData.putBoolean("dz_story_unlock_schema_v1", true)
  dzStoryRefreshProgression(server, announce)
  if (announce && previous !== next) {
    server.tell(Text.of("[PROJECT DEADZONE] ストーリー解禁 S" + previous + " → S" + next).gold())
    server.tell(Text.of("地域・施設・研究・レシピの解禁状態を同期しました。").yellow())
  }
  return next
}

global.pdzStoryUnlockTier = dzStoryTier
global.pdzStoryBossLevel = dzStoryBossLevel
global.pdzStoryRefreshProgression = dzStoryRefreshProgression

ServerEvents.loaded(event => {
  let server = event.server
  let current = dzStoryTier(server)
  if (!server.persistentData.getBoolean(DZ_STORY_RECIPE_RECOVERY_SCHEMA)) {
    let recovered = dzStoryTierFromBossRecords(server)
    server.persistentData.putBoolean(DZ_STORY_RECIPE_RECOVERY_SCHEMA, true)
    if (recovered > current) { dzStorySetTier(server, recovered, true); return }
  }
  dzStoryRefreshProgression(server, false)
})

PlayerEvents.loggedIn(event => {
  let tier = dzStoryTier(event.player.server)
  dzStoryApplyPlayer(event.player, tier)
  dzStorySyncDependentProgression(event.player, false)
})
PlayerEvents.respawned(event => dzStoryApplyPlayer(event.player, dzStoryTier(event.player.server)))
PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 200 !== 0) return
  let tier = dzStoryTier(player.server)
  if (player.persistentData.getInt(DZ_STORY_TIER_KEY) !== tier) dzStoryApplyPlayer(player, tier)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonetier")
  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let tier = dzStoryTier(player.server)
    player.tell(Text.of("PROJECT DEADZONE ストーリー解禁段階: S" + tier).gold())
    player.tell(Text.of("Bossマイルストーン: " + dzStoryCompletedMilestones(player.server) +
      "/" + DZ_STORY_LEVEL_MILESTONES.length + "（プレイヤーLv追従なし）").yellow())
    if (global.pdzCharacterStatus) global.pdzCharacterStatus(player)
    return 1
  }))
  root.then(Commands.literal("advance").requires(source => source.hasPermission(2)).executes(ctx => {
    dzStorySetTier(ctx.source.server, dzStoryTier(ctx.source.server) + 1, true); return 1
  }))
  root.then(Commands.literal("reset").requires(source => source.hasPermission(2)).executes(ctx => {
    dzStorySetTier(ctx.source.server, 0, true); return 1
  }))
  let set = Commands.literal("set").requires(source => source.hasPermission(2))
  for (let tier = 0; tier <= DZ_STORY_MAX_TIER; tier++) {
    let selected = tier
    set.then(Commands.literal("tier_" + tier).executes(ctx => {
      dzStorySetTier(ctx.source.server, selected, true); return 1
    }))
  }
  root.then(set)
  root.then(Commands.literal("sync").requires(source => source.hasPermission(2)).executes(ctx => {
    dzStoryRefreshProgression(ctx.source.server, false)
    ctx.source.player.tell(Text.of("Story Unlock stages synchronized.").aqua())
    return 1
  }))
  event.register(root)
})

console.info("[PROJECT DEADZONE] Story Progression v0.5 loaded (M&S independent)")
