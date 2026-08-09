// PROJECT DEADZONE faction test commands v0.1
// Short aliases with explicit feedback for isolated NPC testing.

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonefaction")
    .requires(source => source.hasPermission(2))

  const tests = {
    survivor: "project_deadzone:factions/test/single_survivor",
    civildef: "project_deadzone:factions/test/single_civildef",
    raider: "project_deadzone:factions/test/single_raider",
    remnant: "project_deadzone:factions/test/single_remnant",
    civildef_medic: "project_deadzone:factions/test/single_civildef_medic",
    raider_medic: "project_deadzone:factions/test/single_raider_medic"
  }

  Object.keys(tests).forEach(name => {
    root.then(Commands.literal(name).executes(ctx => {
      let player = ctx.source.player
      player.runCommandSilent("function " + tests[name])
      player.tell(Text.of("[DEADZONE TEST] Spawn command executed: " + name).aqua())
      return 1
    }))
  })

  root.then(Commands.literal("cleanup").executes(ctx => {
    ctx.source.player.runCommandSilent("function project_deadzone:factions/cleanup_near")
    return 1
  }))

  root.then(Commands.literal("inspect").executes(ctx => {
    ctx.source.player.runCommand("function project_deadzone:factions/test/inspect_nearest")
    return 1
  }))

  root.then(Commands.literal("loadout_test").executes(ctx => {
    let player = ctx.source.player
    player.runCommand("tag @e[tag=dz_npc,sort=nearest,limit=1,distance=..16] add dz_loadout_test")
    player.tell(Text.of("[DEADZONE TEST] Nearest NPC enabled for Tier loadout testing.").aqua())
    return 1
  }))

  root.then(Commands.literal("loadout_clear").executes(ctx => {
    let player = ctx.source.player
    player.runCommand("tag @e[tag=dz_npc,sort=nearest,limit=1,distance=..16] remove dz_loadout_test")
    player.tell(Text.of("[DEADZONE TEST] Nearest NPC removed from Tier loadout testing.").gray())
    return 1
  }))

  event.register(root)
})
