// PROJECT DEADZONE - CTE2-inspired combat level bands v0.1
// CTE2 uses bounded dimension ranges plus per-mob role multipliers. PDZ has one
// playable overworld, so the higher of geographic World Tier and Threat
// selects the band. Waiting at low Story Tier therefore cannot freeze nearby
// outdoor enemies at M&S level 1 forever.
// This script changes M&S level only; existing PDZ hp/damage role profiles stay
// authoritative and TaCZ damage still runs through one pre-damage hook.

const PDZCTE_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const PDZCTE_HEALTH = Java.loadClass('com.robertx22.mine_and_slash.uncommon.utilityclasses.HealthUtils')
const PDZCTE_DAMAGE_MODIFIER = 'd34db300-0000-4000-8000-000000000001'
const PDZCTE_GUN_HEALTH_MODIFIER = 'd34db300-0000-4000-8000-000000000002'
const PDZCTE_LEVEL_BANDS = [
  {min:1,max:8},
  {min:9,max:18},
  {min:19,max:30},
  {min:31,max:42},
  {min:43,max:55},
  {min:56,max:70}
]

function pdzCteIsHostile(entity){
  if(!entity||!entity.type)return false
  let id=String(entity.type)
  // Namespace-wide hostile matching must not feed non-living projectile
  // entities into M&S EntityData.  Mutant spitter shots were repeatedly doing
  // exactly that and filling the log on every projectile spawn.
  if(id.indexOf('projectile')>=0)return false
  let namespace=id.split(':')[0]
  if(['spore','infnexus','infectious','apocalypse_zombies','mutantszombies','tacz_bandits','tacz_hostiles'].indexOf(namespace)>=0)return true
  if(id==='simpleenemymod:ruunit')return true
  return [
    'minecraft:zombie','minecraft:husk','minecraft:drowned','minecraft:zombie_villager',
    'minecraft:skeleton','minecraft:stray','minecraft:creeper','minecraft:spider',
    'minecraft:cave_spider','minecraft:enderman','minecraft:witch','minecraft:phantom',
    'minecraft:slime','minecraft:silverfish','minecraft:pillager','minecraft:vindicator',
    'minecraft:evoker','minecraft:ravager'
  ].indexOf(id)>=0
}

function pdzCteExcluded(entity){
  if(!entity||!entity.tags)return true
  let excluded=['dz_buddy','dz_survivor','dz_usunit_friendly','dz_boss_showroom',
    'dz_boss_test_frozen','dz_boss_loadtest','dz_boss_axel','dz_mns_boss_profile','dz_spore_nexus',
    'dz_boss_mechanics_active','dz_boss_component','dz_story_boss_argus_fragment','dz_story_boss_choir_vessel',
    'dz_story_boss_firestation','dz_story_boss_gasstation','dz_story_boss_gunshop',
    'dz_story_boss_hospital','dz_story_boss_policestation','dz_story_boss_primordial',
    'dz_story_boss_radio_tower','dz_story_boss_reactor_saint','dz_story_boss_t4_relay_shepherd','dz_sideboss_tank',
    'dz_sideboss_abomination','dz_boss_mech_02','dz_boss_mech_03','dz_boss_mech_04',
    'dz_boss_mech_05','dz_boss_mech_06','dz_boss_mech_07','dz_boss_mech_08',
    'dz_boss_mech_09','dz_boss_mech_10','dz_boss_mech_11','dz_boss_mech_12',
    'dz_boss_mech_13','dz_boss_mech_14','dz_t4_signal_node','dz_pdz_boss_weakpoint',
    // Authored T4 profiles own their M&S level/rarity and must not be replaced
    // by the ordinary geographic band when their chunk reloads.
    'dz_mns_elite_profile','dz_t4_relay_guard']
  for(let i=0;i<excluded.length;i++)if(entity.tags.contains(excluded[i]))return true
  try{if(entity.getOwnerUUID()!=null)return true}catch(ignored){}
  return false
}

function pdzCteIsGunSoldier(entity){
  if(!entity||!entity.type)return false
  let id=String(entity.type),namespace=id.split(':')[0]
  if(namespace==='tacz_bandits'||namespace==='tacz_hostiles')return true
  if(id==='simpleenemymod:ruunit')return true
  try{
    let stack=entity.mainHandItem
    if(stack&&String(stack.id)==='tacz:modern_kinetic_gun')return true
  }catch(ignored){}
  return false
}

