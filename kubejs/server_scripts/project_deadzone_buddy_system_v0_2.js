// PROJECT DEADZONE Buddy System v0.2
// Adds durability, one active recruit per player, and a down/revive loop
// to Simple Enemy Mod's recruited PMC units.

const DZ_BUDDY_TYPE = "simpleenemymod:pmcunit"
const DZ_BUDDY_UUID_KEY = "dz_buddy_uuid"
const DZ_BUDDY_MAX_HEALTH = 40
const DZ_BUDDY_REVIVE_HEALTH = 20
const DZ_BUDDY_REVIVE_ITEMS = [
  "apocalypsenow:bandage",
  "apocalypsenow:bandage"
]

function dzBuddyOwnerUuid(entity) {
  if (!entity || String(entity.type) !== DZ_BUDDY_TYPE) return ""
  try {
    let owner = entity.getOwnerUUID()
    return owner == null ? "" : String(owner)
  } catch (ignored) {
    return ""
  }
}

function dzIsBuddy(entity) {
  return dzBuddyOwnerUuid(entity) !== ""
}

function dzBuddyOwner(server, ownerUuid) {
  let result = null
  server.players.forEach(player => {
    if (String(player.uuid) === ownerUuid) result = player
  })
  return result
}

function dzRegisterBuddy(entity) {
  let ownerUuid = dzBuddyOwnerUuid(entity)
  if (ownerUuid === "") return

  entity.tags.add("dz_buddy")
  entity.tags.add("dz_survivor")
  entity.tags.add("dz_survivor_buddy")
  // Camp guards and recruited buddies must share vanilla alliance state even
  // though they originate from different NPC mods.
  entity.runCommandSilent("team join dz_survivors @s")
  entity.runCommandSilent("attribute @s minecraft:generic.max_health base set " + DZ_BUDDY_MAX_HEALTH)
  entity.runCommandSilent("attribute @s minecraft:generic.armor base set 6")
  if (entity.health < DZ_BUDDY_MAX_HEALTH && !entity.tags.contains("dz_buddy_downed")) {
    entity.health = DZ_BUDDY_MAX_HEALTH
  }

  let owner = dzBuddyOwner(entity.server, ownerUuid)
  if (owner) {
    owner.persistentData.putString(DZ_BUDDY_UUID_KEY, String(entity.uuid))
    let role = owner.persistentData.getString("dz_buddy_role")
    if (role === "") {
      role = "assault"
      owner.persistentData.putString("dz_buddy_role", role)
    }
    let profileApplied = false
    try {
      if (typeof dzBctlApplyProfile === "function") {
        dzBctlApplyProfile(owner, entity, role, false)
        profileApplied = true
      }
    } catch (ignored) {}
    if (!profileApplied && role === "support") {
      entity.runCommandSilent("attribute @s minecraft:generic.max_health base set 56")
      entity.runCommandSilent("attribute @s minecraft:generic.armor base set 10")
      entity.runCommandSilent("attribute @s minecraft:generic.movement_speed base set 0.25")
    } else if (!profileApplied && role === "scout") {
      entity.runCommandSilent("attribute @s minecraft:generic.max_health base set 38")
      entity.runCommandSilent("attribute @s minecraft:generic.armor base set 4")
      entity.runCommandSilent("attribute @s minecraft:generic.movement_speed base set 0.36")
    } else if (!profileApplied && role === "medic") {
      entity.runCommandSilent("attribute @s minecraft:generic.max_health base set 46")
      entity.runCommandSilent("attribute @s minecraft:generic.armor base set 6")
      entity.runCommandSilent("attribute @s minecraft:generic.movement_speed base set 0.28")
      entity.tags.add("dz_faction_medic")
    } else if (!profileApplied) {
      entity.runCommandSilent("attribute @s minecraft:generic.max_health base set 48")
      entity.runCommandSilent("attribute @s minecraft:generic.armor base set 7")
      entity.runCommandSilent("attribute @s minecraft:generic.movement_speed base set 0.30")
    }

    // Show the role entry point once for each newly registered recruit.
    // The entity tag prevents the periodic attribute refresh from spamming chat.
    if (!entity.tags.contains("dz_buddy_role_prompted")) {
      entity.tags.add("dz_buddy_role_prompted")
      owner.tell(Text.of("Buddyを雇用しました。現在の役割: " + role.toUpperCase()).gold())
      owner.tell(
        Text.of("[ BUDDYの役割を選択 ]").aqua()
          .clickRunCommand("/deadzonebuddycontrol roles")
          .hover(Text.of("Assault / Support / Scout / Medicから選択します"))
      )
      owner.tell(Text.of("後から /deadzonebuddycontrol roles で変更できます。").gray())
    }
  }

  // Clear stale combat targets acquired before the scoreboard team was
  // assigned. Team membership prevents the same target from being selected
  // again, while this makes the repair immediate for already spawned units.
  try {
    let target = entity.target
    if (target && target.tags && target.tags.contains("dz_survivor")) {
      entity.setTarget(null)
    }
  } catch (ignored) {}
  entity.level.entities.forEach(other => {
    if (!other || !other.tags || !other.tags.contains("dz_basecamp_guard")) return
    try {
      let target = other.target
      if (target && String(target.uuid) === String(entity.uuid)) other.setTarget(null)
    } catch (ignored) {}
  })
}

