// PROJECT DEADZONE Firearms Perks v0.1
// Uses TaCZ's official pre-damage event. It does not modify gun NBT,
// magazines, animations or reload timing.

function dzFirearmsTier(player, branch) {
  for (let tier = 3; tier >= 1; tier--) {
    if (player.tags.contains("dz_firearms_" + branch + "_" + tier)) return tier
  }
  return 0
}

function dzFirearmsCore(player) {
  for (let rank = 6; rank >= 1; rank--) {
    if (player.tags.contains("dz_firearms_core_" + rank)) return rank
  }
  return 0
}

TimelessGunEvents.entityHurtByGunPre(event => {
  // Use explicit TaCZ wrapper methods. Rhino can treat the paired
  // get/set bean property as a FieldAndMethods object; Number(event.baseAmount)
  // then dereferences a null receiver on some TaCZ Tweaks instant-hit paths.
  let player = event.getAttacker()
  if (!player || !player.isPlayer() || player.level.clientSide) return
  let hurtEntity = event.getHurtEntity()
  let baseAmount = event.getBaseAmount()
  // TaCZ Tweaks also posts this hook for some block/instant-hit interactions
  // where no living target or numeric damage value exists.
  if (!hurtEntity || !isFinite(baseAmount) || baseAmount <= 0) return

  let core = dzFirearmsCore(player)
  let handling = dzFirearmsTier(player, "handling")
  if (core <= 0 && handling <= 0) return

  let multiplier = 1.0 + core * 0.01
  // Base JOB passive. JOB progression is independent from Talent SP.
  if (String(player.persistentData.getString('dz_job_id')) === 'weapons_expert') multiplier += 0.05
  let motion = player.deltaMovement
  let horizontalSpeedSq = motion ? motion.x * motion.x + motion.z * motion.z : 0
  let moving = horizontalSpeedSq >= 0.003
  let career2=String(player.persistentData.getString('dz_career_t2'))
  // Marksman rewards deliberate stationary hits; Assault Operator rewards
  // mobile pressure. Both remain usable outside their preferred state.
  if (career2==='marksman'&&!moving) multiplier+=event.isHeadShot()?0.12:0.04
  if (career2==='assault'&&moving) multiplier+=0.08
  let career3=String(player.persistentData.getString('dz_career_t3'))
  if (career3==='sniper'&&!moving&&event.isHeadShot()) multiplier+=0.20
  if (career3==='overwatch'&&!moving) multiplier+=0.10
  if (career3==='gunner'&&moving) multiplier+=0.12
  if (career3==='breacher'&&hurtEntity.distanceTo(player)<=5) multiplier+=0.18
  if (career3==='weapon_engineer') multiplier+=0.10
  if (career3==='ordnance_specialist'&&(hurtEntity.tags.contains('dz_elite')||hurtEntity.tags.contains('dz_named')||hurtEntity.tags.contains('dz_story_boss'))) multiplier+=0.15

  // Tier 1 rewards deliberate stationary precision.
  if (handling >= 1 && event.isHeadShot() && !moving) {
    multiplier += 0.08
  }

  // Tier 2 opens an alternative mobile marksman playstyle.
  if (handling >= 2 && event.isHeadShot() && moving) {
    multiplier += 0.08
  }

  // Tier 3 rewards keeping a burst on one target, not spraying a crowd.
  if (handling >= 3) {
    let now = Date.now()
    let targetId = String(hurtEntity.uuid)
    let oldTarget = player.persistentData.getString("dz_firearms_burst_target")
    let lastHit = player.persistentData.getLong("dz_firearms_burst_last_ms")
    let stacks = 0

    if (oldTarget === targetId && now - lastHit <= 1500) {
      stacks = Math.min(5, player.persistentData.getInt("dz_firearms_burst_stacks") + 1)
    }

    player.persistentData.putString("dz_firearms_burst_target", targetId)
    player.persistentData.putLong("dz_firearms_burst_last_ms", now)
    player.persistentData.putInt("dz_firearms_burst_stacks", stacks)
    multiplier += stacks * 0.02
  }

  event.setBaseAmount(baseAmount * multiplier)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonefirearms")
    .requires(source => source.hasPermission(2))

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of(
      "Firearms Core " + dzFirearmsCore(player)
      + " / Ammo " + dzFirearmsTier(player, "ammo")
      + " / Handling " + dzFirearmsTier(player, "handling")
      + " / Maintenance " + dzFirearmsTier(player, "maintenance")
    ).aqua())
    return 1
  }))

  event.register(root)
})
