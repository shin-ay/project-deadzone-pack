// PROJECT DEADZONE Buddy orders and field roles v0.1
const DZ_BCTL_TYPE = "simpleenemymod:pmcunit"
const DZ_BCTL_ORDER = Java.loadClass(
  "net.nekoyuni.SimpleEnemyMod.entity.ai.orders.OrderType")
const DZ_BCTL_CAPS = Java.loadClass("net.minecraftforge.common.capabilities.ForgeCapabilities")
const DZ_BCTL_RL = Java.loadClass("net.minecraft.resources.ResourceLocation")
const DZ_BCTL_GUN_BUILDER = Java.loadClass("com.tacz.guns.api.item.builder.GunItemBuilder")
const DZ_BCTL_AMMO_BUILDER = Java.loadClass("com.tacz.guns.api.item.builder.AmmoItemBuilder")
const DZ_BCTL_FIRE_MODE = Java.loadClass("com.tacz.guns.api.item.gun.FireMode")
const DZ_BCTL_TACE_API = Java.loadClass("com.tacz.guns.api.TimelessAPI")

const DZ_BCTL_GUNS = {
  assault: ["tacz:type_81","tacz:type_81","tacz:ak47","tacz:m4a1","tacz:scar_l","tacz:hk416d"],
  support: ["tacz:rpk","tacz:rpk","tacz:rpk","tacz:m249","tacz:m249","tacz:m249"],
  scout:   ["tacz:glock_17","tacz:glock_17","tacz:m870","tacz:scar_l","tacz:scar_l","tacz:hk416d"],
  medic:   ["tacz:glock_17","tacz:glock_17","tacz:m4a1","tacz:m4a1","tacz:hk416d","tacz:hk416d"]
}

