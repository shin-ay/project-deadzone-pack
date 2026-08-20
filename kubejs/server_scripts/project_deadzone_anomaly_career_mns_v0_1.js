// PROJECT DEADZONE Anomaly Researcher Career -> Mine and Slash v0.1
// Adds the missing T2/T3 mechanical skeleton. Stable exact-stat keys prevent
// stacking on login, respawn, reload, or promotion.

const PDZA_LOAD = Java.loadClass('com.robertx22.mine_and_slash.uncommon.datasaving.Load')
const PDZA_MOD_TYPE = Java.loadClass('com.robertx22.mine_and_slash.uncommon.enumclasses.ModType')

const PDZA_KEYS = [
  'ailment_damage','all_penetration','area_dmg','magic_shield','magic_shield_regen',
  'aura_effect','summon_damage','summon_duration','damage_reduction','chance_of_slow',
  'all_resist','accuracy','critical_hit','critical_damage','increase_healing','health_regen'
]

const PDZA_T2 = {
  rift_analyst:[
    ['ailment_damage',8,'PERCENT'],['all_penetration',4,'PERCENT'],['area_dmg',5,'PERCENT']
  ],
  resonance_engineer:[
    ['magic_shield',6,'FLAT'],['magic_shield_regen',8,'PERCENT'],['aura_effect',5,'PERCENT'],
    ['summon_damage',6,'PERCENT']
  ]
}

const PDZA_T3 = {
  rift_warden:[
    ['damage_reduction',5,'PERCENT'],['chance_of_slow',8,'PERCENT'],['all_resist',6,'PERCENT']
  ],
  hazard_seer:[
    ['accuracy',8,'PERCENT'],['critical_hit',6,'PERCENT'],['critical_damage',10,'PERCENT']
  ],
  construct_binder:[
    ['summon_damage',16,'PERCENT'],['summon_duration',20,'PERCENT'],['magic_shield',4,'FLAT']
  ],
  null_physician:[
    ['increase_healing',14,'PERCENT'],['health_regen',8,'PERCENT'],['magic_shield_regen',12,'PERCENT']
  ]
}

function pdzAModType(id){
  if(id==='FLAT')return PDZA_MOD_TYPE.FLAT
  if(id==='MORE')return PDZA_MOD_TYPE.MORE
  return PDZA_MOD_TYPE.PERCENT
}

function pdzAApplyRows(exact,prefix,rows){
  ;(rows||[]).forEach(row=>exact.addExactStat(prefix+'_'+row[0],row[0],row[1],pdzAModType(row[2])))
}

function pdzAApply(player,force){
  if(!player||player.level.clientSide)return false
  let d=player.persistentData
  let job=String(d.getString('dz_job_id'))
  let t2=job==='anomaly_researcher'?String(d.getString('dz_career_t2')):''
  let t3=job==='anomaly_researcher'?String(d.getString('dz_career_t3')):''
  let signature=job+'|'+t2+'|'+t3
  if(!force&&String(d.getString('dz_anomaly_mns_signature'))===signature)return false
  try{
    let cap=PDZA_LOAD.Unit(player),exact=cap.getCustomExactStats()
    PDZA_KEYS.forEach(stat=>{
      exact.removeExactStat('pdz_anomaly_t2_'+stat)
      exact.removeExactStat('pdz_anomaly_t3_'+stat)
    })
    if(job==='anomaly_researcher'){
      pdzAApplyRows(exact,'pdz_anomaly_t2',PDZA_T2[t2])
      pdzAApplyRows(exact,'pdz_anomaly_t3',PDZA_T3[t3])
    }
    cap.setEquipsChanged();cap.setAllDirtyOnLoginEtc();cap.syncToClient(player)
    d.putString('dz_anomaly_mns_signature',signature)
    d.putBoolean('dz_anomaly_mns_ok',true)
    return true
  }catch(error){
    d.putBoolean('dz_anomaly_mns_ok',false)
    d.putString('dz_anomaly_mns_error',String(error))
    console.error('[PDZ Anomaly] M&S career sync failed for '+player.name.string+': '+error)
    return false
  }
}

function pdzAStatus(player){
  let d=player.persistentData
  player.tell(Text.of('=== Anomaly Researcher ===').lightPurple())
  player.tell(Text.of('T2: '+(d.getString('dz_career_t2')||'-')+' / T3: '+(d.getString('dz_career_t3')||'-')).aqua())
  player.tell(Text.of('M&S effects: '+(d.getBoolean('dz_anomaly_mns_ok')?'OK':'ERROR')).color(d.getBoolean('dz_anomaly_mns_ok')?'green':'red'))
  if(!d.getBoolean('dz_anomaly_mns_ok'))player.tell(Text.of(String(d.getString('dz_anomaly_mns_error'))).red())
}

PlayerEvents.loggedIn(event=>event.server.scheduleInTicks(140,()=>pdzAApply(event.player,true)))
PlayerEvents.respawned(event=>event.server.scheduleInTicks(80,()=>pdzAApply(event.player,true)))
PlayerEvents.tick(event=>{if(event.player.age%200===0)pdzAApply(event.player,false)})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzoneanomaly')
  root.executes(ctx=>{pdzAApply(ctx.source.player,true);pdzAStatus(ctx.source.player);return 1})
  root.then(Commands.literal('status').executes(ctx=>{pdzAStatus(ctx.source.player);return 1}))
  root.then(Commands.literal('refresh').executes(ctx=>{let ok=pdzAApply(ctx.source.player,true);pdzAStatus(ctx.source.player);return ok?1:0}))
  event.register(root)
})
