// PROJECT DEADZONE T0 onboarding safe zone v0.2
// Reject unwanted spawns individually with discard(). The old implementation
// scanned a 1400x56x1400 box every five seconds and used /kill, triggering
// death/drop/XP hooks in bulk and causing visible server stalls.

const DZ_T0_SUBURB_RADIUS = 700
// Basecamp is a permanent onboarding/trading safe zone.  Do not tie this
// radius to world tier or elapsed days: players must always be able to use
// camp services without newly spawned hostiles appearing inside the walls.
const DZ_T0_CAMP_RADIUS = 100
const DZ_T0_VERTICAL_RADIUS = 24

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

function dzT0ProtectedSpawn(entity, radius) {
  let data=entity.server.persistentData
  if (data.getInt("deadzone_world_tier") > 0) return false
  if (data.getInt("dz_auto_basecamp_layout_version") <= 0) return false
  let cx=data.getInt("dz_auto_basecamp_origin_x")+16
  let cy=data.getInt("dz_auto_basecamp_origin_y")
  let cz=data.getInt("dz_auto_basecamp_origin_z")+16
  let dx=Number(entity.x)-cx, dy=Number(entity.y)-cy, dz=Number(entity.z)-cz
  return Math.abs(dy)<=DZ_T0_VERTICAL_RADIUS && (dx*dx+dz*dz)<=radius*radius
}

function dzCampProtectedSpawn(entity, radius) {
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
