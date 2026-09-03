// PROJECT DEADZONE Epic Fight combat reward v0.3
// Epic Fight battle mode is the committed melee stance. Mining-mode attacks
// remain available for work and emergencies. Melee attacks now receive a real
// per-hit damage roll, while battle-mode attack animations receive a short
// defensive commitment window so the player is not deleted mid-combo.

const PDZ_EF_CAPABILITIES = Java.loadClass(
  "yesman.epicfight.world.capabilities.EpicFightCapabilities"
)
const PDZ_EF_SKILL_SLOTS = Java.loadClass("yesman.epicfight.skill.SkillSlots")
const PDZ_EF_SKILL_DATA_KEYS = Java.loadClass("yesman.epicfight.skill.SkillDataKeys")
const PDZ_EF_EVENT_TYPES = Java.loadClass(
  "yesman.epicfight.world.entity.eventlistener.PlayerEventListener$EventType"
)
const PDZ_EF_UUID = Java.loadClass("java.util.UUID")
const PDZ_EF_MNS_STACK_SAVING = Java.loadClass(
  "com.robertx22.mine_and_slash.uncommon.datasaving.StackSaving"
)
const PDZ_EF_STAMINA_LISTENER_ID = PDZ_EF_UUID.fromString(
  "d34db300-0000-4000-8000-000000000020"
)
const PDZ_EF_COMBO_LISTENER_ID = PDZ_EF_UUID.fromString(
  "d34db300-0000-4000-8000-000000000021"
)
const PDZ_EF_STAMINA_COST_MULTIPLIER = 0.72
const PDZ_EF_BATTLE_DAMAGE_MULTIPLIER = 1.20
let PDZ_EF_STAMINA_LISTENERS = {}

function pdzEpicFightStackId(stack) {
  try { return String(stack.id).toLowerCase() } catch (ignored) {}
  try { return String(stack.getItem()).toLowerCase() } catch (ignored) {}
  return ""
}

function pdzEpicFightIsMeleeStack(stack) {
  if (!stack || stack.isEmpty()) return false
  let id = pdzEpicFightStackId(stack)
  if (id === "tacz:modern_kinetic_gun" || id === "tacz:ammo") return false

  let tags = [
    "great_sword", "short_sword", "longsword", "katana", "warhammer",
    "hammer", "great_axe", "axe", "dagger", "spear", "pike", "halberd",
    "mace", "scythe", "knuckle"
  ]
  try {
    if (stack.hasTag("minecraft:swords") || stack.hasTag("minecraft:axes")) return true
    for (let i = 0; i < tags.length; i++) {
      if (stack.hasTag("mmorpg:" + tags[i])) return true
    }
  } catch (ignored) {}

  return /axe|sword|knife|machete|katana|bat|hammer|spear|pike|halberd|club|cleaver|crowbar|scythe|sytche|baton|knuckle/.test(id)
}

function pdzEpicFightHeldGun(player) {
  if (!player || !player.mainHandItem || player.mainHandItem.isEmpty()) return false
  let id = String(player.mainHandItem.id)
  return id === "tacz:modern_kinetic_gun" || id === "tacz:ammo"
}

function pdzEpicFightPatch(player) {
  try { return PDZ_EF_CAPABILITIES.getServerPlayerPatch(player) } catch (ignored) {}
  return null
}

