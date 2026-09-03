// PROJECT DEADZONE T0 onboarding safe zone v0.4
// Reject unwanted spawns individually with discard(). The old implementation
// scanned a 1400x56x1400 box every five seconds and used /kill, triggering
// death/drop/XP hooks in bulk and causing visible server stalls.

const DZ_T0_SUBURB_RADIUS = 700
const DZ_T0_CAMP_RADIUS = 100
const DZ_T0_VERTICAL_RADIUS = 24
const DZ_CAMP_PROTECTION_DAYS = 20
const DZ_CAMP_PROTECTION_LIMIT = DZ_CAMP_PROTECTION_DAYS * 24000
const DZ_CAMP_PROTECTION_TICKS = "dz_camp_protection_active_ticks_v1"
const DZ_CAMP_PROTECTION_INITIALIZED = "dz_camp_protection_clock_initialized_v1"
const DZ_CAMP_PROTECTION_EXPIRED_NOTICE = "dz_camp_protection_expired_notice_v1"

const DZ_T0_GUN_TYPES = [
  "tacz_hostiles:scavenger", "tacz_hostiles:soldier",
  "tacz_bandits:bandit", "simpleenemymod:ruunit",
  "simpleenemymod:pmcunit"
]
const DZ_T0_RANGED_TYPES = ["minecraft:skeleton", "minecraft:stray"]
const DZ_T0_CAMP_HOSTILES = [
  "minecraft:zombie", "minecraft:husk", "minecraft:drowned", "minecraft:creeper",
  "minecraft:spider", "minecraft:cave_spider", "minecraft:witch"
]
const DZ_T0_EXEMPT_TAGS = [
  "dz_basecamp_raider", "dz_story_npc", "dz_story_boss", "dz_buddy",
  "dz_survivor", "dz_basecamp_guard", "dz_usunit_friendly",
  "dz_t0_convoy", "dz_named", "dz_elite", "dz_settlement_civilian",
  "dz_boss_showroom", "dz_boss_loadtest", "dz_boss_mechanic_runtime", "dz_boss_loadtest_runtime"
]

function dzCampProtectionTicks(server) {
  return Math.max(0, Number(server.persistentData.getLong(DZ_CAMP_PROTECTION_TICKS)))
}

function dzCampProtectionActive(server) {
  return dzCampProtectionTicks(server) < DZ_CAMP_PROTECTION_LIMIT
}

function dzCampProtectionDay(server) {
  return Math.min(DZ_CAMP_PROTECTION_DAYS + 1,
    Math.floor(dzCampProtectionTicks(server) / 24000) + 1)
}

function dzCampCenter(server) {
  let data = server.persistentData
  if (data.getInt("dz_auto_basecamp_layout_version") <= 0) return null
  return {
    x: data.getInt("dz_auto_basecamp_origin_x") + 16,
    y: data.getInt("dz_auto_basecamp_origin_y"),
    z: data.getInt("dz_auto_basecamp_origin_z") + 16
  }
}

function dzInsideBaseCampAt(server, x, z, radius) {
  let center = dzCampCenter(server)
  if (!center) return false
  let dx = Number(x) - center.x, dz = Number(z) - center.z
  return dx * dx + dz * dz <= radius * radius
}

function dzCampCombatTierAt(server, x, z, dimension) {
  let tier = 0
  try { if (global.pdzWorldTierAt) tier = Number(global.pdzWorldTierAt(server, x, z)) || 0 } catch (ignored) {}
  if (dimension && String(dimension) !== "minecraft:overworld") return Math.max(0, Math.min(5, tier))
  if (!dzCampProtectionActive(server) && dzInsideBaseCampAt(server, x, z, DZ_T0_CAMP_RADIUS))
    tier = Math.max(1, tier)
  return Math.max(0, Math.min(5, tier))
}

global.pdzCampProtectionActive = dzCampProtectionActive
global.pdzCampProtectionDay = dzCampProtectionDay
global.pdzInsideBaseCampAt = dzInsideBaseCampAt
global.pdzCombatTierAt = dzCampCombatTierAt

