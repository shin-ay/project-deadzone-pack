// PROJECT DEADZONE story progress bridge v0.1
// Story bosses use dedicated tags so ordinary faction NPC kills cannot skip
// campaign objectives.

const DZ_STORY_DECREE_ITEM = Java.loadClass('io.ejekta.bountiful.content.DecreeItem')
const DZ_STORY_MNS_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const DZ_STORY_MNS_HEALTH = Java.loadClass('com.robertx22.mine_and_slash.uncommon.utilityclasses.HealthUtils')

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
  hospitalBriefing: "0CC1C27F7969A440",
  hospitalArrival: "0C7AEC6E25192AAA",
  hospital: "6984DA400E0E21C3",
  fireBriefing: "4AF84F15560BA03C",
  fireArrival: "3001FAD121C4FCD2",
  firestation: "04AC90A6EDFF8450",
  radioIntel: "40020680E6A96AF6",
  radioArrival: "3EB8C6CE111AC5E6",
  radioRepair: "42670EF087DB07A6",
  radioTower: "34C3DD0D8725B787",
  tier3: "3FE9D0F62386FC0C",
  // Keep these IDs synchronized with deadzone_main_story_t2/t3.snbt.
  // The former placeholder IDs made valid world events target nonexistent quests.
  t2FactoryArrival: "242968A2B6D41253",
  t2FactoryRestore: "2FD5B06423F44541",
  t2RelayArrival: "13A8A2B1178471CD",
  t2RelayCapture: "6327A52D90F0014B",
  t2FactionChoice: "63BC8CE6C398AEE6",
  t2CivildefRoute: "15EEF72539267271",
  t2RaiderRoute: "6B79E4C886405D52",
  t2RemnantRoute: "172DC215E314B2C5",
  t2RouteConverge: "30842133D9A8E440",
  t2AegisRecord: "64FC20257BDD84CF",
  t2Primordial: "0573B0233758DF83",
  t2Complete: "17F1D932ED1B4A01",
  t3Military: "1ABE30FB04136438",
  t3Laboratory: "0E2A157FFF57D90A",
  t3Reactor: "46488BBA671011F5",
  t3WardenCores: "719E23C2245BB557",
  t3ArgusFragment: "22426D3E145D5513",
  t3ChoirDiscovery: "5B4D3EBFA1026614",
  t3ChoirVessel: "0E8A3FB0BED9A091",
  t3ArgusChoice: "5EF7DA85993329F7",
  t3Complete: "65F53D8012470726",
  t3EndgameContracts: "A3E1000000000001",
  // These are the real quest IDs in deadzone_main_story_t4.snbt.  The old
  // A4E1 placeholders never existed in the chapter and silently prevented
  // automatic T4 completion.
  t4Aftermath: "562B6555400E8922",
  t4Authorization: "259E544FE7CEAC94"
}

function dzGrantEndgameDecree(player) {
  if (player.server.persistentData.getString("dz_story_argus_outcome") === "") return false
  let key = "dz_story_endgame_decree_v1"
  if (!player.persistentData.getBoolean(key)) {
    try {
      player.give(DZ_STORY_DECREE_ITEM.Companion.create("deadzone_endgame"))
      player.persistentData.putBoolean(key, true)
      player.tell(Text.of("[終幕後] 危険地区作戦令状を受領。Bounty Boardへ挿入するとT3向け契約が生成されます。").gold())
    } catch (error) {
      if (!player.persistentData.getBoolean("dz_story_endgame_decree_error_logged_v1")) {
        player.persistentData.putBoolean("dz_story_endgame_decree_error_logged_v1", true)
        console.error("[DEADZONE STORY] Endgame decree creation failed for " + player.username + ": " + error)
      }
      return false
    }
  }
  dzCompletePlayerStoryQuest(player, "t3_endgame_contracts", DZ_STORY_QUESTS.t3EndgameContracts)
  return true
}

function dzStoryInventoryCount(player, id) {
  try { return player.inventory.count(Item.of(id)) }
  catch (ignored) { return 0 }
}

