// PROJECT DEADZONE starter colony population v1.0
// Execution layer: MCA Reborn residents + Recruits guards.
// PDZ only decides where/when the verified initial colony is populated.

const DZ_COLONY_POP_VERSION = 3
const DZ_COLONY_HEIGHTMAP = Java.loadClass("net.minecraft.world.level.levelgen.Heightmap$Types")

function dzColonyOverworld(server) {
  try { return server.getLevel("minecraft:overworld") } catch (ignored) {}
  try { return server.overworld() } catch (ignored) {}
  return null
}

function dzColonyBlock(level, x, y, z) {
  try { return String(level.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)).id) }
  catch (ignored) { return "minecraft:void_air" }
}

function dzColonyAir(id) {
  return id.indexOf("air") >= 0 || id.indexOf("grass") >= 0 || id.indexOf("flower") >= 0 ||
    id.indexOf("fern") >= 0 || id.indexOf("snow") >= 0
}

function dzColonyBadGround(id) {
  return id.indexOf("water") >= 0 || id.indexOf("lava") >= 0 || id.indexOf("leaves") >= 0 ||
    id.indexOf("log") >= 0 || id.indexOf("cactus") >= 0 || id.indexOf("fire") >= 0 ||
    id.indexOf("void_air") >= 0
}

function dzColonySafePos(level, centerX, centerZ, seed) {
  // Golden-angle distribution avoids stacking every resident on one doorway.
  for (let i = 0; i < 48; i++) {
    let n = seed * 13 + i
    let radius = 5 + (n % 10) * 2
    let angle = n * 2.3999632297
    let x = Math.floor(centerX + Math.cos(angle) * radius)
    let z = Math.floor(centerZ + Math.sin(angle) * radius)
    try {
      level.getChunk(Math.floor(x / 16), Math.floor(z / 16))
      let y = Number(level.getHeight(DZ_COLONY_HEIGHTMAP.MOTION_BLOCKING_NO_LEAVES, x, z))
      if (!Number.isFinite(y) || y < 36 || y > 210) continue
      let ground = dzColonyBlock(level, x, y - 1, z)
      let body = dzColonyBlock(level, x, y, z)
      let head = dzColonyBlock(level, x, y + 1, z)
      if (dzColonyBadGround(ground) || !dzColonyAir(body) || !dzColonyAir(head)) continue
      return {x:x + 0.5, y:y, z:z + 0.5}
    } catch (ignored) {}
  }
  return null
}

