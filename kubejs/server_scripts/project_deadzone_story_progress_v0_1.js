// PROJECT DEADZONE story progress bridge v0.1
// Story bosses use dedicated tags so ordinary faction NPC kills cannot skip
// campaign objectives.

const DZ_STORY_QUESTS = {
  prologue: "4262970F1B621A1D",
  job: "52F2869C3820DF98",
  camp: "1920AEAAF4D75E94",
  briefing: "23E782D769F4E809",
  preparation: "633F4D540C6511A9",
  gasstation: "19FC30DCB267A732",
  tier1: "162BAA0F1AF6097C",
  gunshopIntel: "500615465858A8D5",
  gunshop: "7718CAD4F2ED6F3E",
  policeIntel: "6AD31D0364FE7B57",
  policeArrival: "3786D5F3AF1D3EF4",
  policeAssault: "5C450F9A7EB25D5B",
  policestation: "74065A02DB68DAE2",
  hospitalBriefing: "D34D220000000101",
  hospitalArrival: "D34D220000000102",
  hospital: "D34D220000000103",
  fireBriefing: "4AF84F15560BA03C",
  fireArrival: "3001FAD121C4FCD2",
  firestation: "04AC90A6EDFF8450",
  radioIntel: "40020680E6A96AF6",
  radioArrival: "3EB8C6CE111AC5E6",
  radioRepair: "42670EF087DB07A6",
  radioTower: "34C3DD0D8725B787",
  tier3: "3FE9D0F62386FC0C"
}

function dzCompleteStoryQuest(server, questId, message) {
  server.runCommandSilent("ftbquests change_progress @a complete " + questId)
  server.runCommandSilent('tellraw @a {"text":"' + message + '","color":"gold","bold":true}')
}

function dzCompletePlayerStoryQuest(player, key, questId) {
  let flag = "dz_story_auto_" + key
  if (player.persistentData.getBoolean(flag)) return
  player.server.runCommandSilent("ftbquests change_progress " + player.username +
    " complete " + questId)
  player.persistentData.putBoolean(flag, true)
}

function dzNearbyStoryBoss(player, tag, distance) {
  return player.server.runCommandSilent("execute as " + player.username +
    " at @s if entity @e[tag=" + tag + ",distance=.." + distance +
    ",limit=1]") > 0
}

const DZ_PREP_FOOD = [
  "survival_instinct:bean_can", "minecraft:bread", "minecraft:cooked_beef",
  "minecraft:cooked_porkchop", "minecraft:cooked_chicken", "apocalypsenow:nutrition_bar"
]
const DZ_PREP_WATER = [
  "survival_instinct:gallon_of_water", "survival_instinct:bottle_of_water",
  "apocalypsenow:canned_water", "minecraft:potion"
]
const DZ_PREP_MEDICAL = [
  "apocalypsenow:bandage", "apocalypsenow:bandage", "apocalypsenow:morphine",
  "apocalypsenow:pain_killers", "apocalypsenow:adrenaline_syringe"
]
const DZ_PREP_WEAPONS = [
  "tacz:modern_kinetic_gun", "minecraft:wooden_sword", "minecraft:stone_sword",
  "minecraft:iron_sword", "minecraft:bow", "minecraft:crossbow",
  "survival_instinct:hand_axe", "survival_instinct:tactical_knife",
  "survival_instinct:police_baton_mace", "survival_instinct:hunt_knife",
  "immersiveengineering:hammer"
]

function dzPrepItemCount(player, ids) {
  let total = 0
  ids.forEach(id => total += player.server.runCommandSilent(
    "clear " + player.username + " " + id + " 0"))
  return total
}

function dzPreparationState(player) {
  return {
    food: dzPrepItemCount(player, DZ_PREP_FOOD),
    water: dzPrepItemCount(player, DZ_PREP_WATER),
    medical: dzPrepItemCount(player, DZ_PREP_MEDICAL),
    weapon: dzPrepItemCount(player, DZ_PREP_WEAPONS)
  }
}

function dzPreparationReady(state) {
  return state.food >= 2 && state.water >= 1 && state.medical >= 2 && state.weapon >= 1
}

function dzTellPreparation(player) {
  let state = dzPreparationState(player)
  player.tell(Text.of("=== 探索準備 ===").gold())
  if (player.persistentData.getBoolean("dz_story_preparation_latched") ||
      player.persistentData.getBoolean("dz_story_auto_preparation")) {
    player.tell(Text.of("✓ 達成記録済み（所持品を移動しても維持されます）").green())
  }
  let food = Text.of((state.food >= 2 ? "✓ " : "－ ") + "食料 2個以上: " + state.food)
  let water = Text.of((state.water >= 1 ? "✓ " : "－ ") + "飲料 1個以上: " + state.water)
  let medical = Text.of((state.medical >= 2 ? "✓ " : "－ ") + "治療用品 2個以上: " + state.medical)
  let weapon = Text.of((state.weapon >= 1 ? "✓ " : "－ ") + "武器 1個以上: " + state.weapon)
  player.tell(state.food >= 2 ? food.green() : food.gray())
  player.tell(state.water >= 1 ? water.green() : water.gray())
  player.tell(state.medical >= 2 ? medical.green() : medical.gray())
  player.tell(state.weapon >= 1 ? weapon.green() : weapon.gray())
  return state
}

