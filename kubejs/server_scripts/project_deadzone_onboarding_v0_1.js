// PROJECT DEADZONE - stable onboarding (normal world) v1.1
// The old lobby / village-search / automatic-warp flow is intentionally retired.
// JOB confirmation is the single source of truth for starter loadout grants.

const DZ_ONBOARDING_JOB_DELAY_TICKS = 80
const DZ_JOB_SELECTION_PROTECTION_TAG = "dz_job_selection_protected"

function dzJobSelectionNeedsProtection(player) {
  return !!player && !player.persistentData.getBoolean("dz_job_chosen")
}

function dzSetJobSelectionProtection(player, enabled) {
  if (!player) return
  if (enabled) {
    if (!player.tags.contains(DZ_JOB_SELECTION_PROTECTION_TAG)) player.addTag(DZ_JOB_SELECTION_PROTECTION_TAG)
    // The hurt event below is the source of truth. Short effects also protect
    // against modded damage paths that bypass the normal LivingHurt event.
    player.runCommandSilent("effect give @s minecraft:resistance 5 255 true")
    player.runCommandSilent("effect give @s minecraft:fire_resistance 5 0 true")
    return
  }
  if (player.tags.contains(DZ_JOB_SELECTION_PROTECTION_TAG)) player.removeTag(DZ_JOB_SELECTION_PROTECTION_TAG)
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

PlayerEvents.loggedIn(event => {
  let player = event.player
  dzSetJobSelectionProtection(player, dzJobSelectionNeedsProtection(player))
  player.server.scheduleInTicks(DZ_ONBOARDING_JOB_DELAY_TICKS, () => {
    if (!player || !player.alive) return
    if (!player.persistentData.getBoolean("dz_job_chosen")) {
      dzOpenInitialJobSelector(player)
      return
    }
    dzEnsureRegisteredLoadout(player)
  })
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
