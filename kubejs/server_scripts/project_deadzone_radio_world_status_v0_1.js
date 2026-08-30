// PROJECT DEADZONE - FTB Quests world-status terminal and GUI-only staff routes.
// This is a bridge between existing EasyNPC, FTB Quests, story and LSO systems.

const DZ_RADIO_QUESTS = {
  root: "6D8F010000000101",
  tier1: "6D8F010000000102",
  tier2: "6D8F010000000103",
  tier3: "6D8F010000000104",
  tier4: "6D8F010000000105",
  raid: "6D8F010000000106",
  consequence: "6D8F010000000107",
  argus: "6D8F010000000108",
  loop0: "6D8F010000000109",
  loop1: "6D8F010000000110",
  loop2: "6D8F010000000111"
}

function dzRadioStoryUnlock(server) {
  try { if (global.pdzStoryUnlockTier) return global.pdzStoryUnlockTier(server) } catch (ignored) {}
  return Math.max(0, server.persistentData.getInt("deadzone_world_tier"))
}

function dzRadioWorldTier(player) {
  try { if (global.pdzWorldTierAt) return global.pdzWorldTierAt(player.server, player.x, player.z) } catch (ignored) {}
  return Math.max(0, player.persistentData.getInt("dz_world_tier"))
}

function dzRadioComplete(player, id) {
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + id)
}

function dzRadioHasVerdict(player) {
  return ["cdf", "raider", "remnant", "aegis"].some(key =>
    player.persistentData.getString("dz_branch_choice_" + key) !== "")
}

function dzRadioSync(player) {
  let server = player.server
  let tier = dzRadioStoryUnlock(server)
  dzRadioComplete(player, DZ_RADIO_QUESTS.root)
  if (tier >= 1) dzRadioComplete(player, DZ_RADIO_QUESTS.tier1)
  if (tier >= 2) dzRadioComplete(player, DZ_RADIO_QUESTS.tier2)
  if (tier >= 3) dzRadioComplete(player, DZ_RADIO_QUESTS.tier3)
  if (tier >= 4) dzRadioComplete(player, DZ_RADIO_QUESTS.tier4)
  if (server.persistentData.getInt("dz_basecamp_first_raid_state") === 5)
    dzRadioComplete(player, DZ_RADIO_QUESTS.raid)
  if (dzRadioHasVerdict(player)) dzRadioComplete(player, DZ_RADIO_QUESTS.consequence)
  if (server.persistentData.getString("dz_story_argus_outcome") !== "")
    dzRadioComplete(player, DZ_RADIO_QUESTS.argus)

  // End-to-end T0-T2 loops complete only after returning to the radio desk.
  // These cards summarize existing systems; no new rank or currency is added.
  if (player.persistentData.getBoolean("dz_job_chosen") &&
      player.persistentData.getBoolean("dz_story_preparation_latched") &&
      server.persistentData.getBoolean("dz_story_gasstation_secured"))
    dzRadioComplete(player, DZ_RADIO_QUESTS.loop0)
  if (tier >= 1 && server.persistentData.getInt("dz_basecamp_first_raid_state") === 5 &&
      server.persistentData.getInt("dz_camp_development_level") >= 1)
    dzRadioComplete(player, DZ_RADIO_QUESTS.loop1)
  if (tier >= 2 && player.persistentData.getBoolean("dz_story_t2_route_complete") &&
      dzRadioHasVerdict(player))
    dzRadioComplete(player, DZ_RADIO_QUESTS.loop2)
}

function dzOpenQuestGui(player, questId) {
  let opened = player.runCommandSilent("ftbquests open_book " + questId)
  if (opened < 1) player.runCommandSilent("ftbquests open_book")
}

