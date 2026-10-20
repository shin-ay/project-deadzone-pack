// PROJECT DEADZONE - village rescue onboarding v3.0
// Registration is completed by choosing a one-time Starter Loadout.
// No permanent JOB, career rank or JOB UI is involved.

const DZ_ONBOARDING_LOADOUT_DELAY_TICKS = 80
const DZ_REGISTRATION_PROTECTION_TAG = "pdz_registration_protected"
const DZ_ONBOARDING_BLACKOUT_ENABLED = false

function dzRegistrationComplete(player) {
  return !!player && player.persistentData.getBoolean("pdz_registration_complete")
}

function dzRegistrationNeedsProtection(player) {
  return !!player && (!dzRegistrationComplete(player) ||
    player.persistentData.getBoolean("dz_onboarding_intro_pending"))
}

function dzSetRegistrationProtection(player, enabled) {
  if (!player) return
  if (enabled) {
    if (!player.tags.contains(DZ_REGISTRATION_PROTECTION_TAG)) player.addTag(DZ_REGISTRATION_PROTECTION_TAG)
    player.runCommandSilent("effect give @s minecraft:resistance 5 255 true")
    player.runCommandSilent("effect give @s minecraft:fire_resistance 5 0 true")
    if (DZ_ONBOARDING_BLACKOUT_ENABLED) {
      player.runCommandSilent("effect give @s minecraft:slowness 5 255 true")
      player.runCommandSilent("effect give @s minecraft:blindness 5 0 true")
    } else {
      player.runCommandSilent("effect clear @s minecraft:slowness")
      player.runCommandSilent("effect clear @s minecraft:blindness")
    }
    return
  }
  if (player.tags.contains(DZ_REGISTRATION_PROTECTION_TAG)) player.removeTag(DZ_REGISTRATION_PROTECTION_TAG)
  player.runCommandSilent("effect clear @s minecraft:slowness")
  player.runCommandSilent("effect clear @s minecraft:blindness")
}

function dzHoldVillageIntro(player) {
  if (!player) return
  player.persistentData.putBoolean("dz_onboarding_intro_pending", DZ_ONBOARDING_BLACKOUT_ENABLED)
  dzSetRegistrationProtection(player, true)
}

function dzWakeInVillage(player) {
  if (!player) return
  let data = player.persistentData
  data.putBoolean("dz_onboarding_awake", true)
  data.putBoolean("dz_onboarding_intro_pending", false)
  dzSetRegistrationProtection(player, false)
  player.runCommandSilent("effect clear @s minecraft:resistance")
  player.runCommandSilent("effect clear @s minecraft:fire_resistance")
  player.runCommandSilent("effect give @s minecraft:resistance 6 4 true")
  player.runCommandSilent("title @s times 20 80 30")
  player.runCommandSilent('title @s subtitle {"text":"村人たちに救助されたようだ","color":"gray"}')
  player.runCommandSilent('title @s title {"text":"UNKNOWN SETTLEMENT","color":"gold","bold":true}')
  player.server.runCommandSilent(
    "ftbquests change_progress " + player.username + " complete 4262970F1B621A1D")
  player.server.runCommandSilent(
    "ftbquests change_progress " + player.username + " complete 52F2869C3820DF98")
  player.tell(Text.of("[生存記録] あなたは村の住民に救助された。事故以前の知識は断片的だ。").gold())
  player.tell(Text.of("近くの村人に話しかけ、所持品と通信手段を確認しよう。").aqua())
}

function dzOnboardingTellLoadoutPrompt(player) {
  player.tell(Text.of("[PROJECT DEADZONE] 最初の遠征装備を選択してください。").gold())
  player.tell(Text.of("[ Starter Loadoutを選ぶ ]").aqua()
    .clickRunCommand("/deadzoneloadout menu")
    .hover(Text.of("初回支給内容を選びます。永久クラスではありません")))
}

function dzOpenInitialLoadoutSelector(player) {
  if (!player) return false
  if (dzRegistrationComplete(player)) return true
  if (global.pdzStarterLoadoutMenu) return global.pdzStarterLoadoutMenu(player)
  dzOnboardingTellLoadoutPrompt(player)
  return false
}

function dzEnsureRegisteredLoadout(player) {
  if (!player || !dzRegistrationComplete(player)) return false
  let starterReady = player.persistentData.getBoolean("pdz_starter_loadout_received")
  let campReady = true
  try {
    if (global.pdzEnsureStarterLoadout) starterReady = global.pdzEnsureStarterLoadout(player)
  } catch (error) {
    starterReady = false
    console.error("[PDZ][Onboarding] Starter Loadout check failed for " + player.username + ": " + error)
  }
  try {
    if (global.pdzEnsurePersonalSupplyCamp) campReady = global.pdzEnsurePersonalSupplyCamp(player)
  } catch (error) {
    campReady = false
    console.error("[PDZ][Onboarding] personal camp check failed for " + player.username + ": " + error)
  }
  return starterReady && campReady
}

