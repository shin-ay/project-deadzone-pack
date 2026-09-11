// PROJECT DEADZONE Buddy System v0.2
// Keeps one specialist Buddy while allowing a progression-capped PMC roster.
// Recruitment and command execution remain owned by SEM / Combined Arms.

const DZ_BUDDY_TYPE = "simpleenemymod:pmcunit"
const DZ_PMC_COMMANDER_TYPE = "tacz_sewv:pmc_commander"
const DZ_BUDDY_UUID_KEY = "dz_buddy_uuid"
const DZ_PMC_ROSTER_PREFIX = "dz_pmc_roster_"
const DZ_PMC_PROMOTION_PREFIX = "dz_pmc_promotion_"
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

function dzPmcOwnerUuid(entity) {
  if (!entity) return ""
  let type = String(entity.type)
  if (type !== DZ_BUDDY_TYPE && type !== DZ_PMC_COMMANDER_TYPE) return ""
  try {
    let owner = entity.getOwnerUUID()
    return owner == null ? "" : String(owner)
  } catch (ignored) { return "" }
}

function dzPmcRosterKey(ownerUuid) {
  return DZ_PMC_ROSTER_PREFIX + String(ownerUuid).replace(/-/g, "")
}

function dzPmcPromotionKey(ownerUuid) {
  return DZ_PMC_PROMOTION_PREFIX + String(ownerUuid).replace(/-/g, "")
}

function dzPmcRoster(server, ownerUuid) {
  let raw = server.persistentData.getString(dzPmcRosterKey(ownerUuid))
  return raw === "" ? [] : raw.split(";").filter(value => value !== "")
}

function dzPmcSaveRoster(server, ownerUuid, roster) {
  let unique = []
  roster.forEach(value => {
    value = String(value)
    if (value !== "" && !unique.includes(value)) unique.push(value)
  })
  server.persistentData.putString(dzPmcRosterKey(ownerUuid), unique.join(";"))
  return unique
}

function dzPmcRosterAdd(entity) {
  let ownerUuid = dzPmcOwnerUuid(entity)
  if (ownerUuid === "") return []
  let roster = dzPmcRoster(entity.server, ownerUuid)
  let uuid = String(entity.uuid)
  if (!roster.includes(uuid)) roster.push(uuid)
  entity.tags.add("dz_pmc_contract")
  return dzPmcSaveRoster(entity.server, ownerUuid, roster)
}

function dzPmcRosterRemove(server, ownerUuid, entityUuid) {
  if (ownerUuid === "") return []
  return dzPmcSaveRoster(server, ownerUuid,
    dzPmcRoster(server, ownerUuid).filter(value => value !== String(entityUuid)))
}

function dzPmcStoryTier(player) {
  try { return Math.max(0, Math.min(5, dzStoryTier(player.server))) }
  catch (ignored) { return Math.max(0, Math.min(5,
    player.server.persistentData.getInt("deadzone_world_tier"))) }
}

