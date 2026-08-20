// PROJECT DEADZONE village road-skeleton preview and lobby departure controller v0.5
// IMPORTANT: the Jigsaw pools below contain roads/lots only.  They are admin
// previews and are never accepted as a finished initial settlement.

const DZ_STARTER_VILLAGE_POOL = "project_deadzone:starter_village/start"
const DZ_NORMAL_VILLAGE_POOL = "project_deadzone:pdz_village/start"
const DZ_VILLAGE_TARGET = "project_deadzone:start"
const DZ_VILLAGE_CAMP_STATE_KEY = "dz_auto_basecamp_state"
const DZ_VILLAGE_CAMP_ARRIVAL_X = 13
const DZ_VILLAGE_CAMP_ARRIVAL_Y = 2
const DZ_VILLAGE_CAMP_ARRIVAL_Z = 20

function dzVillageDimension(player) {
  try {
    return String(player.level.dimension)
  } catch (ignored) {
    return ""
  }
}

function dzVillagePreviewAtPlayer(player, pool, depth, label, keyPrefix) {
  let x = Math.floor(player.x)
  let y = Math.floor(player.y) - 1
  let z = Math.floor(player.z)
  let command = "execute in minecraft:overworld positioned " + x + " " + y + " " + z +
    " run place jigsaw " + pool + " " + DZ_VILLAGE_TARGET + " " + depth + " ~ ~ ~"
  let result = player.runCommandSilent(command)
  if (result > 0) {
    player.server.persistentData.putInt(keyPrefix + "_x", x)
    player.server.persistentData.putInt(keyPrefix + "_y", y)
    player.server.persistentData.putInt(keyPrefix + "_z", z)
    player.tell(Text.of("[PDZ] " + label + " 道路骨格テストを配置しました。").yellow())
    player.tell(Text.of("警告: 建物を含まない開発用プレビューです。初期村としては使用されません。").red())
    return 1
  }
  player.tell(Text.of("[PDZ] Jigsaw配置に失敗しました。再起動後、開けた地上で再実行してください。").red())
  return 0
}

function dzVillageTeleportToExistingCamp(player, data) {
  let originX = data.getInt("dz_auto_basecamp_origin_x")
  let originY = data.getInt("dz_auto_basecamp_origin_y")
  let originZ = data.getInt("dz_auto_basecamp_origin_z")
  if (originY < 0) return 0

  let x = originX + DZ_VILLAGE_CAMP_ARRIVAL_X + 0.5
  let y = originY + DZ_VILLAGE_CAMP_ARRIVAL_Y
  let z = originZ + DZ_VILLAGE_CAMP_ARRIVAL_Z + 0.5
  player.runCommandSilent("effect give @s minecraft:resistance 8 10 true")
  player.runCommandSilent("effect give @s minecraft:slow_falling 8 0 true")
  let result = player.runCommandSilent(
    "execute in minecraft:overworld run tp @s " + x + " " + y + " " + z
  )
  if (result > 0) {
    player.persistentData.putBoolean("dz_starter_depart_complete", true)
    player.persistentData.remove("dz_starter_depart_requested")
    player.tell(Text.of("[PDZ] 初期拠点へ到着しました。ここから生存任務を開始します。").green())
    return 1
  }
  return 0
}

