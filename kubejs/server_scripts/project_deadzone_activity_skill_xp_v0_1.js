// PROJECT DEADZONE Activity Skill XP v0.1
// Low baseline rewards. Quests, elites and bosses remain the main late-game XP.

// Retired by unified progression. Keep the file as a no-op so old pack updates
// do not resurrect ten hidden Puffish Skills XP tracks.
const PDZ_ACTIVITY_LEGACY_XP_ENABLED = false

function dzActivityAddXp(player, category, amount) {
  return 0
}

function dzActivityCooldown(player, key, milliseconds) {
  let now = Date.now()
  let nbtKey = "dz_xp_cd_" + key
  let last = player.persistentData.getLong(nbtKey)
  if (now - last < milliseconds) return false
  player.persistentData.putLong(nbtKey, now)
  return true
}

ItemEvents.foodEaten(event => {
  let player = event.entity
  if (!player || !player.isPlayer() || player.level.clientSide) return
  if (!dzActivityCooldown(player, "survival_food", 30000)) return
  dzActivityAddXp(player, "survival", 1)
})

ItemEvents.rightClicked(event => {
  let player = event.player
  if (!player || player.level.clientSide) return
  let id = String(event.item.id)
  if (!["apocalypsenow:bandage", "apocalypsenow:pain_killers", "apocalypsenow:morphine", "apocalypsenow:adrenaline_syringe", "apocalypsenow:medicalkit"].includes(id)) return
  if (!dzActivityCooldown(player, "medical_item", 15000)) return
  dzActivityAddXp(player, "medical", 2)
})

ItemEvents.crafted(event => {
  let player = event.player
  if (!player || player.level.clientSide) return
  let id = String(event.item.id)

  if (id.startsWith("blocky_bikes:") || id.startsWith("vehicle:") || id.startsWith("mts:")) {
    if (dzActivityCooldown(player, "mechanics_craft", 10000)) {
      dzActivityAddXp(player, "mechanics", 2)
    }
    return
  }

  if (id.startsWith("create:") || id.startsWith("immersiveengineering:")
      || id.startsWith("buildinggadgets2:")) {
    if (dzActivityCooldown(player, "engineering_craft", 10000)) {
      dzActivityAddXp(player, "engineering", 2)
    }
  }
})

BlockEvents.broken(event => {
  let player = event.player
  if (!player || player.level.clientSide) return
  let block = event.block
  let qualifies = block.hasTag("minecraft:logs")
    || block.hasTag("forge:ores")
    || block.hasTag("forge:storage_blocks")
  if (!qualifies) return
  if (!dzActivityCooldown(player, "scavenging_break", 20000)) return
  dzActivityAddXp(player, "scavenging", 1)
})

PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 20 !== 0) return

  let activeSeconds = player.persistentData.getInt("dz_fitness_active_seconds")
  if (player.isSprinting()) activeSeconds++
  else activeSeconds = Math.max(0, activeSeconds - 1)

  if (activeSeconds >= 60) {
    activeSeconds = 0
    dzActivityAddXp(player, "fitness", 1)
  }
  player.persistentData.putInt("dz_fitness_active_seconds", activeSeconds)
})