function dzSyncT4Foundation(player) {
  if (player.server.persistentData.getString("dz_story_argus_outcome") === "") return
  dzCompletePlayerStoryQuest(player, "t4_aftermath", DZ_STORY_QUESTS.t4Aftermath)

  if (!player.persistentData.getBoolean("dz_story_t4_samples_latched") &&
      dzStoryInventoryCount(player, "infectious:mutated_rotten_flesh") >= 16 &&
      dzStoryInventoryCount(player, "immersiveengineering:component_steel") >= 4) {
    player.persistentData.putBoolean("dz_story_t4_samples_latched", true)
    player.tell(Text.of("[T4準備] 感染サンプルと解析用工業部品を確保した。").green())
  }
  if (!player.persistentData.getBoolean("dz_story_t4_arsenal_latched") &&
      dzStoryInventoryCount(player, "superbwarfare:blueprint_research_table") >= 1 &&
      dzStoryInventoryCount(player, "superbwarfare:battery") >= 1) {
    player.persistentData.putBoolean("dz_story_t4_arsenal_latched", true)
    player.tell(Text.of("[T4準備] 軍用Blueprint解析設備が稼働可能になった。").green())
  }
  if (!player.persistentData.getBoolean("dz_story_t4_cipher_latched") &&
      dzStoryInventoryCount(player, "superbwarfare:epic_blueprint_data_chip") >= 1) {
    player.persistentData.putBoolean("dz_story_t4_cipher_latched", true)
    player.tell(Text.of("[T4準備] 高度暗号化Data Chipを確保した。").green())
  }

  let ready = player.persistentData.getBoolean("dz_story_t4_samples_latched") &&
    player.persistentData.getBoolean("dz_story_t4_arsenal_latched") &&
    player.persistentData.getBoolean("dz_story_t4_cipher_latched")
  if (ready && dzCompletePlayerStoryQuest(player, "t4_authorization", DZ_STORY_QUESTS.t4Authorization) &&
      dzStoryTier(player.server) < 4) {
    dzStorySetTier(player.server, 4, true)
    player.server.tell(Text.of("ARGUS-9外縁からFirst Voiceの中継信号を検出。T4作戦を開始します。").darkPurple())
  }
}

function dzCompleteStoryQuest(server, questId, message) {
  server.runCommandSilent("ftbquests change_progress @a complete " + questId)
  server.runCommandSilent('tellraw @a {"text":"' + message + '","color":"gold","bold":true}')
}

function dzCompletePlayerStoryQuest(player, key, questId) {
  // v3: FTB Quests can reject completion while a dependency is still locked.
  // Older revisions stored the flag even after a rejected command, leaving the
  // player permanently stuck. Record completion only when the command succeeds
  // and keep retrying otherwise. A versioned flag also repairs affected saves.
  let flag = "dz_story_auto_v3_" + key
  if (player.persistentData.getBoolean(flag)) return true
  let result = player.server.runCommandSilent("ftbquests change_progress " + player.username +
    " complete " + questId)
  if (result > 0) {
    player.persistentData.putBoolean(flag, true)
    console.info("[DEADZONE STORY] Auto-completed " + key + " for " + player.username)
    return true
  }
  return false
}

function dzNearbyStoryBoss(player, tag, distance) {
  return player.server.runCommandSilent("execute as " + player.username +
    " at @s if entity @e[tag=" + tag + ",distance=.." + distance +
    ",limit=1]") > 0
}

function dzNearbyStoryMarker(player, predicate, distance) {
  let found = false
  let max = distance * distance
  player.level.entities.forEach(entity => {
    if (found || !entity.tags || !entity.tags.contains("dz_wilderness_site")) return
    let dx = entity.x - player.x, dy = entity.y - player.y, dz = entity.z - player.z
    if (dx * dx + dy * dy + dz * dz > max) return
    if (predicate(entity)) found = true
  })
  return found
}

function dzNearestStoryMarker(player, predicate, distance) {
  let best = null, bestDistance = distance * distance
  player.level.entities.forEach(entity => {
    if (!entity.tags || !entity.tags.contains("dz_wilderness_site")) return
    if (!predicate(entity)) return
    let dx = entity.x - player.x, dy = entity.y - player.y, dz = entity.z - player.z
    let current = dx * dx + dy * dy + dz * dz
    if (current <= bestDistance) { best = entity; bestDistance = current }
  })
  return best
}