function pdzEpicFightInstallStaminaListener(player) {
  if (!player || player.level.clientSide) return
  let patch = pdzEpicFightPatch(player)
  if (!patch) return
  let key = String(player.uuid)
  let identity = String(patch.hashCode())
  if (PDZ_EF_STAMINA_LISTENERS[key] === identity) return
  try {
    let listener = patch.getEventListener()
    listener.removeListener(PDZ_EF_EVENT_TYPES.STAMINA_CONSUME_EVENT, PDZ_EF_STAMINA_LISTENER_ID)
    listener.addEventListener(
      PDZ_EF_EVENT_TYPES.STAMINA_CONSUME_EVENT,
      PDZ_EF_STAMINA_LISTENER_ID,
      consumeEvent => {
        let activePatch = consumeEvent.getPlayerPatch()
        let activePlayer = activePatch ? activePatch.getOriginal() : null
        if (!activePlayer || !activePatch.isEpicFightMode() ||
            !pdzEpicFightIsMeleeStack(activePlayer.mainHandItem)) return
        let original = Math.max(0, Number(consumeEvent.getAmount()) || 0)
        let adjusted = original * PDZ_EF_STAMINA_COST_MULTIPLIER
        consumeEvent.setAmount(adjusted)
        activePlayer.persistentData.putDouble("dz_epicfight_last_stamina_original", original)
        activePlayer.persistentData.putDouble("dz_epicfight_last_stamina_adjusted", adjusted)
      }
    )
    // BasicAttack advances COMBO_COUNTER before the Forge hurt event. Capture
    // the event's previous value: it is the animation stage that actually hit,
    // while reading the container later can describe the *next* swing.
    listener.removeListener(PDZ_EF_EVENT_TYPES.COMBO_COUNTER_HANDLE_EVENT, PDZ_EF_COMBO_LISTENER_ID)
    listener.addEventListener(
      PDZ_EF_EVENT_TYPES.COMBO_COUNTER_HANDLE_EVENT,
      PDZ_EF_COMBO_LISTENER_ID,
      comboEvent => {
        let activePatch = comboEvent.getPlayerPatch()
        let activePlayer = activePatch ? activePatch.getOriginal() : null
        if (!activePlayer) return
        activePlayer.persistentData.putInt("dz_epicfight_observed_combo", Math.max(0, Number(comboEvent.getPrevValue()) || 0))
        activePlayer.persistentData.putLong("dz_epicfight_observed_combo_tick", Math.floor(Number(activePlayer.level.gameTime)))
        try { activePlayer.persistentData.putString("dz_epicfight_last_animation", String(comboEvent.getAnimation())) }
        catch (ignored) {}
      }
    )
    PDZ_EF_STAMINA_LISTENERS[key] = identity
  } catch (error) {
    if (!player.persistentData.getBoolean("dz_epicfight_stamina_listener_error")) {
      player.persistentData.putBoolean("dz_epicfight_stamina_listener_error", true)
      console.error("[PROJECT DEADZONE][Epic Fight] stamina listener failed: " + error)
    }
  }
}

// PlayerPatch is recreated after login/respawn. Check its identity at low
// frequency and attach exactly one listener to the current server patch.
ForgeEvents.onEvent("net.minecraftforge.event.entity.living.LivingEvent$LivingTickEvent", event => {
  let player = event.entity
  if (!player || !player.isPlayer || !player.isPlayer() || player.level.clientSide || player.tickCount % 20 !== 0) return
  pdzEpicFightInstallStaminaListener(player)
})

function pdzEpicFightClamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

// M&S base gear min/max values are currently used only while the item itself is
// generated. Convert their ratio into a real per-hit damage band around the
// rolled item's fixed average. If a non-M&S melee weapon reaches this hook, use
// a conservative family band instead.
function pdzEpicFightDamageBand(stack) {
  let id = pdzEpicFightStackId(stack)
  let fallback = /great_axe|greataxe|warhammer|sledge|fire_axe/.test(id)
    ? { min: 0.78, max: 1.22, source: "heavy" }
    : (/dagger|knife|katana|rapier|baton/.test(id)
      ? { min: 0.92, max: 1.08, source: "light" }
      : { min: 0.86, max: 1.14, source: "standard" })

  try {
    let gear = PDZ_EF_MNS_STACK_SAVING.GEARS.loadFrom(stack)
    if (!gear || !gear.isWeapon()) return fallback
    let base = gear.GetBaseGearType()
    if (!base) return fallback
    let stats = base.baseStats()
    for (let i = 0; i < stats.size(); i++) {
      let stat = stats.get(i)
      if (String(stat.stat) !== "weapon_damage") continue
      let low = Number(stat.min)
      let high = Number(stat.max)
      let average = (low + high) * 0.5
      if (!isFinite(low) || !isFinite(high) || average <= 0 || high <= low) break
      return {
        min: pdzEpicFightClamp(low / average, 0.64, 0.96),
        max: pdzEpicFightClamp(high / average, 1.04, 1.36),
        source: "mns:" + String(base.GUID())
      }
    }
  } catch (ignored) {}
  return fallback
}

function pdzEpicFightRollDamage(player, stack, amount) {
  let band = pdzEpicFightDamageBand(stack)
  let roll = band.min + Math.random() * (band.max - band.min)
  player.persistentData.putDouble("dz_melee_variance_min", band.min)
  player.persistentData.putDouble("dz_melee_variance_max", band.max)
  player.persistentData.putDouble("dz_melee_variance_roll", roll)
  player.persistentData.putString("dz_melee_variance_source", band.source)
  return amount * roll
}

