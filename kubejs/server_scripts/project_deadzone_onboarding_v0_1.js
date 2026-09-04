// PROJECT DEADZONE - village rescue onboarding v2.0 (local prototype)
// Village Spawn Point owns the initial world spawn. New survivors wake in that
// village only after selecting a JOB and preparing Survivor Camp 100-500m away.

const DZ_ONBOARDING_JOB_DELAY_TICKS = 80
const DZ_JOB_SELECTION_PROTECTION_TAG = "dz_job_selection_protected"

function dzJobSelectionNeedsProtection(player) {
  return !!player && (!player.persistentData.getBoolean("dz_job_chosen") ||
    player.persistentData.getBoolean("dz_onboarding_intro_pending"))
}

function dzSetJobSelectionProtection(player, enabled) {
  if (!player) return
  if (enabled) {
    if (!player.tags.contains(DZ_JOB_SELECTION_PROTECTION_TAG)) player.addTag(DZ_JOB_SELECTION_PROTECTION_TAG)
    // The hurt event below is the source of truth. Short effects also protect
    // against modded damage paths that bypass the normal LivingHurt event.
    player.runCommandSilent("effect give @s minecraft:resistance 5 255 true")
    player.runCommandSilent("effect give @s minecraft:fire_resistance 5 0 true")
    player.runCommandSilent("effect give @s minecraft:slowness 5 255 true")
    player.runCommandSilent("effect give @s minecraft:blindness 5 0 true")
    return
  }
  if (player.tags.contains(DZ_JOB_SELECTION_PROTECTION_TAG)) player.removeTag(DZ_JOB_SELECTION_PROTECTION_TAG)
  player.runCommandSilent("effect clear @s minecraft:slowness")
  player.runCommandSilent("effect clear @s minecraft:blindness")
}

function dzHoldVillageIntro(player) {
  if (!player) return
  player.persistentData.putBoolean("dz_onboarding_intro_pending", true)
  dzSetJobSelectionProtection(player, true)
  player.runCommandSilent("pdzjobui intro hold")
}

function dzWakeInVillage(player) {
  if (!player) return
  let data = player.persistentData
  data.putBoolean("dz_onboarding_awake", true)
  data.putBoolean("dz_onboarding_intro_pending", false)
  dzSetJobSelectionProtection(player, false)
  player.runCommandSilent("effect clear @s minecraft:resistance")
  player.runCommandSilent("effect clear @s minecraft:fire_resistance")
  player.runCommandSilent("effect give @s minecraft:resistance 6 4 true")
  player.runCommandSilent("pdzjobui intro wake")
  player.runCommandSilent("title @s times 20 80 30")
  player.runCommandSilent('title @s subtitle {"text":"村人たちに救助されたようだ","color":"gray"}')
  player.runCommandSilent('title @s title {"text":"UNKNOWN SETTLEMENT","color":"gold","bold":true}')
  player.server.runCommandSilent(
    "ftbquests change_progress " + player.username + " complete 4262970F1B621A1D")
  player.server.runCommandSilent(
    "ftbquests change_progress " + player.username + " complete 52F2869C3820DF98")
  player.tell(Text.of("[生存記録] あなたは村の住民に救助された。事故以前の知識は断片的だ。 ").gold())
  player.tell(Text.of("近くの村人に話しかけ、所持品と通信手段を確認しよう。 ").aqua())
}

function dzOnboardingTellJobPrompt(player) {
  player.tell(Text.of("[PROJECT DEADZONE] 初期JOBを選択してください。").gold())
  player.tell(
    Text.of("[ JOB選択画面を開く ]")
      .aqua()
      .clickRunCommand("/deadzoneonboarding job")
      .hover(Text.of("初期JOB選択画面を開きます"))
  )
}

function dzOpenInitialJobSelector(player) {
  if (!player) return false
  if (player.persistentData.getBoolean("dz_job_chosen")) return true

  let result = 0
  try { result = player.runCommandSilent("class gui") } catch (ignored) {}
  if (result <= 0) {
    dzOnboardingTellJobPrompt(player)
    player.tell(Text.of("画面が開かない場合は、上の青い文字を押してください。").yellow())
    console.error("[PDZ][Onboarding] /class gui returned " + result + " for " + player.username)
    return false
  }

  player.tell(Text.of("JOB確定後、スターターキットと個人用補給キャンプを受け取れます。").green())
  return true
}

function dzEnsureRegisteredLoadout(player) {
  if (!player || !player.persistentData.getBoolean("dz_job_chosen")) return false

  let starterReady = true
  let campReady = true
  try {
    if (global.pdzEnsureStarterKit) starterReady = global.pdzEnsureStarterKit(player)
  } catch (error) {
    starterReady = false
    console.error("[PDZ][Onboarding] Starter recovery failed for " + player.username + ": " + error)
  }
  try {
    if (global.pdzEnsureMineColoniesSupplyCamp) campReady = global.pdzEnsureMineColoniesSupplyCamp(player)
  } catch (error) {
    campReady = false
    console.error("[PDZ][Onboarding] MineColonies camp recovery failed for " + player.username + ": " + error)
  }
  return starterReady && campReady
}