function dzNearbyStronghold(player, type, distance) {
  let found = false
  let max = distance * distance
  player.level.entities.forEach(entity => {
    if (found || !entity.tags || !entity.tags.contains("dz_stronghold_core")) return
    if (entity.persistentData.getString("dz_stronghold_type") !== type) return
    let dx = entity.x - player.x, dy = entity.y - player.y, dz = entity.z - player.z
    if (dx * dx + dy * dy + dz * dz <= max) found = true
  })
  return found
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
  "apocalypsenow:bandage", "apocalypsenow:morphine",
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
    || entity.tags.contains("dz_story_boss_radio_tower")
    || entity.tags.contains("dz_story_boss_primordial")
    || entity.tags.contains("dz_story_boss_reactor_saint")
    || entity.tags.contains("dz_story_boss_argus_fragment")
    || entity.tags.contains("dz_story_boss_choir_vessel"))
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
  let levelBonus = Math.min(12, (party - 1) * 2)
  let scaledHealth = 0
  try {
    let mns = DZ_STORY_MNS_ENTITY_DATA.get(boss)
    mns.setRarity('boss')
    if (levelBonus > 0) mns.setLevel(mns.getLevel() + levelBonus)
    mns.recalcStats_DONT_CALL()
    scaledHealth = Math.round(DZ_STORY_MNS_HEALTH.getMaxHealth(boss))
    boss.addTag('dz_mns_boss_profile')
  } catch (err) {
    console.warn('[DEADZONE STORY] M&S party scaling failed: ' + err)
    scaledHealth = Math.round(boss.maxHealth)
  }
  let armor = Math.min(16, 4 + (party - 1) * 1.5)
  boss.runCommandSilent("attribute @s minecraft:generic.armor base set " + armor)
  boss.runCommandSilent("attribute @s minecraft:generic.knockback_resistance base set 0.75")
  boss.runCommandSilent("effect give @s minecraft:glowing infinite 0 true")
  boss.health = boss.maxHealth
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
    '{"text":"Party ' + party + '人に合わせBossを強化（M&S HP ' + scaledHealth +
    ' / 護衛 ' + escorts + '）","color":"yellow"}]')
  console.info("[DEADZONE STORY] Party scaled boss=" + String(boss.uuid) +
    " players=" + party + " hp=" + scaledHealth + " escorts=" + escorts)
}

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 20 !== 0) return
  dzGrantEndgameDecree(player)
  dzSyncT4Foundation(player)
  // Story quests are completed by actual game events, not manual checkmarks.
  if (player.persistentData.getBoolean("dz_job_chosen") &&
      player.persistentData.getBoolean("dz_onboarding_awake")) {
    dzCompletePlayerStoryQuest(player, "prologue", DZ_STORY_QUESTS.prologue)
    dzCompletePlayerStoryQuest(player, "job", DZ_STORY_QUESTS.job)
  }
  if (player.persistentData.getBoolean("dz_story_camp_signal_received"))
    dzCompletePlayerStoryQuest(player, "camp", DZ_STORY_QUESTS.camp)
  if (player.server.runCommandSilent("execute as " + player.username +
    " at @s if entity @e[tag=dz_basecamp_core_anchor,distance=..96,limit=1]") > 0 &&
      player.persistentData.getBoolean("dz_story_camp_signal_received")) {
    if (dzCompletePlayerStoryQuest(player, "briefing", DZ_STORY_QUESTS.briefing))
      player.persistentData.putBoolean("dz_story_auto_briefing", true)
    try { if (global.pdzSyncRecipeStages) global.pdzSyncRecipeStages(player) } catch (ignored) {}
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
  if (preparationLatched && player.persistentData.getBoolean("dz_story_auto_briefing") &&
      !player.persistentData.getBoolean("dz_story_auto_v3_preparation")) {
    // Only persist completion after FTB Quests accepts it.  Older code wrote its
    // own completion flag even when the dependency was still locked, preventing
    // every later retry and leaving the quest visibly stuck.
    if (dzCompletePlayerStoryQuest(player, "preparation", DZ_STORY_QUESTS.preparation)) {
      player.persistentData.putBoolean("dz_story_auto_preparation", true)
      player.persistentData.putBoolean("dz_story_preparation_completion_v2", true)
      player.tell(Text.of("探索準備が完了した。Gas Stationへ向かおう。").gold())
      console.info("[DEADZONE STORY] Preparation quest completed for " + player.username)
    }
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
  // Act 2 uses the persistent facility/stronghold ledgers already present in
  // DEADZONE. No second site detector is introduced here.
  if (dzNearbyStoryMarker(player, marker => {
    let type = marker.persistentData.getString("dz_wild_type")
    let role = marker.persistentData.getString("dz_wild_role")
    return type === "industrial" || role === "logistics"
  }, 128)) dzCompletePlayerStoryQuest(player, "t2_factory_arrival", DZ_STORY_QUESTS.t2FactoryArrival)

  if (dzNearbyStronghold(player, "remnant", 128))
    dzCompletePlayerStoryQuest(player, "t2_relay_arrival", DZ_STORY_QUESTS.t2RelayArrival)

  if (player.tags.contains("dz_captured_remnant_core"))
    dzCompletePlayerStoryQuest(player, "t2_relay_capture", DZ_STORY_QUESTS.t2RelayCapture)

  if (player.persistentData.getString("dz_story_t2_support") !== "")
    dzCompletePlayerStoryQuest(player, "t2_faction_choice", DZ_STORY_QUESTS.t2FactionChoice)

  if (player.persistentData.getBoolean("dz_story_auto_v3_t2_relay_capture")
      && player.persistentData.getString("dz_story_t2_support") === ""
      && !player.persistentData.getBoolean("dz_story_commandless_support_prompt_v1")) {
    player.persistentData.putBoolean("dz_story_commandless_support_prompt_v1", true)
    player.runCommandSilent("deadzonestory support")
  }

  // The selected support route changes the objective instead of merely changing
  // its label. One completed route is enough to reopen the shared AEGIS trail.
  let support = player.persistentData.getString("dz_story_t2_support")
  if (support === "civildef" && dzNearbyStoryMarker(player, marker =>
      marker.persistentData.getString("dz_wild_faction") === "civildef", 128)) {
    if (dzCompletePlayerStoryQuest(player, "t2_route_civildef", DZ_STORY_QUESTS.t2CivildefRoute))
      player.persistentData.putBoolean("dz_story_t2_route_complete", true)
  }
  if (support === "raider" && player.tags.contains("dz_captured_raider_core")) {
    if (dzCompletePlayerStoryQuest(player, "t2_route_raider", DZ_STORY_QUESTS.t2RaiderRoute))
      player.persistentData.putBoolean("dz_story_t2_route_complete", true)
  }
  if (support === "remnant" && player.tags.contains("dz_captured_remnant_core")) {
    if (dzCompletePlayerStoryQuest(player, "t2_route_remnant", DZ_STORY_QUESTS.t2RemnantRoute))
      player.persistentData.putBoolean("dz_story_t2_route_complete", true)
  }
  if (player.persistentData.getBoolean("dz_story_t2_route_complete"))
    dzCompletePlayerStoryQuest(player, "t2_route_converge", DZ_STORY_QUESTS.t2RouteConverge)

  if (dzNearbyStoryMarker(player, marker => {
    let type = marker.persistentData.getString("dz_wild_type")
    let role = marker.persistentData.getString("dz_wild_role")
    let faction = marker.persistentData.getString("dz_wild_faction")
    return faction === "aegis" && (role === "research" || type.indexOf("laboratory") >= 0 ||
      type.indexOf("underground") >= 0)
  }, 128) && player.persistentData.getBoolean("dz_story_t2_route_complete"))
    dzCompletePlayerStoryQuest(player, "t2_aegis_record", DZ_STORY_QUESTS.t2AegisRecord)

  if (dzNearbyStoryMarker(player, marker => {
    let type = marker.persistentData.getString("dz_wild_type")
    return type.indexOf("military") >= 0 || type.indexOf("command") >= 0 ||
      type.indexOf("nuclear_shelter") >= 0
  }, 160)) dzCompletePlayerStoryQuest(player, "t3_military", DZ_STORY_QUESTS.t3Military)

  if (dzNearbyStoryMarker(player, marker => {
    let type = marker.persistentData.getString("dz_wild_type")
    let role = marker.persistentData.getString("dz_wild_role")
    let faction = marker.persistentData.getString("dz_wild_faction")
    return faction === "aegis" && (type.indexOf("laboratory") >= 0 || role === "research")
  }, 160)) dzCompletePlayerStoryQuest(player, "t3_laboratory", DZ_STORY_QUESTS.t3Laboratory)

  if (player.persistentData.getInt("dz_story_warden_core_count") >= 3)
    dzCompletePlayerStoryQuest(player, "t3_warden_cores", DZ_STORY_QUESTS.t3WardenCores)

  let argusReady = player.server.persistentData.getBoolean("dz_story_boss_complete_reactor_saint")
    && player.server.persistentData.getBoolean("dz_story_boss_complete_argus_fragment")
    && player.server.persistentData.getBoolean("dz_story_boss_complete_choir_vessel")
    && player.persistentData.getInt("dz_story_warden_core_count") >= 3
  if (argusReady && player.server.persistentData.getString("dz_story_argus_outcome") === ""
      && !player.persistentData.getBoolean("dz_story_commandless_argus_prompt_v1")) {
    player.persistentData.putBoolean("dz_story_commandless_argus_prompt_v1", true)
    player.runCommandSilent("deadzonestory argus")
  }

  if (dzNearbyStoryMarker(player, marker => {
    let faction = marker.persistentData.getString("dz_wild_faction")
    let type = marker.persistentData.getString("dz_wild_type")
    let role = marker.persistentData.getString("dz_wild_role")
    return faction === "infected" && (role === "nest" || type.indexOf("infect") >= 0 ||
      type.indexOf("laboratory") >= 0)
  }, 160)) dzCompletePlayerStoryQuest(player, "t3_choir_discovery", DZ_STORY_QUESTS.t3ChoirDiscovery)
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
  if (!npc || npc.level.clientSide) return

  if (npc.tags.contains("dz_story_boss_primordial")) {
    dzStoryBossCheckpoint(event.server, "primordial", DZ_STORY_QUESTS.t2Primordial,
      "[PROJECT DEADZONE] 原初感染体を撃破。T2の感染輸送記録を確保", 3,
      DZ_STORY_QUESTS.t2Complete)
    return
  }
  if (npc.tags.contains("dz_story_boss_reactor_saint")) {
    dzStoryBossCheckpoint(event.server, "reactor_saint", DZ_STORY_QUESTS.t3Reactor,
      "[PROJECT DEADZONE] REACTOR SAINTを撃破。除染経路を確保", 0, null)
    return
  }
  if (npc.tags.contains("dz_story_boss_argus_fragment")) {
    dzStoryBossCheckpoint(event.server, "argus_fragment", DZ_STORY_QUESTS.t3ArgusFragment,
      "[PROJECT DEADZONE] ARGUS Fragmentを撃破", 0, null)
    return
  }
  if (npc.tags.contains("dz_story_boss_choir_vessel")) {
    dzStoryBossCheckpoint(event.server, "choir_vessel", DZ_STORY_QUESTS.t3ChoirVessel,
      "[PROJECT DEADZONE] CHOIR VESSELを撃破。ARGUS-9最終判断を解禁", 0, null)
    return
  }
  if (!npc.tags.contains("dz_npc")) return

  if (npc.tags.contains("dz_story_boss_gasstation")) {
    event.server.persistentData.putBoolean("dz_story_gasstation_secured", true)
    dzStoryBossCheckpoint(event.server, "gasstation", DZ_STORY_QUESTS.gasstation,
      "[PROJECT DEADZONE] Gas Stationを確保。ストーリー解禁S1へ進行", 1,
      DZ_STORY_QUESTS.tier1)
  } else if (npc.tags.contains("dz_story_boss_gunshop")) {
    dzStoryBossCheckpoint(event.server, "gunshop", DZ_STORY_QUESTS.gunshop,
      "[PROJECT DEADZONE] Gun Shopを制圧した", 0, null)
  } else if (npc.tags.contains("dz_story_boss_policestation")) {
    dzStoryBossCheckpoint(event.server, "policestation", DZ_STORY_QUESTS.policestation,
      "[PROJECT DEADZONE] Raider Wardenを撃破。ストーリー解禁S2へ進行", 2, null)
  } else if (npc.tags.contains("dz_story_boss_hospital")) {
    dzStoryBossCheckpoint(event.server, "hospital", DZ_STORY_QUESTS.hospital,
      "[PROJECT DEADZONE] Hospitalの薬品保管区画を確保した", 0, null)
  } else if (npc.tags.contains("dz_story_boss_firestation")) {
    dzStoryBossCheckpoint(event.server, "firestation", DZ_STORY_QUESTS.firestation,
      "[PROJECT DEADZONE] Raider Ash Captainを撃破した", 0, null)
  } else if (npc.tags.contains("dz_story_boss_radio_tower")) {
    dzStoryBossCheckpoint(event.server, "radio_tower", DZ_STORY_QUESTS.radioTower,
      "[PROJECT DEADZONE] 都市通信網を復旧。ストーリー解禁S3へ進行", 3,
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
    radio_tower: "project_deadzone:story/spawn_radio_tower_boss",
    primordial: "project_deadzone:story/spawn_primordial_boss",
    reactor_saint: "project_deadzone:story/spawn_reactor_saint",
    argus_fragment: "project_deadzone:story/spawn_argus_fragment",
    choir_vessel: "project_deadzone:story/spawn_choir_vessel"
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
    ;["gasstation","gunshop","policestation","hospital","firestation","radio_tower","primordial",
      "reactor_saint","argus_fragment","choir_vessel"].forEach(key => {
      let done = server.persistentData.getBoolean("dz_story_boss_complete_" + key)
      let line = Text.of((done ? "✓ " : "－ ") + key)
      ctx.source.player.tell(done ? line.green() : line.gray())
    })
      ctx.source.player.tell(Text.of("ストーリー解禁: S" + dzStoryTier(server)).aqua())
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
      ,["PRIMORDIAL / T2", "/deadzonestoryboss primordial"]
      ,["REACTOR SAINT / T3", "/deadzonestoryboss reactor_saint"]
      ,["ARGUS FRAGMENT / T3", "/deadzonestoryboss argus_fragment"]
      ,["CHOIR VESSEL / T3", "/deadzonestoryboss choir_vessel"]
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
  story.then(Commands.literal("support").executes(ctx => {
    let player = ctx.source.player
    if (!player.persistentData.getBoolean("dz_story_auto_v3_t2_relay_capture")) {
      player.tell(Text.of("T2支援先はProtocol座標断片の確保後に選べます。").red())
      return 0
    }
    player.tell(Text.of("=== T2 支援勢力を選択 ===").gold())
    ;[
      ["CDF：防具・地図・友軍巡回", "civildef", "aqua"],
      ["Raiders：密輸武器・M&S強化資源・車両部品", "raider", "red"],
      ["Remnant：軍用品・T3座標・重工業部品", "remnant", "dark_red"]
    ].forEach(entry => player.tell(Text.of("[ " + entry[0] + " ]")[entry[2]]()
      .clickRunCommand("/deadzonestory choose_" + entry[1])
      .hover(Text.of("この勢力をT2の支援先として選ぶ"))))
    player.tell(Text.of("選択後も他勢力の施設攻略は可能。価格・巡回・報酬経路が変化します。").gray())
    return 1
  }))
  ;[
    ["civildef", "CDF"], ["raider", "Raiders"], ["remnant", "Remnant"]
  ].forEach(entry => story.then(Commands.literal("choose_" + entry[0]).executes(ctx => {
    let player = ctx.source.player
    if (!player.persistentData.getBoolean("dz_story_auto_v3_t2_relay_capture")) {
      player.tell(Text.of("判断材料がまだ揃っていません。").red())
      return 0
    }
    if (player.persistentData.getString("dz_story_t2_support") !== "") {
      player.tell(Text.of("支援先は既に選択済みです: " + player.persistentData.getString("dz_story_t2_support")).red())
      return 0
    }
    player.persistentData.putString("dz_story_t2_support", entry[0])
    player.addTag("dz_t2_support_" + entry[0])
    player.server.persistentData.putInt("dz_t2_support_" + entry[0],
      player.server.persistentData.getInt("dz_t2_support_" + entry[0]) + 1)
    dzCompletePlayerStoryQuest(player, "t2_faction_choice", DZ_STORY_QUESTS.t2FactionChoice)
    player.server.runCommandSilent('tellraw @a [{"text":"[STORY] ","color":"gold","bold":true},{"text":"' +
      player.username + ' がT2支援先に ' + entry[1] + ' を選択した","color":"yellow"}]')
    return 1
  })))
  story.then(Commands.literal("warden_disable").executes(ctx => {
    let player = ctx.source.player
    let marker = dzNearestStoryMarker(player, entity =>
      entity.persistentData.getString("dz_wild_faction") === "warden", 48)
    if (!marker) {
      player.tell(Text.of("48m以内にWARDEN施設中枢がありません。").red())
      return 0
    }
    let instance = marker.persistentData.getString("dz_wild_instance")
    if (!instance) instance = marker.persistentData.getString("dz_wild_structure") + "|" +
      Math.floor(marker.x) + "|" + Math.floor(marker.z)
    let raw = player.persistentData.getString("dz_story_warden_cores")
    let cores = raw ? raw.split(";") : []
    if (cores.indexOf(instance) >= 0) {
      player.tell(Text.of("このWARDEN中枢は既に停止済みです。").yellow())
      return 0
    }
    cores.push(instance)
    player.persistentData.putString("dz_story_warden_cores", cores.join(";"))
    player.persistentData.putInt("dz_story_warden_core_count", cores.length)
    marker.persistentData.putBoolean("dz_warden_core_disabled", true)
    player.runCommandSilent("playsound minecraft:block.beacon.deactivate player @s ~ ~ ~ 1 0.7")
    player.tell(Text.of("WARDEN中枢を停止: " + cores.length + " / 3").aqua())
    if (cores.length >= 3)
      dzCompletePlayerStoryQuest(player, "t3_warden_cores", DZ_STORY_QUESTS.t3WardenCores)
    return 1
  }))
  story.then(Commands.literal("argus").executes(ctx => {
    let player = ctx.source.player
    let server = player.server
    let ready = server.persistentData.getBoolean("dz_story_boss_complete_reactor_saint")
      && server.persistentData.getBoolean("dz_story_boss_complete_argus_fragment")
      && server.persistentData.getBoolean("dz_story_boss_complete_choir_vessel")
      && player.persistentData.getInt("dz_story_warden_core_count") >= 3
    if (!ready) {
      player.tell(Text.of("ARGUS-9の最終処理はまだ実行できません。").red())
      player.tell(Text.of("必要条件: REACTOR SAINT / ARGUS Fragment / CHOIR VESSEL撃破、WARDEN中枢3基停止").gray())
      return 0
    }
    player.tell(Text.of("=== ARGUS-9 最終処理 ===").gold())
    ;[
      ["破壊：機械敵を弱体化／Buddy強化を失う", "destroy", "red"],
      ["再設定：機械Buddy・タレット強化／監視網を残す", "reprogram", "aqua"],
      ["分離：機械網を地域単位へ分割／中立機械が増える", "separate", "yellow"]
    ].forEach(entry => player.tell(Text.of("[ " + entry[0] + " ]")[entry[2]]()
      .clickRunCommand("/deadzonestory argus_" + entry[1])
      .hover(Text.of("取り返しのつかない世界選択"))))
    return 1
  }))
  ;[
    ["destroy", "ARGUS-9を破壊した"],
    ["reprogram", "ARGUS-9をSurvivor Networkへ再設定した"],
    ["separate", "ARGUS-9を地域ノードへ分離した"]
  ].forEach(entry => story.then(Commands.literal("argus_" + entry[0]).executes(ctx => {
    let player = ctx.source.player
    let ready = player.server.persistentData.getBoolean("dz_story_boss_complete_reactor_saint")
      && player.server.persistentData.getBoolean("dz_story_boss_complete_argus_fragment")
      && player.server.persistentData.getBoolean("dz_story_boss_complete_choir_vessel")
      && player.persistentData.getInt("dz_story_warden_core_count") >= 3
    if (!ready) {
      player.tell(Text.of("前提未達のためARGUS-9を処理できません。").red())
      return 0
    }
    if (player.server.persistentData.getString("dz_story_argus_outcome") !== "") {
      player.tell(Text.of("ARGUS-9の処理は既に確定しています: " +
        player.server.persistentData.getString("dz_story_argus_outcome")).red())
      return 0
    }
    player.server.persistentData.putString("dz_story_argus_outcome", entry[0])
    player.server.runCommandSilent("ftbquests change_progress @a complete " + DZ_STORY_QUESTS.t3ArgusChoice)
    player.server.runCommandSilent("ftbquests change_progress @a complete " + DZ_STORY_QUESTS.t3Complete)
    player.server.runCommandSilent('tellraw @a [{"text":"[DEADZONE PROTOCOL] ","color":"gold","bold":true},' +
      '{"text":"' + entry[1] + '","color":"yellow"}]')
    player.server.players.forEach(member => dzGrantEndgameDecree(member))
    return 1
  })))
  event.register(story)
})
