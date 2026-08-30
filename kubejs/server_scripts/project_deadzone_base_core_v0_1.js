// PROJECT DEADZONE Base Core interaction v0.1

const DZ_BASE_CORE_HUB_QUEST = "6D56010000000101"

// Existing worlds receive the public camp entrance without asking players to
// reach the inconvenient Core or type a repair command.
ServerEvents.loaded(event => {
  let server = event.server
  server.scheduleInTicks(100, callback => {
    server.runCommandSilent(
      "function project_deadzone:basecamp/repair_staff_service_ui")
    server.runCommandSilent(
      "execute as @e[tag=dz_basecamp_core_anchor,limit=1] at @s"
      + " if block ~-12 ~-10 ~11 minecraft:air"
      + " run setblock ~-12 ~-10 ~11 bountiful:bountyboard")
  })
})

function dzOpenLegacyBaseCorePanel(player) {
  player.tell(Text.of("=== CAMP 詳細管理（暫定） ===").gold())
  player.tell(Text.of("[ 生存者台帳 ]").gold().clickRunCommand("/deadzone")
    .append(Text.of("  [ 旧依頼一覧 ]").yellow().clickRunCommand("/deadzonecontracts"))
    .append(Text.of("  [ 地域経済 ]").green().clickRunCommand("/deadzonecommunity status")))
  player.tell(Text.of("[ 料理・献立 ]").aqua().clickRunCommand("/deadzonemenu")
    .append(Text.of("  [ 食材検品 ]").green().clickRunCommand("/deadzonequality status"))
    .append(Text.of("  [ 医療・治療 ]").red().clickRunCommand("/deadzonehealth status")))
  player.tell(Text.of("[ 地域防衛 ]").red().clickRunCommand("/deadzonedefense status")
    .append(Text.of("  [ 地域物流 ]").aqua().clickRunCommand("/deadzonelogistics status"))
    .append(Text.of("  [ キャンプ発展 ]").gold().clickRunCommand("/deadzonecampdev status")))
  player.tell(Text.of("[ MineColonies監査 ]").green().clickRunCommand("/deadzonecolonyops audit")
    .append(Text.of("  [ 勢力判断 ]").yellow().clickRunCommand("/deadzonestorybranch status")))
  player.tell(Text.of("[ T2支援先の判断 ]").aqua().clickRunCommand("/deadzonestory support")
    .append(Text.of("  [ ARGUS-9最終判断 ]").lightPurple().clickRunCommand("/deadzonestory argus")))
  player.tell(Text.of("[ 燃料ルート管理 ]").gold()
    .clickRunCommand("/deadzonecamp fuel_status")
    .hover(Text.of("Gas Stationからの燃料回収・定期補給を確認する")))
  player.tell(Text.of("通常クリックでCamp Controlの案内画面へ戻る").gray())
}

BlockEvents.rightClicked("kubejs:deadzone_base_core", event => {
  if (event.level.clientSide) return

  let player = event.player
  let core = event.block
  // The arrival marker is fixed relative to the Base Core in the 32x20x32
  // Survivor Camp template: core [24,11,16], arrival [13,2,20].
  let spawnX = core.x - 11
  let spawnY = core.y - 9
  let spawnZ = core.z + 4
  event.server.runCommandSilent("gamerule spawnRadius 0")
  event.server.runCommandSilent(
    "setworldspawn " + spawnX + " " + spawnY + " " + spawnZ)
  // The Core is now the everyday commandless control panel. Register only the
  // interacting player; otherwise one player's menu check would overwrite the
  // respawn point of everyone online.
  event.server.runCommandSilent(
    "spawnpoint " + player.username + " " + spawnX + " " + spawnY + " " + spawnZ)

  // The camp board is at template [12,1,27]. The Core is [24,11,16].
  // Only fill air so an existing board and its generated bounties are preserved.
  let boardX = core.x - 12
  let boardY = core.y - 10
  let boardZ = core.z + 11
  event.server.runCommandSilent(
    "execute if block " + boardX + " " + boardY + " " + boardZ
    + " minecraft:air run setblock " + boardX + " " + boardY + " " + boardZ
    + " bountiful:bountyboard")

  // Common players get a real screen. The old chat panel remains as a
  // temporary advanced/recovery route behind sneak-right-click.
  if (player.isCrouching()) {
    dzOpenLegacyBaseCorePanel(player)
  } else {
    event.server.runCommandSilent(
      "ftbquests change_progress " + player.username + " complete " + DZ_BASE_CORE_HUB_QUEST)
    let opened = player.runCommandSilent("ftbquests open_book " + DZ_BASE_CORE_HUB_QUEST)
    // A player who has not finished Survivor Registration cannot see the
    // dependent hub yet. Open the book root instead so the unlock condition is visible.
    if (opened < 1) player.runCommandSilent("ftbquests open_book")
  }
  // Gas Station is only converted into progression after the team returns.
  if (player.server.persistentData.getBoolean("dz_story_gasstation_secured")
      && player.server.persistentData.getInt("deadzone_world_tier") < 1) {
    player.server.runCommandSilent("deadzonestory set tier_1")
    player.server.runCommandSilent(
      "ftbquests change_progress @a complete 162BAA0F1AF6097C")
    player.server.tell(Text.of(
      "[PROJECT DEADZONE] 燃料ルート復旧。ストーリー解禁S1へ進みました。").gold())
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event

  // EasyNPC calls this player-safe wrapper instead of invoking an FTB Quests
  // client screen command directly. Existing and newly spawned Maya NPCs use it.
  let campUi = Commands.literal("deadzonecampui")
    .requires(source => source.hasPermission(0))
    .executes(ctx => {
      let player = ctx.source.player
      ctx.source.server.runCommandSilent(
        "ftbquests change_progress " + player.username + " complete " + DZ_BASE_CORE_HUB_QUEST)
      let opened = player.runCommandSilent("ftbquests open_book " + DZ_BASE_CORE_HUB_QUEST)
      if (opened < 1) player.runCommandSilent("ftbquests open_book")
      return 1
    })
  event.register(campUi)

  let root = Commands.literal("deadzonebasecamp")
    .requires(source => source.hasPermission(2))

  root.then(Commands.literal("setspawn").executes(ctx => {
    let player = ctx.source.player
    let x = Math.floor(player.x)
    let y = Math.floor(player.y)
    let z = Math.floor(player.z)
    let server = ctx.source.server

    server.runCommandSilent("gamerule spawnRadius 0")
    server.runCommandSilent("setworldspawn " + x + " " + y + " " + z)
    server.runCommandSilent("spawnpoint @a " + x + " " + y + " " + z)
    server.runCommandSilent(
      'tellraw @a {"text":"[PROJECT DEADZONE] Base Camp spawn: '
      + x + " " + y + " " + z + '","color":"green","bold":true}')
    return 1
  }))

  root.then(Commands.literal("activate").executes(ctx => {
    // Stand on the white arrival marker before running this command.
    ctx.source.player.runCommandSilent(
      "execute positioned ~-13 ~-2 ~-20 run function project_deadzone:basecamp/activate")
    return 1
  }))

  root.then(Commands.literal("refresh").executes(ctx => {
    // Stand directly on top of the Base Core. Player feet are one block above
    // the core, so Y uses -12 while the template core offset is [24,11,16].
    ctx.source.player.runCommandSilent(
      "execute positioned ~-24 ~-12 ~-16 run function project_deadzone:basecamp/activate")
    return 1
  }))

  event.register(root)
})
