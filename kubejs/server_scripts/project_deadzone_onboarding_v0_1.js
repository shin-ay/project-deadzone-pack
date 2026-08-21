// PROJECT DEADZONE Multiplayer Onboarding v0.9
// Deterministic Lobby -> Aoi -> JOB -> starter kit -> verified starter city.

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
  player.tell(Text.of("[PROJECT DEADZONE] \u6b63\u9762\u306e\u767b\u9332\u53d7\u4ed8\u5b98\u30a2\u30aa\u30a4\u306b\u8a71\u3057\u304b\u3051\u3001\u521d\u671fJOB\u3092\u767b\u9332\u3057\u3066\u304f\u3060\u3055\u3044\u3002").yellow())
  player.tell(Text.of("[ JOB\u767b\u9332\u753b\u9762\u3092\u958b\u304f ]").green().bold()
    .clickRunCommand("/deadzoneonboarding job")
    .hover(Text.of("\u30a2\u30aa\u30a4\u3092\u30af\u30ea\u30c3\u30af\u3067\u304d\u306a\u3044\u5834\u5408\u306e\u5b89\u5168\u306a\u4ee3\u66ff\u624b\u6bb5")))
  player.runCommandSilent('title @s actionbar {"text":"\u767b\u9332\u53d7\u4ed8\u5b98\u30a2\u30aa\u30a4\u306b\u8a71\u3057\u304b\u3051\u3066JOB\u3092\u9078\u629e","color":"gold"}')
}

function dzLobbyPrologueComplete(player) {
  return player && player.persistentData.getBoolean("dz_onboarding_prologue_complete")
}

function dzOpenInitialJobSelector(player) {
  if (!player || !player.alive || !dzOnboardingIsLobby(player)) return 0
  if (player.persistentData.getBoolean("dz_job_chosen")) return 0
  player.tell(Text.of("\u767b\u9332\u3059\u308b\u521d\u671fJOB\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u78ba\u5b9a\u5f8c\u306b\u5c02\u7528\u30b9\u30bf\u30fc\u30bf\u30fc\u30ad\u30c3\u30c8\u3092\u652f\u7d66\u3057\u307e\u3059\u3002").aqua())
  let result = player.runCommandSilent("class gui")
  if (result <= 0) {
    player.tell(Text.of("[ JOB\u9078\u629e\u753b\u9762\u3092\u518d\u8868\u793a ]").green().bold()
      .clickRunCommand("/class gui")
      .hover(Text.of("\u753b\u9762\u304c\u81ea\u52d5\u8868\u793a\u3055\u308c\u306a\u3044\u5834\u5408\u306f\u3053\u3053\u3092\u30af\u30ea\u30c3\u30af")))
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
    subtitle = "\u751f\u5b58\u8005\u901a\u4fe1\u56de\u7dda\u3092\u78ba\u7acb\u3057\u3066\u3044\u307e\u3059\u2026\u2026"
  } else if (step === 2) {
    title = "\u6587\u660e\u5d29\u58ca\u304b\u3089\u6570\u5e74"
    subtitle = "\u6b8b\u3055\u308c\u305f\u90fd\u5e02\u306f\u611f\u67d3\u8005\u3068\u52e2\u529b\u4e89\u3044\u306b\u98f2\u307e\u308c\u305f"
  } else if (step === 3) {
    title = "\u3042\u306a\u305f\u306f\u65b0\u305f\u306a\u751f\u5b58\u8005"
    subtitle = "\u5f79\u5272\u3092\u9078\u3073\u3001\u5fa9\u8208\u62e0\u70b9\u3078\u5411\u304b\u3048"
  } else if (step === 4) {
    title = "\u767b\u9332\u30ed\u30d3\u30fc\u5230\u7740"
    subtitle = "\u6b63\u9762\u306e\u53d7\u4ed8\u5b98\u30a2\u30aa\u30a4\u306b\u8a71\u3057\u304b\u3051\u3066\u304f\u3060\u3055\u3044"
  } else return
  player.runCommandSilent('title @s title {"text":"' + title + '","color":"gold"}')
  player.runCommandSilent('title @s subtitle {"text":"' + subtitle + '","color":"gray"}')
}

function dzOfferSettlementDeparture(player) {
  if (!player || !player.alive || !dzOnboardingIsLobby(player)) return
  if (!player.persistentData.getBoolean("dz_job_chosen")) return
  if (player.persistentData.getBoolean("dz_starter_depart_complete")) return
  player.tell(Text.of("[PROJECT DEADZONE] JOB\u767b\u9332\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u88c5\u5099\u3068\u521d\u671f\u90fd\u5e02\u306e\u78ba\u8a8d\u5f8c\u306b\u51fa\u767a\u3067\u304d\u307e\u3059\u3002").aqua())
  player.tell(Text.of("[ \u521d\u671f\u90fd\u5e02\u300c\u706f\u706b\u5e02\u300d\u3078\u51fa\u767a ]").gold().bold()
    .clickRunCommand("/deadzonevillage depart")
    .hover(Text.of("\u5b9f\u5728\u3059\u308b\u6700\u5bc4\u308a\u306e\u6751\u3092\u78ba\u8a8d\u3057\u3066\u304b\u3089\u79fb\u52d5\u3057\u307e\u3059")))
}

function dzIsLobbyRegistrar(target) {
  if (!target) return false
  try {
    if (target.tags && (target.tags.contains("pdz_lobby_registrar") || target.tags.contains("dz_lobby_registrar"))) return true
  } catch (ignored) {}
  if (String(target.type) !== "easy_npc:humanoid") return false
  let identity = ""
  try { identity += String(target.name) } catch (ignored) {}
  try { identity += " " + String(target.nbt) } catch (ignored) {}
  return identity.indexOf("\u30a2\u30aa\u30a4") >= 0 || identity.indexOf("\u767b\u9332\u53d7\u4ed8\u5b98") >= 0
}