function dzT0ProtectedSpawn(entity, radius) {
  let data=entity.server.persistentData
  if (data.getInt("deadzone_world_tier") > 0) return false
  if (data.getInt("dz_auto_basecamp_layout_version") <= 0) return false
  let cx=data.getInt("dz_auto_basecamp_origin_x")+16
  let cy=data.getInt("dz_auto_basecamp_origin_y")
  let cz=data.getInt("dz_auto_basecamp_origin_z")+16
  let dx=Number(entity.x)-cx, dy=Number(entity.y)-cy, dz=Number(entity.z)-cz
  // After the onboarding treaty expires, the inner camp ring behaves as a T1
  // combat area even while the surrounding starter suburb is still Story T0.
  if (!dzCampProtectionActive(entity.server) && dx*dx+dz*dz<=DZ_T0_CAMP_RADIUS*DZ_T0_CAMP_RADIUS) return false
  return Math.abs(dy)<=DZ_T0_VERTICAL_RADIUS && (dx*dx+dz*dz)<=radius*radius
}

function dzCampProtectedSpawn(entity, radius) {
  if (!dzCampProtectionActive(entity.server)) return false
  let data=entity.server.persistentData
  if (data.getInt("dz_auto_basecamp_layout_version") <= 0) return false
  let cx=data.getInt("dz_auto_basecamp_origin_x")+16
  let cy=data.getInt("dz_auto_basecamp_origin_y")
  let cz=data.getInt("dz_auto_basecamp_origin_z")+16
  let dx=Number(entity.x)-cx, dy=Number(entity.y)-cy, dz=Number(entity.z)-cz
  // Keep underground exploration outside the camp footprint dangerous, but
  // cover the full camp structure and nearby surface approaches.
  return Math.abs(dy)<=40 && (dx*dx+dz*dz)<=radius*radius
}

function dzIsHostileMob(entity) {
  try { if (entity.isMonster && entity.isMonster()) return true } catch (ignored) {}
  try {
    let category=String(entity.minecraftEntity.getType().getCategory().getName())
    if (category==="monster") return true
  } catch (ignored) {}
  let id=String(entity.type)
  return id.indexOf("spore:")===0 || id.indexOf("infnexus:")===0 || id.indexOf("infectious:")===0 || id.indexOf("apocalypsenow:")===0 ||
    id.indexOf("apocalypse_zombies:")===0 || id.indexOf("mutantszombies:")===0 ||
    id.indexOf("tacz_hostiles:")===0 || id.indexOf("tacz_bandits:")===0 ||
    id==="simpleenemymod:ruunit" || id==="simpleenemymod:pmcunit"
}

function dzT0Exempt(entity) {
  for (let i=0;i<DZ_T0_EXEMPT_TAGS.length;i++) if (entity.tags.contains(DZ_T0_EXEMPT_TAGS[i])) return true
  // Brutal Bosses adds Axel's showroom tag a few ticks after creating him.
  // The marker already exists at that point, so protect only entities spawned
  // directly beside that admin-only gallery anchor.
  if (String(entity.type)!=="tacz_hostiles:soldier") return false
  try {
    let protectedByAnchor=false
    entity.level.entities.forEach(candidate => {
      if (protectedByAnchor || !candidate.tags || !candidate.tags.contains("dz_boss_showroom_axel_anchor")) return
      let dx=Number(candidate.x)-Number(entity.x), dy=Number(candidate.y)-Number(entity.y), dz=Number(candidate.z)-Number(entity.z)
      if (dx*dx+dy*dy+dz*dz<=12*12) protectedByAnchor=true
    })
    if (protectedByAnchor) return true
  } catch (ignored) {}
  return false
}

function dzT0RejectSpawn(event, radius) {
  let entity=event.entity
  if (!entity || dzT0Exempt(entity) || !dzT0ProtectedSpawn(entity,radius)) return
  event.cancel()
}

function dzCampRejectSpawn(event) {
  let entity=event.entity
  // Infectious owns a post-join variant finaliser. Cancelling its join here
  // makes that finaliser re-add an already removed instance. Never intercept
  // this namespace; camp safety is handled by exposure and combat systems.
  if (entity && String(entity.type).indexOf("infectious:")===0) return
  if (!entity || dzT0Exempt(entity) || !dzIsHostileMob(entity) ||
      !dzCampProtectedSpawn(entity,DZ_T0_CAMP_RADIUS)) return
  event.cancel()
}

