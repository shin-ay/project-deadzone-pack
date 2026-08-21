// PROJECT DEADZONE - stable onboarding (normal world)
// The old lobby / village-search / automatic-warp flow is intentionally retired.
// JOB confirmation is the single source of truth for starter loadout grants.

const DZ_ONBOARDING_JOB_DELAY_TICKS = 80

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
  player.server.scheduleInTicks(DZ_ONBOARDING_JOB_DELAY_TICKS, () => {
    if (!player || !player.alive) return
    if (!player.persistentData.getBoolean("dz_job_chosen")) {
      dzOpenInitialJobSelector(player)
      return
    }
    dzEnsureRegisteredLoadout(player)
  })
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
