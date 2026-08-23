// PROJECT DEADZONE legacy JourneyMap sync retirement v0.2
//
// The former implementation broadcast pdz_journeymap_sync every 600 ticks.
// Current clients deliberately do not load the obsolete JourneyMap API v2
// bridge, so broadcasting the packet only wasted server/client time and filled
// logs with ClassNotFoundException.  JourneyMap itself remains enabled.

global.pdzJourneyMapSync = function(player) {
  return {cells:0, sites:0, activities:0, retired:true}
}

ServerEvents.commandRegistry(event => {
  const {commands:Commands} = event
  event.register(Commands.literal('deadzonemap')
    .then(Commands.literal('sync').executes(ctx => {
      ctx.source.player.tell(Text.of('[PDZ MAP] 旧カスタムオーバーレイは廃止済みです。JourneyMap本体を使用してください。').gray())
      return 1
    })))
})

console.info('[PROJECT DEADZONE] Legacy JourneyMap strategic sync disabled; native JourneyMap remains active')
