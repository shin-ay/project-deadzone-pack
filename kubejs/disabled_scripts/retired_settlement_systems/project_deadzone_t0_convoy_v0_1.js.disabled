// PROJECT DEADZONE T0 rare convoy encounter v0.1
// T0 is forgiving, not empty. A rare, highly visible patrol creates a reason
// to hide, detour, or return later without restoring ordinary gunner spawns.

let DZ_CONVOY_TICKS = 0

function dzConvoySpawn(player) {
  let angle = Math.random() * Math.PI * 2
  let range = 72 + Math.floor(Math.random() * 25)
  let x = Math.floor(player.x + Math.cos(angle) * range)
  let z = Math.floor(player.z + Math.sin(angle) * range)
  let y = Math.floor(player.y)
  try {
    let surface = dzCampSurfaceY(player, x, z)
    if (Number.isFinite(surface)) y = Math.floor(surface)
  } catch (ignored) {}

  player.runCommandSilent("execute positioned " + x + " " + y + " " + z +
    " run summon mutantszombies:mutant_brute ~ ~ ~ {Tags:[\"dz_t0_convoy\",\"dz_named\",\"dz_named_roadbreaker\"],CustomName:'{\"text\":\"《路砕き》グラウンド・ゼロ\",\"color\":\"dark_red\",\"bold\":true}',CustomNameVisible:1b,PersistenceRequired:1b}")
  player.runCommandSilent("execute positioned " + x + " " + y + " " + z +
    " as @e[tag=dz_named_roadbreaker,sort=nearest,limit=1,distance=..6] run attribute @s minecraft:generic.max_health base set 95")
  player.runCommandSilent("execute positioned " + x + " " + y + " " + z +
    " as @e[tag=dz_named_roadbreaker,sort=nearest,limit=1,distance=..6] run attribute @s minecraft:generic.armor base set 10")
  player.runCommandSilent("execute positioned " + x + " " + y + " " + z +
    " as @e[tag=dz_named_roadbreaker,sort=nearest,limit=1,distance=..6] run effect give @s minecraft:resistance infinite 0 true")
  player.runCommandSilent("execute positioned " + x + " " + y + " " + z +
    " as @e[tag=dz_named_roadbreaker,sort=nearest,limit=1,distance=..6] run effect give @s minecraft:glowing infinite 0 true")
  player.runCommandSilent("execute positioned " + x + " " + y + " " + z +
    " as @e[tag=dz_named_roadbreaker,sort=nearest,limit=1,distance=..6] run data merge entity @s {Health:95.0f}")

  ;[[4,3,"raider_scout"],[-4,3,"raider_scout"],[5,-3,"raider_enforcer"],[-5,-3,"raider_medic"]].forEach(p => {
    player.runCommandSilent("execute positioned " + (x + p[0]) + " " + y + " " +
      (z + p[1]) + " run function project_deadzone:factions/spawn/" + p[2])
    player.runCommandSilent("execute positioned " + (x + p[0]) + " " + y + " " +
      (z + p[1]) + " run tag @e[tag=dz_raider,tag=!dz_t0_convoy,sort=nearest,limit=1,distance=..5] add dz_t0_convoy")
  })
  player.server.runCommandSilent("tellraw @a [{\"text\":\"[WARNING] \" ,\"color\":\"red\",\"bold\":true},{\"text\":\"T0郊外で武装コンボイを確認――交戦は任意\",\"color\":\"gold\"}]")
  player.server.persistentData.putLong("dz_t0_convoy_last", Number(player.level.getGameTime()))
  console.info("[PROJECT DEADZONE][Convoy] spawned at " + x + "," + y + "," + z)
  return 1
}

ServerEvents.tick(event => {
  // v0.2: periodic player-centred encounters are retired. The persistent
  // faction activity framework now plans convoys between registered sites.
  // /deadzoneencounter convoy remains available as a manual compatibility test.
  return
  DZ_CONVOY_TICKS++
  if (DZ_CONVOY_TICKS % 6000 !== 0) return
  let server = event.server
  if (server.runCommandSilent("execute if entity @e[tag=dz_t0_convoy]") > 0) return
  let candidates = []
  server.players.forEach(player => {
    let camp = dzRegionCampCenter(server)
    if (!camp) return
    let dx = player.x - camp.x, dz = player.z - camp.z
    let distance = Math.sqrt(dx * dx + dz * dz)
    if (distance > 210 && distance < 650 && dzRegionTierAt(server, player.x, player.z) === 0)
      candidates.push(player)
  })
  if (candidates.length === 0 || Math.random() >= 0.08) return
  dzConvoySpawn(candidates[Math.floor(Math.random() * candidates.length)])
})

EntityEvents.death(event => {
  let entity = event.entity
  if (!entity || entity.level.clientSide || !entity.tags.contains("dz_named_roadbreaker")) return
  entity.block.popItem(Item.of("apocalypsenow:money", 18))
  entity.block.popItem(Item.of("apocalypsenow:bandage", 4))
  entity.block.popItem(Item.of("minecraft:iron_ingot", 8))
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzoneencounter").requires(source => source.hasPermission(2))
  root.then(Commands.literal("convoy").executes(ctx => dzConvoySpawn(ctx.source.player)))
  root.then(Commands.literal("boss_menu").executes(ctx => {
    ctx.source.player.runCommandSilent("deadzonestoryboss test_menu")
    return 1
  }))
  event.register(root)
})
