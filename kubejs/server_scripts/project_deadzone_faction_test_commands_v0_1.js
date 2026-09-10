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

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    if (typeof pdzFactionOfEntity !== "function") {
      player.tell(Text.of("[FACTION TEST] relation registry is unavailable").red())
      return 0
    }
    let counts = {}, targeting = {}, total = 0
    player.level.entities.forEach(entity => {
      let faction = pdzFactionOfEntity(entity)
      if (faction === "unknown") return
      counts[faction] = Number(counts[faction] || 0) + 1
      total++
      try {
        if (entity.target && entity.target.alive) {
          let key = faction + ">" + pdzFactionOfEntity(entity.target)
          targeting[key] = Number(targeting[key] || 0) + 1
        }
      } catch (ignored) {}
    })
    player.tell(Text.of("=== LOADED FACTION AUDIT / " + String(player.level.dimension) + " ===").gold())
    Object.keys(counts).sort().forEach(faction =>
      player.tell(Text.of(faction + ": " + counts[faction]).aqua()))
    let pairs = Object.keys(targeting).sort()
    player.tell(Text.of("active targets: " + (pairs.length ? pairs.map(key => key + "=" + targeting[key]).join(", ") : "none")).yellow())
    return total
  }))

  root.then(Commands.literal("arena").executes(ctx => {
    let player = ctx.source.player
    player.runCommandSilent("kill @e[tag=dz_faction_test,distance=..80]")
    player.runCommandSilent("execute positioned ^-8 ^ ^28 run function project_deadzone:factions/spawn/civildef_guard")
    player.runCommandSilent("execute positioned ^-8 ^ ^28 run tag @e[tag=dz_civildef,tag=!dz_faction_test,sort=nearest,limit=1,distance=..6] add dz_faction_test")
    player.runCommandSilent("execute positioned ^8 ^ ^28 run function project_deadzone:factions/spawn/remnant_soldier")
    player.runCommandSilent("execute positioned ^8 ^ ^28 run tag @e[tag=dz_remnant,tag=!dz_faction_test,sort=nearest,limit=1,distance=..6] add dz_faction_test")
    player.tell(Text.of("[FACTION TEST] CDF/Remnant pair spawned 16m apart. Observe for 5 seconds, then run /deadzonefaction status.").gold())
    return 2
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
