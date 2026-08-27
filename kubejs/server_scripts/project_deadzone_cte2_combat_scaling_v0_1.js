// PROJECT DEADZONE - CTE2-inspired combat level bands v0.1
// CTE2 uses bounded dimension ranges plus per-mob role multipliers. PDZ has one
// playable overworld, so the higher of geographic Region Tier and Threat Tier
// selects the band. Waiting at low Story Tier therefore cannot freeze nearby
// outdoor enemies at M&S level 1 forever.
// This script changes M&S level only; existing PDZ hp/damage role profiles stay
// authoritative and TaCZ damage still runs through one pre-damage hook.

const PDZCTE_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const PDZCTE_HEALTH = Java.loadClass('com.robertx22.mine_and_slash.uncommon.utilityclasses.HealthUtils')
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
  let namespace=id.split(':')[0]
  if(['infectious','apocalypse_zombies','mutantszombies','tacz_bandits','tacz_hostiles'].indexOf(namespace)>=0)return true
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
    'dz_boss_test_frozen','dz_boss_loadtest','dz_boss_axel','dz_mns_boss_profile',
    'dz_boss_mechanics_active','dz_story_boss_argus_fragment','dz_story_boss_choir_vessel',
    'dz_story_boss_firestation','dz_story_boss_gasstation','dz_story_boss_gunshop',
    'dz_story_boss_hospital','dz_story_boss_policestation','dz_story_boss_primordial',
    'dz_story_boss_radio_tower','dz_story_boss_reactor_saint','dz_sideboss_tank',
    'dz_sideboss_abomination','dz_boss_mech_02','dz_boss_mech_03','dz_boss_mech_04',
    'dz_boss_mech_05','dz_boss_mech_06','dz_boss_mech_07','dz_boss_mech_08',
    'dz_boss_mech_09','dz_boss_mech_10','dz_boss_mech_11','dz_boss_mech_12',
    'dz_boss_mech_13']
  for(let i=0;i<excluded.length;i++)if(entity.tags.contains(excluded[i]))return true
  try{if(entity.getOwnerUUID()!=null)return true}catch(ignored){}
  return false
}

function pdzCteRegion(entity){
  let tier=0
  try{tier=dzRegionTierAt(entity.server,entity.x,entity.z)}catch(ignored){}
  try{if(global.pdzThreatTier)tier=Math.max(tier,global.pdzThreatTier(entity.server))}catch(ignored){}
  return Math.max(0,Math.min(5,tier))
}

function pdzCteApply(entity){
  if(!entity||entity.level.clientSide||!entity.alive||!pdzCteIsHostile(entity)||pdzCteExcluded(entity))return
  if(entity.tags.contains('dz_cte2_level_band'))return
  let tier=pdzCteRegion(entity),band=PDZCTE_LEVEL_BANDS[tier]
  let level=band.min
  try{
    let player=entity.level.getNearestPlayer(entity,128)
    if(player){
      let playerLevel=Number(PDZCTE_ENTITY_DATA.get(player).getLevel())
      if(isFinite(playerLevel))level=Math.max(band.min,Math.min(band.max,Math.round(playerLevel)))
    }
  }catch(ignored){}
  // A tiny same-area spread avoids every enemy having an identical stat line.
  level=Math.max(band.min,Math.min(band.max,level+Math.floor(Math.random()*3)-1))
  try{
    let data=PDZCTE_ENTITY_DATA.get(entity)
    data.setLevel(level)
    data.recalcStats_DONT_CALL()
    entity.health=entity.maxHealth
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
  killer.tell(Text.of('記録damage合計 '+d.getDouble('dz_balance_damage_total').toFixed(2)+' / Region T'+pdzCteRegion(target)).gray())
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
      p.tell(Text.of('[CTE2式戦闘帯] Region T'+tier+' / M&S Lv '+band.min+'-'+band.max).gold())
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
    p.tell(Text.of('Region T'+pdzCteRegion(target)+' / M&S Lv'+level+' / '+rarity).aqua())
    p.tell(Text.of('HP '+Number(target.health).toFixed(1)+' / M&S max '+mnsHp+' / vanilla max '+Number(target.maxHealth).toFixed(1)).gray())
    return 1
  }))
  event.register(root)
})