function pdzCteGunElite(entity){
  if(!entity||!entity.tags)return false
  let tags=['dz_elite','dz_raider_enforcer','dz_raider_warden','dz_remnant_heavy',
    'dz_remnant_officer','dz_t4_relay_guard']
  for(let i=0;i<tags.length;i++)if(entity.tags.contains(tags[i]))return true
  return false
}

function pdzCteApplyGunSoldierDurability(entity){
  if(!pdzCteIsGunSoldier(entity)||entity.tags.contains('dz_gun_soldier_ttk_v1'))return false
  let oldMax=Math.max(1,Number(entity.maxHealth)||1)
  let ratio=Math.max(0,Math.min(1,(Number(entity.health)||oldMax)/oldMax))
  let multiplier=pdzCteGunElite(entity)?1.85:1.50
  try{
    entity.removeAttribute('minecraft:generic.max_health',PDZCTE_GUN_HEALTH_MODIFIER)
    entity.modifyAttribute('minecraft:generic.max_health',PDZCTE_GUN_HEALTH_MODIFIER,
      multiplier-1,'multiply_total')
    entity.health=Math.max(1,Number(entity.maxHealth)*ratio)
    entity.addTag('dz_gun_soldier_ttk_v1')
    entity.persistentData.putDouble('dz_gun_soldier_health_multiplier',multiplier)
    return true
  }catch(error){
    if(!entity.tags.contains('dz_gun_soldier_ttk_error')){
      entity.addTag('dz_gun_soldier_ttk_error')
      console.warn('[PROJECT DEADZONE][Gun TTK] durability profile failed for '+String(entity.type)+': '+error)
    }
  }
  return false
}

global.pdzApplyGunSoldierDurability=pdzCteApplyGunSoldierDurability

function pdzCteRegion(entity){
  let tier=0
  try{
    tier=global.pdzCombatTierAt?
      global.pdzCombatTierAt(entity.server,entity.x,entity.z,entity.level.dimension):
      (global.pdzWorldTierAt?global.pdzWorldTierAt(entity.server,entity.x,entity.z):dzRegionTierAt(entity.server,entity.x,entity.z))
  }catch(ignored){}
  try{if(global.pdzThreatTier)tier=Math.max(tier,global.pdzThreatTier(entity.server))}catch(ignored){}
  return Math.max(0,Math.min(5,tier))
}

function pdzCteApplyIncomingBalance(entity){
  if(!entity||entity.tags.contains('dz_cte2_incoming_v4'))return
  let tier=pdzCteRegion(entity)
  // M&S remains the damage owner.  This PDZ policy modifier only shapes its
  // result into a readable tier curve: early ordinary enemies cannot randomly
  // erase a healthy player, while late elites still keep most of their damage.
  let normal=[-0.55,-0.50,-0.45,-0.40,-0.35,-0.30]
  let elite=[-0.40,-0.35,-0.30,-0.25,-0.20,-0.15]
  let reduction=entity.tags.contains('dz_elite')?elite[tier]:normal[tier]
  entity.removeAttribute('minecraft:generic.attack_damage',PDZCTE_DAMAGE_MODIFIER)
  entity.modifyAttribute('minecraft:generic.attack_damage',PDZCTE_DAMAGE_MODIFIER,reduction,'multiply_total')
  entity.addTag('dz_cte2_incoming_v4')
}

function pdzCteApply(entity){
  if(!entity||entity.level.clientSide||!entity.alive||!pdzCteIsHostile(entity)||pdzCteExcluded(entity))return
  // EntityEvents.spawned is backed by EntityJoinLevelEvent and also runs when
  // an older mob is loaded from disk. This migration path therefore updates
  // already-generated enemies without resetting their HP or M&S level.
  if(entity.tags.contains('dz_cte2_level_band')){
    try{pdzCteApplyIncomingBalance(entity)}catch(ignored){}
    try{pdzCteApplyGunSoldierDurability(entity)}catch(ignored){}
    return
  }
  let tier=pdzCteRegion(entity),band=PDZCTE_LEVEL_BANDS[tier]
  let level=band.min
  try{
    let playerLevel=global.pdzThreatHighestPlayerLevel
      ? Number(global.pdzThreatHighestPlayerLevel(entity.server)) : band.min
    if(isFinite(playerLevel))level=Math.max(band.min,Math.min(band.max,Math.round(playerLevel)))
  }catch(ignored){}
  // A tiny same-area spread avoids every enemy having an identical stat line.
  level=Math.max(band.min,Math.min(band.max,level+Math.floor(Math.random()*3)-1))
  try{
    let data=PDZCTE_ENTITY_DATA.get(entity)
    data.setLevel(level)
    data.recalcStats_DONT_CALL()
    // M&S levels are intentionally used for enemy durability and progression,
    // but their vanilla attack attribute stacks with several infection/LSO
    // effects. Keep ordinary enemies dangerous without letting one basic melee
    // hit erase an entire full-health player. Boss profiles are excluded above;
    // elites retain more of their damage as a visible difficulty spike.
    pdzCteApplyIncomingBalance(entity)
    entity.health=entity.maxHealth
    pdzCteApplyGunSoldierDurability(entity)
    entity.addTag('dz_cte2_level_band')
    entity.addTag('dz_cte2_region_'+tier)
  }catch(err){
    if(!entity.tags.contains('dz_cte2_level_error')){
      entity.addTag('dz_cte2_level_error')
      console.warn('[PROJECT DEADZONE][CTE2 Balance] '+String(entity.type)+' T'+tier+' level '+level+' failed: '+err)
    }
  }
}

