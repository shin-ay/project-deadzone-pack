// PROJECT DEADZONE - global dropped-item lifetime
// One rule owns every ItemEntity: block/explosion debris, mob loot and manual drops.
// Vanilla items are extended from five to ten minutes, while modded infinite or
// unusually long-lived drops are capped without adding a periodic entity scan.

const PDZ_DROPPED_ITEM_LIFETIME_TICKS = 20 * 60 * 10

EntityEvents.spawned('minecraft:item', event => {
  let entity = event.entity
  if (!entity || entity.level.clientSide) return

  entity.lifespan = PDZ_DROPPED_ITEM_LIFETIME_TICKS
  // setNoDespawn uses a negative age. Clamp the remaining time as well so an
  // item already marked persistent cannot outlive the global ten-minute cap.
  if (entity.ticksUntilDespawn > PDZ_DROPPED_ITEM_LIFETIME_TICKS) {
    entity.ticksUntilDespawn = PDZ_DROPPED_ITEM_LIFETIME_TICKS
  }
})
