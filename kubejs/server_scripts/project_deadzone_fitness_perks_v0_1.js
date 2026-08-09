// PROJECT DEADZONE Fitness Perks v0.1
// Endurance improves sustained movement and breath without replacing food.

function dzFitnessPerkTier(player, branch) {
  for (let tier = 3; tier >= 1; tier--) {
    if (player.tags.contains("dz_fitness_" + branch + "_" + tier)) return tier
  }
  return 0
}

function dzFitnessReduceExhaustion(player, tier) {
  if (tier < 2 || !player.isSprinting()) return
  try {
    let food = player.foodData
    let current = food.getExhaustionLevel()
    let reduction = tier >= 3 ? 0.16 : 0.08
    food.setExhaustion(Math.max(0, current - reduction))
  } catch (error) {
    // Forge mappings can differ; never interrupt player ticking.
  }
}

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide) return

  let endurance = dzFitnessPerkTier(player, "endurance")
  if (player.age % 20 === 0) {
    dzFitnessReduceExhaustion(player, endurance)
  }

  // Second Lung roughly doubles useful underwater time.
  if (
    endurance >= 3
    && player.isUnderWater()
    && player.airSupply > 0
    && player.airSupply < player.maxAirSupply
    && player.age % 2 === 0
  ) {
    player.airSupply = Math.min(player.maxAirSupply, player.airSupply + 1)
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonefitnessperks")
    .requires(source => source.hasPermission(2))

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of(
      "Fitness Carry " + dzFitnessPerkTier(player, "carry")
      + " / Endurance " + dzFitnessPerkTier(player, "endurance")
      + " / Mobility " + dzFitnessPerkTier(player, "mobility")
    ).aqua())
    return 1
  }))

  event.register(root)
})
