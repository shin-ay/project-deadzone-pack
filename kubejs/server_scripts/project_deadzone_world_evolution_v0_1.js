// Story tier controls unlocks. Ambient combat strength is handled separately
// by Scaling Health and increases only with distance from the world spawn/camp.
// Do not advance the world tier from elapsed days.
ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  event.register(Commands.literal('deadzoneworld').then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player,day=Math.floor(Number(p.level.getDayTime())/24000)+1
    p.tell(Text.of('Day '+day+' / World Tier T'+p.server.persistentData.getInt('deadzone_world_tier')).gold())
    p.tell(Text.of('Combat difficulty: distance based / Story Tier: objective based').gray());return 1
  })))
})
