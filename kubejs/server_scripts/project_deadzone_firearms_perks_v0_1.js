// PROJECT DEADZONE Firearms Perks v0.1
// Uses TaCZ's official pre-damage event. It does not modify gun NBT,
// magazines, animations or reload timing.

const PDZ_FIREARMS_MNS_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const PDZ_FIREARMS_MNS_RESOURCE_TYPE = Java.loadClass('com.robertx22.mine_and_slash.saveclasses.unit.ResourceType')
const PDZ_FIREARMS_TACZ_IGUN = Java.loadClass('com.tacz.guns.api.item.IGun')
const PDZ_FIREARMS_TACZ_ASSETS = Java.loadClass('com.tacz.guns.resource.CommonAssetsManager')

// TaCZ gun packs already expose a common weapon type in their gun index. Use
// that metadata instead of maintaining a brittle list of hundreds of GunIds.
// These multipliers put firearms above ordinary melee per committed attack,
// while preserving the different RPM, magazine, recoil and ammunition costs.
const PDZ_FIREARMS_ARCHETYPE_MULTIPLIERS = {
  pistol: 1.60,
  handgun: 1.60,
  revolver: 1.75,
  smg: 1.55,
  submachine_gun: 1.55,
  rifle: 1.75,
  assault_rifle: 1.75,
  battle_rifle: 1.90,
  dmr: 2.00,
  marksman_rifle: 2.00,
  sniper: 2.25,
  sniper_rifle: 2.25,
  shotgun: 1.55,
  machine_gun: 1.65,
  mg: 1.65,
  lmg: 1.65,
  launcher: 1.35,
  rocket_launcher: 1.35
}

function dzFirearmsProfile(stack) {
  let profile = {id:'unknown', type:'unknown', multiplier:1.65}
  try {
    let gun = PDZ_FIREARMS_TACZ_IGUN.getIGunOrNull(stack)
    if (!gun) return profile
    let gunId = gun.getGunId(stack)
    profile.id = String(gunId)
    let index = PDZ_FIREARMS_TACZ_ASSETS.get().getGunIndex(gunId)
    if (!index) return profile
    let type = String(index.getType() || 'unknown').toLowerCase().replace(/[ -]/g, '_')
    profile.type = type
    if (PDZ_FIREARMS_ARCHETYPE_MULTIPLIERS[type]) {
      profile.multiplier = PDZ_FIREARMS_ARCHETYPE_MULTIPLIERS[type]
    } else if (type.indexOf('sniper') >= 0) profile.multiplier = 2.25
    else if (type.indexOf('marksman') >= 0 || type.indexOf('dmr') >= 0) profile.multiplier = 2.00
    else if (type.indexOf('shotgun') >= 0) profile.multiplier = 1.55
    else if (type.indexOf('machine') >= 0 || type.indexOf('lmg') >= 0) profile.multiplier = 1.65
    else if (type.indexOf('smg') >= 0) profile.multiplier = 1.55
    else if (type.indexOf('pistol') >= 0 || type.indexOf('handgun') >= 0) profile.multiplier = 1.60
    else if (type.indexOf('rifle') >= 0) profile.multiplier = 1.75
    else if (type.indexOf('launcher') >= 0) profile.multiplier = 1.35
  } catch (ignored) {}
  return profile
}

function dzMnsStatValue(player, id) {
  try {
    let stat = PDZ_FIREARMS_MNS_ENTITY_DATA.get(player).getUnit().getCalculatedStat(id)
    if (!stat) return 0
    let value = Number(stat.getValue())
    return isFinite(value) ? Math.max(0, value) : 0
  } catch (ignored) {
    return 0
  }
}

function dzMnsMaxResource(player, type) {
  try {
    let data = PDZ_FIREARMS_MNS_ENTITY_DATA.get(player)
    let value = Number(data.getResources().getMax(player, type))
    return isFinite(value) ? Math.max(0, value) : 0
  } catch (ignored) {
    return 0
  }
}

function dzQueueGunLifesteal(player, damage) {
  // TaCZ posts its own damage events and therefore does not reliably reach
  // Mine and Slash's DamageEvent. Feed the real M&S leech queue instead of
  // healing vanilla HP directly, so native leech speed/caps remain relevant.
  let percent = Math.min(20, dzMnsStatValue(player, 'lifesteal'))
  if (percent <= 0 || !isFinite(damage) || damage <= 0) return 0
  try {
    let data = PDZ_FIREARMS_MNS_ENTITY_DATA.get(player)
    let maxHealth = dzMnsMaxResource(player, PDZ_FIREARMS_MNS_RESOURCE_TYPE.health)
    let amount = damage * percent / 100
    // A shotgun/pellet or extreme late-game roll must not instantly refill a
    // whole life bar per hit. M&S's own queue adds its further per-second cap.
    if (maxHealth > 0) amount = Math.min(amount, maxHealth * 0.05)
    if (!isFinite(amount) || amount <= 0) return 0
    data.leech.addLeech(PDZ_FIREARMS_MNS_RESOURCE_TYPE.health, amount)
    player.persistentData.putDouble('dz_firearms_last_lifesteal_pct', percent)
    player.persistentData.putDouble('dz_firearms_last_lifesteal', amount)
    return amount
  } catch (ignored) {
    return 0
  }
}

