// PROJECT DEADZONE tactical resource bridge v0.1
// TaCZ gunplay feeds M&S Mana, presented to players as Tactical Resource.
// This keeps active skills relevant without introducing another power system.

const PDZTR_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const PDZTR_RESOURCE_TYPE = Java.loadClass('com.robertx22.mine_and_slash.saveclasses.unit.ResourceType')

function pdzTRRestore(player, amount) {
  if (!player || !player.isPlayer() || player.level.clientSide || amount <= 0) return
  try {
    let data = PDZTR_ENTITY_DATA.get(player)
    let resources = data.getResources()
    let current = Number(resources.get(player, PDZTR_RESOURCE_TYPE.mana))
    let maximum = Number(resources.getMax(player, PDZTR_RESOURCE_TYPE.mana))
    if (!isFinite(current) || !isFinite(maximum) || maximum <= 0 || current >= maximum) return
    resources.restore(player, PDZTR_RESOURCE_TYPE.mana, Math.min(amount, maximum - current))
  } catch (error) {
    if (!player.persistentData.getBoolean('dz_tactical_resource_error_reported')) {
      player.persistentData.putBoolean('dz_tactical_resource_error_reported', true)
      console.error('[PDZ Tactical Resource] restore failed: ' + String(error))
    }
  }
}

TimelessGunEvents.entityHurtByGunPost(event => {
  let player = event.getAttacker()
  let target = event.getHurtEntity()
  if (!player || !player.isPlayer() || player.level.clientSide || !target || target.isPlayer()) return
  try { if (player.isAlliedTo(target)) return } catch (ignored) {}

  let damage = Number(event.getBaseAmount())
  if (!isFinite(damage) || damage <= 0) return
  // Automatic weapons must not refill the entire bar in one burst. Precision
  // gives a small bonus, while the kill event below supplies the main payoff.
  let gain = Math.min(1.25, 0.35 + damage * 0.025)
  if (event.isHeadShot()) gain += 0.35
  pdzTRRestore(player, gain)
})

TimelessGunEvents.entityKillByGun(event => {
  let player = event.attacker
  if (!player || !player.isPlayer() || player.level.clientSide) return
  pdzTRRestore(player, event.headShot ? 4 : 3)
})

// Quickdraw is re-presented as Assault Overdrive. Its existing M&S effect is
// used as the marker so the ability also boosts real TaCZ hits for ten seconds.
TimelessGunEvents.entityHurtByGunPre(event => {
  let player = event.getAttacker()
  if (!player || !player.isPlayer() || player.level.clientSide) return
  let active = false
  try { active = player.hasEffect('mmorpg:instant_arrows') } catch (ignored) {}
  if (!active) return
  let amount = Number(event.getBaseAmount())
  if (isFinite(amount) && amount > 0) event.setBaseAmount(amount * 1.15)
})

