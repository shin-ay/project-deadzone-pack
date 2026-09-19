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

function pdzSurviveGunshopBoss(entity) {
  return pdzSurviveHasTag(entity,'dz_story_boss_gunshop')||
    pdzSurviveHasTag(entity,'dz_boss_mech_06')
}

function pdzSurviveGunSoldier(entity) {
  if(!entity)return false
  try{if(entity.isPlayer&&entity.isPlayer())return false}catch(ignored){}
  let id=pdzSurviveEntityId(entity)
  let namespace=id.split(':')[0]
  if(namespace==='tacz_bandits'||namespace==='tacz_hostiles')return true
  if(id==='simpleenemymod:ruunit')return true
  try{
    let stack=entity.mainHandItem
    if(stack&&String(stack.id)==='tacz:modern_kinetic_gun')return true
  }catch(ignored){}
  return pdzSurviveHasTag(entity,'dz_remnant')||pdzSurviveHasTag(entity,'dz_raider')||
    pdzSurviveHasTag(entity,'dz_t4_relay_guard')
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

function pdzSurviveGameTime(player) {
  let value=NaN
  try{value=Number(player.level.getGameTime())}catch(ignored){}
  if(Number.isFinite(value))return Math.max(0,Math.floor(value))
  try{value=Number(player.server.overworld().getGameTime())}catch(ignored){}
  if(Number.isFinite(value))return Math.max(0,Math.floor(value))
  // A real-world tick fallback is only used when a wrapper exposes neither
  // server-level getter. Never pass NaN/Infinity into CompoundTag#putLong.
  return Math.max(0,Math.floor(Date.now()/50))
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
  let gunshop=pdzSurviveGunshopBoss(attacker)||pdzSurviveGunshopBoss(direct)
  let gunSoldier=pdzSurviveGunSoldier(attacker)||pdzSurviveGunSoldier(direct)
  // Bosses and armed soldiers are meant to apply sustained pressure. Their
  // authored M&S damage remains the source value, while this final pacing layer
  // prevents one animation or one automatic burst from ending the encounter.
  if(gunshop)adjusted*=0.28
  else if(axel)adjusted*=0.32
  else if(boss)adjusted*=0.34
  else if(gunSoldier)adjusted*=0.58

  let health=Math.max(0,Number(player.health)||0)
  let maxHealth=Math.max(1,Number(player.maxHealth)||1)
  let absorption=Math.max(0,Number(player.absorptionAmount)||0)
  let tank=pdzSurviveTank(player)
  let threshold=tank?0.60:0.80
  let capRatio=tank?0.50:0.68
  if(gunshop)capRatio=tank?0.08:0.10
  else if(axel)capRatio=tank?0.18:0.24
  else if(boss)capRatio=tank?0.12:0.16
  else if(gunSoldier)capRatio=tank?0.16:0.22
  let healthy=health/maxHealth>=threshold
  let cap=absorption+maxHealth*capRatio
  if((boss||gunSoldier||healthy)&&adjusted>cap)adjusted=cap

  // TaCZ automatic fire consists of several individually non-lethal events.
  // A shared one-second budget covers every boss and armed NPC; the following
  // second can still down the player, so this is pacing rather than immunity.
  let data=player.persistentData
  let gameTime=pdzSurviveGameTime(player)
  if(boss||gunSoldier){
    let windowStart=Number(data.getLong('dz_hostile_ttk_window_start'))
    if(windowStart<=0||gameTime<windowStart||gameTime-windowStart>=20){
      windowStart=gameTime
      data.putLong('dz_hostile_ttk_window_start',gameTime)
      data.putDouble('dz_hostile_ttk_window_used',0)
    }
    let used=Math.max(0,Number(data.getDouble('dz_hostile_ttk_window_used')))
    // BRASS HOUND is a durable suppression boss: no individual bullet may
    // erase a build, while uninterrupted automatic fire remains dangerous.
    let budgetRatio=gunshop?(tank?0.22:0.28):
      (axel?(tank?0.24:0.32):(boss?(tank?0.28:0.34):(tank?0.26:0.34)))
    let budget=maxHealth*budgetRatio
    adjusted=Math.max(0,Math.min(adjusted,budget-used))
    data.putDouble('dz_hostile_ttk_window_used',Math.min(budget,used+adjusted))
  }

  if(adjusted+0.001<original){
    event.setAmount(adjusted)
    data.putDouble('dz_survival_last_original',original)
    data.putDouble('dz_survival_last_final',adjusted)
    data.putString('dz_survival_last_profile',tank?'tank':'standard')
    data.putBoolean('dz_survival_last_boss',boss)
    data.putBoolean('dz_survival_last_axel',axel)
    data.putBoolean('dz_survival_last_gunshop',gunshop)
    data.putBoolean('dz_survival_last_gun_soldier',gunSoldier)
    data.putInt('dz_survival_guard_count',data.getInt('dz_survival_guard_count')+1)
    let lastLog=Number(data.getLong('dz_survival_last_log_tick'))
    if(lastLog<=0||gameTime<lastLog||gameTime-lastLog>=20){
      data.putLong('dz_survival_last_log_tick',gameTime)
      console.warn('[PDZ Survivability] player='+player.username+' original='+original.toFixed(2)+
        ' final='+adjusted.toFixed(2)+' profile='+(tank?'tank':'standard')+' boss='+boss+
        ' axel='+axel+' gunshop='+gunshop+' gunSoldier='+gunSoldier+' attacker='+pdzSurviveEntityId(attacker)+
        ' direct='+pdzSurviveEntityId(direct)+
        ' health='+health.toFixed(2)+'/'+maxHealth.toFixed(2))
    }
  }
})
