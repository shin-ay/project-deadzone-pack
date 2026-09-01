// PROJECT DEADZONE camp restoration loop v0.1
// Server restoration is shared; recurring supply claims are per player.

const DZ_FUEL_QUESTS = {
  briefing: "7100000000000001",
  secured: "7100000000000002",
  returned: "7100000000000003",
  route: "7100000000000004"
}

function dzFuelComplete(server, target, quest) {
  server.runCommandSilent("ftbquests change_progress " + target + " complete " + quest)
}

function dzFuelCount(player, id) {
  return player.server.runCommandSilent("clear " + player.username + " " + id + " 0")
}

function dzFuelAtCamp(player) {
  return player.server.runCommandSilent("execute as " + player.username +
    " at @s if entity @e[tag=dz_basecamp_core_anchor,distance=..24,limit=1]") > 0
}

function dzFuelTellStatus(player) {
  let server = player.server
  let secured = server.persistentData.getBoolean("dz_story_gasstation_secured")
  let restored = server.persistentData.getBoolean("dz_camp_fuel_route_restored")
  player.tell(Text.of("=== 燃料ルート ===").gold())
  player.tell(secured ? Text.of("✓ Gas Station確保済み").green()
    : Text.of("－ Gas Station未確保").gray())
  player.tell(restored ? Text.of("✓ 定期補給ルート稼働中").green()
    : Text.of("－ ルート未復旧").gray())
  if (secured && !restored) {
    player.tell(Text.of("必要: ガソリンバケツ x2 + 電子部品 x2").yellow())
    player.tell(Text.of("[ 燃料と部品を納入 ]").aqua()
      .clickRunCommand("/deadzonecamp fuel_return"))
  }
  if (restored) player.tell(Text.of("[ 本日の補給を受け取る ]").aqua()
    .clickRunCommand("/deadzonecamp fuel_supply"))
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonecamp")

  root.then(Commands.literal("fuel_status").executes(ctx => {
    let player = ctx.source.player
    if (!dzFuelAtCamp(player)) {
      player.tell(Text.of("燃料ルート管理はBase Core付近でのみ利用できます。").red())
      return 0
    }
    dzFuelComplete(player.server, player.username, DZ_FUEL_QUESTS.briefing)
    if (player.server.persistentData.getBoolean("dz_story_gasstation_secured"))
      dzFuelComplete(player.server, player.username, DZ_FUEL_QUESTS.secured)
    dzFuelTellStatus(player)
    return 1
  }))

  root.then(Commands.literal("fuel_return").executes(ctx => {
    let player = ctx.source.player, server = player.server
    if (!dzFuelAtCamp(player)) {
      player.tell(Text.of("Base Core付近へ戻ってください。").red())
      return 0
    }
    if (!server.persistentData.getBoolean("dz_story_gasstation_secured")) {
      player.tell(Text.of("先にGas Stationを確保する必要があります。").red())
      return 0
    }
    if (server.persistentData.getBoolean("dz_camp_fuel_route_restored")) {
      player.tell(Text.of("燃料ルートは復旧済みです。").yellow())
      return 0
    }
    let gasoline = dzFuelCount(player, "tfmg:gasoline_bucket")
    let electronics = dzFuelCount(player, "immersiveengineering:component_electronic")
    if (gasoline < 2 || electronics < 2) {
      player.tell(Text.of("不足: ガソリン " + gasoline + "/2, 電子部品 " + electronics + "/2").red())
      return 0
    }
    player.runCommandSilent("clear @s tfmg:gasoline_bucket 2")
    player.runCommandSilent("clear @s immersiveengineering:component_electronic 2")
    server.persistentData.putBoolean("dz_camp_fuel_route_restored", true)
    server.persistentData.putString("dz_camp_fuel_route_restored_by", player.username)
    dzFuelComplete(server, player.username, DZ_FUEL_QUESTS.returned)
    dzFuelComplete(server, player.username, DZ_FUEL_QUESTS.route)
    dzFuelComplete(server, player.username, "6D51010000000108")
    server.runCommandSilent('tellraw @a [{"text":"[CAMP RESTORED] ","color":"gold","bold":true},{"text":"Gas Station燃料ルートが稼働。定期補給を解禁しました。","color":"green"}]')
    player.runCommandSilent("playsound minecraft:ui.toast.challenge_complete player @s ~ ~ ~ 1 1")
    return 1
  }))

  root.then(Commands.literal("fuel_supply").executes(ctx => {
    let player = ctx.source.player, server = player.server
    if (!dzFuelAtCamp(player) || !server.persistentData.getBoolean("dz_camp_fuel_route_restored")) {
      player.tell(Text.of("稼働中の燃料ルートが必要です。").red())
      return 0
    }
    let day = Math.floor(Number(player.level.getDayTime()) / 24000)
    let last = player.persistentData.getInt("dz_fuel_supply_day")
    if (player.persistentData.getBoolean("dz_fuel_supply_claimed") && last >= day) {
      player.tell(Text.of("本日分の補給は受け取り済みです。").yellow())
      return 0
    }
    player.give(Item.of("mts:mtsofficialpack.solidfuel", 1))
    if (server.persistentData.getBoolean("dz_logistics_route_road")) player.give(Item.of("mts:mtsofficialpack.repairkit", 1))
    if (server.persistentData.getBoolean("dz_logistics_route_rail")) player.give(Item.of("mts:mtsofficialpack.solidfuel", 2))
    if (server.persistentData.getBoolean("dz_logistics_route_sea")) player.give(Item.of("minecraft:cooked_cod", 4))
    if (server.persistentData.getBoolean("dz_logistics_route_air")) player.give(Item.of("legendarysurvivaloverhaul:bandage", 1))
    player.give(Item.of("lightmanscurrency:coin_copper", 4))
    player.persistentData.putInt("dz_fuel_supply_day", day)
    player.persistentData.putBoolean("dz_fuel_supply_claimed", true)
    player.tell(Text.of("本日の地域航路連動補給を受け取りました。").green())
    return 1
  }))

  event.register(root)
})