EntityEvents.spawned(event=>{
  let entity=event.entity
  if(!entity||entity.level.clientSide||!pdzCteIsHostile(entity))return
  // M&S attaches entity data during spawn; defer until that initialization and
  // story/boss tags have both had a chance to run.
  event.server.scheduleInTicks(10,()=>pdzCteApply(entity))
})

function pdzCteHoldingGun(player){
  try{
    let stack=player.mainHandItem
    if(String(stack.id)==='tacz:modern_kinetic_gun')return true
    return stack.hasTag('mmorpg:kinetic_gun')
  }catch(ignored){}
  return false
}

// Test-only measurement. Nothing is sent unless an administrator enables it.
function pdzCteRecordOutgoing(player,target,damage,mode){
  if(!player||!target||!player.persistentData.getBoolean('dz_balance_record'))return
  let d=player.persistentData,uuid=String(target.uuid),old=String(d.getString('dz_balance_target'))
  if(old!==uuid){
    d.putString('dz_balance_target',uuid)
    d.putString('dz_balance_target_name',String(target.hoverName.string))
    d.putLong('dz_balance_started_ms',Date.now())
    d.putInt('dz_balance_hits',0)
    d.putInt('dz_balance_heads',0)
    d.putInt('dz_balance_bodies',0)
    d.putDouble('dz_balance_damage_total',0)
  }
  d.putInt('dz_balance_hits',d.getInt('dz_balance_hits')+1)
  if(mode==='gun_head')d.putInt('dz_balance_heads',d.getInt('dz_balance_heads')+1)
  else d.putInt('dz_balance_bodies',d.getInt('dz_balance_bodies')+1)
  d.putDouble('dz_balance_damage_total',d.getDouble('dz_balance_damage_total')+Math.max(0,Number(damage)||0))
  d.putString('dz_balance_mode',mode.indexOf('gun_')===0?'gun':'melee')
}

EntityEvents.hurt(event=>{
  let victim=event.entity,source=event.source,actual=source?source.actual:null
  if(victim&&victim.isPlayer&&victim.isPlayer()&&victim.persistentData.getBoolean('dz_balance_record')){
    let amount=Math.max(0,Number(event.damage)||0),d=victim.persistentData
    d.putDouble('dz_balance_last_incoming',amount)
    d.putDouble('dz_balance_max_incoming',Math.max(d.getDouble('dz_balance_max_incoming'),amount))
    d.putInt('dz_balance_incoming_hits',d.getInt('dz_balance_incoming_hits')+1)
    d.putString('dz_balance_incoming_source',actual?String(actual.type):String(source.type||'unknown'))
  }
  if(!actual||!actual.isPlayer||!actual.isPlayer()||pdzCteHoldingGun(actual))return
  if(!victim||!pdzCteIsHostile(victim))return
  pdzCteRecordOutgoing(actual,victim,Math.max(0,Number(event.damage)||0),'melee')
})

EntityEvents.death(event=>{
  let source=event.source,killer=source?source.actual:null,target=event.entity
  if(!killer||!killer.isPlayer||!killer.isPlayer()||!killer.persistentData.getBoolean('dz_balance_record'))return
  let d=killer.persistentData
  if(String(d.getString('dz_balance_target'))!==String(target.uuid))return
  let elapsed=Math.max(0,(Date.now()-Number(d.getLong('dz_balance_started_ms')))/1000)
  let level='?'
  try{level=String(PDZCTE_ENTITY_DATA.get(target).getLevel())}catch(ignored){}
  killer.tell(Text.of('[BALANCE] '+String(target.hoverName.string)+' / M&S Lv'+level).gold())
  killer.tell(Text.of(d.getString('dz_balance_mode')+' '+d.getInt('dz_balance_hits')+' hits ('+
    d.getInt('dz_balance_heads')+' head / '+d.getInt('dz_balance_bodies')+' body) / '+elapsed.toFixed(2)+'s').aqua())
  killer.tell(Text.of('記録damage合計 '+d.getDouble('dz_balance_damage_total').toFixed(2)+' / World T'+pdzCteRegion(target)).gray())
})