function dzBeginVillageSpawnOnboarding(player) {
  if (!player || !player.alive || player.persistentData.getBoolean("dz_job_chosen")) return
  // Village Spawn Point is the sole owner of initial placement. PDZ records
  // where the player arrived and starts onboarding immediately; settlement
  // classification is optional bridge work and must never block play.
  let world=player.server.persistentData
  world.putInt("dz_onboarding_village_x",Math.floor(player.x))
  world.putInt("dz_onboarding_village_y",Math.floor(player.y))
  world.putInt("dz_onboarding_village_z",Math.floor(player.z))
  player.persistentData.putBoolean("dz_onboarding_village_ready",true)
  player.server.scheduleInTicks(20,()=>dzOpenInitialJobSelector(player))

  player.server.scheduleInTicks(200,()=>{
    if (!player || !player.alive) return
    try {
      let nearby=global.pdzSetNearestReal ? global.pdzSetNearestReal(player,256) : null
      if (nearby && global.pdzAdoptVerifiedRescueVillage)
        global.pdzAdoptVerifiedRescueVillage(player,nearby)
    } catch (error) {
      console.warn("[PDZ][Onboarding] optional village observation skipped: "+error)
    }
  })
}

PlayerEvents.loggedIn(event => {
  let player = event.player
  if (!player.persistentData.getBoolean("dz_job_chosen")) {
    player.persistentData.putInt("dz_onboarding_schema", 2)
    dzHoldVillageIntro(player)
  } else if (!player.persistentData.getBoolean("dz_onboarding_intro_pending")) {
    // Existing characters must never be trapped by the new-world prototype.
    player.persistentData.putBoolean("dz_onboarding_awake", true)
    player.runCommandSilent("pdzjobui intro clear")
    dzSetJobSelectionProtection(player, false)
  }
  if (!player.persistentData.getBoolean("dz_job_chosen"))
    player.server.scheduleInTicks(DZ_ONBOARDING_JOB_DELAY_TICKS,()=>dzBeginVillageSpawnOnboarding(player))
  else player.server.scheduleInTicks(DZ_ONBOARDING_JOB_DELAY_TICKS,()=>dzEnsureRegisteredLoadout(player))
})

// JOB selection may stay open for several minutes. Refresh the compatibility
// effects once per second and derive protection only from the confirmed flag,
// so closing the GUI or reconnecting cannot accidentally remove it.
PlayerEvents.tick(event => {
  let player = event.player
  if (!player || player.age % 20 !== 0) return
  dzSetJobSelectionProtection(player, dzJobSelectionNeedsProtection(player))
})

EntityEvents.hurt(event => {
  let player = event.entity
  if (!player || String(player.type) !== "minecraft:player") return
  if (!dzJobSelectionNeedsProtection(player)) return
  event.cancel()
})

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event

  event.register(
    Commands.literal("deadzoneonboarding")
      .then(Commands.literal("job").executes(ctx => dzOpenInitialJobSelector(ctx.source.player) ? 1 : 0))
  )

  event.register(
    Commands.literal("deadzoneready")
      .then(Commands.literal("status").executes(ctx => {
        let player = ctx.source.player
        let data = player.persistentData
        player.tell(Text.of("PROJECT DEADZONE 初期登録状況").gold())
        player.tell(Text.of("JOB: " + (data.getBoolean("dz_job_chosen") ? "完了" : "未選択")))
        player.tell(Text.of("スターターキット: " + (data.getBoolean("dz_starter_received") ? "受領済み" : "未受領")))
        player.tell(Text.of("MineColonies補給キャンプ: " + (data.getBoolean("dz_minecolonies_supply_camp_received") ? "受領済み" : "未受領")))
        return 1
      }))
  )
})

global.pdzOpenInitialJobSelector = dzOpenInitialJobSelector
global.pdzEnsureRegisteredLoadout = dzEnsureRegisteredLoadout
global.pdzSetJobSelectionProtection = dzSetJobSelectionProtection
global.pdzHoldVillageIntro = dzHoldVillageIntro
global.pdzWakeInVillage = dzWakeInVillage
global.pdzOnJobSelected = function(player) {
  dzHoldVillageIntro(player)
  try {
    if (global.pdzStartVillageCampBootstrap) return global.pdzStartVillageCampBootstrap(player)
  } catch (error) {
    console.error("[PDZ][Onboarding] camp bootstrap trigger failed: " + error)
  }
  dzWakeInVillage(player)
  return false
}
global.pdzOnCampPrepared = function(player) {
  dzWakeInVillage(player)
}