function dzBctlOwner(entity) {
  if (!entity || String(entity.type) !== DZ_BCTL_TYPE) return ""
  try { return String(entity.getOwnerUUID()) } catch (ignored) { return "" }
}
function dzBctlFind(player) {
  let result = null, owner = String(player.uuid)
  player.level.entities.forEach(entity => {
    if (!result && dzBctlOwner(entity) === owner) result = entity
  })
  return result
}
function dzBctlLoaded(player) {
  let buddy = dzBctlFind(player)
  if (!buddy) player.tell(Text.of(
    "Buddyが現在のディメンションで読み込まれていません。近づいて再実行してください。"
  ).yellow())
  return buddy
}
function dzBctlOrder(player, order, message) {
  let buddy = dzBctlLoaded(player)
  if (!buddy) return 0
  if (buddy.tags.contains("dz_buddy_downed")) {
    player.tell(Text.of("ダウン中のBuddyには命令できません。").red())
    return 0
  }
  buddy.setOrder(order)
  player.tell(Text.of(message).green())
  return 1
}
function dzBctlStoryUnlock(player) {
  try { return dzStoryTier(player.server) } catch (ignored) {
    return Math.max(0, Math.min(5,
      player.server.persistentData.getInt("deadzone_world_tier")))
  }
}
function dzBctlApplyLoadout(player, buddy, role) {
  try {
    let tier = dzBctlStoryUnlock(player)
    let pool = DZ_BCTL_GUNS[role] || DZ_BCTL_GUNS.assault
    let gunId = pool[Math.max(0, Math.min(5, tier))]
    let gunRl = new DZ_BCTL_RL(gunId)
    let indexOpt = DZ_BCTL_TACE_API.getCommonGunIndex(gunRl)
    if (!indexOpt.isPresent()) {
      player.tell(Text.of("Buddy loadout unavailable: " + gunId).red())
      return false
    }
    let gunData = indexOpt.get().getGunData()
    let ammoId = gunData.getAmmoId()
    let mode = role === "support" || role === "assault"
      ? DZ_BCTL_FIRE_MODE.AUTO : DZ_BCTL_FIRE_MODE.SEMI
    let magazine = Math.max(1, gunData.getAmmoAmount())
    let gun = DZ_BCTL_GUN_BUILDER.create().setId(gunRl).setCount(1)
      .setAmmoCount(magazine).setAmmoInBarrel(true).setFireMode(mode).build()
    let ammo = DZ_BCTL_AMMO_BUILDER.create().setId(ammoId)
      .setCount(Math.max(60, magazine * 6)).build()
    let handler = buddy.getCapability(DZ_BCTL_CAPS.ITEM_HANDLER, null).orElse(null)
    if (handler == null || handler.getSlots() < 2) return false
    handler.setStackInSlot(0, gun)
    handler.setStackInSlot(1, ammo)
    buddy.persistentData.putString("dz_buddy_loadout_gun", gunId)
    buddy.persistentData.putInt("dz_buddy_loadout_tier", tier)
    return true
  } catch (error) {
    console.error("[DEADZONE BUDDY] Loadout failed: " + error)
    player.tell(Text.of("Buddy loadoutの適用に失敗しました。ログを確認してください。").red())
    return false
  }
}
function dzBctlApplyProfile(player, buddy, role, healToFull) {
  ;["assault","support","scout","medic"].forEach(name =>
    buddy.tags.remove("dz_buddy_role_" + name))
  for (let i = 0; i <= 5; i++) buddy.tags.remove("dz_buddy_tier_" + i)
  buddy.tags.remove("dz_faction_medic")
  buddy.tags.add("dz_buddy_role_" + role)

  let tier = dzBctlStoryUnlock(player)
  let health = 48, armor = 7, toughness = 1, speed = 0.30
  if (role === "support") { health = 56; armor = 10; toughness = 2; speed = 0.25 }
  if (role === "scout") { health = 38; armor = 4; toughness = 0; speed = 0.36 }
  if (role === "medic") {
    health = 46; armor = 6; toughness = 1; speed = 0.28
    buddy.tags.add("dz_faction_medic")
  }
  // Alpha profile: each Story Unlock improves survivability without changing
  // the role identity. Visible weapon/armor sets can be layered on later.
  health += tier * 4
  armor += tier * 1.5
  toughness += Math.floor(tier / 2)
  buddy.tags.add("dz_buddy_tier_" + tier)
  buddy.runCommandSilent("attribute @s minecraft:generic.max_health base set " + health)
  buddy.runCommandSilent("attribute @s minecraft:generic.armor base set " + armor)
  buddy.runCommandSilent("attribute @s minecraft:generic.armor_toughness base set " + toughness)
  buddy.runCommandSilent("attribute @s minecraft:generic.movement_speed base set " + speed)
  buddy.runCommandSilent("attribute @s minecraft:generic.knockback_resistance base set " +
    Math.min(0.6, 0.05 + tier * 0.08))
  if (healToFull && !buddy.tags.contains("dz_buddy_downed")) buddy.health = health
  buddy.persistentData.putInt("dz_buddy_applied_tier", tier)
  return {tier:tier, health:health, armor:armor, toughness:toughness, speed:speed}
}
function dzBctlRole(player, role) {
  let buddy = dzBctlLoaded(player)
  if (!buddy) return 0
  let profile = dzBctlApplyProfile(player, buddy, role, true)
  dzBctlApplyLoadout(player, buddy, role)
  try { buddy.setOrder(DZ_BCTL_ORDER.FOLLOW_COMMANDER) } catch (ignored) {}
  player.persistentData.putString("dz_buddy_role", role)
  player.tell(Text.of("Buddyの役割を " + role.toUpperCase() +
    " に変更しました（T" + profile.tier + "）。").gold())
  return 1
}

function dzBctlRoleMenu(player) {
  player.tell(Text.of("=== Buddy 役割設定 ===").gold())
  ;[
    ["assault","ASSAULT","前衛。高いHPと防御で積極的に交戦する。"],
    ["support","SUPPORT","重装。近くの雇用主へ耐性効果を与える。"],
    ["scout","SCOUT","高速偵察。近くの敵対勢力を短時間可視化する。"],
    ["medic","MEDIC","衛生兵。近くにいる負傷した雇用主を治療する。"]
  ].forEach(entry => player.tell(
    Text.of("[ "+entry[1]+" ] "+entry[2]).green()
      .clickRunCommand("/deadzonebuddycontrol role "+entry[0])
      .hover(Text.of(entry[2]))
  ))
}

