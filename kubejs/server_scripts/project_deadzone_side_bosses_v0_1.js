// PROJECT DEADZONE optional bounty bosses v0.1

const DZ_SIDE_BOSS_QUESTS = {
  tank: {first:"10F903EB357EFC28", repeat:"A1E1000000000010"},
  abomination: {first:"717B2B8A66A44728", repeat:"A1E1000000000020"}
}

function dzStyleSideBoss(entity, key) {
  if (!entity || entity.level.clientSide || entity.tags.contains("dz_sideboss_ready")) return
  let tank = key === "tank"
  entity.addTag("dz_sideboss")
  entity.addTag("dz_sideboss_" + key)
  entity.addTag("dz_sideboss_ready")
  // M&S plus the dedicated entity profile own combat stats. This bridge only
  // assigns encounter identity/rewards and must not overwrite boss durability.
  entity.runCommandSilent("effect give @s minecraft:glowing infinite 0 true")
  let name = tank ? "Siege Tank" : "Ancient Abomination"
  let color = tank ? "dark_red" : "dark_purple"
  entity.runCommandSilent("data merge entity @s {CustomName:'{\"text\":\"" + name + "\",\"color\":\"" + color + "\",\"bold\":true}',CustomNameVisible:1b,PersistenceRequired:1b}")
}

EntityEvents.spawned("pdzbosses:siege_tank", event =>
  event.server.scheduleInTicks(2, callback => dzStyleSideBoss(event.entity, "tank")))
EntityEvents.spawned("pdzbosses:ancient_abomination", event =>
  event.server.scheduleInTicks(2, callback => dzStyleSideBoss(event.entity, "abomination")))

EntityEvents.death(event => {
  let entity = event.entity
  if (!entity || entity.level.clientSide || !entity.tags.contains("dz_sideboss")) return
  // Reward each entity only once so retries cannot become an infinite source.
  if (entity.persistentData.getBoolean("dz_sideboss_rewarded")) return
  entity.persistentData.putBoolean("dz_sideboss_rewarded", true)
  entity.tags.add("dz_sideboss_rewarded")
  let killer = event.source ? event.source.actual : null
  let tank = entity.tags.contains("dz_sideboss_tank")
  entity.block.popItem(Item.of("lightmanscurrency:coin_copper", tank ? 8 : 12))
  entity.block.popItem(Item.of("apocalypsenow:bandage", tank ? 4 : 6))
  entity.block.popItem(Item.of("immersiveengineering:ingot_steel", tank ? 3 : 5))
  if (killer && killer.isPlayer && killer.isPlayer()) {
    let quests = tank ? DZ_SIDE_BOSS_QUESTS.tank : DZ_SIDE_BOSS_QUESTS.abomination
    // First completion receives the larger milestone reward. Later kills feed
    // only the repeatable, smaller Party contract.
    let first = killer.server.runCommandSilent("ftbquests change_progress " + killer.username +
      " complete " + quests.first)
    if (first <= 0) killer.server.runCommandSilent("ftbquests change_progress " + killer.username +
      " complete " + quests.repeat)
  }
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal("deadzonebounty").requires(source=>source.hasPermission(2))
  root.then(Commands.literal("spawn_tank").executes(ctx=>{
    ctx.source.player.runCommandSilent("execute positioned ^ ^ ^8 run summon pdzbosses:siege_tank ~ ~ ~")
    return 1
  }))
  root.then(Commands.literal("spawn_abomination").executes(ctx=>{
    ctx.source.player.runCommandSilent("execute positioned ^ ^ ^8 run summon pdzbosses:ancient_abomination ~ ~ ~")
    return 1
  }))
  event.register(root)
})

