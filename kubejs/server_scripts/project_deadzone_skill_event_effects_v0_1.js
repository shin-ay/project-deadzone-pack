// PROJECT DEADZONE event-driven skill effects v0.1
// These react to player actions rather than applying permanent potion effects.

ItemEvents.foodEaten(event => {
  let player = event.entity
  if (!player || !player.isPlayer()) return

  let tier = dzHighestTier(player, "dz_survival_metabolism_", 3)
  if (tier > 0) {
    // Saturation is instant: Tier 1/2/3 restores 2/4/6 additional food points.
    player.potionEffects.add("minecraft:saturation", 1, tier - 1, false, false)
  }

  // Cook profession: meals become a small multiplayer support action.
  // Tier 1-3 improves the eater; Team Meal (tier 4) shares the effect nearby.
  let cooking = dzHighestTier(player, "dz_survival_cooking_", 5)
  let prepared = global.pdzIsPreparedMeal && global.pdzIsPreparedMeal(event.item)
  if (cooking > 0 && prepared) {
    player.potionEffects.add("minecraft:regeneration", 80 + cooking * 20, 0, false, false)
    if (cooking >= 3) {
      player.potionEffects.add("minecraft:resistance", 120, 0, false, false)
    }

    if (cooking >= 4) {
      player.server.runCommandSilent(
        "execute at " + player.username + " run effect give @a[distance=0.1..8] minecraft:regeneration 5 0 true"
      )
      player.server.runCommandSilent(
        "execute at " + player.username + " run effect give @a[distance=0.1..8] minecraft:saturation 1 0 true"
      )
    }
  }

  if (player.tags.contains("dz_mastery_recovery_1")) {
    player.potionEffects.add("minecraft:regeneration", 100, 0, false, false)
  }
})