function dzStoryBossCheckpoint(server, key, questId, message, unlockTier, tierQuestId) {
  let flag = "dz_story_boss_complete_" + key
  if (server.persistentData.getBoolean(flag)) return false
  server.persistentData.putBoolean(flag, true)
  dzCompleteStoryQuest(server, questId, message)
  if (tierQuestId) server.runCommandSilent(
    "ftbquests change_progress @a complete " + tierQuestId)
  if (unlockTier > 0) {
    try {
      if (dzStoryTier(server) < unlockTier) dzStorySetTier(server, unlockTier, true)
    } catch (ignored) {
      server.runCommandSilent("deadzonestory set tier_" + unlockTier)
    }
  }
  return true
}

function dzIsFacilityBoss(entity) {
  return entity && entity.tags && (
    entity.tags.contains("dz_story_boss_gasstation")
    || entity.tags.contains("dz_story_boss_gunshop")
    || entity.tags.contains("dz_story_boss_policestation")
    || entity.tags.contains("dz_story_boss_hospital")
    || entity.tags.contains("dz_story_boss_firestation")
    || entity.tags.contains("dz_story_boss_radio_tower"))
}

function dzFacilityPartySize(server, boss) {
  let count = 0
  server.players.forEach(player => {
    if (String(player.level.dimension) !== String(boss.level.dimension)) return
    let dx = player.x - boss.x, dy = player.y - boss.y, dz = player.z - boss.z
    if (dx * dx + dy * dy + dz * dz <= 9216) count++
  })
  return Math.max(1, count)
}