function dzVillageDepart(player) {
  if (!player.persistentData.getBoolean("dz_job_chosen")) {
    player.tell(Text.of("[PDZ] 先にJOBを選択してください。").red())
    player.runCommandSilent("deadzonejob menu")
    return 0
  }
  if (dzVillageDimension(player).indexOf("lobby:lobby_dimension") < 0) {
    player.tell(Text.of("[PDZ] この操作はロビーでのみ実行できます。").yellow())
    return 0
  }

  let data = player.server.persistentData
  let campState = data.getInt(DZ_VILLAGE_CAMP_STATE_KEY)
  player.persistentData.putBoolean("dz_starter_depart_requested", true)
  player.runCommandSilent("effect give @s minecraft:blindness 180 0 true")
  player.runCommandSilent("effect give @s minecraft:resistance 180 255 true")

  if (campState === 2) {
    player.tell(Text.of("[PDZ] 初期拠点へ移動します。").aqua())
    if (dzVillageTeleportToExistingCamp(player, data) > 0) return 1
    player.persistentData.remove("dz_starter_depart_requested")
    player.runCommandSilent("effect clear @s minecraft:blindness")
    player.runCommandSilent("effect clear @s minecraft:resistance")
    player.tell(Text.of("[PDZ] 保存済み拠点への移動に失敗しました。管理者へ連絡してください。").red())
    return 0
  }

  if (campState === 1) {
    player.runCommandSilent("effect clear @s minecraft:blindness")
    player.runCommandSilent("effect clear @s minecraft:resistance")
    player.tell(Text.of("[PDZ] 初期拠点を生成中です。完了後にもう一度実行してください。").yellow())
    return 0
  }

  if (campState === 3) {
    player.persistentData.remove("dz_starter_depart_requested")
    player.runCommandSilent("effect clear @s minecraft:blindness")
    player.runCommandSilent("effect clear @s minecraft:resistance")
    player.tell(Text.of("[PDZ] 進行済みワールドへ初期拠点を自動配置できません。管理者へ連絡してください。").red())
    return 0
  }

  player.tell(Text.of("[PDZ] 安全な初期拠点を探索・生成します。完了まで移動しないでください。").aqua())
  let result = player.runCommandSilent("spawn")
  if (result <= 0) {
    player.persistentData.remove("dz_starter_depart_requested")
    player.runCommandSilent("effect clear @s minecraft:blindness")
    player.runCommandSilent("effect clear @s minecraft:resistance")
    player.tell(Text.of("[PDZ] 移動を開始できませんでした。/spawnを実行してください。").red())
    return 0
  }
  return 1
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonevillage")

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let data = player.server.persistentData
    player.tell(Text.of("[PDZ] Village road-skeleton previews v0.4 (ADMIN TEST ONLY)").yellow())
    player.tell(Text.of("建物なし・自動生成なし。完成した初期拠点には使用しません。").red())
    player.tell(Text.of("道路骨格A: /deadzonevillage preview_starter_here").gray())
    player.tell(Text.of("道路骨格B: /deadzonevillage preview_pdz_here").gray())
    player.tell(Text.of("拠点状態: " + data.getInt(DZ_VILLAGE_CAMP_STATE_KEY) + " (0=未生成 / 1=生成中 / 2=完成)").gray())
    if (data.contains("dz_starter_village_preview_x")) {
      player.tell(Text.of("初期村の直近配置: " + data.getInt("dz_starter_village_preview_x") + " " +
        data.getInt("dz_starter_village_preview_y") + " " + data.getInt("dz_starter_village_preview_z")).gray())
    }
    if (data.contains("dz_pdz_village_preview_x")) {
      player.tell(Text.of("通常村の直近配置: " + data.getInt("dz_pdz_village_preview_x") + " " +
        data.getInt("dz_pdz_village_preview_y") + " " + data.getInt("dz_pdz_village_preview_z")).gray())
    }
    return 1
  }))

  root.then(Commands.literal("preview_here")
    .requires(source => source.hasPermission(2))
    .executes(ctx => dzVillagePreviewAtPlayer(ctx.source.player, DZ_STARTER_VILLAGE_POOL, 5, "初期村", "dz_starter_village_preview")))

  root.then(Commands.literal("preview_starter_here")
    .requires(source => source.hasPermission(2))
    .executes(ctx => dzVillagePreviewAtPlayer(ctx.source.player, DZ_STARTER_VILLAGE_POOL, 5, "初期村", "dz_starter_village_preview")))

  root.then(Commands.literal("preview_pdz_here")
    .requires(source => source.hasPermission(2))
    .executes(ctx => dzVillagePreviewAtPlayer(ctx.source.player, DZ_NORMAL_VILLAGE_POOL, 4, "通常PDZ村", "dz_pdz_village_preview")))

  root.then(Commands.literal("depart")
    .executes(ctx => dzVillageDepart(ctx.source.player)))

  event.register(root)
})
