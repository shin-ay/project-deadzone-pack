// PROJECT DEADZONE Medical Perks v0.1
// Conservation refunds only when the player's inventory count actually fell.

const DZ_MEDICAL_CONSUMABLES = [
  "apocalypsenow:bandage",
  "apocalypsenow:pain_killers",
  "apocalypsenow:morphine",
  "apocalypsenow:adrenaline_syringe",
  "legendarysurvivaloverhaul:bandage",
  "legendarysurvivaloverhaul:medkit",
  "legendarysurvivaloverhaul:morphine"
]

function dzMedicalTier(player, branch) {
  for (let tier = 3; tier >= 1; tier--) {
    if (player.tags.contains("dz_medical_" + branch + "_" + tier)) return tier
  }
  return 0
}

ItemEvents.rightClicked(event => {
  let player = event.player
  if (!player || player.level.clientSide) return

  let tier = dzMedicalTier(player, "conservation")
  if (tier <= 0) return

  let itemId = String(event.item.id)
  if (!DZ_MEDICAL_CONSUMABLES.includes(itemId)) return

  let now = Date.now()
  let last = player.persistentData.getLong("dz_medical_conservation_check_ms")
  if (now - last < 2500) return
  player.persistentData.putLong("dz_medical_conservation_check_ms", now)

  let ingredient = Ingredient.of(itemId)
  let before = player.inventory.count(ingredient)

  player.server.scheduleInTicks(60, callback => {
    if (!player || !player.alive) return
    let after = player.inventory.count(ingredient)
    if (after >= before) return

    let chance = [0, 0.10, 0.20, 0.30][tier]
    if (Math.random() >= chance) return

    player.give(Item.of(itemId))
    player.tell(Text.of("医療物資を温存しました").green())
  })
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonemedical")
    .requires(source => source.hasPermission(2))

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let reviveTier = dzMedicalTier(player, "revive")
    let cooldownMs = [0, 900000, 600000, 300000][reviveTier]
    let elapsed = Date.now() - player.persistentData.getLong("dz_medical_revive_last_ms")
    let remaining = Math.max(0, Math.ceil((cooldownMs - elapsed) / 1000))
    player.tell(Text.of(
      "Medical Treatment " + dzMedicalTier(player, "treatment")
      + " / Conservation " + dzMedicalTier(player, "conservation")
      + " / Revive " + reviveTier
      + " / Revive CD " + (remaining > 0 ? remaining + "s" : "READY")
    ).aqua())
    return 1
  }))

  event.register(root)
})
