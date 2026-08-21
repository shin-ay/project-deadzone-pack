// PROJECT DEADZONE Multiplayer Onboarding v0.8
// Deterministic Lobby -> JOB -> starter kit -> verified starter colony.

const DZ_READY_SKILLS = [
  "Survival", "Scavenging", "Melee", "Medical", "Firearms",
  "Fitness", "Reload", "Mechanics", "Engineering", "Armor"
]

function dzOnboardingDimension(player) {
  try { return String(player.level.dimension) } catch (ignored) {}
  return "unknown"
}

function dzOnboardingIsLobby(player) {
  return dzOnboardingDimension(player).indexOf("lobby:lobby_dimension") >= 0
}

function dzShowLobbyReceptionPrompt(player) {
  if (!player || !player.alive || player.persistentData.getBoolean("dz_job_chosen")) return
  if (!dzOnboardingIsLobby(player)) return
  player.tell(Text.of("[PROJECT DEADZONE] 正面の登録受付官アオイに話しかけ、初期JOBを登録してください。").yellow())
  player.tell(Text.of("[ JOB登録画面を開く ]").green().bold()
    .clickRunCommand("/deadzoneonboarding job")
    .hover(Text.of("アオイをクリックできない場合の安全な再表示")))
  player.runCommandSilent('title @s actionbar {"text":"登録受付官アオイに話しかけてJOBを選択","color":"gold"}')
}

function dzLobbyPrologueComplete(player) {
  return player && player.persistentData.getBoolean("dz_onboarding_prologue_complete")
}

function dzOpenInitialJobSelector(player) {
  if (!player || !player.alive || !dzOnboardingIsLobby(player)) return 0
  if (player.persistentData.getBoolean("dz_job_chosen")) return 0
  player.tell(Text.of("登録する初期JOBを選択してください。確定後に専用スターターキットを支給します。").aqua())
  let result = player.runCommandSilent("class gui")
  if (result <= 0) {
    player.tell(Text.of("[ JOB選択画面を再表示 ]").green().bold()
      .clickRunCommand("/class gui")
      .hover(Text.of("画面が自動表示されない場合はここをクリック")))
    console.error("[PDZ][Onboarding] /class gui returned " + result + " for " + player.username)
  } else {
    console.info("[PDZ][Onboarding] JOB selector opened for " + player.username)
  }
  return result
}

function dzPlayLobbyPrologueStep(player, step) {
  if (!player || !player.alive || player.persistentData.getBoolean("dz_job_chosen")) return
  let title = ""
  let subtitle = ""
  if (step === 1) {
    title = "PROJECT DEADZONE"
    subtitle = "生存者通信回線を確立しています……"
  } else if (step === 2) {
    title = "文明崩壊から数年"
    subtitle = "残された都市は感染者と勢力争いに飲まれた"
  } else if (step === 3) {
    title = "あなたは新たな生存者"
    subtitle = "役割を選び、復興拠点へ向かえ"
  } else if (step === 4) {
    title = "登録ロビー到着"
    subtitle = "正面の受付官アオイに話しかけてください"
  } else return
  player.runCommandSilent('title @s title {"text":"' + title + '","color":"gold"}')
  player.runCommandSilent('title @s subtitle {"text":"' + subtitle + '","color":"gray"}')
}

function dzOfferSettlementDeparture(player) {
  if (!player || !player.alive || !dzOnboardingIsLobby(player)) return
  if (!player.persistentData.getBoolean("dz_job_chosen")) return
  if (player.persistentData.getBoolean("dz_starter_depart_complete")) return
  player.tell(Text.of("[PROJECT DEADZONE] JOB登録が完了しました。装備と初期コロニーの確認後に出発できます。").aqua())
  player.tell(Text.of("[ 初期コロニーへ出発 ]").gold().bold()
    .clickRunCommand("/deadzonevillage depart")
    .hover(Text.of("キャンプ、住民、スターターキットを検証してから移動します")))
}

function dzIsLobbyRegistrar(target) {
  if (!target) return false
  try {
    if (target.tags && (target.tags.contains("pdz_lobby_registrar") || target.tags.contains("dz_lobby_registrar"))) return true
  } catch (ignored) {}

  // Existing lobby worlds can retain an older Easy NPC entity without the
  // current scoreboard tags.  Accept Aoi by type/name and repair the tags so
  // one stale entity cannot silently break onboarding.
  if (String(target.type) !== "easy_npc:humanoid") return false
  let identity = ""
  try { identity += String(target.name) } catch (ignored) {}
  try { identity += " " + String(target.nbt) } catch (ignored) {}
  return identity.indexOf("アオイ") >= 0 || identity.indexOf("登録受付官") >= 0
}

