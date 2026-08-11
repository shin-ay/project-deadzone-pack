// PROJECT DEADZONE - temperature stays meaningful but is never directly lethal.
// Legendary Survival Overhaul still supplies heat/cold debuffs and resource drain.

EntityEvents.hurt(event => {
  let entity = event.entity
  if (!entity || String(entity.type) !== "minecraft:player") return

  let source = "unknown"
  try { source = String(event.source.type()) }
  catch (ignored) {
    try { source = String(event.source.getType()) }
    catch (ignored2) { source = String(event.source) }
  }
  if (source.indexOf("legendarysurvivaloverhaul:hyperthermia") >= 0 ||
      source.indexOf("legendarysurvivaloverhaul:hypothermia") >= 0 ||
      source.indexOf("hyperthermia") >= 0 ||
      source.indexOf("hypothermia") >= 0) {
    event.cancel()
  }
})