function dzRadioSummary(player) {
  let server = player.server
  let tier = dzRadioStoryUnlock(server)
  let world = dzRadioWorldTier(player)
  let threat = 0
  let relief = 0
  try { if (global.pdzThreatTier) threat = global.pdzThreatTier(server) } catch (ignored) {}
  try { if (global.pdzThreatRelief) relief = global.pdzThreatRelief(server) } catch (ignored) {}
  let raid = server.persistentData.getInt("dz_basecamp_first_raid_state")
  let message = "[レイ定時通信] World T" + world + " / Story S" + tier + " / Threat T" + threat
  if (relief > 0) message += " / 回復猶予 -" + relief
  if (raid > 0 && raid < 5) message += " / キャンプ警戒中"
  else if (server.persistentData.getString("dz_story_argus_outcome") !== "") message += " / T4外縁作戦を確認"
  else if (tier >= 3) message += " / ARGUS-9関連作戦を継続"
  else if (tier >= 2) message += " / 地域勢力が活動中"
  else if (tier >= 1) message += " / 燃料ルート稼働"
  else message += " / Gas Station偵察を優先"
  return message + "　詳細は無線卓GUI"
}

// Story changes refresh existing camp shops and the FTB status terminal. The
// concrete inventory/NPC/raid changes stay owned by their existing modules.
let DZ_RADIO_WORLD_TICKS = 0
ServerEvents.tick(event => {
  DZ_RADIO_WORLD_TICKS++
  if (DZ_RADIO_WORLD_TICKS % 200 !== 0 || event.server.players.length <= 0) return
  let server = event.server, story = dzRadioStoryUnlock(server), data = server.persistentData
  let initialized = data.getBoolean("dz_world_effect_story_initialized_v1")
  let previous = data.getInt("dz_world_effect_story_v1")
  if (initialized && previous === story) return
  data.putBoolean("dz_world_effect_story_initialized_v1", true)
  data.putInt("dz_world_effect_story_v1", story)
  data.putLong("dz_camp_shops_next_rotation", 0)
  server.players.forEach(player => dzRadioSync(player))
  if (initialized) server.tell(Text.of(
    "[レイ定時通信] ストーリーS" + story + "の状況を無線卓・Camp在庫へ同期しました。"
  ).aqua())
})

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 12000 !== 400) return
  let nearRadio = player.server.runCommandSilent("execute as " + player.username +
    " at @s if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_radio,distance=..48,limit=1]") > 0
  if (!nearRadio) return
  dzRadioSync(player)
  let safe = dzRadioSummary(player).replace(/\\/g, "\\\\").replace(/\"/g, '\\"')
  player.runCommandSilent('title @s actionbar {"text":"' + safe + '","color":"aqua"}')
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event

  event.register(Commands.literal("deadzoneradio").executes(ctx => {
    let player = ctx.source.player
    dzRadioSync(player)
    if (player.persistentData.getBoolean("dz_job_chosen"))
      player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete 23E782D769F4E809")
    dzOpenQuestGui(player, DZ_RADIO_QUESTS.root)
    return 1
  }))

  event.register(Commands.literal("deadzonepeopleui").executes(ctx => {
    let player = ctx.source.player
    if (typeof dzPeopleSyncQuests === "function") dzPeopleSyncQuests(player, true)
    dzOpenQuestGui(player, "6D4E010000000101")
    return 1
  }))

  event.register(Commands.literal("deadzonehealthui").executes(ctx => {
    dzOpenQuestGui(ctx.source.player, "6D4F010000000101")
    return 1
  }))

  event.register(Commands.literal("deadzonedefenseui").executes(ctx => {
    dzOpenQuestGui(ctx.source.player, "6D50010000000101")
    return 1
  }))

  event.register(Commands.literal("deadzonecareerui").executes(ctx => {
    dzOpenQuestGui(ctx.source.player, "387BAACC78EDD7B2")
    return 1
  }))

  event.register(Commands.literal("deadzonebuddyui").executes(ctx => {
    dzOpenQuestGui(ctx.source.player, "1920AEAAF4D75E94")
    return 1
  }))

  event.register(Commands.literal("deadzonestoryui").executes(ctx => {
    let player = ctx.source.player
    if (player.persistentData.getBoolean("dz_job_chosen"))
      player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete 23E782D769F4E809")
    dzOpenQuestGui(player, "23E782D769F4E809")
    return 1
  }))
})

console.info("[PROJECT DEADZONE][Radio GUI] FTB world-status and staff GUI routes loaded.")