// Aoi is the sole entry point.  Easy NPC owns the visible conversation and its
// "JOB登録を開始する" button runs /class gui.  KubeJS only repairs identity,
// completes the prologue state and handles already-registered players.  Do not
// cancel a first-time interaction here or Easy NPC's dialog never appears.
ItemEvents.entityInteracted(event => {
  let player = event.player
  let target = event.target
  if (!player || player.level.clientSide || !target || !dzOnboardingIsLobby(player)) return
  if (!dzIsLobbyRegistrar(target)) return

  try {
    target.tags.add("dz_lobby_registrar")
    target.tags.add("pdz_lobby_registrar")
    target.tags.add("pdz_lobby_registrar_dialog_v2")
  } catch (ignored) {}

  try { target.runCommandSilent("tp @s ~ ~ ~ facing entity " + player.username + " eyes") } catch (ignored) {}
  let data = player.persistentData

  if (data.getBoolean("dz_job_chosen")) {
    event.cancel()
    if (data.getBoolean("dz_lobby_registrar_lock")) return
    data.putBoolean("dz_lobby_registrar_lock", true)
    player.server.scheduleInTicks(10, callback => {
      if (player) player.persistentData.remove("dz_lobby_registrar_lock")
    })
    if (!data.getBoolean("dz_starter_received") || data.getInt("dz_starter_grant_version") < 6) {
      player.tell(Text.of("スターターキットの受領記録が不完全です。内容を再検査して不足分を支給します。").yellow())
      player.runCommandSilent("deadzonejob starter_claim")
    }
    dzOfferSettlementDeparture(player)
    return
  }

  if (!dzLobbyPrologueComplete(player)) {
    data.putBoolean("dz_onboarding_prologue_complete", true)
    data.putInt("dz_onboarding_prologue_tick", 190)
    player.runCommandSilent("title @s clear")
    player.tell(Text.of("通信同期完了。生存者登録を開始します。").green())
  }
  console.info("[PDZ][Onboarding] Aoi dialog interaction accepted for " + player.username)
})

function dzReadyReport(player) {
  let data = player.persistentData
  let chosen = data.getBoolean("dz_job_chosen")
  let starter = data.getBoolean("dz_starter_received")
  let tier = data.getInt("deadzone_world_tier")

  player.tell(Text.of("=== PROJECT DEADZONE READY CHECK ===").gold())
  player.tell(chosen ? Text.of("JOB: " + data.getString("dz_job_name")).green() : Text.of("JOB: 未選択").red())
  player.tell(starter ? Text.of("Starter Kit: 受領・検証済み").green() : Text.of("Starter Kit: 未受領または不足").red())
  player.tell(Text.of("World Tier: T" + tier).aqua())

  let initialized = []
  let missing = []
  DZ_READY_SKILLS.forEach(skill => {
    if (data.contains("dz_skill_" + skill)) initialized.push(skill + ":" + data.getInt("dz_skill_" + skill))
    else missing.push(skill)
  })
  player.tell(Text.of("Initial Skills: " + (initialized.length ? initialized.join(", ") : "none")).gray())
  if (chosen && missing.length) player.tell(Text.of("未初期化カテゴリ: " + missing.join(", ")).yellow())
  if (!chosen) {
    player.tell(Text.of("[ JOB選択画面を表示 ]").green().clickRunCommand("/deadzoneonboarding job"))
  } else {
    player.tell(Text.of("基本プレイヤーデータはマルチテスト可能です。").green())
  }
}

PlayerEvents.loggedIn(event => {
  let player = event.player
  let data = player.persistentData
  data.remove("dz_onboarding_origin_x")
  data.remove("dz_onboarding_origin_y")
  data.remove("dz_onboarding_origin_z")
  data.remove("dz_onboarding_origin_dimension")
  data.remove("dz_onboarding_origin_valid")
  data.remove("dz_lobby_arrival_seen")
  data.putInt("dz_lobby_prompt_ticks", 0)
  if (!data.getBoolean("dz_job_chosen")) {
    data.putInt("dz_onboarding_prologue_tick", 0)
    data.putBoolean("dz_onboarding_prologue_started", false)
    data.putBoolean("dz_onboarding_prologue_complete", false)
  }
  player.server.scheduleInTicks(40, callback => {
    if (!player || !player.alive || player.persistentData.getBoolean("dz_job_chosen")) return
    if (!dzOnboardingIsLobby(player)) {
      player.server.runCommandSilent("function project_deadzone:lobby/setup")
      player.runCommandSilent("lobby")
    }
  })
})

