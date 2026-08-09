// PROJECT DEADZONE T0 onboarding safe zone v0.2
// Reject unwanted spawns individually with discard(). The old implementation
// scanned a 1400x56x1400 box every five seconds and used /kill, triggering
// death/drop/XP hooks in bulk and causing visible server stalls.

const DZ_T0_SUBURB_RADIUS = 700
const DZ_T0_CAMP_RADIUS = 64
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
  "dz_t0_convoy", "dz_named", "dz_elite"
]

function dzT0ProtectedSpawn(entity, radius) {
  let data=entity.server.persistentData
  if (data.getInt("dz_auto_basecamp_layout_version") <= 0) return false
  let cx=data.getInt("dz_auto_basecamp_origin_x")+16
  let cy=data.getInt("dz_auto_basecamp_origin_y")
  let cz=data.getInt("dz_auto_basecamp_origin_z")+16
  let dx=Number(entity.x)-cx, dy=Number(entity.y)-cy, dz=Number(entity.z)-cz
  return Math.abs(dy)<=DZ_T0_VERTICAL_RADIUS && (dx*dx+dz*dz)<=radius*radius
}

function dzT0Exempt(entity) {
  for (let i=0;i<DZ_T0_EXEMPT_TAGS.length;i++) if (entity.tags.contains(DZ_T0_EXEMPT_TAGS[i])) return true
  return false
}

function dzT0DiscardLater(event, radius) {
  let entity=event.entity
  // Named/convoy promotion hooks run a few ticks after spawn. Waiting ten
  // ticks lets those tags settle, while discard avoids death loot and XP.
  entity.server.scheduleInTicks(10,()=>{
    if (!entity || !entity.alive || dzT0Exempt(entity) || !dzT0ProtectedSpawn(entity,radius)) return
    try { entity.discard() } catch (ignored) { entity.kill() }
  })
}

DZ_T0_GUN_TYPES.forEach(type=>EntityEvents.spawned(type,event=>dzT0DiscardLater(event,DZ_T0_SUBURB_RADIUS)))
DZ_T0_RANGED_TYPES.forEach(type=>EntityEvents.spawned(type,event=>dzT0DiscardLater(event,DZ_T0_SUBURB_RADIUS)))
DZ_T0_CAMP_HOSTILES.forEach(type=>EntityEvents.spawned(type,event=>dzT0DiscardLater(event,DZ_T0_CAMP_RADIUS)))
