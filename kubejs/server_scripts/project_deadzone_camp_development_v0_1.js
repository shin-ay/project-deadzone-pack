// PROJECT DEADZONE shared Survivor Camp development v0.1
// Functional upgrades only. Physical camp remodeling remains player-built.

const DZ_CAMP_DEV_QUESTS = {
  intro: "6D46010000000101",
  level1: "6D46010000000102",
  level2: "6D46010000000103",
  level3: "6D46010000000104"
}

const DZ_CAMP_DEV_LEVELS = {
  1: {
    name: "安定拠点",
    storyUnlock: 0,
    lifeRep: 10,
    fuel: true,
    items: [["minecraft:oak_log", 32], ["minecraft:iron_ingot", 16], ["minecraft:bread", 16]]
  },
  2: {
    name: "サービス拠点",
    storyUnlock: 1,
    lifeRep: 25,
    fuel: true,
    items: [["minecraft:chest", 12], ["minecraft:copper_ingot", 24], ["immersiveengineering:component_electronic", 4]]
  },
  3: {
    name: "地域ハブ",
    storyUnlock: 2,
    lifeRep: 50,
    fuel: true,
    items: [["immersiveengineering:ingot_steel", 24], ["minecraft:diamond", 4], ["tfmg:gasoline_bucket", 2]]
  }
}

function dzCampDevLevel(server) {
  return Math.max(0, Math.min(3, server.persistentData.getInt("dz_camp_development_level")))
}

function dzCampDevLifeRep(server) {
  return Math.max(0, server.persistentData.getInt("dz_life_supply_reputation"))
}

function dzCampDevAtCore(player) {
  return player.server.runCommandSilent("execute as " + player.username +
    " at @s if entity @e[tag=dz_basecamp_core_anchor,distance=..24,limit=1]") > 0
}

function dzCampDevItemCount(player, id) {
  return player.server.runCommandSilent("clear " + player.username + " " + id + " 0")
}

function dzCampDevSyncQuests(player) {
  let level = dzCampDevLevel(player.server)
  if (level >= 1) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_CAMP_DEV_QUESTS.level1)
  if (level >= 2) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_CAMP_DEV_QUESTS.level2)
  if (level >= 3) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_CAMP_DEV_QUESTS.level3)
}

function dzCampDevRequirementStatus(player, target) {
  let spec = DZ_CAMP_DEV_LEVELS[target]
  let server = player.server
  let storyUnlock = Math.max(0, server.persistentData.getInt("deadzone_world_tier"))
  let lifeRep = dzCampDevLifeRep(server)
  let fuel = server.persistentData.getBoolean("dz_camp_fuel_route_restored")
  player.tell(Text.of("次段階 Lv" + target + "「" + spec.name + "」").yellow())
  player.tell((storyUnlock >= spec.storyUnlock ? Text.of("✓ ").green() : Text.of("× ").red())
    .append(Text.of("ストーリー解禁 S" + storyUnlock + "/S" + spec.storyUnlock).gray()))
  player.tell((lifeRep >= spec.lifeRep ? Text.of("✓ ").green() : Text.of("× ").red())
    .append(Text.of("生活評判 " + lifeRep + "/" + spec.lifeRep).gray()))
  player.tell((!spec.fuel || fuel ? Text.of("✓ ").green() : Text.of("× ").red())
    .append(Text.of("燃料ルート " + (fuel ? "復旧済み" : "未復旧")).gray()))
  spec.items.forEach(entry => {
    let have = dzCampDevItemCount(player, entry[0])
    player.tell((have >= entry[1] ? Text.of("✓ ").green() : Text.of("× ").red())
      .append(Text.of(entry[0] + " " + have + "/" + entry[1]).gray()))
  })
}