function dzScaleFacilityBoss(server, boss) {
  if (!dzIsFacilityBoss(boss)
    || !boss.alive || boss.health <= 0
    || boss.persistentData.getBoolean("dz_party_scaled")) return
  let party = dzFacilityPartySize(server, boss)
  let healthScale = Math.min(2.5, 1.0 + (party - 1) * 0.22)
  let scaledHealth = Math.max(20, Math.round(boss.maxHealth * healthScale))
  let armor = Math.min(16, 4 + (party - 1) * 1.5)
  boss.runCommandSilent("attribute @s minecraft:generic.max_health base set " + scaledHealth)
  boss.runCommandSilent("attribute @s minecraft:generic.armor base set " + armor)
  boss.runCommandSilent("attribute @s minecraft:generic.knockback_resistance base set 0.75")
  boss.runCommandSilent("effect give @s minecraft:glowing infinite 0 true")
  boss.health = scaledHealth
  boss.persistentData.putBoolean("dz_party_scaled", true)
  boss.persistentData.putInt("dz_party_size", party)

  // Add tactical pressure instead of turning the boss into a pure HP sponge.
  let escorts = Math.min(3, Math.floor((party - 1) / 2))
  let remnant = boss.tags.contains("dz_story_boss_radio_tower")
  let spawnFunction = remnant
    ? "project_deadzone:factions/spawn/remnant_soldier"
    : "project_deadzone:factions/spawn/raider"
  for (let i = 0; i < escorts; i++) {
    let offsetX = i % 2 === 0 ? 3 : -3
    let offsetZ = i < 2 ? 2 : -3
    boss.runCommandSilent("execute positioned ~" + offsetX + " ~ ~" + offsetZ +
      " run function " + spawnFunction)
  }
  server.runCommandSilent('tellraw @a [{"text":"[MISSION] ","color":"gold","bold":true},' +
    '{"text":"Party ' + party + '人に合わせBossを強化（HP ' + scaledHealth +
    ' / 護衛 ' + escorts + '）","color":"yellow"}]')
  console.info("[DEADZONE STORY] Party scaled boss=" + String(boss.uuid) +
    " players=" + party + " hp=" + scaledHealth + " escorts=" + escorts)
}

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 20 !== 0) return
  // Story quests are completed by actual game events, not manual checkmarks.
  if (player.persistentData.getBoolean("dz_job_chosen")) {
    dzCompletePlayerStoryQuest(player, "prologue", DZ_STORY_QUESTS.prologue)
    dzCompletePlayerStoryQuest(player, "job", DZ_STORY_QUESTS.job)
  }
  if (player.server.runCommandSilent("execute as " + player.username +
    " at @s if entity @e[tag=dz_basecamp_core_anchor,distance=..96,limit=1]") > 0) {
    dzCompletePlayerStoryQuest(player, "camp", DZ_STORY_QUESTS.camp)
    dzCompletePlayerStoryQuest(player, "briefing", DZ_STORY_QUESTS.briefing)
  }
  // Preparation is a permanent checkpoint. Starter-kit items may satisfy the
  // requirements before the prerequisite Camp/briefing quests become active,
  // so remember the achievement separately and complete the quest once its
  // dependency is available. Items can then be stored, consumed or traded.
  let preparationLatched = player.persistentData.getBoolean("dz_story_preparation_latched")
  // Migrate players affected by v0.1, which marked the one-shot command as
  // handled even when FTB Quests rejected it because dependencies were locked.
  if (!preparationLatched && player.persistentData.getBoolean("dz_story_auto_preparation")) {
    player.persistentData.putBoolean("dz_story_preparation_latched", true)
    preparationLatched = true
  }
  if (!preparationLatched && player.persistentData.getBoolean("dz_job_chosen") &&
      dzPreparationReady(dzPreparationState(player))) {
    player.persistentData.putBoolean("dz_story_preparation_latched", true)
    preparationLatched = true
    player.tell(Text.of("探索準備の条件を達成した。装備を収納しても達成状態は維持される。").green())
    console.info("[DEADZONE STORY] Preparation requirements latched for " + player.username)
  }
  if (preparationLatched &&
      player.persistentData.getBoolean("dz_story_auto_briefing") &&
      !player.persistentData.getBoolean("dz_story_preparation_completion_v2")) {
    player.server.runCommandSilent("ftbquests change_progress " + player.username +
      " complete " + DZ_STORY_QUESTS.preparation)
    player.persistentData.putBoolean("dz_story_auto_preparation", true)
    player.persistentData.putBoolean("dz_story_preparation_completion_v2", true)
    player.tell(Text.of("探索準備が完了した。Gas Stationへ向かおう。").gold())
    console.info("[DEADZONE STORY] Preparation quest completed for " + player.username)
  }
  if (dzNearbyStoryBoss(player, "dz_story_boss_gunshop", 96))
    dzCompletePlayerStoryQuest(player, "gunshop_intel", DZ_STORY_QUESTS.gunshopIntel)
  if (dzNearbyStoryBoss(player, "dz_story_boss_policestation", 96)) {
    dzCompletePlayerStoryQuest(player, "police_intel", DZ_STORY_QUESTS.policeIntel)
    dzCompletePlayerStoryQuest(player, "police_arrival", DZ_STORY_QUESTS.policeArrival)
    dzCompletePlayerStoryQuest(player, "police_assault", DZ_STORY_QUESTS.policeAssault)
  }
  if (dzNearbyStoryBoss(player, "dz_story_boss_hospital", 96)) {
    dzCompletePlayerStoryQuest(player, "hospital_briefing", DZ_STORY_QUESTS.hospitalBriefing)
    dzCompletePlayerStoryQuest(player, "hospital_arrival", DZ_STORY_QUESTS.hospitalArrival)
  }
  if (dzNearbyStoryBoss(player, "dz_story_boss_firestation", 96)) {
    dzCompletePlayerStoryQuest(player, "fire_briefing", DZ_STORY_QUESTS.fireBriefing)
    dzCompletePlayerStoryQuest(player, "fire_arrival", DZ_STORY_QUESTS.fireArrival)
  }
  if (dzNearbyStoryBoss(player, "dz_story_boss_radio_tower", 96)) {
    dzCompletePlayerStoryQuest(player, "radio_intel", DZ_STORY_QUESTS.radioIntel)
    dzCompletePlayerStoryQuest(player, "radio_arrival", DZ_STORY_QUESTS.radioArrival)
  }
  // A full entity scan for every player every second was expensive on a
  // five-player server. Bosses only need this initialization once, so check at
  // a five-second cadence instead.
  if (player.age % 100 === 0) player.level.entities.forEach(entity => {
    if (dzIsFacilityBoss(entity) && entity.alive && entity.health > 0
      && !entity.persistentData.getBoolean("dz_party_scaled"))
      dzScaleFacilityBoss(player.server, entity)
  })
})

