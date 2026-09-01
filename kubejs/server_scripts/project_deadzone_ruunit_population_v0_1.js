// PROJECT DEADZONE RU Unit population v0.2
// Keep natural hostile patrols rare and bounded. Authored encounters are exempt.
const DZ_RUUNIT_TYPE = 'simpleenemymod:ruunit'
const DZ_RUUNIT_NATURAL_KEEP_CHANCE = 0.08
const DZ_RUUNIT_LOADED_CAP = 6
const DZ_RUUNIT_AUTHORED_TAGS = [
  'dz_raider','dz_story_npc','dz_story_boss','dz_elite','dz_t0_convoy',
  'dz_boss_showroom','dz_boss_loadtest','dz_basecamp_guard','dz_buddy',
  'dz_named','dz_sideboss','dz_event_unit','dz_stronghold_guard'
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
    if (Math.random() > DZ_RUUNIT_NATURAL_KEEP_CHANCE) entity.discard()
  })
})

// Also migrates old loaded natural RU Units that predate the population tag.
ServerEvents.tick(event => {
  if (event.server.tickCount % 20 !== 0) return
  let retained = {}
  event.server.players.forEach(player => {
    player.level.entities.forEach(entity => {
      if (String(entity.type) !== DZ_RUUNIT_TYPE || dzRuunitIsAuthored(entity)) return
      let key = String(entity.uuid)
      if (retained[key]) return
      retained[key] = true
      entity.addTag('dz_ruunit_natural')
      if (Object.keys(retained).length > DZ_RUUNIT_LOADED_CAP) entity.discard()
    })
  })
})
