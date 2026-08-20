// PROJECT DEADZONE Multiplayer Onboarding v0.5
// Deterministic Lobby -> JOB -> explicit departure -> verified settlement.

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
  player.runCommandSilent('title @s actionbar {"text":"登録受付官アオイに話しかけてJOBを選択","color":"gold"}')
}

function dzLobbyPrologueComplete(player) {
  return player && player.persistentData.getBoolean("dz_onboarding_prologue_complete")
}

function dzOpenInitialJobSelector(player) {
  if (!player || !player.alive || !dzOnboardingIsLobby(player)) return 0
  if (player.persistentData.getBoolean("dz_job_chosen")) return 0
  player.tell(Text.of("登録する初期JOBを選択してください。確定するとスターターキットを支給します。").aqua())
  let result = player.runCommandSilent("class gui")
  if (result <= 0) {
    player.tell(Text.of("[ JOB選択画面を開く ]").green().bold()
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
    subtitle = "通信回線を確立しています……"
  } else if (step === 2) {
    title = "文明崩壊から数年"
    subtitle = "残された都市は、感染者と勢力争いに飲まれた。"
  } else if (step === 3) {
    title = "あなたは生存者として登録される"
    subtitle = "役割を選び、復興拠点へ向かえ。"
  } else if (step === 4) {
    title = "登録ロビー到着"
    subtitle = "正面の受付官アオイに話しかけてください。"
  } else return
  player.runCommandSilent('title @s title {"text":"'+title+'","color":"gold"}')
  player.runCommandSilent('title @s subtitle {"text":"'+subtitle+'","color":"gray"}')
}

function dzOfferSettlementDeparture(player) {
  if (!player || !player.alive || !dzOnboardingIsLobby(player)) return
  if (!player.persistentData.getBoolean("dz_job_chosen")) return
  if (player.persistentData.getBoolean("dz_starter_depart_complete")) return
  player.tell(Text.of("[PROJECT DEADZONE] JOB登録が完了しました。準備ができたら初期拠点へ出発してください。").aqua())
  player.tell(Text.of("[ 初期拠点へ出発 ]").gold().bold()
    .clickRunCommand("/deadzonevillage depart")
    .hover(Text.of("建物付き初期拠点の生成を確認してから移動します")))
}

// The registrar is the single entry point for initial JOB selection.  The
// lobby must never open or close the selector from a teleport timer because
// that races dimension/chunk loading on slower clients.
ItemEvents.entityInteracted(event => {
  let player = event.player
  let target = event.target
  if (!player || player.level.clientSide || !target || !dzOnboardingIsLobby(player)) return
  if (!target.tags || !target.tags.contains("pdz_lobby_registrar")) return

  event.cancel()
  let data = player.persistentData
  if (data.getBoolean("dz_lobby_registrar_lock")) return
  data.putBoolean("dz_lobby_registrar_lock", true)
  player.server.scheduleInTicks(10, callback => {
    if (player) player.persistentData.remove("dz_lobby_registrar_lock")
  })

  if (data.getBoolean("dz_job_chosen")) {
    if (!data.getBoolean("dz_starter_received") || data.getInt("dz_starter_grant_version") < 2) {
      player.tell(Text.of("スターターキットの受領記録がありません。復旧支給を確認します。 ").yellow())
      player.runCommandSilent("deadzonejob starter_claim")
    }
    dzOfferSettlementDeparture(player)
    return
  }

  if (!dzLobbyPrologueComplete(player)) {
    player.tell(Text.of("通信同期中です。プロローグ終了後に受付を開始します。").yellow())
    player.runCommandSilent('title @s actionbar {"text":"通信同期中……プロローグ終了までお待ちください","color":"gold"}')
    return
  }

  // Class Selection Mod is the presentation/execution layer. Each class in
  // config/classmod/classes.json calls `deadzonejob choose <id>` on confirm,
  // so the PDZ server script remains the authoritative rule and kit layer.
  dzOpenInitialJobSelector(player)
})

function dzReadyReport(player) {
  let data = player.persistentData
  let chosen = data.getBoolean("dz_job_chosen")
  let starter = data.getBoolean("dz_starter_received")
  let tier = data.getInt("deadzone_world_tier")

  player.tell(Text.of("=== PROJECT DEADZONE READY CHECK ===").gold())
  if (chosen) player.tell(Text.of("JOB: " + data.getString("dz_job_name")).green())
  else player.tell(Text.of("JOB: \u672a\u9078\u629e").red())
  if (starter) player.tell(Text.of("Starter Kit: \u53d7\u9818\u6e08\u307f").green())
  else player.tell(Text.of("Starter Kit: \u672a\u53d7\u9818").red())
  player.tell(Text.of("World Tier: T" + tier).aqua())

  let initialized = []
  let missing = []
  DZ_READY_SKILLS.forEach(skill => {
    if (data.contains("dz_skill_" + skill)) initialized.push(skill + ":" + data.getInt("dz_skill_" + skill))
    else missing.push(skill)
  })
  player.tell(Text.of("Initial Skills: " + (initialized.length ? initialized.join(", ") : "none")).gray())
  if (chosen && missing.length) player.tell(Text.of("\u672a\u521d\u671f\u5316\u30ab\u30c6\u30b4\u30ea: " + missing.join(", ")).yellow())

  if (!chosen) {
    player.tell(Text.of("[ JOB\u9078\u629e\u753b\u9762\u3092\u8868\u793a ]").green()
      .clickRunCommand("/class gui")
      .hover(Text.of("\u30af\u30ea\u30c3\u30af\u3057\u3066JOB\u9078\u629e\u3092\u958b\u304f")))
  } else {
    player.tell(Text.of("\u57fa\u672c\u30d7\u30ec\u30a4\u30e4\u30fc\u30c7\u30fc\u30bf\u306f\u30de\u30eb\u30c1\u30c6\u30b9\u30c8\u53ef\u80fd\u3067\u3059\u3002").green())
  }
}

PlayerEvents.loggedIn(event => {
  let player = event.player
  player.persistentData.remove("dz_lobby_arrival_seen")
  player.persistentData.putInt("dz_lobby_prompt_ticks", 0)
  if (!player.persistentData.getBoolean("dz_job_chosen")) {
    player.persistentData.putInt("dz_onboarding_prologue_tick", 0)
    player.persistentData.putBoolean("dz_onboarding_prologue_started", false)
    player.persistentData.putBoolean("dz_onboarding_prologue_complete", false)
  }
  player.server.scheduleInTicks(40, callback => {
    if (!player || !player.alive || player.persistentData.getBoolean("dz_job_chosen")) return
    if (!dzOnboardingIsLobby(player)) {
      // Build the intake platform before crossing dimensions. This prevents the
      // delayed Lobby validator from placing a new player over an unloaded void.
      player.server.runCommandSilent("function project_deadzone:lobby/setup")
      player.runCommandSilent("lobby")
    }
  })
})

// Emergency recovery for an unloaded or partially generated lobby.
PlayerEvents.tick(event => {
  let player = event.player
  if (!player || !player.alive) return

  if (!dzOnboardingIsLobby(player)) return

  // Detect the actual first Lobby tick and rebuild the intake while the server
  // is fully available. JOB selection is deliberately opened by the registrar
  // NPC, never by a teleport timer.
  if (!player.persistentData.getBoolean("dz_lobby_arrival_seen")) {
    player.persistentData.putBoolean("dz_lobby_arrival_seen", true)
    player.server.runCommandSilent("function project_deadzone:lobby/setup")
    player.persistentData.putInt("dz_onboarding_prologue_tick", 0)
    player.persistentData.putBoolean("dz_onboarding_prologue_started", true)
  }

  // Start story time only after the lobby and player are both loaded. Slow
  // clients therefore see the complete prologue instead of losing it during
  // the dimension loading screen.
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

  // Class Selection Mod closes its GUI before the command reaches the server.
  // Verify the atomic JOB+kit transaction immediately after that transition.
  if (player.persistentData.getBoolean("dz_job_chosen") &&
      (!player.persistentData.getBoolean("dz_starter_received") ||
       player.persistentData.getInt("dz_starter_grant_version") < 2)) {
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
    player.tell(Text.of("[PROJECT DEADZONE] \u30ed\u30d3\u30fc\u306e\u5b89\u5168\u5730\u70b9\u3078\u5fa9\u5e30\u3057\u307e\u3057\u305f\u3002").yellow())
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
  let root = Commands.literal("deadzoneready")
  root.then(Commands.literal("status").executes(ctx => {
    dzReadyReport(ctx.source.player)
    return 1
  }))
  root.then(Commands.literal("resync_skills").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    player.runCommandSilent("deadzonejob skills_grant_test")
    player.tell(Text.of("[PROJECT DEADZONE] JOB\u521d\u671f\u30b9\u30ad\u30eb\u3092\u518d\u540c\u671f\u3057\u307e\u3057\u305f\u3002").aqua())
    return 1
  }))
  event.register(root)
})
