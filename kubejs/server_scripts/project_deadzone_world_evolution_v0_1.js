// Shared threat progression: story may advance early; elapsed days prevent permanent T0.
// Elapsed days are only a slow safety net. Story progression may advance sooner.
// This pacing leaves enough time for multiplayer building, farming and side content.
const PDZ_DAY_TIER = [[10,1],[25,2],[50,3],[90,4]]
ServerEvents.tick(event => {
  let server=event.server
  if (server.tickCount%1200!==0 || !server.players || server.players.length===0) return
  let day=Math.floor(Number(server.players[0].level.getDayTime())/24000)+1
  let current=server.persistentData.getInt('deadzone_world_tier'), target=current
  PDZ_DAY_TIER.forEach(entry=>{if(day>=entry[0])target=Math.max(target,entry[1])})
  if(target>current && typeof dzStorySetTier==='function'){
    dzStorySetTier(server,target,true)
    server.tell(Text.of('[WORLD] Day '+day+': threat advanced to T'+target).red())
  }
})
ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  event.register(Commands.literal('deadzoneworld').then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player,day=Math.floor(Number(p.level.getDayTime())/24000)+1
    p.tell(Text.of('Day '+day+' / World Tier T'+p.server.persistentData.getInt('deadzone_world_tier')).gold())
    p.tell(Text.of('Automatic: Day 6 T1 / 14 T2 / 28 T3 / 50 T4').gray());return 1
  })))
})
