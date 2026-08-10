// PROJECT DEADZONE - player one-shot guard and First Aid diagnostics.
// First Aid owns limb health; this only prevents an unexplained full-health
// one-shot while recording the damage source and amount needed for balancing.

function pdzDamageSourceId(source) {
  try { return String(source.type()) } catch (ignored) {}
  try { return String(source.getType()) } catch (ignored) {}
  try { return String(source) } catch (ignored) {}
  return 'unknown'
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
  let nearFull = health >= maxHealth * 0.80
  let lethal = incoming >= health

  if (lethal || incoming >= maxHealth * 0.35) {
    console.warn('[PDZ DamageAudit] player=' + player.username
      + ' source=' + source
      + ' incoming=' + incoming.toFixed(2)
      + ' health=' + health.toFixed(2) + '/' + maxHealth.toFixed(2)
      + ' attacker=' + (event.source.actual ? String(event.source.actual.type) : 'none'))
  }

  // A healthy player must enter the First Aid / PlayerRevive flow instead of
  // vanishing to a single ordinary hit. Low-health and repeated hits remain lethal.
  if (nearFull && lethal) {
    let capped = Math.max(1, maxHealth * 0.45)
    event.setDamage(Math.min(incoming, capped))
    console.warn('[PDZ DamageGuard] capped full-health lethal hit for '
      + player.username + ': ' + incoming.toFixed(2) + ' -> ' + capped.toFixed(2)
      + ' source=' + source)
  }
})