// Aoi is the main entry point. The clickable command remains a safe fallback.
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
  try {
    if (player.server.persistentData.getInt("dz_starter_village_state") !== 2) {
      player.server.scheduleInTicks(1, callback => {
        try {
          if (global.pdzRegisterNearestStarterCity) global.pdzRegisterNearestStarterCity(player)
        } catch (error) {
          console.error("[PDZ][Onboarding] starter city registration failed: " + error)
        }
      })
    }
  } catch (error) {
    console.error("[PDZ][Onboarding] could not inspect starter city state: " + error)
  }

  if (data.getBoolean("dz_job_chosen")) {
    event.cancel()
    if (data.getBoolean("dz_lobby_registrar_lock")) return
    data.putBoolean("dz_lobby_registrar_lock", true)
    player.server.scheduleInTicks(10, callback => {
      if (player) player.persistentData.remove("dz_lobby_registrar_lock")
    })
    if (!data.getBoolean("dz_starter_received") || data.getInt("dz_starter_grant_version") < 6) {
      player.tell(Text.of("\u30b9\u30bf\u30fc\u30bf\u30fc\u30ad\u30c3\u30c8\u306e\u53d7\u9818\u8a18\u9332\u304c\u4e0d\u5b8c\u5168\u3067\u3059\u3002\u5185\u5bb9\u3092\u518d\u691c\u67fb\u3057\u3001\u4e0d\u8db3\u5206\u3092\u652f\u7d66\u3057\u307e\u3059\u3002").yellow())
      player.runCommandSilent("deadzonejob starter_claim")
    }
    dzOfferSettlementDeparture(player)
    return
  }

  if (!dzLobbyPrologueComplete(player)) {
    data.putBoolean("dz_onboarding_prologue_complete", true)
    data.putInt("dz_onboarding_prologue_tick", 190)
    player.runCommandSilent("title @s clear")
    player.tell(Text.of("\u901a\u4fe1\u540c\u671f\u5b8c\u4e86\u3002\u751f\u5b58\u8005\u767b\u9332\u3092\u958b\u59cb\u3057\u307e\u3059\u3002").green())
  }
  dzOpenInitialJobSelector(player)
  console.info("[PDZ][Onboarding] Aoi dialog interaction accepted for " + player.username)
})

function dzReadyReport(player) {
  let data = player.persistentData
  let chosen = data.getBoolean("dz_job_chosen")
  let starter = data.getBoolean("dz_starter_received")
  let tier = data.getInt("deadzone_world_tier")
  player.tell(Text.of("=== PROJECT DEADZONE READY CHECK ===").gold())
  player.tell(chosen ? Text.of("JOB: " + data.getString("dz_job_name")).green() : Text.of("JOB: \u672a\u9078\u629e").red())
  player.tell(starter ? Text.of("Starter Kit: \u53d7\u9818\u30fb\u691c\u8a3c\u6e08\u307f").green() : Text.of("Starter Kit: \u672a\u53d7\u9818\u307e\u305f\u306f\u4e0d\u8db3").red())
  player.tell(Text.of("World Tier: T" + tier).aqua())
  let initialized = []
  let missing = []
  DZ_READY_SKILLS.forEach(skill => {
    if (data.contains("dz_skill_" + skill)) initialized.push(skill + ":" + data.getInt("dz_skill_" + skill))
    else missing.push(skill)
  })
  player.tell(Text.of("Initial Skills: " + (initialized.length ? initialized.join(", ") : "none")).gray())
  if (chosen && missing.length) player.tell(Text.of("\u672a\u521d\u671f\u5316\u30ab\u30c6\u30b4\u30ea: " + missing.join(", ")).yellow())
  if (!chosen) player.tell(Text.of("[ JOB\u9078\u629e\u753b\u9762\u3092\u8868\u793a ]").green().clickRunCommand("/deadzoneonboarding job"))
  else player.tell(Text.of("\u57fa\u672c\u30d7\u30ec\u30a4\u30e4\u30fc\u30c7\u30fc\u30bf\u306f\u30de\u30eb\u30c1\u30c6\u30b9\u30c8\u53ef\u80fd\u3067\u3059\u3002").green())
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
  if (!player.persistentData.getBoolean("dz_job_chosen") && player.persistentData.getBoolean("dz_onboarding_prologue_started")) {
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
  if (player.persistentData.getBoolean("dz_job_chosen") && (!player.persistentData.getBoolean("dz_starter_received") || player.persistentData.getInt("dz_starter_grant_version") < 6)) {
    let recovery = player.persistentData.getInt("dz_starter_recovery_ticks") + 1
    player.persistentData.putInt("dz_starter_recovery_ticks", recovery)
    if (recovery === 20) {
      player.runCommandSilent("deadzonejob starter_claim")
      if (!player.persistentData.getBoolean("dz_starter_received")) player.tell(Text.of("\u30b9\u30bf\u30fc\u30bf\u30fc\u30ad\u30c3\u30c8\u652f\u7d66\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u53d7\u4ed8\u5b98\u3078\u3082\u3046\u4e00\u5ea6\u8a71\u3057\u304b\u3051\u3066\u304f\u3060\u3055\u3044\u3002").red())
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
    player.tell(Text.of("[PROJECT DEADZONE] JOB\u521d\u671f\u30b9\u30ad\u30eb\u3092\u518d\u540c\u671f\u3057\u307e\u3057\u305f\u3002").aqua())
    return 1
  }))
  event.register(root)
})
