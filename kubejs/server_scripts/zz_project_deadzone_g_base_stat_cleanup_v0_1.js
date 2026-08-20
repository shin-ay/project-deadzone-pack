// PROJECT DEADZONE G base-stat compatibility v0.1
// G/ASCENDANCY owns the initial 10 points. Remove only the legacy duplicate.

const PDZGBC_LOAD = Java.loadClass('com.robertx22.mine_and_slash.uncommon.datasaving.Load')
const PDZGBC_KEYS = ['strength','dexterity','intelligence']

function pdzGBaseCleanup(player,force){
  if(!player||player.level.clientSide)return false
  let d=player.persistentData
  let signature=String(d.getString('dz_job_id'))+'|'+String(d.getString('dz_g_synced_job'))
  if(!force&&String(d.getString('dz_g_base_cleanup_signature'))===signature)return false
  try{
    let unit=PDZGBC_LOAD.Unit(player), exact=unit.getCustomExactStats()
    PDZGBC_KEYS.forEach(stat=>exact.removeExactStat('pdz_job_'+stat))
    unit.setEquipsChanged();unit.setAllDirtyOnLoginEtc();unit.syncToClient(player)
    d.putString('dz_g_base_cleanup_signature',signature)
    d.putBoolean('dz_g_base_cleanup_ok',true)
    return true
  }catch(error){
    d.putBoolean('dz_g_base_cleanup_ok',false)
    d.putString('dz_g_base_cleanup_error',String(error))
    console.error('[PDZ G JOB] legacy base-stat cleanup failed: '+error)
    return false
  }
}

PlayerEvents.loggedIn(event=>event.server.scheduleInTicks(180,()=>pdzGBaseCleanup(event.player,true)))
PlayerEvents.respawned(event=>event.server.scheduleInTicks(100,()=>pdzGBaseCleanup(event.player,true)))
PlayerEvents.tick(event=>{if(event.player.age%200===199)pdzGBaseCleanup(event.player,false)})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  event.register(Commands.literal('deadzonegcleanup').executes(ctx=>{
    let ok=pdzGBaseCleanup(ctx.source.player,true)
    ctx.source.player.tell(Text.of(ok?'旧JOB能力値の二重加算を除去しました。':'旧JOB能力値の除去に失敗しました。').color(ok?'green':'red'))
    return ok?1:0
  }))
})
