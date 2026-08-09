// PROJECT DEADZONE T0 onboarding safe zone v0.1
// The camp is not a combat arena before players have selected a JOB and armed.
// Story/facility spawns remain available outside the camp, and scripted camp
// raiders are explicitly excluded so the post-T1 raid still works.

const DZ_T0_SAFE_GUN_RADIUS = 160
const DZ_T0_SAFE_MOB_RADIUS = 64
const DZ_T0_SUBURB_RADIUS = 700
let DZ_T0_SAFE_TICKS = 0

function dzT0Tier(server) {
  return server.persistentData.getInt("deadzone_world_tier")
}

function dzT0KillBoxAtCamp(server, selector, radius, down, height) {
  let boxed = selector.substring(0, selector.length - 1) +
    ",dx=" + (radius * 2) + ",dy=" + height + ",dz=" + (radius * 2) + "]"
  server.runCommandSilent(
    "execute at @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1] " +
    "positioned ~-" + radius + " ~-" + down + " ~-" + radius + " run kill " + boxed
  )
}

ServerEvents.tick(event => {
  DZ_T0_SAFE_TICKS++
  if (DZ_T0_SAFE_TICKS % 100 !== 0) return
  let server = event.server
  // Geographical T0 remains a farming/recovery area after World Tier rises.
  // Story raids use dz_basecamp_raider and are excluded below.
  if (server.runCommandSilent(
    "execute if entity @e[type=minecraft:marker,tag=dz_basecamp_core_anchor,limit=1]"
  ) <= 0) return

  // Armed roaming NPCs stay in cities, facilities and explicit encounters.
  ;[
    "tacz_hostiles:scavenger", "tacz_hostiles:soldier",
    "tacz_bandits:bandit", "simpleenemymod:ruunit",
    "simpleenemymod:pmcunit"
  ].forEach(type => dzT0KillBoxAtCamp(server,
    "@e[type=" + type +
    ",tag=!dz_basecamp_raider,tag=!dz_story_npc,tag=!dz_story_boss,tag=!dz_buddy" +
    ",tag=!dz_survivor,tag=!dz_basecamp_guard,tag=!dz_usunit_friendly" +
    ",tag=!dz_t0_convoy,tag=!dz_named,tag=!dz_elite]",
    DZ_T0_SUBURB_RADIUS, 24, 56))

  // T0 suburbs teach positioning against melee groups. Long-range crossfire
  // starts in T1 towns, after players have found armor and ammunition.
  ;["minecraft:skeleton", "minecraft:stray"].forEach(type => dzT0KillBoxAtCamp(server,
    "@e[type=" + type + ",tag=!dz_named,tag=!dz_elite,tag=!dz_t0_convoy]",
    DZ_T0_SUBURB_RADIUS, 24, 56))

  // A smaller breathing room around the actual respawn/camp area.
  ;[
    "minecraft:zombie", "minecraft:husk", "minecraft:drowned",
    "minecraft:skeleton", "minecraft:stray", "minecraft:creeper",
    "minecraft:spider", "minecraft:cave_spider", "minecraft:witch"
  ].forEach(type => dzT0KillBoxAtCamp(server,
    "@e[type=" + type + ",tag=!dz_named,tag=!dz_elite,tag=!dz_t0_convoy]",
    DZ_T0_SAFE_MOB_RADIUS, 16, 32))
})
