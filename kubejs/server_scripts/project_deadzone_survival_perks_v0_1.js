// PROJECT DEADZONE Survival Perks v0.1
// The pack now uses Legendary Survival Overhaul.  Do not load the removed
// Thirst Was Taken capability here: a top-level Java.loadClass failure stops
// this entire script from loading.  LSO hydration tuning lives in its config.
const DZ_THIRST_CAPABILITIES = null

function dzSurvivalTier(player, branch) {
  for (let tier = 3; tier >= 1; tier--) {
    if (player.tags.contains("dz_survival_" + branch + "_" + tier)) return tier
  }
  return 0
}

function dzReduceThirstExhaustion(player, tier) {
  if (tier < 2 || !DZ_THIRST_CAPABILITIES) return
  try {
    let thirst = player.getCapability(DZ_THIRST_CAPABILITIES.PLAYER_THIRST)
      .resolve().orElse(null)
    if (!thirst) return

    let reduction = tier >= 3 ? 0.30 : 0.15
    thirst.setExhaustion(Math.max(0, thirst.getExhaustion() - reduction))
    thirst.updateThirstData(player)
  } catch (error) {
    // Thirst integration is optional at runtime; never break player ticking.
  }
}

function dzNearCampfire(player, radius) {
  let baseX = Math.floor(player.x)
  let baseY = Math.floor(player.y)
  let baseZ = Math.floor(player.z)
  let radiusSq = radius * radius

  for (let y = baseY - 2; y <= baseY + 2; y++) {
    for (let x = baseX - radius; x <= baseX + radius; x++) {
      let dx = x - baseX
      for (let z = baseZ - radius; z <= baseZ + radius; z++) {
        let dz = z - baseZ
        if (dx * dx + dz * dz > radiusSq) continue
        let id = String(player.level.getBlock(x, y, z).id)
        if (id === "minecraft:campfire" || id === "minecraft:soul_campfire") {
          return true
        }
      }
    }
  }
  return false
}

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 100 !== 0) return

  let metabolism = dzSurvivalTier(player, "metabolism")
  dzReduceThirstExhaustion(player, metabolism)
  if (player.tags.contains("dz_mastery_hydration_1")) {
    dzReduceThirstExhaustion(player, 2)
  }

  let fieldcraft = dzSurvivalTier(player, "fieldcraft")
  if (fieldcraft <= 0) return

  let radius = [0, 4, 6, 8][fieldcraft]
  if (!dzNearCampfire(player, radius)) return

  player.server.runCommandSilent(
    "effect give " + player.username + " minecraft:regeneration 6 0 true"
  )
  if (fieldcraft >= 2) {
    player.server.runCommandSilent(
      "effect give " + player.username + " minecraft:resistance 6 0 true"
    )
  }
  if (fieldcraft >= 3) {
    player.server.runCommandSilent(
      "effect give " + player.username + " minecraft:night_vision 12 0 true"
    )
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonesurvival")
    .requires(source => source.hasPermission(2))

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let fieldcraft = dzSurvivalTier(player, "fieldcraft")
    let nearCamp = fieldcraft > 0
      && dzNearCampfire(player, [0, 4, 6, 8][fieldcraft])
    player.tell(Text.of(
      "Survival Metabolism " + dzSurvivalTier(player, "metabolism")
      + " / Fieldcraft " + fieldcraft
      + " / Resistance " + dzSurvivalTier(player, "resistance")
      + " / Camp " + (nearCamp ? "ACTIVE" : "OUT OF RANGE")
    ).aqua())
    return 1
  }))

  event.register(root)
})
