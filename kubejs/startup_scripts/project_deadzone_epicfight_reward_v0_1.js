// PROJECT DEADZONE Epic Fight combat reward v0.1
// Epic Fight battle mode is the committed melee stance. Mining-mode attacks
// remain available for work and emergencies, but a completed battle combo has
// the higher damage ceiling and feeds stamina back into defensive actions.

const PDZ_EF_CAPABILITIES = Java.loadClass(
  "yesman.epicfight.world.capabilities.EpicFightCapabilities"
)
const PDZ_EF_SKILL_SLOTS = Java.loadClass("yesman.epicfight.skill.SkillSlots")
const PDZ_EF_SKILL_DATA_KEYS = Java.loadClass("yesman.epicfight.skill.SkillDataKeys")

function pdzEpicFightHeldGun(player) {
  if (!player || !player.mainHandItem || player.mainHandItem.isEmpty()) return false
  let id = String(player.mainHandItem.id)
  return id === "tacz:modern_kinetic_gun" || id === "tacz:ammo"
}

function pdzEpicFightCombo(patch) {
  try {
    let basic = patch.getSkill(PDZ_EF_SKILL_SLOTS.BASIC_ATTACK)
    if (!basic || basic.isEmpty()) return 0
    let key = PDZ_EF_SKILL_DATA_KEYS.COMBO_COUNTER.get()
    return Math.max(0, Number(basic.getDataManager().getDataValue(key)) || 0)
  } catch (ignored) {
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
  if (!attacker || !attacker.isPlayer || !attacker.isPlayer()) return
  if (!target || target.isPlayer() || attacker.level.clientSide) return
  // Bows, thrown weapons and other projectiles still name the player as the
  // causing entity. Only a direct body/weapon hit belongs to this melee loop.
  if (direct && direct !== attacker) return
  if (event.amount <= 0 || pdzEpicFightHeldGun(attacker)) return

  let patch = null
  try { patch = PDZ_EF_CAPABILITIES.getServerPlayerPatch(attacker) } catch (ignored) {}
  if (!patch || !patch.isEpicFightMode()) return

  let combo = pdzEpicFightCombo(patch)
  let multiplier = pdzEpicFightMultiplier(combo)
  if (multiplier > 1.0) event.setAmount(event.amount * multiplier)

  // Successful pressure restores enough stamina to fund guard/dodge play,
  // with the largest refund on the third and later combo motions.
  try {
    let refund = combo >= 2 ? 4.0 : (combo === 1 ? 2.0 : 1.0)
    patch.setStamina(Math.min(patch.getMaxStamina(), patch.getStamina() + refund))
  } catch (ignored) {}

  attacker.persistentData.putInt("dz_epicfight_last_combo", combo)
  attacker.persistentData.putDouble("dz_epicfight_last_multiplier", multiplier)
})
