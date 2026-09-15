// PROJECT DEADZONE - player combat survivability policy v0.1
// Mine and Slash still owns HP and combat stats. This hook only provides the
// missing final safety layer against unreadable combat one-shots.

function pdzSurviveHasTag(entity, tag) {
  try { return entity.tags.contains(tag) } catch (ignored) { return false }
}

function pdzSurviveTank(player) {
  let data=player.persistentData
  let job=String(data.getString('dz_job_id'))
  let c2=String(data.getString('dz_career_t2'))
  let c3=String(data.getString('dz_career_t3'))
  if(job==='security'||c2==='guardian'||['bulwark','sentinel','juggernaut','riot_leader'].indexOf(c3)>=0)return true
  return pdzSurviveHasTag(player,'dz_growth_combat_tank')||pdzSurviveHasTag(player,'dz_growth_combat_bulwark')
}

function pdzSurviveStoryBoss(entity) {
  if(!entity)return false
  let tags=['dz_story_boss','dz_pdz_boss','dz_mns_boss_profile','dz_boss_axel',
    'dz_story_boss_gasstation','dz_story_boss_gunshop','dz_story_boss_firestation',
    'dz_story_boss_hospital','dz_story_boss_policestation','dz_story_boss_radio_tower',
    'dz_story_boss_argus_fragment','dz_story_boss_choir_vessel','dz_story_boss_reactor_saint',
    'dz_story_boss_t4_relay_shepherd','dz_story_boss_primordial','dz_sideboss_tank',
    'dz_sideboss_abomination']
  for(let i=0;i<tags.length;i++)if(pdzSurviveHasTag(entity,tags[i]))return true
  return false
}

function pdzSurviveAxel(entity) {
  return pdzSurviveHasTag(entity,'dz_boss_axel')
}

function pdzSurviveSourceEntity(source,direct) {
  if(!source)return null
  let entity=null
  // LivingHurtEvent exposes the native DamageSource. Use its Java accessors
  // first; property aliases are not consistently resolved for TaCZ bullets.
  try{entity=direct?source.getDirectEntity():source.getEntity()}catch(ignored){}
  if(entity)return entity
  try{entity=direct?source.directEntity:source.entity}catch(ignored){}
  if(entity)return entity
  try{entity=direct?source.direct:source.actual}catch(ignored){}
  return entity||null
}

function pdzSurviveEntityId(entity) {
  if(!entity)return 'none'
  try{return String(entity.type)}catch(ignored){}
  try{return String(entity.getType())}catch(ignored){}
  return 'unknown'
}

ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingHurtEvent',event=>{
  let player=event.entity
  if(!player||!player.isPlayer||!player.isPlayer()||player.level.clientSide)return
  let source=event.source
  let sourceId=''
  try{sourceId=String(source.type())}catch(ignored){try{sourceId=String(source)}catch(ignored2){}}
  sourceId=sourceId.toLowerCase()
  if(sourceId.indexOf('outofworld')>=0||sourceId.indexOf('out_of_world')>=0||sourceId.indexOf('generic_kill')>=0)return

  let attacker=pdzSurviveSourceEntity(source,false)
  let direct=pdzSurviveSourceEntity(source,true)
  // Environmental attrition remains LSO/vanilla territory. This protection is
  // deliberately limited to attacks caused by an entity or its projectile.
  if(!attacker&&!direct)return

  let original=Math.max(0,Number(event.amount)||0)
  if(original<=0)return
  let adjusted=original
  let boss=pdzSurviveStoryBoss(attacker)||pdzSurviveStoryBoss(direct)
  let axel=pdzSurviveAxel(attacker)||pdzSurviveAxel(direct)
  // Axel uses a full-auto M4A1. Per-hit one-shot protection cannot stop a
  // whole burst, so his bullets receive a stronger encounter-specific scale.
  if(axel)adjusted*=0.40
  else if(boss)adjusted*=0.60

  let health=Math.max(0,Number(player.health)||0)
  let maxHealth=Math.max(1,Number(player.maxHealth)||1)
  let absorption=Math.max(0,Number(player.absorptionAmount)||0)
  let tank=pdzSurviveTank(player)
  let threshold=tank?0.60:0.80
  let capRatio=tank?0.50:0.68
  let healthy=health/maxHealth>=threshold
  let cap=absorption+maxHealth*capRatio
  if(healthy&&adjusted>cap)adjusted=cap

  // A TaCZ burst consists of several individually non-lethal events. Limit
  // Axel's total one-second damage instead of making later bullets invisible
  // to the normal M&S health pool. The next second can still finish the player.
  let data=player.persistentData
  let gameTime=0
  try{gameTime=Number(player.level.gameTime)}catch(ignored){}
  if(axel){
    let windowStart=Number(data.getLong('dz_axel_damage_window_start'))
    if(windowStart<=0||gameTime<windowStart||gameTime-windowStart>=20){
      windowStart=gameTime
      data.putLong('dz_axel_damage_window_start',gameTime)
      data.putDouble('dz_axel_damage_window_used',0)
    }
    let used=Math.max(0,Number(data.getDouble('dz_axel_damage_window_used')))
    let budget=maxHealth*(tank?0.35:0.45)
    adjusted=Math.max(0,Math.min(adjusted,budget-used))
    data.putDouble('dz_axel_damage_window_used',Math.min(budget,used+adjusted))
  }

  if(adjusted+0.001<original){
    event.setAmount(adjusted)
    data.putDouble('dz_survival_last_original',original)
    data.putDouble('dz_survival_last_final',adjusted)
    data.putString('dz_survival_last_profile',tank?'tank':'standard')
    data.putBoolean('dz_survival_last_boss',boss)
    data.putBoolean('dz_survival_last_axel',axel)
    data.putInt('dz_survival_guard_count',data.getInt('dz_survival_guard_count')+1)
    let lastLog=Number(data.getLong('dz_survival_last_log_tick'))
    if(lastLog<=0||gameTime<lastLog||gameTime-lastLog>=20){
      data.putLong('dz_survival_last_log_tick',gameTime)
      console.warn('[PDZ Survivability] player='+player.username+' original='+original.toFixed(2)+
        ' final='+adjusted.toFixed(2)+' profile='+(tank?'tank':'standard')+' boss='+boss+
        ' axel='+axel+' attacker='+pdzSurviveEntityId(attacker)+' direct='+pdzSurviveEntityId(direct)+
        ' health='+health.toFixed(2)+'/'+maxHealth.toFixed(2))
    }
  }
})
