// PROJECT DEADZONE Fitness / Weight System integration v0.1
// Weight is a specialization advantage, not a punishment for ordinary looting.

// The custom Weight mod is optional in multiplayer builds. Never resolve its
// Java class unless Forge reports the mod as loaded, otherwise /reload fails.
const DZ_WEIGHT_MOD_LOADED = Platform.isLoaded("weight")
const DZ_WEIGHT_ATTRIBUTES = DZ_WEIGHT_MOD_LOADED
  ? Java.loadClass("weight.WeightAttributes") : null

const DZ_FITNESS_CARRY_CAPACITY = [100, 125, 160, 210]
const DZ_JOB_WEIGHT_BONUS = {
  scout: 20,
  mechanic: 40,
  engineer: 60
}

function dzFitnessCarryTier(player) {
  for (let tier = 3; tier >= 1; tier--) {
    if (player.tags.contains("dz_fitness_carry_" + tier)) return tier
  }
  return 0
}

function dzFitnessWeightCapacity(player) {
  let base = DZ_FITNESS_CARRY_CAPACITY[dzFitnessCarryTier(player)]
  let jobId = player.persistentData.getString("dz_job_id")
  let jobBonus = DZ_JOB_WEIGHT_BONUS[jobId] || 0
  let careerBonus = Math.max(0, player.persistentData.getInt("dz_growth_carry_bonus"))
  let talentBonus = Math.max(0, player.persistentData.getDouble("dz_talent_effect_carry"))
  return base + jobBonus + careerBonus + talentBonus
}

function dzFitnessWeightJob(player) {
  let jobId = player.persistentData.getString("dz_job_id")
  return {
    id: jobId || "none",
    bonus: DZ_JOB_WEIGHT_BONUS[jobId] || 0
  }
}

function dzSyncFitnessWeight(player, force) {
  if (!player || player.level.clientSide) return

  let capacity = dzFitnessWeightCapacity(player)
  let previous = player.persistentData.getInt("dz_fitness_weight_capacity")
  // Keep the calculated value available to the HUD/skills even on server packs
  // where the experimental Weight mod is disabled.
  player.persistentData.putInt("dz_fitness_weight_capacity", capacity)
  if (!DZ_WEIGHT_MOD_LOADED || DZ_WEIGHT_ATTRIBUTES == null) return
  if (!force && previous === capacity) return

  try {
    // The Weight mod's /weight max command sends a hard-coded Chinese message.
    // Set the same attribute directly and provide PROJECT DEADZONE's Japanese notice.
    let attribute = DZ_WEIGHT_ATTRIBUTES.MAX_CARRY_WEIGHT.get()
    let instance = player.getAttribute(attribute)
    if (!instance) return
    instance.setBaseValue(capacity)
    player.persistentData.putInt("dz_fitness_weight_capacity", capacity)
    player.tell(Text.of(
      "重量上限を " + capacity.toFixed(1) + " kg に設定しました。"
    ).aqua())
  } catch (e) {
    player.tell(Text.of("重量上限の設定に失敗しました: " + e).red())
  }
}

PlayerEvents.loggedIn(event => {
  dzSyncFitnessWeight(event.player, true)
})

PlayerEvents.respawned(event => {
  dzSyncFitnessWeight(event.player, true)
})

PlayerEvents.tick(event => {
  let player = event.player
  if (player.age % 100 === 0) dzSyncFitnessWeight(player, false)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonefitness")
    .requires(source => source.hasPermission(2))

  root.then(Commands.literal("weight_status").executes(ctx => {
    let player = ctx.source.player
    let tier = dzFitnessCarryTier(player)
    let capacity = dzFitnessWeightCapacity(player)
    let job = dzFitnessWeightJob(player)
    player.tell(Text.of(
      "Fitness Carry " + tier
      + " / Job " + job.id + " (+" + job.bonus + ")"
      + " / Career +" + player.persistentData.getInt("dz_growth_carry_bonus")
      + " / Talent +" + player.persistentData.getDouble("dz_talent_effect_carry").toFixed(1)
      + " / Max Weight " + capacity
    ).aqua())
    return 1
  }))

  root.then(Commands.literal("weight_sync").executes(ctx => {
    let player = ctx.source.player
    dzSyncFitnessWeight(player, true)
    player.tell(Text.of("Weight capacity synchronized.").green())
    return 1
  }))

  root.then(Commands.literal("held_vehicle_id").executes(ctx => {
    let player = ctx.source.player
    let held = player.mainHandItem
    if (!held || held.empty) {
      player.tell(Text.of("メインハンドに車両アイテムを持ってください。").gray())
      return 0
    }
    player.tell(Text.of(
      "Held ID: " + String(held.id)
      + " / Name: " + held.displayName.getString()
    ).aqua())
    return 1
  }))

  event.register(root)
})