function dzRestoreGunKillResource(player, statId, type) {
  let amount = dzMnsStatValue(player, statId)
  if (amount <= 0) return 0
  try {
    let data = PDZ_FIREARMS_MNS_ENTITY_DATA.get(player)
    let maximum = dzMnsMaxResource(player, type)
    // On-kill is deliberately punchier than per-hit leech, but still bounded
    // against malformed external affixes and rapid multi-kills.
    if (maximum > 0) amount = Math.min(amount, maximum * 0.15)
    amount = Math.min(amount, 100)
    data.getResources().restore(player, type, amount)
    return amount
  } catch (ignored) {
    return 0
  }
}

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

function dzMnsGunCritical(player) {
  // M&S native bases are 1% critical_hit and 100% critical_damage. TaCZ does
  // not enter M&S's on_damage critical pipeline, so reproduce that one roll
  // here with M&S's own documented stat maxima instead of inventing a tier.
  let chance = Math.min(100, dzMnsStatValue(player, 'critical_hit'))
  let damage = Math.min(500, dzMnsStatValue(player, 'critical_damage'))
  let critical = chance > 0 && Math.random() * 100 < chance
  let multiplier = critical ? 1 + damage / 100 : 1
  player.persistentData.putDouble('dz_firearms_last_crit_chance', chance)
  player.persistentData.putDouble('dz_firearms_last_crit_damage', damage)
  player.persistentData.putBoolean('dz_firearms_last_critical', critical)
  return multiplier
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
  let gunProfile = dzFirearmsProfile(player.mainHandItem)

  let multiplier = gunProfile.multiplier + core * 0.01

  // Keep every firearm damage modifier on TaCZ's single pre-damage path.
  // Generic hurt handlers must not subtract HP again after this event.
  try {
    if (typeof pdztrValue === 'function') multiplier += Math.max(0, Number(pdztrValue(player, 'gunDamage')))
  } catch (ignored) {}
  // Do not apply M&S weapon damage here. PDZ's gun WeaponType override routes
  // the TaCZ result through M&S compatibility conversion after this hook, so
  // Weapon Damage, Crit, Affix and mitigation are calculated exactly once.
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
  let criticalMultiplier = 1.0
  let finalAmount = Number(baseAmount * multiplier * criticalMultiplier)
  if (!isFinite(finalAmount) || finalAmount <= 0) return
  // Keep a cheap last-hit snapshot for balancing. It has no chat/network cost
  // unless an administrator explicitly opens the diagnostic screen.
  player.persistentData.putDouble('dz_firearms_last_base',baseAmount)
  player.persistentData.putDouble('dz_firearms_last_multiplier',multiplier)
  player.persistentData.putDouble('dz_firearms_last_crit_multiplier',criticalMultiplier)
  player.persistentData.putDouble('dz_firearms_last_final',finalAmount)
  player.persistentData.putString('dz_firearms_last_gun_id',gunProfile.id)
  player.persistentData.putString('dz_firearms_last_gun_type',gunProfile.type)
  try{
    if(typeof pdzCteRecordOutgoing==='function')pdzCteRecordOutgoing(player,hurtEntity,finalAmount,event.isHeadShot()?'gun_head':'gun_body')
  }catch(ignored){}
  event.setBaseAmount(finalAmount)
  if (player.persistentData.getBoolean('dz_firearms_damage_debug')) {
    player.tell(Text.of('[Gun DMG] '+gunProfile.type+' / TaCZ base '+baseAmount.toFixed(2)+' x PDZ '+multiplier.toFixed(3)+' = pre-armor '+finalAmount.toFixed(2)).gray())
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

// M&S compatibility conversion owns Crit, Lifesteal, Health on Kill and Magic
// Shield on Kill. Replaying them from TaCZ Post/Kill events would double proc.

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
      'Last hit: '+player.persistentData.getString('dz_firearms_last_gun_type')
      +' / '+player.persistentData.getString('dz_firearms_last_gun_id')
      +' / base '+Number(player.persistentData.getDouble('dz_firearms_last_base')).toFixed(2)
      +' x '+Number(player.persistentData.getDouble('dz_firearms_last_multiplier')).toFixed(3)
      +' x crit '+Number(player.persistentData.getDouble('dz_firearms_last_crit_multiplier')).toFixed(2)
      +' = '+Number(player.persistentData.getDouble('dz_firearms_last_final')).toFixed(2)+' pre-armor'
    ).gray())
    player.tell(Text.of('M&S Weapon Damage・Crit・Affix・Leech: native compatibility conversion').gray())
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
