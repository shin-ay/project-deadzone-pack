// PROJECT DEADZONE - M&S health/death diagnostics.
// Mine and Slash is authoritative for HP and death. LSO owns localized trauma
// only. This script never invents a second health pool or cancels a valid death.

const PDZ_DAMAGE_MNS_HEALTH = Java.loadClass('com.robertx22.mine_and_slash.uncommon.utilityclasses.HealthUtils')
const PDZ_DAMAGE_EFFECT_REGISTRY = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').MOB_EFFECT

function pdzDamageMnsHealth(player) {
  try { return Math.max(0, Number(PDZ_DAMAGE_MNS_HEALTH.getCurrentHealth(player))) }
  catch (ignored) { return Math.max(0, Number(player.health)) }
}

function pdzDamageMnsMax(player) {
  try { return Math.max(1, Number(PDZ_DAMAGE_MNS_HEALTH.getMaxHealth(player))) }
  catch (ignored) { return Math.max(1, Number(player.maxHealth)) }
}

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
    player.potionEffects.active.forEach(effect => {
      let id = 'unknown'
      try { id = String(PDZ_DAMAGE_EFFECT_REGISTRY.getKey(effect.effect)) } catch (ignored) {}
      effects.push(id + ':' + Number(effect.amplifier))
    })
    return effects.length ? effects.join(',') : 'none'
  } catch (ignored) {
    return 'unavailable'
  }
}

EntityEvents.hurt(event => {
  let player = event.entity
  if (!player || !player.isPlayer || !player.isPlayer() || player.level.clientSide) return

  // PlayerRevive can leave a dying player targetable for a few ticks (fire is
  // the most visible case). Re-processing damage at HP 0 can race the final
  // death handlers used by inventory/grave mods and also floods the log.
  // The player has already reached the terminal state, so subsequent hits
  // must not be processed.
  if (Number(player.health) <= 0) {
    event.cancel()
    return
  }

  let incoming = Math.max(0, Number(event.damage))
  if (!isFinite(incoming) || incoming <= 0) return

  let source = pdzDamageSourceId(event.source)
  let sourceLower = source.toLowerCase()
  let dimension = 'unknown'
  try { dimension = String(player.level.dimension) } catch (ignored) {}

  // The intake is a void dimension. Rescue a player if the lobby island has
  // not finished loading instead of deleting their freshly issued starter kit.
  if (dimension.indexOf('lobby:lobby_dimension') >= 0 &&
      (sourceLower.indexOf('outofworld') >= 0 || sourceLower.indexOf('out_of_world') >= 0)) {
    event.cancel()
    player.teleportTo(9.5, 11, 9.5)
    try { player.fallDistance = 0 } catch (ignored) {}
    player.runCommandSilent('effect give @s minecraft:resistance 5 255 true')
    player.runCommandSilent('effect give @s minecraft:regeneration 5 4 true')
    console.warn('[PDZ LobbySafety] rescued ' + player.username + ' from lobby void damage')
    return
  }

  // Never interfere with explicit administrative/void death sources elsewhere.
  if (sourceLower.indexOf('outofworld') >= 0 || sourceLower.indexOf('out_of_world') >= 0 ||
      sourceLower.indexOf('generic_kill') >= 0) return

  let health = Math.max(0, Number(player.health))
  let maxHealth = Math.max(1, Number(player.maxHealth))
  let mnsHealth = pdzDamageMnsHealth(player)
  let mnsMaxHealth = pdzDamageMnsMax(player)
  let absorption = Math.max(0, Number(player.absorptionAmount || 0))
  let lethal = incoming >= health + absorption
  let attacker = pdzDamageEntityName(event.source.actual)
  let direct = pdzDamageEntityName(event.source.direct)

  if (lethal || incoming >= maxHealth * 0.25) {
    console.warn('[PDZ DamageAudit] player=' + player.username
      + ' source=' + source
      + ' incoming=' + incoming.toFixed(2)
      + ' health=' + health.toFixed(2) + '/' + maxHealth.toFixed(2)
      + ' mnsHealth=' + mnsHealth.toFixed(2) + '/' + mnsMaxHealth.toFixed(2)
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
    player.persistentData.putDouble('dz_last_damage_mns_health', mnsHealth)
    player.persistentData.putDouble('dz_last_damage_mns_max_health', mnsMaxHealth)
    player.persistentData.putDouble('dz_last_damage_absorption', absorption)
    try { player.persistentData.putDouble('dz_last_damage_tick', Number(player.level.gameTime)) } catch (ignored) {}

    let beforeHealth = health
    let beforeMns = mnsHealth
    player.server.scheduleInTicks(2, () => {
      if (!player) return
      let afterHealth = Math.max(0, Number(player.health))
      let afterMns = pdzDamageMnsHealth(player)
      console.warn('[PDZ DamageAuditPost] player=' + player.username
        + ' source=' + source
        + ' vanilla=' + beforeHealth.toFixed(2) + '->' + afterHealth.toFixed(2)
        + ' delta=' + Math.max(0, beforeHealth - afterHealth).toFixed(2)
        + ' mns=' + beforeMns.toFixed(2) + '->' + afterMns.toFixed(2)
        + ' delta=' + Math.max(0, beforeMns - afterMns).toFixed(2)
        + ' effects=' + pdzDamageEffectSummary(player))
    })
  }

})

EntityEvents.death(event => {
  let player = event.entity
  if (!player || !player.isPlayer || !player.isPlayer() || player.level.clientSide) return

  let data = player.persistentData
  let age = -1
  try { age = Number(player.level.gameTime) - Number(data.getDouble('dz_last_damage_tick')) } catch (ignored) {}
  console.warn('[PDZ DeathAudit] player=' + player.username
    + ' deathSource=' + pdzDamageSourceId(event.source)
    + ' health=' + Number(player.health).toFixed(2) + '/' + Number(player.maxHealth).toFixed(2)
    + ' mnsHealth=' + pdzDamageMnsHealth(player).toFixed(2) + '/' + pdzDamageMnsMax(player).toFixed(2)
    + ' lastSource=' + String(data.getString('dz_last_damage_source'))
    + ' lastIncoming=' + Number(data.getDouble('dz_last_damage_incoming')).toFixed(2)
    + ' lastHealth=' + Number(data.getDouble('dz_last_damage_health')).toFixed(2)
    + '/' + Number(data.getDouble('dz_last_damage_max_health')).toFixed(2)
    + ' lastMnsHealth=' + Number(data.getDouble('dz_last_damage_mns_health')).toFixed(2)
    + '/' + Number(data.getDouble('dz_last_damage_mns_max_health')).toFixed(2)
    + ' lastAbsorption=' + Number(data.getDouble('dz_last_damage_absorption')).toFixed(2)
    + ' lastAttacker=' + String(data.getString('dz_last_damage_attacker'))
    + ' lastDirect=' + String(data.getString('dz_last_damage_direct'))
    + ' ageTicks=' + age
    + ' effects=' + pdzDamageEffectSummary(player)
    + ' capabilities={' + pdzDamageCapabilitySummary(player) + '}')
})
