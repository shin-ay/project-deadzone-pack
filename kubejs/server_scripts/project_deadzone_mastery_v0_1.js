// PROJECT DEADZONE shared mastery v0.1
// Conversion is explicit and atomic: 3 unspent points from a capped category
// become 1 point in the shared mastery tree.

const DZ_MASTERY_RATE = 3
const DZ_MASTERY_CAPS = {
  survival: 20
}

function dzMasteryPointsLeft(player, category) {
  try {
    return Number(PufferfishSkills.getPointsLeft(player, category))
  } catch (error) {
    console.error("[PROJECT DEADZONE][Mastery] getPointsLeft failed for " + category + ": " + error)
    return -1
  }
}

function dzMasteryLevel(player, category) {
  try {
    return Number(PufferfishSkills.getExperienceLevel(player, category))
  } catch (error) {
    console.error("[PROJECT DEADZONE][Mastery] getExperienceLevel failed for " + category + ": " + error)
    return -1
  }
}

function dzConvertMastery(player, category) {
  let cap = DZ_MASTERY_CAPS[category]
  if (!cap) {
    player.tell(Text.of("That skill is not enabled for Mastery conversion yet.").red())
    return 0
  }

  let level = dzMasteryLevel(player, category)
  let points = dzMasteryPointsLeft(player, category)
  if (level < cap) {
    player.tell(Text.of(category + " must reach Lv" + cap + " before conversion.").yellow())
    return 0
  }
  if (points < DZ_MASTERY_RATE) {
    player.tell(Text.of("Need 3 unspent " + category + " points. Current: " + Math.max(0, points)).yellow())
    return 0
  }

  // Read both balances first, then apply the debit before the credit.
  // If the debit fails, no Mastery point is granted.
  try {
    PufferfishSkills.addPoints(player, category, -DZ_MASTERY_RATE)
    let after = dzMasteryPointsLeft(player, category)
    if (after !== points - DZ_MASTERY_RATE) {
      PufferfishSkills.addPoints(player, category, DZ_MASTERY_RATE)
      player.tell(Text.of("Conversion cancelled: source point verification failed.").red())
      return 0
    }
    PufferfishSkills.addPoints(player, "mastery", 1)
    player.persistentData.putInt(
      "dz_mastery_conversions",
      player.persistentData.getInt("dz_mastery_conversions") + 1
    )
    player.tell(Text.of("Converted 3 " + category + " points into 1 Mastery point.").green())
    return 1
  } catch (error) {
    console.error("[PROJECT DEADZONE][Mastery] conversion failed: " + error)
    player.tell(Text.of("Mastery conversion failed safely. Check server log.").red())
    return 0
  }
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands, arguments: Arguments} = event
  let root = Commands.literal("deadzonemastery")

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of(
      "Mastery points: " + Math.max(0, dzMasteryPointsLeft(player, "mastery"))
      + " / Survival Lv" + Math.max(0, dzMasteryLevel(player, "survival"))
      + " points " + Math.max(0, dzMasteryPointsLeft(player, "survival"))
    ).gold())
    return 1
  }))

  root.then(Commands.literal("convert")
    .then(Commands.literal("survival").executes(ctx => {
      return dzConvertMastery(ctx.source.player, "survival")
    })))

  root.then(Commands.literal("grant_test")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player = ctx.source.player
      PufferfishSkills.addPoints(player, "mastery", 6)
      player.tell(Text.of("Granted 6 Mastery test points. Open the tree with K.").aqua())
      return 1
    }))

  root.then(Commands.literal("reset_test")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player = ctx.source.player
      PufferfishSkills.resetCategory(player, "mastery")
      PufferfishSkills.setPoints(player, "mastery", 0)
      player.persistentData.putInt("dz_mastery_conversions", 0)
      player.tell(Text.of("Mastery tree and test points reset.").gray())
      return 1
    }))

  event.register(root)
})
