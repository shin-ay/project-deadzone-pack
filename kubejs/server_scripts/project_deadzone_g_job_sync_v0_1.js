// PROJECT DEADZONE G JOB sync v0.1
// DEV: Makes the PDZ JOB id the only source of truth for Mine and Slash's
// ASCENDANCY entry. This does not award or consume player Talent points.

const PDZG_LOAD = Java.loadClass('com.robertx22.mine_and_slash.uncommon.datasaving.Load')
const PDZG_SCHOOL = Java.loadClass('com.robertx22.mine_and_slash.database.data.talent_tree.TalentTree$SchoolType')
const PDZG_POINT = Java.loadClass('com.robertx22.mine_and_slash.saveclasses.PointData')

const PDZG_JOB_ENTRY = {
  survivor:{id:'ascendant_class',x:54,y:46},
  weapons_expert:{id:'assassin_class',x:108,y:46},
  medic:{id:'arcanist_class',x:72,y:82},
  mechanic:{id:'raider_class',x:54,y:82},
  engineer:{id:'battlemage_class',x:54,y:64},
  scout:{id:'hunter_class',x:90,y:46},
  security:{id:'champion_class',x:90,y:100},
  survivalist:{id:'chieftain_class',x:90,y:82},
  anomaly_researcher:{id:'elementalist_class',x:90,y:64}
}

const PDZG_TALENT_ENTRY = {
  survivor:{id:'pdz_start_survival',x:96,y:67},
  weapons_expert:{id:'pdz_start_combat',x:90,y:73},
  medic:{id:'pdz_start_analysis',x:90,y:61},
  mechanic:{id:'pdz_start_industry',x:84,y:67},
  engineer:{id:'pdz_start_industry',x:84,y:67},
  scout:{id:'pdz_start_survival',x:96,y:67},
  security:{id:'pdz_start_combat',x:90,y:73},
  survivalist:{id:'pdz_start_survival',x:96,y:67},
  anomaly_researcher:{id:'pdz_start_analysis',x:90,y:61}
}

function pdzGJobId(player){
  let id=String(player.persistentData.getString('dz_job_id'))
  return PDZG_JOB_ENTRY[id]?id:'survivor'
}

function pdzGSyncJob(player,force){
  if(!player||player.level.clientSide)return false
  let job=pdzGJobId(player)
  let d=player.persistentData
  if(!force&&String(d.getString('dz_g_synced_job'))===job)return false
  try{
    let pdata=PDZG_LOAD.player(player)
    // PDZ Career owns promotions. M&S default ascendancies must never survive
    // a base JOB change, otherwise class passives can be mixed accidentally.
    pdata.talents.clearAllTalents(PDZG_SCHOOL.ASCENDANCY)
    let entry=PDZG_JOB_ENTRY[job]
    let school=pdata.talents.getSchool(PDZG_SCHOOL.ASCENDANCY)
    if(!school.allocate(new PDZG_POINT(entry.x,entry.y)))throw 'Unable to allocate '+entry.id

    // The standard M&S four starts are replaced by PDZ doctrine entries.
    // Reset once per schema so a player can never keep a fantasy class start.
    let talentEntry=PDZG_TALENT_ENTRY[job]
    if(d.getInt('dz_g_talent_start_schema')<2){
      pdata.talents.clearAllTalents(PDZG_SCHOOL.TALENTS)
      let talentSchool=pdata.talents.getSchool(PDZG_SCHOOL.TALENTS)
      if(!talentSchool.allocate(new PDZG_POINT(talentEntry.x,talentEntry.y)))throw 'Unable to allocate '+talentEntry.id
      d.putInt('dz_g_talent_start_schema',2)
      d.putString('dz_g_talent_entry',talentEntry.id)
    }
    pdata.forceNextSync()
    pdata.syncToClient(player)
    let unit=PDZG_LOAD.Unit(player)
    unit.setEquipsChanged()
    unit.setAllDirtyOnLoginEtc()
    unit.syncToClient(player)
    d.putString('dz_g_synced_job',job)
    d.putString('dz_g_synced_entry',entry.id)
    d.putBoolean('dz_g_job_sync_ok',true)
    d.remove('dz_g_job_sync_error')
    return true
  }catch(error){
    d.putBoolean('dz_g_job_sync_ok',false)
    d.putString('dz_g_job_sync_error',String(error))
    console.error('[PDZ G JOB] sync failed for '+player.name.string+': '+error)
    return false
  }
}

function pdzGJobStatus(player){
  let job=pdzGJobId(player), entry=PDZG_JOB_ENTRY[job], d=player.persistentData
  player.tell(Text.of('=== PDZ / G JOB Sync ===').gold())
  player.tell(Text.of('PDZ JOB: '+job).aqua())
  player.tell(Text.of('G Entry: '+entry.id+' @ '+entry.x+','+entry.y).gray())
  player.tell(Text.of('Talent Start: '+PDZG_TALENT_ENTRY[job].id).gray())
  player.tell(Text.of('Sync: '+(d.getBoolean('dz_g_job_sync_ok')?'OK':'ERROR')).color(d.getBoolean('dz_g_job_sync_ok')?'green':'red'))
  if(!d.getBoolean('dz_g_job_sync_ok'))player.tell(Text.of(String(d.getString('dz_g_job_sync_error'))).red())
}

// Do not force-clear ASCENDANCY on every reconnect. A forced clear is only
// required when the PDZ base JOB changed or an administrator requests it.
PlayerEvents.loggedIn(event=>event.server.scheduleInTicks(120,()=>pdzGSyncJob(event.player,false)))
PlayerEvents.respawned(event=>event.server.scheduleInTicks(60,()=>pdzGSyncJob(event.player,false)))
PlayerEvents.tick(event=>{if(event.player.age%200===0)pdzGSyncJob(event.player,false)})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzoneg')
  root.executes(ctx=>{pdzGSyncJob(ctx.source.player,true);pdzGJobStatus(ctx.source.player);return 1})
  root.then(Commands.literal('status').executes(ctx=>{pdzGJobStatus(ctx.source.player);return 1}))
  root.then(Commands.literal('sync').executes(ctx=>{
    let ok=pdzGSyncJob(ctx.source.player,true)
    ctx.source.player.tell(Text.of(ok?'Gの開始JOBを同期しました。':'GのJOB同期に失敗しました。').color(ok?'green':'red'))
    return ok?1:0
  }))
  event.register(root)
})