// Catch modded monsters as well as vanilla monsters.  discard() prevents
// loot/XP/death hooks, avoiding the lag spikes caused by repeated /kill.
EntityEvents.spawned(event=>dzCampRejectSpawn(event))

DZ_T0_GUN_TYPES.forEach(type=>EntityEvents.spawned(type,event=>dzT0RejectSpawn(event,DZ_T0_SUBURB_RADIUS)))
DZ_T0_RANGED_TYPES.forEach(type=>EntityEvents.spawned(type,event=>dzT0RejectSpawn(event,DZ_T0_SUBURB_RADIUS)))
// Explicit vanilla registrations are kept as a compatibility fallback for
// loaders where the generic mob-category accessor is unavailable.
DZ_T0_CAMP_HOSTILES.forEach(type=>EntityEvents.spawned(type,event=>{
  let entity=event.entity
  if (!entity || dzT0Exempt(entity) || !dzCampProtectedSpawn(entity,DZ_T0_CAMP_RADIUS)) return
  event.cancel()
}))

let DZ_CAMP_CLOCK_PULSE = 0
ServerEvents.tick(event => {
  DZ_CAMP_CLOCK_PULSE++
  if (DZ_CAMP_CLOCK_PULSE % 20 !== 0 || event.server.players.length <= 0) return
  let server = event.server, data = server.persistentData
  if (!data.getBoolean(DZ_CAMP_PROTECTION_INITIALIZED)) {
    // Reuse the Horde director's existing online-only clock on old worlds so
    // updating the pack does not grant a fresh twenty-day protection window.
    let inherited = Math.max(0, Number(data.getLong("dz_auto_horde_active_ticks_v1")))
    data.putLong(DZ_CAMP_PROTECTION_TICKS, inherited)
    data.putBoolean(DZ_CAMP_PROTECTION_INITIALIZED, true)
  }
  let before = dzCampProtectionTicks(server)
  if (before < DZ_CAMP_PROTECTION_LIMIT)
    data.putLong(DZ_CAMP_PROTECTION_TICKS, Math.min(DZ_CAMP_PROTECTION_LIMIT, before + 20))
  if (before < DZ_CAMP_PROTECTION_LIMIT && !dzCampProtectionActive(server) &&
      !data.getBoolean(DZ_CAMP_PROTECTION_EXPIRED_NOTICE)) {
    data.putBoolean(DZ_CAMP_PROTECTION_EXPIRED_NOTICE, true)
    server.tell(Text.of("[CAMP ALERT] 初期防衛協定が終了。Camp 100m圏は以後Combat T1として扱われます。").red())
  }
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonesafezone")
  root.then(Commands.literal("status").executes(ctx => {
    let server = ctx.source.server, active = dzCampProtectionActive(server)
    ctx.source.player.tell(Text.of("Camp protection: " + (active ? "ON" : "OFF") +
      " / active day " + dzCampProtectionDay(server) + "/" + DZ_CAMP_PROTECTION_DAYS +
      (active ? " / Camp Horde blocked" : " / Camp Combat T1")).color(active ? "green" : "red"))
    return 1
  }))
  root.then(Commands.literal("expire").requires(source => source.hasPermission(2)).executes(ctx => {
    let data = ctx.source.server.persistentData
    data.putLong(DZ_CAMP_PROTECTION_TICKS, DZ_CAMP_PROTECTION_LIMIT)
    data.putBoolean(DZ_CAMP_PROTECTION_INITIALIZED, true)
    data.putBoolean(DZ_CAMP_PROTECTION_EXPIRED_NOTICE, true)
    ctx.source.player.tell(Text.of("Camp protectionを終了し、100m圏をCombat T1へ移行しました。").red())
    return 1
  }))
  root.then(Commands.literal("reset").requires(source => source.hasPermission(2)).executes(ctx => {
    let data = ctx.source.server.persistentData
    data.putLong(DZ_CAMP_PROTECTION_TICKS, 0)
    data.putBoolean(DZ_CAMP_PROTECTION_INITIALIZED, true)
    data.putBoolean(DZ_CAMP_PROTECTION_EXPIRED_NOTICE, false)
    ctx.source.player.tell(Text.of("Camp protection clockをactive day 1へ戻しました。").yellow())
    return 1
  }))
  event.register(root)
})

console.info("[PROJECT DEADZONE] Camp protection v0.3: first 20 online-active days, then Combat T1")