function dzBctlDistanceSq(a,b) {
  let dx=a.x-b.x, dy=a.y-b.y, dz=a.z-b.z
  return dx*dx+dy*dy+dz*dz
}

function dzBctlAmmoState(buddy) {
  try {
    let handler = buddy.getCapability(DZ_BCTL_CAPS.ITEM_HANDLER, null).orElse(null)
    if (handler == null) return {known:false, reserve:0}
    let reserve = 0
    for (let slot = 1; slot < handler.getSlots(); slot++) {
      let stack = handler.getStackInSlot(slot)
      if (stack && !stack.isEmpty()) reserve += stack.count
    }
    return {known:true, reserve:reserve}
  } catch (ignored) { return {known:false, reserve:0} }
}

function dzBctlFieldBehavior(player, buddy, role, tier) {
  let hpRatio = buddy.maxHealth > 0 ? buddy.health / buddy.maxHealth : 1
  let distanceSq = dzBctlDistanceSq(player, buddy)

  // Critical condition: break contact and return to the commander. Teleport is
  // reserved for extreme separation so ordinary combat movement remains visible.
  if (hpRatio <= 0.30) {
    buddy.tags.add("dz_buddy_retreating")
    try { buddy.setTarget(null) } catch (ignored) {}
    try { buddy.setOrder(DZ_BCTL_ORDER.FOLLOW_COMMANDER) } catch (ignored) {}
    buddy.runCommandSilent("effect give @s minecraft:resistance 3 1 true")
    if (role === "medic") buddy.runCommandSilent("effect give @s minecraft:regeneration 3 0 true")
  } else buddy.tags.remove("dz_buddy_retreating")

  if (distanceSq > 2304) {
    buddy.teleportTo(player.x + 1, player.y, player.z + 1)
    try { buddy.setOrder(DZ_BCTL_ORDER.FOLLOW_COMMANDER) } catch (ignored) {}
  }

  let ammo = dzBctlAmmoState(buddy)
  if (ammo.known && ammo.reserve <= 0) {
    if (!buddy.tags.contains("dz_buddy_out_of_ammo")) {
      buddy.tags.add("dz_buddy_out_of_ammo")
      player.tell(Text.of("Buddy: reserve ammunition depleted. Resupply or apply a test loadout.").red())
    }
    try { buddy.setTarget(null) } catch (ignored) {}
    try { buddy.setOrder(DZ_BCTL_ORDER.CEASE_FIRE) } catch (ignored) {}
  } else if (ammo.reserve > 0) buddy.tags.remove("dz_buddy_out_of_ammo")

  if (role === "assault") {
    buddy.runCommandSilent("effect give @s minecraft:speed 3 0 true")
    if (hpRatio > 0.50) buddy.runCommandSilent("effect give @s minecraft:strength 3 0 true")
  } else if (role === "support") {
    let radius = 12 + tier
    buddy.runCommandSilent("effect give @e[tag=dz_survivor,distance=.." + radius + ",limit=8] minecraft:resistance 3 0 true")
    if (distanceSq <= radius * radius) player.runCommandSilent("effect give @s minecraft:resistance 3 0 true")
  } else if (role === "scout") {
    let radius = 20 + tier * 3
    buddy.runCommandSilent("effect give @e[tag=dz_hostile,distance=.." + radius + ",limit=12] minecraft:glowing 3 0 true")
    buddy.runCommandSilent("effect give @s minecraft:night_vision 5 0 true")
  } else if (role === "medic") {
    let cooldown = Math.max(60, 100 - tier * 8)
    if (player.age % cooldown < 40) {
      buddy.runCommandSilent("effect give @e[tag=dz_survivor,distance=..10,sort=nearest,limit=3] minecraft:regeneration 4 0 true")
      if (distanceSq <= 144 && player.health < player.maxHealth)
        player.runCommandSilent("effect give @s minecraft:regeneration 4 0 true")
    }
  }
}

