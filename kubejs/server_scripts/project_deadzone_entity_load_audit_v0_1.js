// PROJECT DEADZONE - loaded settlement entity audit v0.1
// Read-only by default. Cleanup requires an explicit confirmation literal and
// only removes entities from the disabled Village Recruits namespace.

function pdzLoadAuditClass(entity) {
  let id = String(entity.type)
  if (id === 'minecraft:villager') return 'vanilla_villager'
  if (id === 'minecraft:iron_golem') return 'iron_golem'
  if (id.indexOf('village_recruits:') === 0) return 'disabled_village_recruits'
  if (id.indexOf('recruits:') === 0) return 'recruits'
  if (id.indexOf('mca:') === 0) return 'mca'
  if (entity.tags && (entity.tags.contains('dz_basecamp_guard') ||
      entity.tags.contains('dz_settlement_guard') || entity.tags.contains('dz_survivor_guard')))
    return 'pdz_guard'
  return ''
}

function pdzLoadedSettlementSummary(server) {
  let dimensions = {}, counts = {}, total = 0
  server.players.forEach(player => {
    let dimension = String(player.level.dimension)
    if (dimensions[dimension]) return
    dimensions[dimension] = true
    player.level.entities.forEach(entity => {
      let key = pdzLoadAuditClass(entity)
      if (!key) return
      counts[key] = Number(counts[key] || 0) + 1
      total++
    })
  })
  return {counts:counts, total:total, dimensions:Object.keys(dimensions).length}
}

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzoneentityaudit').requires(source => source.hasPermission(2))

  root.then(Commands.literal('summary').executes(ctx => {
    let result = pdzLoadedSettlementSummary(ctx.source.server)
    let text = '[PDZ ENTITY AUDIT] loaded settlement entities=' + result.total +
      ' dimensions=' + result.dimensions + ' counts=' + JSON.stringify(result.counts)
    ctx.source.sendSuccess(Text.of(text).aqua(), false)
    console.info(text)
    return result.total
  }))

  root.then(Commands.literal('cleanup_disabled_village_recruits').then(
    Commands.literal('confirm').executes(ctx => {
      let server = ctx.source.server, dimensions = {}, removed = 0
      server.players.forEach(player => {
        let dimension = String(player.level.dimension)
        if (dimensions[dimension]) return
        dimensions[dimension] = true
        // Cleanup is deliberately restricted to loaded entities belonging to
        // the disabled mod. Vanilla villagers, MCA and Recruits are untouched.
        player.level.entities.forEach(entity => {
          if (String(entity.type).indexOf('village_recruits:') !== 0) return
          entity.discard()
          removed++
        })
      })
      let text = '[PDZ ENTITY AUDIT] removed disabled Village Recruits entities=' + removed
      ctx.source.sendSuccess(Text.of(text).yellow(), false)
      console.warn(text)
      return removed
    })
  ))

  event.register(root)
})
