// PROJECT DEADZONE RU Unit population v0.3
// Population frequency belongs to Simple Enemy Mod's source configuration.
// This bridge only marks natural units and never removes a visible spawn.
const DZ_RUUNIT_TYPE = 'simpleenemymod:ruunit'
const DZ_RUUNIT_AUTHORED_TAGS = [
  'dz_raider','dz_story_npc','dz_story_boss','dz_elite','dz_t0_convoy',
  'dz_boss_showroom','dz_boss_loadtest','dz_basecamp_guard','dz_buddy',
  'dz_named','dz_sideboss','dz_event_unit','dz_stronghold_guard',
  // Every PDZ-authored Remnant/AEGIS formation must survive the natural
  // population thinning below. These cover strongholds, territory patrols,
  // wilderness garrisons and story relay defenders.
  'dz_npc','dz_remnant','dz_aegis','dz_garrison_bound',
  'dz_territory_patrol','dz_stronghold_defender','dz_t4_relay_guard'
]

function dzRuunitIsAuthored(entity) {
  if (!entity || !entity.tags) return true
  for (let i = 0; i < DZ_RUUNIT_AUTHORED_TAGS.length; i++)
    if (entity.tags.contains(DZ_RUUNIT_AUTHORED_TAGS[i])) return true
  try { if (entity.getOwnerUUID() != null) return true } catch (ignored) {}
  return false
}

EntityEvents.spawned(DZ_RUUNIT_TYPE, event => {
  let entity = event.entity
  entity.server.scheduleInTicks(20, () => {
    if (!entity || !entity.alive || dzRuunitIsAuthored(entity)) return
    entity.addTag('dz_ruunit_natural')
  })
})
