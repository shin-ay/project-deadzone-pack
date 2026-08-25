// PROJECT DEADZONE Story Progression v0.1
// Stores one shared World Tier for the server and synchronizes it to all players.

const DZ_STORY_TIER_KEY = "deadzone_world_tier"
const DZ_STORY_MAX_TIER = 5

function dzStoryTier(server) {
  let tier = server.persistentData.getInt(DZ_STORY_TIER_KEY)
  return Math.max(0, Math.min(DZ_STORY_MAX_TIER, tier))
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
  player.persistentData.putInt(DZ_STORY_TIER_KEY, tier)
}

function dzStorySetTier(server, tier, announce) {
  let next = Math.max(0, Math.min(DZ_STORY_MAX_TIER, tier))
  let previous = dzStoryTier(server)
  server.persistentData.putInt(DZ_STORY_TIER_KEY, next)

  server.players.forEach(player => dzStoryApplyPlayer(player, next))

  if (announce && previous !== next) {
    server.tell(Text.of(
      "[PROJECT DEADZONE] World Tier " + previous + " → " + next
    ).gold())
    server.tell(Text.of(
      "新しいストーリー進行・Loot・レシピ解禁条件が同期されました。"
    ).yellow())
  }
}

PlayerEvents.loggedIn(event => {
  dzStoryApplyPlayer(event.player, dzStoryTier(event.player.server))
})

PlayerEvents.respawned(event => {
  dzStoryApplyPlayer(event.player, dzStoryTier(event.player.server))
})

// Repairs stages if another mod or a command removed one during play.
PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 200 !== 0) return
  let worldTier = dzStoryTier(player.server)
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
  // Keep narrative mission commands on /deadzonestory. World Tier has its own
  // root so command registration never depends on script load order.
  let root = Commands.literal("deadzonetier")

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let tier = dzStoryTier(player.server)
    player.tell(Text.of("PROJECT DEADZONE World Tier: T" + tier).gold())
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
      ctx.source.player.tell(Text.of("World Tier stages synchronized.").aqua())
      return 1
    }))

  event.register(root)
})