function pdzCteNearestHostile(player){
  let nearest=null,best=999999
  try{
    let list=player.level.getEntities(player,player.boundingBox.inflate(16))
    for(let i=0;i<list.size();i++){
      let entity=list.get(i)
      if(!pdzCteIsHostile(entity))continue
      let distance=Number(player.distanceToSqr(entity))
      if(distance<best){best=distance;nearest=entity}
    }
  }catch(ignored){}
  return nearest
}

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonebalance').requires(source=>source.hasPermission(2))
  root.then(Commands.literal('status').executes(ctx=>{
      let p=ctx.source.player
      let tier=pdzCteRegion(p),band=PDZCTE_LEVEL_BANDS[tier]
      p.tell(Text.of('[CTE2式戦闘帯] World T'+tier+' / M&S Lv '+band.min+'-'+band.max).gold())
      p.tell(Text.of('通常感染者: 低HP・高火力 / 特殊個体: 個別profile / Boss: 専用mechanics').gray())
      return 1
    }))
  root.then(Commands.literal('record_on').executes(ctx=>{
    let p=ctx.source.player,d=p.persistentData
    d.putBoolean('dz_balance_record',true)
    d.putInt('dz_balance_incoming_hits',0)
    d.putDouble('dz_balance_max_incoming',0)
    p.tell(Text.of('[BALANCE] TTK・命中・被ダメージ計測 ON').green())
    return 1
  }))
  root.then(Commands.literal('record_off').executes(ctx=>{
    ctx.source.player.persistentData.putBoolean('dz_balance_record',false)
    ctx.source.player.tell(Text.of('[BALANCE] 計測 OFF').yellow())
    return 1
  }))
  root.then(Commands.literal('incoming').executes(ctx=>{
    let p=ctx.source.player,d=p.persistentData
    p.tell(Text.of('[BALANCE] 被弾 '+d.getInt('dz_balance_incoming_hits')+'回 / 最大 '+
      d.getDouble('dz_balance_max_incoming').toFixed(2)+' / 最終 '+d.getDouble('dz_balance_last_incoming').toFixed(2)).gold())
    p.tell(Text.of('最終source: '+d.getString('dz_balance_incoming_source')).gray())
    return 1
  }))
  root.then(Commands.literal('scan').executes(ctx=>{
    let p=ctx.source.player,target=pdzCteNearestHostile(p)
    if(!target){p.tell(Text.of('16m以内に計測対象の敵がいません。').yellow());return 0}
    let level='?',rarity='?',mnsHp='?'
    try{
      let data=PDZCTE_ENTITY_DATA.get(target)
      level=String(data.getLevel())
      rarity=String(data.getRarity())
      mnsHp=Number(PDZCTE_HEALTH.getMaxHealth(target)).toFixed(1)
    }catch(ignored){}
    p.tell(Text.of('[BALANCE SCAN] '+String(target.hoverName.string)+' / '+String(target.type)).gold())
    p.tell(Text.of('World T'+pdzCteRegion(target)+' / M&S Lv'+level+' / '+rarity).aqua())
    p.tell(Text.of('HP '+Number(target.health).toFixed(1)+' / M&S max '+mnsHp+' / vanilla max '+Number(target.maxHealth).toFixed(1)).gray())
    return 1
  }))
  root.then(Commands.literal('apply_nearest').executes(ctx=>{
    let p=ctx.source.player,target=pdzCteNearestHostile(p)
    if(!target){p.tell(Text.of('16m以内に補正対象の敵がいません。').yellow());return 0}
    // Operational repair/probe for a mob imported by another mod without a
    // normal spawn event. This is intentionally op-only with the root command.
    pdzCteApply(target)
    let value='?'
    try{value=Number(target.getAttributeValue('minecraft:generic.attack_damage')).toFixed(2)}catch(ignored){}
    p.tell(Text.of('[BALANCE APPLY] '+String(target.type)+' / attack '+value).green())
    return 1
  }))
  event.register(root)
})
