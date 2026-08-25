// PROJECT DEADZONE Firearms Perks v0.1
// Uses TaCZ's official pre-damage event. It does not modify gun NBT,
// magazines, animations or reload timing.

const PDZ_FIREARMS_MNS_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')

function dzMnsWeaponDamageBonus(player) {
  try {
    let unit = PDZ_FIREARMS_MNS_ENTITY_DATA.get(player).getUnit()
    let stat = unit.getCalculatedStat('weapon_damage')
    if (!stat) return 0
    // StatData#getMultiplier is 1 + value / 100. A valid More multiplier is
    // normally 1. Some non-native weapons can briefly expose 0 while M&S is
    // rebuilding the Unit after inventory conversion. Treat that transient 0
    // as neutral: using it as a real multiplier reduced a 4/8 damage TaCZ hit
    // to exactly 0.4/0.8. M&S weapon_damage may increase firearm output, but an
    // incomplete compatibility state must never erase 90% of the gun's base.
    let additive = Number(stat.getMultiplier())
    let more = Number(stat.getMoreStatTypeMulti())
    if (!isFinite(additive) || additive <= 0) additive = 1.0
    if (!isFinite(more) || more <= 0) more = 1.0
    let total = additive * more
    if (!isFinite(total) || total <= 1.0) return 0
    return Math.min(4.0, total - 1.0)
  } catch (ignored) {
    return 0
  }
}

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

function dzBallisticFx(player, target, mode) {
  let server = player.server
  // Always use explicit Java getters here. Rhino exposes bean properties as
  // FieldAndMethods on some transformed TaCZ entities and arithmetic on those
  // wrappers throws a null-receiver NPE.
  let x = Number(target.getX()).toFixed(2)
  let y = (Number(target.getY()) + Number(target.getBbHeight()) * 0.5).toFixed(2)
  let z = Number(target.getZ()).toFixed(2)
  if (mode === 'explosive') {
    server.runCommandSilent('execute positioned ' + x + ' ' + y + ' ' + z + ' run particle minecraft:explosion ~ ~ ~ 0 0 0 0 1 force')
    server.runCommandSilent('execute positioned ' + x + ' ' + y + ' ' + z + ' run playsound minecraft:entity.generic.explode player @a[distance=..24] ~ ~ ~ 0.65 1.35')
  } else if (mode === 'corrosive') {
    target.potionEffects.add('minecraft:poison', 100, 0, false, true)
    target.potionEffects.add('minecraft:weakness', 80, 0, false, true)
    server.runCommandSilent('execute positioned ' + x + ' ' + y + ' ' + z + ' run particle minecraft:item_slime ~ ~ ~ 0.25 0.25 0.25 0.03 12 force')
  }
}

TimelessGunEvents.entityHurtByGunPre(event => {
  let stage = 'event'
  let player = null
  try {
  // Use explicit TaCZ wrapper methods. Rhino can treat the paired
  // get/set bean property as a FieldAndMethods object; Number(event.baseAmount)
  // then dereferences a null receiver on some TaCZ Tweaks instant-hit paths.
  player = event.getAttacker()
  if (!player || !player.isPlayer() || player.level.clientSide) return
  stage = 'target'
  let hurtEntity = event.getHurtEntity()
  let baseAmount = Number(event.getBaseAmount())
  // TaCZ Tweaks also posts this hook for some block/instant-hit interactions
  // where no living target or numeric damage value exists.
  if (!hurtEntity || !isFinite(baseAmount) || baseAmount <= 0) return

  // Ranged PDZ abilities are ammunition protocols, not free-cast projectiles.
  // Without a TaCZ hit these marker effects have no offensive output.
  stage = 'ability-markers'
  let explosiveRounds = false
  let corrosiveRounds = false
  try { explosiveRounds = player.hasEffect('project_deadzone:explosive_rounds') } catch (ignored) {}
  try { corrosiveRounds = player.hasEffect('project_deadzone:corrosive_rounds') } catch (ignored) {}
  if (explosiveRounds) {
    baseAmount *= 1.35
    dzBallisticFx(player, hurtEntity, 'explosive')
  }
  if (corrosiveRounds) {
    baseAmount *= 1.10
    dzBallisticFx(player, hurtEntity, 'corrosive')
  }

  stage = 'bonuses'
  let core = dzFirearmsCore(player)
  let handling = dzFirearmsTier(player, "handling")

  let multiplier = 1.0 + core * 0.01

  // Keep every firearm damage modifier on TaCZ's single pre-damage path.
  // Generic hurt handlers must not subtract HP again after this event.
  try {
    if (typeof pdztrValue === 'function') multiplier += Math.max(0, Number(pdztrValue(player, 'gunDamage')))
  } catch (ignored) {}
  // TaCZ bypasses M&S's normal melee damage path. Fold the player's calculated
  // M&S weapon_damage into TaCZ's one and only pre-damage hook instead.
  multiplier += dzMnsWeaponDamageBonus(player)
  // Base JOB passive. JOB progression is independent from Talent SP.
  if (String(player.persistentData.getString('dz_job_id')) === 'weapons_expert') multiplier += 0.05
  let motion = player.getDeltaMovement()
  let motionX = motion ? Number(motion.x()) : 0
  let motionZ = motion ? Number(motion.z()) : 0
  let horizontalSpeedSq = motionX * motionX + motionZ * motionZ
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

  stage = 'apply'
  let finalAmount = Number(baseAmount * multiplier)
  if (!isFinite(finalAmount) || finalAmount <= 0) return
  // Keep a cheap last-hit snapshot for balancing. It has no chat/network cost
  // unless an administrator explicitly opens the diagnostic screen.
  player.persistentData.putDouble('dz_firearms_last_base',baseAmount)
  player.persistentData.putDouble('dz_firearms_last_multiplier',multiplier)
  player.persistentData.putDouble('dz_firearms_last_final',finalAmount)
  event.setBaseAmount(finalAmount)
  if (player.persistentData.getBoolean('dz_firearms_damage_debug')) {
    player.tell(Text.of('[Gun DMG] TaCZ base '+baseAmount.toFixed(2)+' x PDZ '+multiplier.toFixed(3)+' = pre-armor '+finalAmount.toFixed(2)).gray())
  }
  } catch (error) {
    // TaCZ's event bridge otherwise reports only "null" and floods the log on
    // every pellet. Report one useful diagnostic per player/session instead.
    if (player && !player.persistentData.getBoolean('dz_firearms_hook_error_reported')) {
      player.persistentData.putBoolean('dz_firearms_hook_error_reported', true)
      console.error('[PDZ Gun Hook] stage=' + stage + ' error=' + String(error))
    }
  }
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
    player.tell(Text.of(
      'Last hit: base '+Number(player.persistentData.getDouble('dz_firearms_last_base')).toFixed(2)
      +' x '+Number(player.persistentData.getDouble('dz_firearms_last_multiplier')).toFixed(3)
      +' = '+Number(player.persistentData.getDouble('dz_firearms_last_final')).toFixed(2)+' pre-armor'
    ).gray())
    return 1
  }))

  root.then(Commands.literal('debug_on').executes(ctx => {
    ctx.source.player.persistentData.putBoolean('dz_firearms_damage_debug',true)
    ctx.source.player.tell(Text.of('銃ダメージ内訳表示: ON').green())
    return 1
  }))
  root.then(Commands.literal('debug_off').executes(ctx => {
    ctx.source.player.persistentData.putBoolean('dz_firearms_damage_debug',false)
    ctx.source.player.tell(Text.of('銃ダメージ内訳表示: OFF').yellow())
    return 1
  }))

  event.register(root)
})