function pdzEpicFightCombo(player, patch) {
  let now = Math.floor(Number(player.level.gameTime))
  let observedAt = Number(player.persistentData.getLong("dz_epicfight_observed_combo_tick"))
  if (now - observedAt >= 0 && now - observedAt <= 20)
    return Math.max(0, Number(player.persistentData.getInt("dz_epicfight_observed_combo")) || 0)
  try {
    let basic = patch.getSkill(PDZ_EF_SKILL_SLOTS.BASIC_ATTACK)
    if (!basic || basic.isEmpty()) return 0
    let key = PDZ_EF_SKILL_DATA_KEYS.COMBO_COUNTER.get()
    return Math.max(0, Number(basic.getDataManager().getDataValue(key)) || 0)
  } catch (error) {
    if (!player.persistentData.getBoolean("dz_epicfight_combo_read_error")) {
      player.persistentData.putBoolean("dz_epicfight_combo_read_error", true)
      console.error("[PROJECT DEADZONE][Epic Fight] combo counter read failed: " + error)
    }
    return 0
  }
}

function pdzEpicFightMultiplier(combo) {
  if (combo >= 2) return 1.50
  if (combo === 1) return 1.15
  return 1.00
}

ForgeEvents.onEvent("net.minecraftforge.event.entity.living.LivingHurtEvent", event => {
  let attacker = event.source ? event.source.entity : null
  let direct = event.source ? event.source.directEntity : null
  let target = event.entity

  // Passive battle stance gives a small safety margin. The stronger reduction
  // exists only for the short period after committing to a melee swing.
  if (attacker && attacker !== target && (!attacker.isPlayer || !attacker.isPlayer()) &&
      target && target.isPlayer() &&
      !target.level.clientSide && event.amount > 0) {
    let targetPatch = pdzEpicFightPatch(target)
    let targetStack = target.mainHandItem
    if (targetPatch && targetPatch.isEpicFightMode() && pdzEpicFightIsMeleeStack(targetStack)) {
      let now = Number(target.level.gameTime)
      let guardUntil = Number(target.persistentData.getLong("dz_epicfight_guard_until"))
      let attacking = false
      try { attacking = targetPatch.getEntityState().attacking() } catch (ignored) {}
      // Battle mode itself must be sturdy enough to survive closing distance.
      // The wind-up/active animation and the brief post-hit commitment window
      // get the stronger reduction, preventing deaths during an uncancellable
      // attack without turning mining mode into the safest combat option.
      let reduction = (attacking || now <= guardUntil) ? 0.45 : 0.25
      event.setAmount(event.amount * (1.0 - reduction))
      target.persistentData.putDouble("dz_epicfight_last_defense", reduction)
    }
  }

  if (!attacker || !attacker.isPlayer || !attacker.isPlayer()) return
  if (!target || target.isPlayer() || attacker.level.clientSide) return
  // Bows, thrown weapons and other projectiles still name the player as the
  // causing entity. Only a direct body/weapon hit belongs to this melee loop.
  if (direct && direct !== attacker) return
  if (event.amount <= 0 || pdzEpicFightHeldGun(attacker)) return
  let stack = attacker.mainHandItem
  if (!pdzEpicFightIsMeleeStack(stack)) return

  // This is the actual per-hit variance. It applies to both normal Minecraft
  // melee and Epic Fight so the tooltip's damage band is no longer cosmetic.
  event.setAmount(pdzEpicFightRollDamage(attacker, stack, event.amount))

  let patch = pdzEpicFightPatch(attacker)
  if (!patch || !patch.isEpicFightMode()) return

  let combo = pdzEpicFightCombo(attacker, patch)
  let multiplier = pdzEpicFightMultiplier(combo)
  let beforeBattle = Number(event.amount)
  event.setAmount(beforeBattle * PDZ_EF_BATTLE_DAMAGE_MULTIPLIER * multiplier)

  let now = Number(attacker.level.gameTime)
  let guardTicks = combo >= 2 ? 18 : (combo === 1 ? 15 : 12)
  attacker.persistentData.putLong("dz_epicfight_guard_until", Math.floor(now + guardTicks))

  // Successful pressure restores enough stamina to fund guard/dodge play,
  // with the largest refund on the third and later combo motions.
  try {
    let refund = combo >= 2 ? 5.5 : (combo === 1 ? 3.5 : 2.0)
    patch.setStamina(Math.min(patch.getMaxStamina(), patch.getStamina() + refund))
  } catch (ignored) {}

  attacker.persistentData.putInt("dz_epicfight_last_combo", combo)
  attacker.persistentData.putDouble("dz_epicfight_last_base_multiplier", PDZ_EF_BATTLE_DAMAGE_MULTIPLIER)
  attacker.persistentData.putDouble("dz_epicfight_last_multiplier", multiplier)
  attacker.persistentData.putDouble("dz_epicfight_last_before_battle", beforeBattle)
  attacker.persistentData.putDouble("dz_epicfight_last_after_battle", Number(event.amount))
})
