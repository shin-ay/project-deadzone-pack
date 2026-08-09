// PROJECT DEADZONE optional bounty bosses v0.1

function dzStyleSideBoss(entity, key) {
  if (!entity || entity.level.clientSide || entity.tags.contains("dz_sideboss_ready")) return
  let tank = key === "tank"
  let health = tank ? 90 : 120
  entity.addTag("dz_sideboss")
  entity.addTag("dz_sideboss_" + key)
  entity.addTag("dz_sideboss_ready")
  entity.runCommandSilent("attribute @s minecraft:generic.max_health base set " + health)
  entity.runCommandSilent("attribute @s minecraft:generic.armor base set " + (tank ? 10 : 12))
  entity.runCommandSilent("attribute @s minecraft:generic.knockback_resistance base set 0.9")
  entity.runCommandSilent("effect give @s minecraft:glowing infinite 0 true")
  let name = tank ? "Siege Tank" : "Ancient Abomination"
  let color = tank ? "dark_red" : "dark_purple"
  entity.runCommandSilent("data merge entity @s {CustomName:'{\"text\":\"" + name + "\",\"color\":\"" + color + "\",\"bold\":true}',CustomNameVisible:1b,PersistenceRequired:1b,Health:" + health + ".0f}")
}

EntityEvents.spawned("apocalypse_zombies:tank", event =>
  event.server.scheduleInTicks(2, callback => dzStyleSideBoss(event.entity, "tank")))
EntityEvents.spawned("infectious:ancient_zombie_boss", event =>
  event.server.scheduleInTicks(2, callback => dzStyleSideBoss(event.entity, "abomination")))

EntityEvents.death(event => {
  let entity = event.entity
  if (!entity || entity.level.clientSide || !entity.tags.contains("dz_sideboss")) return
  let killer = event.source ? event.source.actual : null
  let tank = entity.tags.contains("dz_sideboss_tank")
  entity.block.popItem(Item.of("apocalypsenow:money", tank ? 8 : 12))
  entity.block.popItem(Item.of("apocalypsenow:bandage", tank ? 4 : 6))
  entity.block.popItem(Item.of("immersiveengineering:ingot_steel", tank ? 3 : 5))
  if (killer && killer.isPlayer && killer.isPlayer()) {
    killer.server.runCommandSilent("ftbquests change_progress " + killer.username +
      " complete " + (tank ? "D202608200004020" : "D202608200004030"))
  }
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal("deadzonebounty").requires(source=>source.hasPermission(2))
  root.then(Commands.literal("spawn_tank").executes(ctx=>{
    ctx.source.player.runCommandSilent("execute positioned ^ ^ ^8 run summon apocalypse_zombies:tank ~ ~ ~")
    return 1
  }))
  root.then(Commands.literal("spawn_abomination").executes(ctx=>{
    ctx.source.player.runCommandSilent("execute positioned ^ ^ ^8 run summon infectious:ancient_zombie_boss ~ ~ ~")
    return 1
  }))
  event.register(root)
})

