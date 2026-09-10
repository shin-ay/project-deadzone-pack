// PROJECT DEADZONE Story Progression v0.3
// Story Unlock is narrative progress only. Geographic World Tier belongs to
// project_deadzone_region_tiers_v0_1.js and enemy pressure belongs to Threat.

const DZ_STORY_MNS_BALANCE = Java.loadClass('com.robertx22.mine_and_slash.database.data.game_balance_config.GameBalanceConfig')
const DZ_STORY_MNS_ENTITY = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const DZ_STORY_UNLOCK_KEY = "deadzone_story_unlock_tier"
// Compatibility mirror for existing saves and older scripts. Never present
// this key to players as geographic World Tier.
const DZ_STORY_TIER_KEY = "deadzone_world_tier"
const DZ_STORY_MAX_TIER = 5
// S0 is the pre-boss survival band. Gas Station, Police Station and Radio
// Tower each open the next broad character band. S3 restores M&S's authored
// level 100 endgame. The cap is server-wide because Story Unlock is shared.
const DZ_STORY_MNS_LEVEL_CAPS = [20, 40, 60, 100, 100, 100]

function dzStoryMnsLevelCap(tier) {
  let index = Math.max(0, Math.min(DZ_STORY_MAX_TIER, Number(tier) || 0))
  return DZ_STORY_MNS_LEVEL_CAPS[index]
}

function dzStoryApplyMnsLevelCap(server, tier) {
  let cap = dzStoryMnsLevelCap(tier)
  try {
    let balance = DZ_STORY_MNS_BALANCE.get()
    if (balance.MAX_LEVEL !== cap) balance.MAX_LEVEL = cap
    server.persistentData.putInt('dz_story_mns_level_cap', cap)
    return true
  } catch (error) {
    console.error('[DEADZONE STORY] Failed to apply M&S level cap ' + cap + ': ' + error)
    return false
  }
}

function dzStoryClampBankedMnsExp(player, cap) {
  try {
    let data = DZ_STORY_MNS_ENTITY.get(player)
    if (data.getLevel() !== cap) return
    let required = Math.max(0, Number(data.getExpRequiredForLevelUp()) || 0)
    if (required > 0 && data.getExp() > required) data.setExp(required)
  } catch (error) {
    if (!player.persistentData.getBoolean('dz_story_mns_cap_error_logged_v1')) {
      player.persistentData.putBoolean('dz_story_mns_cap_error_logged_v1', true)
      console.error('[DEADZONE STORY] Failed to clamp M&S XP for ' + player.username + ': ' + error)
    }
  }
}

function dzStoryTier(server) {
  let data = server.persistentData
  if (!data.getBoolean("dz_story_unlock_schema_v1")) {
    data.putInt(DZ_STORY_UNLOCK_KEY, data.getInt(DZ_STORY_TIER_KEY))
    data.putBoolean("dz_story_unlock_schema_v1", true)
  }
  let tier = data.getInt(DZ_STORY_UNLOCK_KEY)
  return Math.max(0, Math.min(DZ_STORY_MAX_TIER, tier))
}

function dzStoryApplyPlayer(player, tier) {
  let levelCap = dzStoryMnsLevelCap(tier)
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
  player.persistentData.putInt('dz_story_mns_level_cap', levelCap)
}

function dzStorySetTier(server, tier, announce) {
  let next = Math.max(0, Math.min(DZ_STORY_MAX_TIER, tier))
  let previous = dzStoryTier(server)
  server.persistentData.putInt(DZ_STORY_UNLOCK_KEY, next)
  server.persistentData.putInt(DZ_STORY_TIER_KEY, next)
  server.persistentData.putBoolean("dz_story_unlock_schema_v1", true)
  dzStoryApplyMnsLevelCap(server, next)

  server.players.forEach(player => dzStoryApplyPlayer(player, next))

  if (announce && previous !== next) {
    server.tell(Text.of(
      "[PROJECT DEADZONE] ストーリー解禁 " + previous + " → " + next
    ).gold())
    server.tell(Text.of(
      "新しいストーリー進行・Loot・レシピ解禁条件とM&S Lv上限" +
      dzStoryMnsLevelCap(next) + "が同期されました。"
    ).yellow())
  }
}

global.pdzStoryUnlockTier = dzStoryTier
global.pdzStoryMnsLevelCap = dzStoryMnsLevelCap

ServerEvents.loaded(event => {
  dzStoryApplyMnsLevelCap(event.server, dzStoryTier(event.server))
})

PlayerEvents.loggedIn(event => {
  let tier = dzStoryTier(event.player.server)
  dzStoryApplyMnsLevelCap(event.player.server, tier)
  dzStoryApplyPlayer(event.player, tier)
})

PlayerEvents.respawned(event => {
  dzStoryApplyPlayer(event.player, dzStoryTier(event.player.server))
})

// Repairs stages if another mod or a command removed one during play.
PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 200 !== 0) return
  let worldTier = dzStoryTier(player.server)
  let levelCap = dzStoryMnsLevelCap(worldTier)
  dzStoryApplyMnsLevelCap(player.server, worldTier)
  dzStoryClampBankedMnsExp(player, levelCap)
  if (player.persistentData.getInt(DZ_STORY_TIER_KEY) !== worldTier) {
    dzStoryApplyPlayer(player, worldTier)
    return
  }
  for (let i = 0; i <= worldTier; i++) {
    let stage = "deadzone_tier_" + i
    if (!player.tags.contains(stage) || !player.stages.has(stage)) {
      dzStoryApplyPlayer(player, worldTier)
      return
    }
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  // Compatibility command root retained for administrators and old buttons.
  let root = Commands.literal("deadzonetier")

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let tier = dzStoryTier(player.server)
    player.tell(Text.of("PROJECT DEADZONE ストーリー解禁段階: S" + tier).gold())
    try {
      let mns = DZ_STORY_MNS_ENTITY.get(player)
      let level = Math.max(1, Number(mns.getLevel()) || 1)
      let cap = dzStoryMnsLevelCap(tier)
      player.tell(Text.of("M&S Lv " + level + " / " + cap +
        (level >= cap ? "（現在の上限）" : "")).aqua())
    } catch (ignored) {}
    for (let i = 0; i <= DZ_STORY_MAX_TIER; i++) {
      let stage = "deadzone_tier_" + i
      let active = player.stages.has(stage)
      let line = Text.of((active ? "✓ " : "－ ") + stage)
      player.tell(active ? line.green() : line.gray())
    }
    return 1
  }))

  root.then(Commands.literal("advance")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let server = ctx.source.server
      dzStorySetTier(server, dzStoryTier(server) + 1, true)
      return 1
    }))

  root.then(Commands.literal("reset")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      dzStorySetTier(ctx.source.server, 0, true)
      ctx.source.server.tell(Text.of(
        "ストーリー解禁をS0へリセットし、オンラインプレイヤーの解放Stageを同期しました。"
      ).green())
      return 1
    }))

  let set = Commands.literal("set").requires(source => source.hasPermission(2))
  for (let tier = 0; tier <= DZ_STORY_MAX_TIER; tier++) {
    let selected = tier
    set.then(Commands.literal("tier_" + tier).executes(ctx => {
      dzStorySetTier(ctx.source.server, selected, true)
      return 1
    }))
  }
  root.then(set)

  root.then(Commands.literal("sync")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let server = ctx.source.server
      server.players.forEach(player => dzStoryApplyPlayer(player, dzStoryTier(server)))
      ctx.source.player.tell(Text.of("Story Unlock stages synchronized.").aqua())
      return 1
    }))

  event.register(root)
})