PlayerEvents.tick(event => {
  let player = event.player
  if (!player || !player.alive || !dzOnboardingIsLobby(player)) return

  if (!player.persistentData.getBoolean("dz_lobby_arrival_seen")) {
    player.persistentData.putBoolean("dz_lobby_arrival_seen", true)
    player.server.runCommandSilent("function project_deadzone:lobby/setup")
    player.persistentData.putInt("dz_onboarding_prologue_tick", 0)
    player.persistentData.putBoolean("dz_onboarding_prologue_started", true)
  }

  if (!player.persistentData.getBoolean("dz_job_chosen") &&
      player.persistentData.getBoolean("dz_onboarding_prologue_started")) {
    let storyTick = player.persistentData.getInt("dz_onboarding_prologue_tick") + 1
    player.persistentData.putInt("dz_onboarding_prologue_tick", storyTick)
    if (storyTick === 5) dzPlayLobbyPrologueStep(player, 1)
    if (storyTick === 50) dzPlayLobbyPrologueStep(player, 2)
    if (storyTick === 100) dzPlayLobbyPrologueStep(player, 3)
    if (storyTick === 150) dzPlayLobbyPrologueStep(player, 4)
    if (storyTick === 190) {
      player.persistentData.putBoolean("dz_onboarding_prologue_complete", true)
      dzShowLobbyReceptionPrompt(player)
    }
  }

  if (player.persistentData.getBoolean("dz_job_chosen") &&
      (!player.persistentData.getBoolean("dz_starter_received") ||
        player.persistentData.getInt("dz_starter_grant_version") < 6)) {
    let recovery = player.persistentData.getInt("dz_starter_recovery_ticks") + 1
    player.persistentData.putInt("dz_starter_recovery_ticks", recovery)
    if (recovery === 20) {
      player.runCommandSilent("deadzonejob starter_claim")
      if (!player.persistentData.getBoolean("dz_starter_received")) {
        player.tell(Text.of("スターターキット支給に失敗しました。受付官へもう一度話しかけてください。").red())
      }
    }
  } else player.persistentData.putInt("dz_starter_recovery_ticks", 0)

  let probe = player.persistentData.getInt("dz_lobby_safety_probe") + 1
  if (probe < 5) {
    player.persistentData.putInt("dz_lobby_safety_probe", probe)
    return
  }
  player.persistentData.putInt("dz_lobby_safety_probe", 0)
  if (Number(player.y) < 10) {
    player.teleportTo(9.5, 11, 9.5)
    try { player.fallDistance = 0 } catch (ignored) {}
    player.runCommandSilent("effect give @s minecraft:resistance 5 255 true")
    player.runCommandSilent("effect give @s minecraft:regeneration 5 4 true")
    player.tell(Text.of("[PROJECT DEADZONE] ロビーの安全地点へ復帰しました。").yellow())
  }

  let promptTicks = player.persistentData.getInt("dz_lobby_prompt_ticks") + 5
  if (promptTicks >= 400) {
    promptTicks = 0
    if (player.persistentData.getBoolean("dz_job_chosen")) dzOfferSettlementDeparture(player)
    else dzShowLobbyReceptionPrompt(player)
  }
  player.persistentData.putInt("dz_lobby_prompt_ticks", promptTicks)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let onboarding = Commands.literal("deadzoneonboarding")
  onboarding.then(Commands.literal("job").executes(ctx => {
    let player = ctx.source.player
    if (!player || !dzOnboardingIsLobby(player)) return 0
    if (player.persistentData.getBoolean("dz_job_chosen")) {
      dzOfferSettlementDeparture(player)
      return 1
    }
    player.persistentData.putBoolean("dz_onboarding_prologue_complete", true)
    player.runCommandSilent("title @s clear")
    return dzOpenInitialJobSelector(player)
  }))
  event.register(onboarding)

  let root = Commands.literal("deadzoneready")
  root.then(Commands.literal("status").executes(ctx => {
    dzReadyReport(ctx.source.player)
    return 1
  }))
  root.then(Commands.literal("resync_skills").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    player.runCommandSilent("deadzonejob skills_grant_test")
    player.tell(Text.of("[PROJECT DEADZONE] JOB初期スキルを再同期しました。").aqua())
    return 1
  }))
  event.register(root)
})