EntityEvents.death(event => {
  let npc = event.entity
  if (!npc || npc.level.clientSide || !npc.tags.contains("dz_npc")) return

  if (npc.tags.contains("dz_story_boss_gasstation")) {
    event.server.persistentData.putBoolean("dz_story_gasstation_secured", true)
    dzStoryBossCheckpoint(event.server, "gasstation", DZ_STORY_QUESTS.gasstation,
      "[PROJECT DEADZONE] Gas Stationを確保。World Tier 1を解放", 1,
      DZ_STORY_QUESTS.tier1)
  } else if (npc.tags.contains("dz_story_boss_gunshop")) {
    dzStoryBossCheckpoint(event.server, "gunshop", DZ_STORY_QUESTS.gunshop,
      "[PROJECT DEADZONE] Gun Shopを制圧した", 0, null)
  } else if (npc.tags.contains("dz_story_boss_policestation")) {
    dzStoryBossCheckpoint(event.server, "policestation", DZ_STORY_QUESTS.policestation,
      "[PROJECT DEADZONE] Raider Wardenを撃破。World Tier 2を解放", 2, null)
  } else if (npc.tags.contains("dz_story_boss_hospital")) {
    dzStoryBossCheckpoint(event.server, "hospital", DZ_STORY_QUESTS.hospital,
      "[PROJECT DEADZONE] Hospitalの薬品保管区画を確保した", 0, null)
  } else if (npc.tags.contains("dz_story_boss_firestation")) {
    dzStoryBossCheckpoint(event.server, "firestation", DZ_STORY_QUESTS.firestation,
      "[PROJECT DEADZONE] Raider Ash Captainを撃破した", 0, null)
  } else if (npc.tags.contains("dz_story_boss_radio_tower")) {
    dzStoryBossCheckpoint(event.server, "radio_tower", DZ_STORY_QUESTS.radioTower,
      "[PROJECT DEADZONE] 都市通信網を復旧。World Tier 3を解放", 3,
      DZ_STORY_QUESTS.tier3)
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonestoryboss")
    .requires(source => source.hasPermission(2))

  const tests = {
    gasstation: "project_deadzone:story/spawn_gasstation_boss",
    gunshop: "project_deadzone:story/spawn_gunshop_boss",
    policestation: "project_deadzone:story/spawn_policestation_boss",
    hospital: "project_deadzone:story/spawn_hospital_boss",
    firestation: "project_deadzone:story/spawn_firestation_boss",
    radio_tower: "project_deadzone:story/spawn_radio_tower_boss"
  }

  Object.keys(tests).forEach(name => {
    root.then(Commands.literal(name).executes(ctx => {
      let player = ctx.source.player
      player.runCommandSilent("execute positioned ^ ^ ^5 run function " + tests[name])
      player.tell(Text.of("[DEADZONE TEST] Story boss spawned: " + name).aqua())
      return 1
    }))
  })

  root.then(Commands.literal("status").executes(ctx => {
    let server = ctx.source.server
    ctx.source.player.tell(Text.of("=== STORY FACILITY STATUS ===").gold())
    ;["gasstation","gunshop","policestation","hospital","firestation","radio_tower"].forEach(key => {
      let done = server.persistentData.getBoolean("dz_story_boss_complete_" + key)
      let line = Text.of((done ? "✓ " : "－ ") + key)
      ctx.source.player.tell(done ? line.green() : line.gray())
    })
    ctx.source.player.tell(Text.of("World Tier: T" + dzStoryTier(server)).aqua())
    return 1
  }))

  root.then(Commands.literal("test_menu").executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of("=== STORY FACILITY TEST ===").gold())
    ;[
      ["STATUS", "/deadzonestoryboss status"],
      ["GAS STATION / T1", "/deadzonestoryboss gasstation"],
      ["GUN SHOP", "/deadzonestoryboss gunshop"],
      ["POLICE STATION / T2", "/deadzonestoryboss policestation"],
      ["HOSPITAL", "/deadzonestoryboss hospital"],
      ["FIRE STATION", "/deadzonestoryboss firestation"],
      ["RADIO TOWER / T3", "/deadzonestoryboss radio_tower"]
    ].forEach(entry => player.tell(Text.of("[ " + entry[0] + " ]").aqua()
      .clickRunCommand(entry[1]).hover(Text.of(entry[1]))))
    return 1
  }))

  event.register(root)

  let story = Commands.literal("deadzonestory")
  story.then(Commands.literal("briefing").executes(ctx => {
    let player = ctx.source.player
    if (!player.persistentData.getBoolean("dz_job_chosen")) {
      player.tell(Text.of("[レイ] 先にミナトからJOBの割り当てを受けて。").yellow())
      return 0
    }
    player.server.runCommandSilent(
      "ftbquests change_progress " + player.username + " complete " + DZ_STORY_QUESTS.briefing)
    player.tell(Text.of("[レイ] Gas Stationから燃料反応を確認。装備を整えて偵察して。").aqua())
    player.tell(Text.of("準備ができたらクエスト画面の「探索準備」を確認してください。").gray())
    return 1
  }))
  story.then(Commands.literal("prep_status").executes(ctx => {
    dzTellPreparation(ctx.source.player)
    return 1
  }))
  event.register(story)
})