function dzBeginVillageSpawnOnboarding(player) {
  if (!player || !player.alive || dzRegistrationComplete(player)) return
  let world = player.server.persistentData
  world.putInt("dz_onboarding_village_x", Math.floor(player.x))
  world.putInt("dz_onboarding_village_y", Math.floor(player.y))
  world.putInt("dz_onboarding_village_z", Math.floor(player.z))
  player.persistentData.putBoolean("dz_onboarding_village_ready", true)
  player.server.scheduleInTicks(20, () => dzOpenInitialLoadoutSelector(player))

  player.server.scheduleInTicks(200, () => {
    if (!player || !player.alive) return
    try {
      let nearby = global.pdzSetNearestReal ? global.pdzSetNearestReal(player, 256) : null
      if (nearby && global.pdzAdoptVerifiedRescueVillage)
        global.pdzAdoptVerifiedRescueVillage(player, nearby)
    } catch (error) {
      console.warn("[PDZ][Onboarding] optional village observation skipped: " + error)
    }
  })
}

PlayerEvents.loggedIn(event => {
  let player = event.player
  if (!dzRegistrationComplete(player)) {
    player.persistentData.putInt("pdz_onboarding_schema", 3)
    dzHoldVillageIntro(player)
    player.server.scheduleInTicks(DZ_ONBOARDING_LOADOUT_DELAY_TICKS,
      () => dzBeginVillageSpawnOnboarding(player))
  } else {
    player.persistentData.putBoolean("dz_onboarding_awake", true)
    dzSetRegistrationProtection(player, false)
    player.server.scheduleInTicks(DZ_ONBOARDING_LOADOUT_DELAY_TICKS,
      () => dzEnsureRegisteredLoadout(player))
  }
})

PlayerEvents.tick(event => {
  let player = event.player
  if (!player || player.age % 20 !== 0) return
  dzSetRegistrationProtection(player, dzRegistrationNeedsProtection(player))
})

EntityEvents.hurt(event => {
  let player = event.entity
  if (!player || String(player.type) !== "minecraft:player") return
  if (!dzRegistrationNeedsProtection(player)) return
  event.cancel()
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event

  let onboarding = Commands.literal("deadzoneonboarding")
  onboarding.then(Commands.literal("loadout")
    .executes(ctx => dzOpenInitialLoadoutSelector(ctx.source.player) ? 1 : 0))
  // Temporary command alias for old quest buttons. It no longer opens a JOB UI.
  onboarding.then(Commands.literal("job").executes(ctx => {
    ctx.source.player.tell(Text.of("固定JOBは廃止されました。Starter Loadoutを選びます。").yellow())
    return dzOpenInitialLoadoutSelector(ctx.source.player) ? 1 : 0
  }))
  event.register(onboarding)

  event.register(Commands.literal("deadzoneready")
    .then(Commands.literal("status").executes(ctx => {
      let player = ctx.source.player, data = player.persistentData
      player.tell(Text.of("PROJECT DEADZONE 初期登録状況").gold())
      player.tell(Text.of("登録: " + (data.getBoolean("pdz_registration_complete") ? "完了" : "未完了")))
      player.tell(Text.of("Starter Loadout: " + (data.getBoolean("pdz_starter_loadout_received") ?
        data.getString("pdz_starter_loadout_name") : "未選択")))
      player.tell(Text.of("MineColonies補給キャンプ: " +
        (data.getBoolean("pdz_minecolonies_supply_camp_received") ? "受領済み" : "未受領")))
      return 1
    })))
})

global.pdzRegistrationComplete = dzRegistrationComplete
global.pdzOpenInitialLoadoutSelector = dzOpenInitialLoadoutSelector
global.pdzEnsureRegisteredLoadout = dzEnsureRegisteredLoadout
global.pdzSetRegistrationProtection = dzSetRegistrationProtection
global.pdzHoldVillageIntro = dzHoldVillageIntro
global.pdzWakeInVillage = dzWakeInVillage
global.pdzOnStarterLoadoutSelected = function(player) {
  dzHoldVillageIntro(player)
  try {
    if (global.pdzStartVillageCampBootstrap) return global.pdzStartVillageCampBootstrap(player)
  } catch (error) {
    console.error("[PDZ][Onboarding] camp bootstrap trigger failed: " + error)
  }
  dzWakeInVillage(player)
  return true
}
global.pdzOnCampPrepared = function(player) {
  dzWakeInVillage(player)
}

console.info("[PROJECT DEADZONE][Onboarding] v3.0 jobless Starter Loadout onboarding loaded")
