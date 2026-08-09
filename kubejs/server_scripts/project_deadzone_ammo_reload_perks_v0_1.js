// PROJECT DEADZONE Ammo / Reload Perks v0.2
// Compatible-ammo recovery uses TaCZ's public gun data. Magazine NBT,
// reload state and animation timing are never modified.

const DZ_TACZ_IGUN = Java.loadClass("com.tacz.guns.api.item.IGun")
const DZ_TACZ_ASSETS = Java.loadClass("com.tacz.guns.resource.CommonAssetsManager")

function dzWeaponBranchTier(player, category, branch) {
  for (let tier = 3; tier >= 1; tier--) {
    if (player.tags.contains("dz_" + category + "_" + branch + "_" + tier)) return tier
  }
  return 0
}

function dzCompatibleAmmoId(gunStack) {
  try {
    let gun = DZ_TACZ_IGUN.getIGunOrNull(gunStack)
    if (!gun) return null
    let gunData = DZ_TACZ_ASSETS.get().getGunData(gun.getGunId(gunStack))
    if (!gunData || !gunData.ammoId) return null
    return String(gunData.ammoId)
  } catch (error) {
    return null
  }
}

function dzGiveCompatibleAmmo(player, ammoId, count, message) {
  if (!ammoId || count <= 0) return false
  player.give(Item.of("tacz:ammo", count, `{AmmoId:"${ammoId}"}`))
  player.tell(Text.of(message + ": " + count + "発").gold())
  return true
}

TimelessGunEvents.entityKillByGun(event => {
  let player = event.attacker
  if (!player || !player.isPlayer() || player.level.clientSide) return

  let tier = dzWeaponBranchTier(player, "firearms", "ammo")
  let pouchBonus = player.persistentData.getBoolean("pdz_curio_ammo") ? 0.10 : 0
  if (tier <= 0 && pouchBonus <= 0) return

  let chance = Math.min(0.50, [0, 0.15, 0.25, 0.35][tier] + pouchBonus)
  if (Math.random() >= chance) return

  let ammoId = dzCompatibleAmmoId(player.mainHandItem)
  let count = tier >= 3 && event.headShot ? 2 : 1
  dzGiveCompatibleAmmo(player, ammoId, count, "弾薬回収")
})

TimelessGunEvents.gunReload(event => {
  let player = event.entity
  if (!player || !player.isPlayer() || player.level.clientSide) return

  let speedTier = dzWeaponBranchTier(player, "reload", "speed")
  if (speedTier === 1) {
    player.server.runCommandSilent("effect give " + player.username + " minecraft:speed 2 0 true")
  } else if (speedTier === 2) {
    player.server.runCommandSilent("effect give " + player.username + " minecraft:speed 2 0 true")
    player.server.runCommandSilent("effect give " + player.username + " minecraft:resistance 2 0 true")
  } else if (speedTier >= 3) {
    player.server.runCommandSilent("effect give " + player.username + " minecraft:speed 3 1 true")
    player.server.runCommandSilent("effect give " + player.username + " minecraft:resistance 3 0 true")
  }

  let magazineTier = dzWeaponBranchTier(player, "reload", "magazine")
  if (magazineTier <= 0) return

  let now = Date.now()
  let last = player.persistentData.getLong("dz_reload_magazine_recovery_ms")
  if (now - last < 1500) return

  let chance = [0, 0.10, 0.20, 0.30][magazineTier]
  if (Math.random() >= chance) return

  let ammoId = dzCompatibleAmmoId(event.gunItemStack)
  if (dzGiveCompatibleAmmo(player, ammoId, 1, "マガジン保持")) {
    player.persistentData.putLong("dz_reload_magazine_recovery_ms", now)
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonereload").requires(source => source.hasPermission(2))

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of(
      "Reload Speed " + dzWeaponBranchTier(player, "reload", "speed")
      + " / Magazine " + dzWeaponBranchTier(player, "reload", "magazine")
      + " / Malfunction " + dzWeaponBranchTier(player, "reload", "malfunction")
      + " / Firearms Ammo " + dzWeaponBranchTier(player, "firearms", "ammo")
      + " / Ammo Pouch " + player.persistentData.getBoolean("pdz_curio_ammo")
    ).aqua())
    return 1
  }))

  event.register(root)
})