PlayerEvents.tick(event => {
  let player=event.player
  if (player.level.clientSide || player.age % 40 !== 0) return
  let buddy=dzBctlFind(player)
  if (!buddy || buddy.tags.contains("dz_buddy_downed")) return
  let role=player.persistentData.getString("dz_buddy_role") || "assault"
  let tier=dzBctlStoryUnlock(player)
  if (buddy.persistentData.getInt("dz_buddy_applied_tier") !== tier) {
    dzBctlApplyProfile(player, buddy, role, false)
    dzBctlApplyLoadout(player, buddy, role)
  }
  dzBctlFieldBehavior(player, buddy, role, tier)
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonebuddycontrol")
  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player, buddy = dzBctlFind(player)
    let role = player.persistentData.getString("dz_buddy_role")
  let tier = dzBctlStoryUnlock(player)
  player.tell(Text.of("Role: " + (role || "assault") + " / 支援装備解禁: S" + tier).gold())
    player.tell(Text.of(
      buddy ? "Loaded: YES / HP: " + Math.ceil(buddy.health) + "/" +
        Math.ceil(buddy.maxHealth) + " / Down: " + buddy.tags.contains("dz_buddy_downed") +
        " / Order: " + String(buddy.getOrder()) +
        " / Ammo: " + dzBctlAmmoState(buddy).reserve +
        " / Retreat: " + buddy.tags.contains("dz_buddy_retreating") : "Loaded: NO"
    ).gray())
    return 1
  }))
  root.then(Commands.literal("refresh").executes(ctx => {
    let player = ctx.source.player, buddy = dzBctlLoaded(player)
    if (!buddy) return 0
    let role = player.persistentData.getString("dz_buddy_role") || "assault"
    let profile = dzBctlApplyProfile(player, buddy, role, false)
    player.tell(Text.of("Buddy profile refreshed: " + role.toUpperCase() +
      " / T" + profile.tier + " / HP " + profile.health + " / Armor " + profile.armor).aqua())
    return 1
  }))
  root.then(Commands.literal("test_menu").executes(ctx => {
    let player = ctx.source.player
    player.tell(Text.of("=== BUDDY ALPHA TEST ===").gold())
    ;[
      ["STATUS", "/deadzonebuddycontrol status"],
      ["ROLES", "/deadzonebuddycontrol roles"],
      ["FOLLOW", "/deadzonebuddycontrol follow"],
      ["HOLD", "/deadzonebuddycontrol hold"],
      ["CEASE FIRE", "/deadzonebuddycontrol cease_fire"],
      ["FREE FIRE", "/deadzonebuddycontrol free_fire"],
      ["RECALL", "/deadzonebuddycontrol recall"],
      ["REFRESH TIER", "/deadzonebuddycontrol refresh"],
      ["APPLY LOADOUT", "/deadzonebuddycontrol loadout"],
      ["FIELD STATUS", "/deadzonebuddycontrol field_status"],
      ["REPAIR ALLIANCE", "/deadzonebuddycontrol repair_alliance"]
    ].forEach(entry => player.tell(
      Text.of("[ " + entry[0] + " ]").aqua().clickRunCommand(entry[1]).hover(Text.of(entry[1]))
    ))
    player.tell(Text.of("蘇生確認: Buddyをダウンさせ、包帯か絆創膏で右クリック。").yellow())
    player.tell(Text.of("雇用上限確認: Buddyがいる状態でRecruit Tableを再使用。").yellow())
    return 1
  }))
  root.then(Commands.literal("loadout").executes(ctx => {
    let player = ctx.source.player, buddy = dzBctlLoaded(player)
    if (!buddy) return 0
    let role = player.persistentData.getString("dz_buddy_role") || "assault"
    let ok = dzBctlApplyLoadout(player, buddy, role)
    if (ok) player.tell(Text.of("Buddy loadout applied: " +
      buddy.persistentData.getString("dz_buddy_loadout_gun") +
      " / Story S" + dzBctlStoryUnlock(player)).green())
    return ok ? 1 : 0
  }))
  root.then(Commands.literal("field_status").executes(ctx => {
    let player = ctx.source.player, buddy = dzBctlLoaded(player)
    if (!buddy) return 0
    let ammo = dzBctlAmmoState(buddy)
    let role = player.persistentData.getString("dz_buddy_role") || "assault"
    player.tell(Text.of("Buddy field status: " + role.toUpperCase() +
      " / HP " + Math.ceil(buddy.health) + "/" + Math.ceil(buddy.maxHealth) +
      " / Reserve " + (ammo.known ? ammo.reserve : "?") +
      " / Retreat " + buddy.tags.contains("dz_buddy_retreating") +
      " / OutOfAmmo " + buddy.tags.contains("dz_buddy_out_of_ammo")).aqua())
    return 1
  }))
  root.then(Commands.literal("repair_alliance").executes(ctx => {
    let player = ctx.source.player, buddy = dzBctlLoaded(player)
    if (!buddy) return 0
    buddy.tags.add("dz_survivor")
    buddy.tags.add("dz_survivor_buddy")
    buddy.runCommandSilent("team join dz_survivors @s")
    buddy.runCommandSilent("team join dz_survivors @e[tag=dz_basecamp_guard,distance=..64]")
    try { buddy.setTarget(null) } catch (ignored) {}
    buddy.level.entities.forEach(other => {
      if (!other || !other.tags || !other.tags.contains("dz_basecamp_guard")) return
      try { other.setTarget(null) } catch (ignored) {}
    })
    player.tell(Text.of("Buddyとキャンプ警備兵のSurvivor同盟を再設定しました。").green())
    return 1
  }))
  root.then(Commands.literal("roles").executes(ctx => {
    dzBctlRoleMenu(ctx.source.player)
    return 1
  }))
  root.then(Commands.literal("follow").executes(ctx =>
    dzBctlOrder(ctx.source.player, DZ_BCTL_ORDER.FOLLOW_COMMANDER, "Buddyを同行状態にしました。")))
  root.then(Commands.literal("hold").executes(ctx =>
    dzBctlOrder(ctx.source.player, DZ_BCTL_ORDER.HOLD_POSITION, "Buddyを現在地で待機させました。")))
  root.then(Commands.literal("cease_fire").executes(ctx =>
    dzBctlOrder(ctx.source.player, DZ_BCTL_ORDER.CEASE_FIRE, "Buddyへ射撃禁止を命令しました。")))
  root.then(Commands.literal("free_fire").executes(ctx =>
    dzBctlOrder(ctx.source.player, DZ_BCTL_ORDER.FREE_FIRE, "Buddyへ自由射撃を許可しました。")))
  root.then(Commands.literal("recall").executes(ctx => {
    let player = ctx.source.player, buddy = dzBctlLoaded(player)
    if (!buddy || buddy.tags.contains("dz_buddy_downed")) return 0
    buddy.teleportTo(player.x + 1, player.y, player.z + 1)
    buddy.setOrder(DZ_BCTL_ORDER.FOLLOW_COMMANDER)
    player.tell(Text.of("Buddyを近くへ呼び戻しました。").green())
    return 1
  }))
  root.then(Commands.literal("install_table")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let server = ctx.source.server
      let result = server.runCommandSilent(
        "execute at @e[type=easy_npc:humanoid,tag=dz_basecamp_buddy_recruiter," +
        "limit=1] positioned ~-2 ~-1 ~ run setblock ~ ~ ~ simpleenemymod:recruit_table"
      )
      if (result > 0) {
        ctx.source.player.tell(Text.of("ハンクの近くにRecruit Tableを設置しました。").green())
      } else {
        ctx.source.player.tell(Text.of("ハンクが見つからないか、設置位置を更新できませんでした。").red())
      }
      return result > 0 ? 1 : 0
    }))
  let roles = Commands.literal("role")
  ;["assault","support","scout","medic"].forEach(name =>
    roles.then(Commands.literal(name).executes(ctx => dzBctlRole(ctx.source.player, name))))
  root.then(roles)
  event.register(root)
})
