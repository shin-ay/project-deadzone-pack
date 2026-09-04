// PROJECT DEADZONE Vehicle Authorization v0.1 (local candidate)
// Technology milestones authorize vehicle deployment independently from JOB.
// S0 keeps simple bikes and civilian boats; S1 opens motor vehicles; S2 opens aircraft.

function dzVehicleStoryTier(player) {
  try {
    if (global.pdzStoryUnlockTier) return Math.max(0, Number(global.pdzStoryUnlockTier(player.server)) || 0)
  } catch (ignored) {}
  for (let i = 5; i >= 0; i--) if (player.stages.has('deadzone_tier_' + i)) return i
  return Math.max(0, player.server.persistentData.getInt('deadzone_story_unlock_tier'))
}

function dzVehicleRequiredTier(stack) {
  if (!stack || stack.isEmpty()) return -1
  let id = String(stack.id).toLowerCase()
  if (id.startsWith('blocky_bikes:')) return 0
  if (id.startsWith('immersive_aircraft:')) return 2
  // Small Ships are ordinary civilian exploration vessels, not military
  // technology. They intentionally remain unrestricted at every story stage.
  if (id.startsWith('smallships:')) return -1
  if (id.startsWith('vehicle:')) {
    return /(compact_helicopter|sports_plane|sofacopter|aircraft|airplane|helicopter)/.test(id) ? 2 : 1
  }
  if (id.startsWith('mts:')) {
    // MTS stores pack vehicles and parts under one namespace. Only placement
    // items reach this use guard; aircraft names are classified before the
    // general MTS ground-vehicle fallback.
    if (/(aircraft|airplane|aeroplane|helicopter|\bheli\b|skyhawk|trimotor|cessna|c172|biplane|seaplane|jet)/.test(id)) return 2
    return 1
  }
  return -1
}

function dzVehicleTierLabel(tier) {
  if (tier <= 0) return 'S0 軽車両'
  if (tier === 1) return 'S1 動力付き陸上・水上車両 / Gas Station'
  return 'S2 航空機・ヘリ / Police Station'
}

ItemEvents.rightClicked(event => {
  let player = event.player
  if (!player || player.level.clientSide) return
  let required = dzVehicleRequiredTier(event.item)
  if (required < 0 || dzVehicleStoryTier(player) >= required) return
  event.cancel()
  let now = player.age, last = player.persistentData.getInt('dz_vehicle_deny_notice_tick')
  if (last > 0 && now >= last && now - last < 40) return
  player.persistentData.putInt('dz_vehicle_deny_notice_tick', now)
  player.tell(Text.of('未承認の移動手段: ' + String(event.item.id)).red())
  player.tell(Text.of('必要: ' + dzVehicleTierLabel(required) + ' / 現在 S' + dzVehicleStoryTier(player)).gray())
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzonevehicle')
  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    let required = dzVehicleRequiredTier(player.mainHandItem)
    player.tell(Text.of('Story S' + dzVehicleStoryTier(player) + ' / ' + String(player.mainHandItem.id)).aqua())
    if (required < 0) player.tell(Text.of('車両配備アイテムではありません。').gray())
    else player.tell(Text.of('承認段階: ' + dzVehicleTierLabel(required))
      .color(dzVehicleStoryTier(player) >= required ? 'green' : 'red'))
    return 1
  }))
  event.register(root)
})

global.pdzVehicleRequiredTier = dzVehicleRequiredTier
