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
  event.server.runCommandSilent(
    "spawnpoint @a " + spawnX + " " + spawnY + " " + spawnZ)

  player.tell(Text.of("=== DEADZONE BASE CORE ===").gold())
  player.tell(Text.of("状態: 稼働中").green())
  player.tell(Text.of(
    "リスポーン地点: " + spawnX + ", " + spawnY + ", " + spawnZ).green())
  player.tell(Text.of("登録スタッフ: 6か所").aqua())
  player.tell(Text.of("襲撃アンカー: 4方向").red())
  player.tell(Text.of("次段階: 交易・納品・襲撃制御を接続").gray())
  player.tell(Text.of("[ 依頼掲示板を開く ]").yellow()
    .clickRunCommand("/deadzonecontracts")
    .hover(Text.of("キャンプの反復依頼を確認する")))
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