// Personal Buddy remains one specialist. Extra slots are ordinary contract
// infantry controlled by Combined Arms, keeping multiplayer NPC growth bounded.
function dzPmcRosterCap(player) {
  let tier = dzPmcStoryTier(player)
  if (tier >= 4) return 7
  if (tier >= 2) return 5
  return 3
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

  let firstRegistration = !entity.tags.contains("dz_buddy")
  entity.tags.add("dz_buddy")
  entity.tags.remove("dz_contract_infantry")
  dzPmcRosterAdd(entity)
  entity.tags.add("dz_survivor")
  entity.tags.add("dz_survivor_buddy")
  // Camp guards and recruited buddies must share vanilla alliance state even
  // though they originate from different NPC mods.
  entity.runCommandSilent("team join dz_survivors @s")
  entity.runCommandSilent("attribute @s minecraft:generic.max_health base set " + DZ_BUDDY_MAX_HEALTH)
  entity.runCommandSilent("attribute @s minecraft:generic.armor base set 6")
  if (firstRegistration && entity.health < DZ_BUDDY_MAX_HEALTH && !entity.tags.contains("dz_buddy_downed")) {
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

function dzRegisterOwnedPmc(entity) {
  let ownerUuid = dzPmcOwnerUuid(entity)
  if (ownerUuid === "") return

  // Medal promotion replaces the original PMC entity. Swap its UUID in the
  // persistent roster instead of consuming another contract slot.
  if (String(entity.type) === DZ_PMC_COMMANDER_TYPE) {
    let pendingKey = dzPmcPromotionKey(ownerUuid)
    let replaced = entity.server.persistentData.getString(pendingKey)
    if (replaced !== "") {
      dzPmcRosterRemove(entity.server, ownerUuid, replaced)
      entity.server.persistentData.putString(pendingKey, "")
    }
  }

  dzPmcRosterAdd(entity)
  entity.tags.add("dz_survivor")
  entity.tags.add("dz_pmc_contract")
  entity.runCommandSilent("team join dz_survivors @s")

  let owner = dzBuddyOwner(entity.server, ownerUuid)
  let primaryUuid = owner ? owner.persistentData.getString(DZ_BUDDY_UUID_KEY) : ""
  if (String(entity.type) === DZ_BUDDY_TYPE && (primaryUuid === "" ||
      primaryUuid === String(entity.uuid) || entity.tags.contains("dz_buddy"))) {
    dzRegisterBuddy(entity)
    return
  }

  entity.tags.add(String(entity.type) === DZ_PMC_COMMANDER_TYPE
    ? "dz_contract_commander" : "dz_contract_infantry")
  if (owner && !entity.tags.contains("dz_contract_announced")) {
    entity.tags.add("dz_contract_announced")
    owner.tell(Text.of(String(entity.type) === DZ_PMC_COMMANDER_TYPE
      ? "契約部隊にPMC指揮官が着任しました。"
      : "契約歩兵が部隊へ加わりました。Tactical Data Terminalから選択・指揮できます。"
    ).aqua())
  }
}

function dzPlayerHasLoadedBuddy(player) {
  let ownerUuid = String(player.uuid)
  let primaryUuid = player.persistentData.getString(DZ_BUDDY_UUID_KEY)
  let found = false
  player.level.entities.forEach(entity => {
    if (dzPmcOwnerUuid(entity) === ownerUuid) dzRegisterOwnedPmc(entity)
    if (!found && dzBuddyOwnerUuid(entity) === ownerUuid &&
        (primaryUuid === "" || primaryUuid === String(entity.uuid) || entity.tags.contains("dz_buddy"))) {
      dzRegisterBuddy(entity)
      found = true
    }
  })
  return found
}

EntityEvents.spawned(DZ_BUDDY_TYPE, event => {
  let entity = event.entity
  if (!dzIsBuddy(entity)) return
  entity.server.scheduleInTicks(1, callback => dzRegisterOwnedPmc(entity))
})

EntityEvents.spawned(DZ_PMC_COMMANDER_TYPE, event => {
  let entity = event.entity
  if (dzPmcOwnerUuid(entity) === "") return
  entity.server.scheduleInTicks(1, callback => dzRegisterOwnedPmc(entity))
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

  dzPlayerHasLoadedBuddy(player)
  let roster = dzPmcRoster(player.server, String(player.uuid))
  let cap = dzPmcRosterCap(player)
  if (roster.length >= cap) {
    event.cancel()
    player.tell(Text.of("現在の契約枠は " + roster.length + "/" + cap + " です。" +
      (cap < 7 ? " Story進行で追加枠が解禁されます。" : "")).yellow())
  }
})

EntityEvents.death(DZ_BUDDY_TYPE, event => {
  let buddy = event.entity
  if (!dzIsBuddy(buddy)) return

  let ownerUuid = dzBuddyOwnerUuid(buddy)
  dzPmcRosterRemove(buddy.server, ownerUuid, String(buddy.uuid))

  // Buddy down/revive was retired together with faction NPC revive.
  // Clear the ownership slot and allow the normal death event to continue.
  let deadBuddyOwner = dzBuddyOwner(buddy.server, ownerUuid)
  if (deadBuddyOwner && deadBuddyOwner.persistentData.getString(DZ_BUDDY_UUID_KEY) === String(buddy.uuid))
    deadBuddyOwner.persistentData.putString(DZ_BUDDY_UUID_KEY, "")
  return

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

EntityEvents.death(DZ_PMC_COMMANDER_TYPE, event => {
  let entity = event.entity
  let ownerUuid = dzPmcOwnerUuid(entity)
  if (ownerUuid !== "") dzPmcRosterRemove(entity.server, ownerUuid, String(entity.uuid))
})

ItemEvents.entityInteracted(event => {
  let player = event.player
  let buddy = event.target
  if (!player || player.level.clientSide || !buddy) return

  if (String(event.item.id) === "tacz_sewv:medal_of_honor" &&
      String(buddy.type) === DZ_BUDDY_TYPE && dzBuddyOwnerUuid(buddy) === String(player.uuid)) {
    if (buddy.tags.contains("dz_buddy")) {
      event.cancel()
      player.tell(Text.of("専属Buddyは役割能力を維持します。勲章は追加の契約歩兵へ使用してください。").yellow())
      return
    }
    if (dzPmcStoryTier(player) < 2) {
      event.cancel()
      player.tell(Text.of("PMC指揮官への昇進はStory Tier 2で解禁されます。").yellow())
      return
    }
    player.server.persistentData.putString(dzPmcPromotionKey(String(player.uuid)), String(buddy.uuid))
  }

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
    let roster = dzPmcRoster(player.server, String(player.uuid))
    let cap = dzPmcRosterCap(player)
    let loaded = 0, infantry = 0, commanders = 0
    player.level.entities.forEach(entity => {
      if (dzPmcOwnerUuid(entity) !== String(player.uuid)) return
      loaded++
      if (String(entity.type) === DZ_PMC_COMMANDER_TYPE) commanders++
      else if (!entity.tags.contains("dz_buddy")) infantry++
    })
    player.tell(Text.of("PMC契約枠: " + roster.length + "/" + cap +
      " / 専属Buddy: " + (uuid === "" ? "なし" : "活動中")).aqua())
    player.tell(Text.of("現在Dimensionで読込中: " + loaded +
      "（一般兵 " + infantry + " / 指揮官 " + commanders + "）").gray())
    player.tell(Text.of("解禁: T0=3名 / T2=5名・指揮官 / T4=7名（うち専属Buddyは1名）").gray())
    return 1
  }))

  root.then(Commands.literal("reset")
    .requires(source => source.hasPermission(2))
    .executes(ctx => {
      let player = ctx.source.player
      player.persistentData.putString(DZ_BUDDY_UUID_KEY, "")
      dzPmcSaveRoster(player.server, String(player.uuid), [])
      player.tell(Text.of("BuddyとPMC契約台帳をリセットしました。実体は削除されません。").yellow())
      return 1
    }))

  event.register(root)
})
