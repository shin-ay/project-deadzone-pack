// PROJECT DEADZONE - multiplayer baseline preflight / recovery
// Administrative checks for the consolidated multiplayer test build.

const PDZ_PREFLIGHT_VERSION = "2026.08.24-mp1"

function pdzPreflightTell(player, message, color) {
  let line = Text.of(message)
  if (color === "green") line = line.green()
  else if (color === "yellow") line = line.yellow()
  else if (color === "red") line = line.red()
  else if (color === "aqua") line = line.aqua()
  else line = line.gray()
  player.tell(line)
}

function pdzPreflightPlayerState(player) {
  let data = player.persistentData
  return {
    name: String(player.username),
    job: data.getBoolean("dz_job_chosen"),
    starter: data.getBoolean("dz_starter_received"),
    camp: data.getBoolean("dz_minecolonies_supply_camp_received")
  }
}

function pdzPreflightStatus(source) {
  let player = source.player
  let server = source.server
  let states = []
  server.players.forEach(p => states.push(pdzPreflightPlayerState(p)))

  let pending = states.filter(s => !s.job || !s.starter || !s.camp)
  let activityRetired = server.persistentData.getBoolean("dz_legacy_activity_runtime_retired_v3")
  let activityAuto = server.persistentData.getBoolean("dz_faction_activity_auto_enabled")

  pdzPreflightTell(player, "=== PROJECT DEADZONE MULTIPLAYER PREFLIGHT ===", "aqua")
  pdzPreflightTell(player, "Baseline: " + PDZ_PREFLIGHT_VERSION, "gray")
  pdzPreflightTell(player, "Online: " + states.length + " / onboarding incomplete: " + pending.length, pending.length ? "yellow" : "green")
  pdzPreflightTell(player, "Legacy activity runtime: " + (activityRetired ? "RETIRED" : "PENDING RESTART"), activityRetired ? "green" : "yellow")
  pdzPreflightTell(player, "Legacy activity auto: " + (activityAuto ? "WARNING: ON" : "OFF"), activityAuto ? "red" : "green")
  pdzPreflightTell(player, "Legacy JourneyMap bridge: RETIRED (native JourneyMap only)", "green")

  states.forEach(s => {
    let ok = s.job && s.starter && s.camp
    pdzPreflightTell(
      player,
      (ok ? "[OK] " : "[CHECK] ") + s.name +
        " | JOB=" + (s.job ? "OK" : "NO") +
        " Starter=" + (s.starter ? "OK" : "NO") +
        " Camp=" + (s.camp ? "OK" : "NO"),
      ok ? "green" : "yellow"
    )
  })
  return pending.length === 0 && activityRetired && !activityAuto ? 1 : 0
}

function pdzPreflightRecoverAll(source) {
  let player = source.player
  let recovered = 0
  let skipped = 0
  let failed = 0

  source.server.players.forEach(target => {
    if (!target.persistentData.getBoolean("dz_job_chosen")) {
      skipped++
      pdzPreflightTell(player, "[SKIP] " + target.username + ": JOB not selected", "yellow")
      return
    }

    let starterReady = false
    let campReady = false
    try {
      if (global.pdzEnsureStarterKit) global.pdzEnsureStarterKit(target)
      if (global.pdzEnsureMineColoniesSupplyCamp) global.pdzEnsureMineColoniesSupplyCamp(target)

      // Recovery helpers do not share a guaranteed return-value contract.
      // Re-read the persisted result so this command reports the real state.
      starterReady = target.persistentData.getBoolean("dz_starter_received")
      campReady = target.persistentData.getBoolean("dz_minecolonies_supply_camp_received")
    } catch (error) {
      console.error("[PDZ][Preflight] recovery failed for " + target.username + ": " + error)
    }

    if (starterReady && campReady) {
      recovered++
      pdzPreflightTell(player, "[OK] recovered/verified " + target.username, "green")
    } else {
      failed++
      pdzPreflightTell(player, "[FAIL] " + target.username + " | Starter=" + starterReady + " Camp=" + campReady, "red")
    }
  })

  pdzPreflightTell(player, "Recovery result: OK=" + recovered + " SKIP=" + skipped + " FAIL=" + failed, failed ? "red" : "green")
  return failed === 0 ? 1 : 0
}

function pdzPreflightCleanupLegacy(source) {
  let server = source.server
  ;["minecraft:overworld", "minecraft:the_nether", "minecraft:the_end"].forEach(dimension => {
    server.runCommandSilent("execute in " + dimension + " run kill @e[tag=dz_activity]")
    server.runCommandSilent("execute in " + dimension + " run kill @e[tag=dz_activity_bound]")
  })
  server.persistentData.putBoolean("dz_faction_activity_auto_enabled", false)
  server.persistentData.putBoolean("dz_legacy_activity_runtime_retired_v3", true)
  pdzPreflightTell(source.player, "Legacy convoy/noise activity entities cleared. Auto activity is OFF.", "green")
  return 1
}

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  let root = Commands.literal("deadzonepreflight").requires(source => source.hasPermission(2))
  root.then(Commands.literal("status").executes(ctx => pdzPreflightStatus(ctx.source)))
  root.then(Commands.literal("recover_all").executes(ctx => pdzPreflightRecoverAll(ctx.source)))
  root.then(Commands.literal("cleanup_legacy").executes(ctx => pdzPreflightCleanupLegacy(ctx.source)))
  event.register(root)
})

console.info("[PROJECT DEADZONE] Multiplayer preflight " + PDZ_PREFLIGHT_VERSION + " loaded")
