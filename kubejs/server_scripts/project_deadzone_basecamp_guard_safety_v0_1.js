// PROJECT DEADZONE - basecamp guard safety v0.1
// TaCZ NPC templates can reacquire players even when scoreboard teams/tags are
// correct. The camp is a hard safe zone, so authored survivor guards must never
// damage players or other survivor-aligned entities.

function pdzIsCampGuard(entity) {
  if (!entity || !entity.tags) return false
  return entity.tags.contains('dz_basecamp_guard') ||
    (entity.tags.contains('dz_survivor_guard') && entity.tags.contains('dz_survivor'))
}

function pdzIsSurvivorAlly(entity) {
  if (!entity) return false
  if (String(entity.type) === 'minecraft:player') return true
  return !!entity.tags && (entity.tags.contains('dz_survivor') || entity.tags.contains('dz_friendly') ||
    entity.tags.contains('dz_buddy') || entity.tags.contains('dz_story_npc'))
}

EntityEvents.hurt(event => {
  let attacker = event.source.actual
  let direct = event.source.direct
  if ((!attacker || !pdzIsCampGuard(attacker)) && direct && pdzIsCampGuard(direct)) attacker = direct
  if (pdzIsCampGuard(attacker) && pdzIsSurvivorAlly(event.entity)) event.cancel()
})

ServerEvents.tick(event => {
  if (event.server.tickCount % 20 !== 0) return
  let seen = {}
  event.server.players.forEach(player => {
    player.level.entities.forEach(entity => {
      if (!pdzIsCampGuard(entity) || seen[String(entity.uuid)]) return
      seen[String(entity.uuid)] = true
      entity.tags.add('dz_survivor')
      entity.tags.add('dz_friendly')
      entity.runCommandSilent('team join dz_survivors @s')
      try {
        if (pdzIsSurvivorAlly(entity.target)) entity.setTarget(null)
      } catch (ignored) {}
    })
  })
})
