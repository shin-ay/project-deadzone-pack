// PROJECT DEADZONE - damage diagnostics only.
// Legendary Survival Overhaul owns health, limb damage and lethal conditions.

function pdzDamageSourceId(source) {
  try { return String(source.type()) } catch (ignored) {}
  try { return String(source.getType()) } catch (ignored) {}
  try { return String(source) } catch (ignored) {}
  return 'unknown'
}

function pdzDamageEntityName(entity) {
  if (!entity) return 'none'
  try { return String(entity.type) } catch (ignored) {}
  try { return String(entity.getType()) } catch (ignored) {}
  return 'unknown'
}

function pdzDamageCapabilitySummary(player) {
  try {
    let root = player.serializeNBT()
    let caps = root.getCompound('ForgeCaps')
    let iterator = caps.getAllKeys().iterator()
    let found = []
    while (iterator.hasNext()) {
      let key = String(iterator.next())
      let lower = key.toLowerCase()
      if (lower.indexOf('firstaid') < 0 && lower.indexOf('revive') < 0 && lower.indexOf('health') < 0 && lower.indexOf('bleed') < 0) continue
      let value = String(caps.get(key)).replace(/[\r\n]+/g, ' ')
      if (value.length > 420) value = value.substring(0, 420) + '...'
      found.push(key + '=' + value)
    }
    return found.length ? found.join(' | ') : 'none'
  } catch (ignored) {
    return 'unavailable'
  }
}

function pdzDamageEffectSummary(player) {
  try {
    let effects = []
    player.potionEffects.active.forEach(effect => effects.push(String(effect.effect) + ':' + Number(effect.amplifier)))
    return effects.length ? effects.join(',') : 'none'
  } catch (ignored) {
    return 'unavailable'
  }
}

EntityEvents.hurt(event => {
  let player = event.entity
  if (!player || !player.isPlayer || !player.isPlayer() || player.level.clientSide) return

  let incoming = Math.max(0, Number(event.damage))
  if (!isFinite(incoming) || incoming <= 0) return

  let source = pdzDamageSourceId(event.source)
  // Never interfere with explicit administrative/void death sources.
  if (source.indexOf('out_of_world') >= 0 || source.indexOf('generic_kill') >= 0) return

  let health = Math.max(0, Number(player.health))
  let maxHealth = Math.max(1, Number(player.maxHealth))
  let absorption = Math.max(0, Number(player.absorptionAmount || 0))
  let lethal = incoming >= health + absorption
  let attacker = pdzDamageEntityName(event.source.actual)
  let direct = pdzDamageEntityName(event.source.direct)

  if (lethal || incoming >= maxHealth * 0.25) {
    console.warn('[PDZ DamageAudit] player=' + player.username
      + ' source=' + source
      + ' incoming=' + incoming.toFixed(2)
      + ' health=' + health.toFixed(2) + '/' + maxHealth.toFixed(2)
      + ' absorption=' + absorption.toFixed(2)
      + ' armor=' + Number(player.armorValue || 0)
      + ' attacker=' + attacker
      + ' direct=' + direct
      + ' effects=' + pdzDamageEffectSummary(player)
      + ' capabilities={' + pdzDamageCapabilitySummary(player) + '}')

    player.persistentData.putString('dz_last_damage_source', source)
    player.persistentData.putString('dz_last_damage_attacker', attacker)
    player.persistentData.putString('dz_last_damage_direct', direct)
    player.persistentData.putDouble('dz_last_damage_incoming', incoming)
    player.persistentData.putDouble('dz_last_damage_health', health)
    player.persistentData.putDouble('dz_last_damage_max_health', maxHealth)
    player.persistentData.putDouble('dz_last_damage_absorption', absorption)
    try { player.persistentData.putLong('dz_last_damage_tick', player.level.gameTime) } catch (ignored) {}
  }

})

EntityEvents.death(event => {
  let player = event.entity
  if (!player || !player.isPlayer || !player.isPlayer() || player.level.clientSide) return

  let data = player.persistentData
  let age = -1
  try { age = Number(player.level.gameTime) - Number(data.getLong('dz_last_damage_tick')) } catch (ignored) {}
  console.warn('[PDZ DeathAudit] player=' + player.username
    + ' deathSource=' + pdzDamageSourceId(event.source)
    + ' health=' + Number(player.health).toFixed(2) + '/' + Number(player.maxHealth).toFixed(2)
    + ' lastSource=' + String(data.getString('dz_last_damage_source'))
    + ' lastIncoming=' + Number(data.getDouble('dz_last_damage_incoming')).toFixed(2)
    + ' lastHealth=' + Number(data.getDouble('dz_last_damage_health')).toFixed(2)
    + '/' + Number(data.getDouble('dz_last_damage_max_health')).toFixed(2)
    + ' lastAbsorption=' + Number(data.getDouble('dz_last_damage_absorption')).toFixed(2)
    + ' lastAttacker=' + String(data.getString('dz_last_damage_attacker'))
    + ' lastDirect=' + String(data.getString('dz_last_damage_direct'))
    + ' ageTicks=' + age
    + ' effects=' + pdzDamageEffectSummary(player)
    + ' capabilities={' + pdzDamageCapabilitySummary(player) + '}')
})
