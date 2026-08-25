// PROJECT DEADZONE Base Core interaction v0.1

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

  player.tell(Text.of("=== DEADZONE BASE CORE ===").gold())
  player.tell(Text.of("状態: 稼働中").green())
  player.tell(Text.of(
    "リスポーン地点: " + spawnX + ", " + spawnY + ", " + spawnZ).green())
  player.tell(Text.of("登録スタッフ: 6か所").aqua())
  player.tell(Text.of("襲撃アンカー: 4方向").red())
  player.tell(Text.of("次段階: 交易・納品・襲撃制御を接続").gray())
  player.tell(Text.of("--- CAMP CONTROL PANEL ---").gray())
  player.tell(Text.of("[ 生存者台帳 ]").gold().clickRunCommand("/deadzone")
    .append(Text.of("  [ 依頼掲示板 ]").yellow().clickRunCommand("/deadzonecontracts"))
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
  // Gas Station is only converted into progression after the team returns.
  if (player.server.persistentData.getBoolean("dz_story_gasstation_secured")
      && player.server.persistentData.getInt("deadzone_world_tier") < 1) {
    player.server.runCommandSilent("deadzonestory set tier_1")
    player.server.runCommandSilent(
      "ftbquests change_progress @a complete 162BAA0F1AF6097C")
    player.server.tell(Text.of(
      "[PROJECT DEADZONE] 燃料ルート復旧。World Tier 1を解放しました。").gold())
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event

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