function dzPlayerHasLoadedBuddy(player) {
  let ownerUuid = String(player.uuid)
  let found = false
  player.level.entities.forEach(entity => {
    if (!found && dzBuddyOwnerUuid(entity) === ownerUuid) {
      dzRegisterBuddy(entity)
      found = true
    }
  })
  return found
}

EntityEvents.spawned(DZ_BUDDY_TYPE, event => {
  let entity = event.entity
  if (!dzIsBuddy(entity)) return
  entity.server.scheduleInTicks(1, callback => dzRegisterBuddy(entity))
})

// The persistent UUID keeps the cap effective even if the buddy is unloaded or
// in another dimension. Nearby pre-v0.2 recruits are adopted automatically.
PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 100 !== 0) return
  // Re-apply the buddy attributes after loading and after Simple Enemy Mod
  // refreshes its unit data. A stored UUID must not disable this health sync.
  dzPlayerHasLoadedBuddy(player)
})

BlockEvents.rightClicked("simpleenemymod:recruit_table", event => {
  let player = event.player
  if (!player || player.level.clientSide) return

  let registered = player.persistentData.getString(DZ_BUDDY_UUID_KEY)
  let loadedBuddy = dzPlayerHasLoadedBuddy(player)
  if (loadedBuddy) {
    event.cancel()
    player.tell(Text.of("雇用できるバディは1人までです。").yellow())
  } else if (registered !== "") {
    player.persistentData.putString(DZ_BUDDY_UUID_KEY, "")
    console.info("[DEADZONE BUDDY] Cleared stale recruit UUID " + registered
      + " for " + String(player.uuid))
  }
})

EntityEvents.death(DZ_BUDDY_TYPE, event => {
  let buddy = event.entity
  if (!dzIsBuddy(buddy)) return

  event.cancel()
  buddy.health = 1
  buddy.tags.add("dz_buddy")
  buddy.tags.add("dz_buddy_downed")
  buddy.mergeNbt({
    Invulnerable: 1,
    NoAI: 1
  })
  buddy.runCommandSilent("effect give @s minecraft:glowing infinite 0 true")

  let owner = dzBuddyOwner(buddy.server, dzBuddyOwnerUuid(buddy))
  if (owner) {
    owner.persistentData.putString(DZ_BUDDY_UUID_KEY, String(buddy.uuid))
    owner.tell(Text.of("バディがダウンしました。包帯か絆創膏を持って右クリックすると蘇生できます。").red())
  }
})

ItemEvents.entityInteracted(event => {
  let player = event.player
  let buddy = event.target
  if (!player || player.level.clientSide || !buddy) return
  if (String(buddy.type) !== DZ_BUDDY_TYPE || !buddy.tags.contains("dz_buddy_downed")) return

  event.cancel()

  if (dzBuddyOwnerUuid(buddy) !== String(player.uuid)) {
    player.tell(Text.of("このバディを蘇生できるのは雇用者だけです。").red())
    return
  }

  let itemId = String(event.item.id)
  if (!DZ_BUDDY_REVIVE_ITEMS.includes(itemId)) {
    player.tell(Text.of("蘇生には包帯か絆創膏が必要です。").yellow())
    return
  }

  if (!player.creative) event.item.shrink(1)
  buddy.mergeNbt({
    Invulnerable: 0,
    NoAI: 0
  })
  buddy.tags.remove("dz_buddy_downed")
  buddy.health = DZ_BUDDY_REVIVE_HEALTH
  buddy.runCommandSilent("effect clear @s minecraft:glowing")
  buddy.runCommandSilent("effect give @s minecraft:regeneration 5 1 true")
  buddy.runCommandSilent("playsound minecraft:item.totem.use neutral @a[distance=..16] ~ ~ ~ 0.6 1.2")
  player.tell(Text.of("バディを蘇生しました。").green())
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonebuddy")

  root.then(Commands.literal("status").executes(ctx => {
    let player = ctx.source.player
    let uuid = player.persistentData.getString(DZ_BUDDY_UUID_KEY)
    player.tell(Text.of(uuid === ""
      ? "バディ雇用枠: 空き"
      : "バディ雇用枠: 使用中 / UUID " + uuid
    ).aqua())
    return 1
  }))

  root.then(Commands.literal("reset")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player = ctx.source.player
      player.persistentData.putString(DZ_BUDDY_UUID_KEY, "")
      player.tell(Text.of("バディ雇用枠をリセットしました。").yellow())
      return 1
    }))

  event.register(root)
})