function dzCampDevStatus(player) {
  if (!dzCampDevAtCore(player)) {
    player.tell(Text.of("キャンプ発展管理はBase Core付近でのみ利用できます。" ).red())
    return 0
  }
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_CAMP_DEV_QUESTS.intro)
  dzCampDevSyncQuests(player)
  let level = dzCampDevLevel(player.server)
  player.tell(Text.of("=== SURVIVOR CAMP 発展管理 ===").gold())
  player.tell(Text.of("現在 Lv" + level + "「" + (level === 0 ? "仮設キャンプ" : DZ_CAMP_DEV_LEVELS[level].name) + "」").aqua())
  if (level < 3) {
    dzCampDevRequirementStatus(player, level + 1)
    player.tell(Text.of("[ 次段階へ共同資材を納品 ]").green().clickRunCommand("/deadzonecampdev upgrade"))
  } else player.tell(Text.of("キャンプは最大段階まで発展しています。" ).green())
  return 1
}

function dzCampDevUpgrade(player) {
  if (!dzCampDevAtCore(player)) {
    player.tell(Text.of("Base Core付近へ戻ってください。" ).red())
    return 0
  }
  let server = player.server
  let current = dzCampDevLevel(server)
  if (current >= 3) {
    player.tell(Text.of("キャンプは最大段階です。" ).yellow())
    return 0
  }
  let target = current + 1
  let spec = DZ_CAMP_DEV_LEVELS[target]
  if (server.persistentData.getInt("deadzone_world_tier") < spec.storyUnlock ||
      dzCampDevLifeRep(server) < spec.lifeRep ||
      (spec.fuel && !server.persistentData.getBoolean("dz_camp_fuel_route_restored"))) {
    player.tell(Text.of("発展条件を満たしていません。" ).red())
    dzCampDevRequirementStatus(player, target)
    return 0
  }
  for (let i = 0; i < spec.items.length; i++) {
    let entry = spec.items[i]
    if (dzCampDevItemCount(player, entry[0]) < entry[1]) {
      player.tell(Text.of("共同資材が不足しています: " + entry[0]).red())
      return 0
    }
  }
  spec.items.forEach(entry => player.runCommandSilent("clear @s " + entry[0] + " " + entry[1]))
  server.persistentData.putInt("dz_camp_development_level", target)
  server.persistentData.putString("dz_camp_development_last_by", player.username)
  server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
  if (typeof dzCommunityEconomyRefresh === "function") dzCommunityEconomyRefresh(server, player, false)
  server.runCommandSilent("ftbquests change_progress @a complete " + DZ_CAMP_DEV_QUESTS["level" + target])
  server.runCommandSilent('tellraw @a [{"text":"[CAMP DEVELOPMENT] ","color":"gold","bold":true},{"text":"Survivor CampがLv' + target + '「' + spec.name + '」へ発展しました。NPCサービスが更新されます。","color":"green"}]')
  player.runCommandSilent("playsound minecraft:ui.toast.challenge_complete player @s ~ ~ ~ 1 1")
  return 1
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonecampdev")
  root.executes(ctx => dzCampDevStatus(ctx.source.player))
  root.then(Commands.literal("status").executes(ctx => dzCampDevStatus(ctx.source.player)))
  root.then(Commands.literal("upgrade").executes(ctx => dzCampDevUpgrade(ctx.source.player)))
  ;[0, 1, 2, 3].forEach(level => root.then(Commands.literal("set_" + level)
    .requires(source => source.hasPermission(2)).executes(ctx => {
      ctx.source.server.persistentData.putInt("dz_camp_development_level", level)
      ctx.source.server.persistentData.putLong("dz_camp_shops_next_rotation", 0)
      ctx.source.player.tell(Text.of("キャンプ発展Lvを" + level + "へ設定しました。" ).aqua())
      dzCampDevSyncQuests(ctx.source.player)
      if (typeof dzCommunityEconomyRefresh === "function") dzCommunityEconomyRefresh(ctx.source.server, ctx.source.player, false)
      return 1
    })))
  event.register(root)
})

PlayerEvents.loggedIn(event => event.player.server.scheduleInTicks(100, callback => dzCampDevSyncQuests(event.player)))

console.info("[PROJECT DEADZONE][Camp Development] v0.1 loaded.")