function dzColonySummon(server, level, entityId, pos, tags, name, extraNbt) {
  if (!pos) return false
  let safeName = String(name).replace(/\\/g, "").replace(/\"/g, "")
  let tagNbt = tags.map(t => '\"' + t + '\"').join(",")
  let nbt = "{PersistenceRequired:1b,Tags:[" + tagNbt + "],CustomName:'{\"text\":\"" + safeName + "\"}',CustomNameVisible:0b" +
    (extraNbt ? "," + extraNbt : "") + "}"
  let cmd = "execute in minecraft:overworld run summon " + entityId + " " + pos.x + " " + pos.y + " " + pos.z + " " + nbt
  return server.runCommandSilent(cmd) > 0
}

function dzColonyTaggedCount(server, tag) {
  let probe = "dz_starter_count_probe"
  server.runCommandSilent("execute in minecraft:overworld run tag @e[tag=" + tag + "] remove " + probe)
  let count = server.runCommandSilent("execute in minecraft:overworld as @e[tag=" + tag + "] run tag @s add " + probe)
  server.runCommandSilent("execute in minecraft:overworld run tag @e[tag=" + probe + "] remove " + probe)
  return Math.max(0, Number(count) || 0)
}

function dzColonyLiveCount(server) {
  return dzColonyTaggedCount(server, "dz_starter_colony_resident") +
    dzColonyTaggedCount(server, "dz_starter_colony_guard")
}

function dzEnsureStarterPopulation(server, force) {
  let data = server.persistentData
  if (data.getInt("dz_starter_village_state") !== 2) return 0
  let liveBefore = dzColonyLiveCount(server)
  if (!force && data.getInt("dz_starter_colony_population_version") >= DZ_COLONY_POP_VERSION &&
      liveBefore >= 13) {
    data.putInt("dz_starter_colony_population_count", liveBefore)
    return 1
  }
  let level = dzColonyOverworld(server)
  if (!level) return 0

  let x = data.getInt("dz_starter_native_village_x")
  let z = data.getInt("dz_starter_native_village_z")
  if (x === 0 && z === 0 && !data.contains("dz_starter_native_village_structure")) return 0

  server.runCommandSilent("team add dz_survivors")
  server.runCommandSilent("team modify dz_survivors friendlyFire false")
  server.runCommandSilent("team modify dz_survivors color aqua")

  // A forced repair must be idempotent. Remove only the dedicated starter-colony
  // population before reinstalling; camp staff and ordinary MCA villagers stay intact.
  if (force || data.getInt("dz_starter_colony_population_version") < DZ_COLONY_POP_VERSION || liveBefore < 13) {
    server.runCommandSilent("execute in minecraft:overworld run kill @e[tag=dz_starter_colony_resident]")
    server.runCommandSilent("execute in minecraft:overworld run kill @e[tag=dz_starter_colony_guard]")
  }

  let residents = [
    ["mca:female_villager", "復興コロニー住民"],
    ["mca:male_villager", "復興コロニー住民"],
    ["mca:female_villager", "農業担当住民"],
    ["mca:male_villager", "資材担当住民"],
    ["mca:female_villager", "食料担当住民"],
    ["mca:male_villager", "整備担当住民"],
    ["mca:female_villager", "医療補助住民"],
    ["mca:male_villager", "交易担当住民"]
  ]
  let guardArmor = 'ArmorItems:[{id:"survival_instinct:green_recluit_armor_boots",Count:1b},' +
    '{id:"survival_instinct:green_recluit_armor_leggings",Count:1b},' +
    '{id:"survival_instinct:green_recluit_armor_chestplate",Count:1b},' +
    '{id:"survival_instinct:green_recluit_armor_helmet",Count:1b}],' +
    'ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]'
  let guardMeleeGear = guardArmor + ',HandItems:[{id:"survival_instinct:tactical_knife",Count:1b},' +
    '{id:"survival_instinct:swat_shield",Count:1b}],HandDropChances:[0.0f,0.0f]'
  let guardRangedGear = guardArmor + ',HandItems:[{id:"minecraft:bow",Count:1b},' +
    '{id:"survival_instinct:tactical_knife",Count:1b}],HandDropChances:[0.0f,0.0f]'
  let guards = [
    ["recruits:recruit", "復興コロニー警備員"],
    ["recruits:recruit", "復興コロニー警備員"],
    ["recruits:bowman", "復興コロニー監視員"],
    ["recruits:recruit_shieldman", "復興コロニー防衛員"],
    ["recruits:scout", "復興コロニー斥候"]
  ]

  let summoned = 0
  for (let i = 0; i < residents.length; i++) {
    let pos = dzColonySafePos(level, x, z, i + 1)
    if (dzColonySummon(server, level, residents[i][0], pos,
      ["dz_starter_colony_resident", "dz_colony_civilian", "dz_faction_civil_defense"], residents[i][1])) summoned++
  }
  for (let i = 0; i < guards.length; i++) {
    let pos = dzColonySafePos(level, x, z, i + 20)
    let gear = (guards[i][0] === "recruits:bowman" || guards[i][0] === "recruits:scout") ?
      guardRangedGear : guardMeleeGear
    if (dzColonySummon(server, level, guards[i][0], pos,
      ["dz_starter_colony_guard", "dz_colony_guard", "dz_survivor_guard", "dz_survivor", "dz_friendly",
        "dz_faction_civil_defense"], guards[i][1], gear)) summoned++
  }

  if (summoned < 13) {
    console.error("[PDZ][Starter Colony] population incomplete: " + summoned + "/13")
    data.putInt("dz_starter_colony_population_version", 0)
    data.putInt("dz_starter_colony_population_count", summoned)
    return 0
  }
  server.runCommandSilent("execute in minecraft:overworld run team join dz_survivors @e[tag=dz_starter_colony_resident]")
  server.runCommandSilent("execute in minecraft:overworld run team join dz_survivors @e[tag=dz_starter_colony_guard]")
  let liveAfter = dzColonyLiveCount(server)
  if (liveAfter < 13) {
    console.error("[PDZ][Starter Colony] population verification failed: " + liveAfter + "/13")
    data.putInt("dz_starter_colony_population_version", 0)
    data.putInt("dz_starter_colony_population_count", liveAfter)
    return 0
  }
  data.putInt("dz_starter_colony_population_version", DZ_COLONY_POP_VERSION)
  data.putInt("dz_starter_colony_population_count", liveAfter)
  console.info("[PDZ][Starter Colony] MCA/Recruits population installed and verified: " + liveAfter)
  return 1
}

global.pdzEnsureStarterPopulation = dzEnsureStarterPopulation

PlayerEvents.tick(event => {
  let player = event.player
  if (!player || !player.alive || String(player.level.dimension).indexOf("minecraft:overworld") < 0) return
  if (player.age % 100 !== 0) return
  let data = player.server.persistentData
  if (data.getInt("dz_starter_village_state") !== 2 ||
      data.getInt("dz_starter_colony_population_version") >= DZ_COLONY_POP_VERSION) return
  let x = data.getInt("dz_starter_native_village_x"), z = data.getInt("dz_starter_native_village_z")
  let dx = Number(player.x) - x, dz = Number(player.z) - z
  if (dx * dx + dz * dz <= 192 * 192) dzEnsureStarterPopulation(player.server, false)
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands} = event
  let root = Commands.literal("deadzonecolonypop")
  root.then(Commands.literal("status").executes(ctx => {
    let p = ctx.source.player, d = p.server.persistentData
    p.tell(Text.of("初期コロニー人口: v" + d.getInt("dz_starter_colony_population_version") +
      " / 生成数 " + d.getInt("dz_starter_colony_population_count")).aqua())
    return 1
  }))
  root.then(Commands.literal("install").requires(s => s.hasPermission(2)).executes(ctx =>
    dzEnsureStarterPopulation(ctx.source.server, true)))
  root.then(Commands.literal("retry").requires(s => s.hasPermission(2)).executes(ctx => {
    ctx.source.server.persistentData.putInt("dz_starter_colony_population_version", 0)
    return dzEnsureStarterPopulation(ctx.source.server, false)
  }))
  event.register(root)
})
