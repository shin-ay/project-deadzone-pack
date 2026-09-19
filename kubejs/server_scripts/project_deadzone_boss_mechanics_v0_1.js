// PROJECT DEADZONE - shared boss mechanics and multiplayer load test v0.1
// Native mod AI remains authoritative. This layer adds low-frequency encounter
// identity, CHOIR's large-model hitboxes, cleanup and measurable test tooling.

const PDZ_MECH_RUNTIME = 'dz_boss_mechanic_runtime'
const PDZ_MECH_LOADTEST = 'dz_boss_loadtest'
const PDZ_MECH_FROZEN_TEST = 'dz_boss_test_frozen'
const PDZ_MECH_ACTIVE = 'dz_boss_mechanics_active'
const PDZ_CHOIR_HITBOX = 'dz_choir_hitbox'
const PDZ_MECH_HOME_RADIUS = 64
const PDZ_MECH_HOME_VERTICAL = 24
const PDZ_MECH_TARGET_RADIUS = 48
const PDZ_MECH_MNS_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const PDZ_MECH_MNS_HEALTH = Java.loadClass('com.robertx22.mine_and_slash.uncommon.utilityclasses.HealthUtils')
const PDZ_MECH_PARTY_HEALTH_MODIFIER = '655854f1-df25-43ff-81c6-7cf547fca6b4'
const PDZ_MECH_PHASE_THRESHOLDS = [0.66, 0.33]
const PDZ_MECH_PHASE_LOCK_MS = 6000
const PDZ_MECH_PARTY_HEALTH = [1.0, 1.5, 1.9, 2.2, 2.5]
// BRASS HOUND trades burst lethality for a longer suppression encounter.
// This multiplier is combined with party scaling, including solo play.
const PDZ_MECH_BASE_DURABILITY = 1.20
const PDZ_MECH_ENCOUNTER_DURABILITY = {'06':1.35}
const PDZ_MECH_PRESENTATION = 'dz_boss_presentation'
const PDZ_MECH_COMPONENT = 'dz_boss_component'

const PDZ_MECH_DEFS = [
  {id:'01',tag:'dz_boss_axel',name:'燃料タンク＋焼夷投擲',bossName:'AXEL // ROAD KING',bar:'red',style:'notched_10',icon:'minecraft:firework_star'},
  {id:'02',tag:'dz_story_boss_argus_fragment',name:'適応障壁',bossName:'ARGUS FRAGMENT',bar:'blue',style:'notched_10',icon:'minecraft:end_crystal'},
  {id:'03',tag:'dz_story_boss_choir_vessel',name:'共鳴衝撃波＋全身判定',bossName:'CHOIR VESSEL',bar:'purple',style:'notched_12',icon:'minecraft:echo_shard'},
  {id:'04',tag:'dz_story_boss_firestation',name:'焼夷制圧',bossName:'CINDER',bar:'red',style:'notched_10',icon:'minecraft:fire_charge'},
  {id:'06',tag:'dz_story_boss_gunshop',name:'弾薬セル＋制圧射撃',bossName:'BRASS HOUND',bar:'yellow',style:'notched_10',icon:'minecraft:netherite_chestplate'},
  {id:'07',tag:'dz_story_boss_hospital',name:'妨害可能な戦場治療',bossName:'WHITE STITCH',bar:'white',style:'notched_10',icon:'minecraft:ghast_tear'},
  {id:'08',tag:'dz_story_boss_policestation',name:'拘束命令＋増援',bossName:'MARSHAL GRAVES',bar:'blue',style:'notched_10',icon:'minecraft:shield'},
  {id:'09',tag:'dz_story_boss_primordial',name:'段階変異',bossName:'PRIMORDIAL',bar:'purple',style:'notched_12',icon:'minecraft:fermented_spider_eye'},
  {id:'10',tag:'dz_story_boss_radio_tower',name:'遮蔽可能な狙撃標定',bossName:'ECHO-7',bar:'blue',style:'notched_10',icon:'minecraft:spyglass'},
  {id:'11',tag:'dz_story_boss_reactor_saint',name:'予告式臨界放射環',bossName:'REACTOR SAINT',bar:'green',style:'notched_12',icon:'minecraft:heart_of_the_sea'},
  {id:'12',tag:'dz_sideboss_tank',name:'予告式グラウンドスラム',bossName:'SIEGE TANK',bar:'red',style:'notched_10',icon:'minecraft:iron_block'},
  {id:'13',tag:'dz_sideboss_abomination',name:'焼却可能な再生胞子',bossName:'ANCIENT ABOMINATION',bar:'green',style:'notched_10',icon:'minecraft:spore_blossom'},
  {id:'14',tag:'dz_story_boss_t4_relay_shepherd',name:'信号ノード＋座標砲撃',bossName:'RELAY SHEPHERD',bar:'purple',style:'notched_20',icon:'minecraft:recovery_compass'},
  // Adopted bosses keep the original mod's renderer, bossbar, phases and
  // attacks. PDZ only supplies story identity, M&S level and party durability.
  {id:'15',tag:'dz_story_boss_harbinger',name:'レーザー／ミサイル／EMP',bossName:'HARBINGER // WAR MACHINE',bar:'red',style:'notched_12',icon:'minecraft:nether_star'},
  {id:'16',tag:'dz_sideboss_wroughtnaut',name:'背面弱点＋重斧衝撃波',bossName:'WARDEN-0 // IRON SENTINEL',bar:'yellow',style:'notched_10',icon:'minecraft:netherite_axe'},
  {id:'17',tag:'dz_story_boss_cornelia',name:'凍結海域＋亡霊船長',bossName:'CAPTAIN CORNELIA // LAST VOYAGE',bar:'purple',style:'notched_12',icon:'minecraft:heart_of_the_sea'},
  {id:'18',tag:'dz_sideboss_frostmaw',name:'氷結吐息＋巨体制圧',bossName:'FROSTMAW // WHITEOUT',bar:'white',style:'notched_10',icon:'minecraft:blue_ice'}
]

// Boss-only silhouettes. Ordinary bandits already use AK/M4/SMG/Deagle/
// double-barrel weapons, so named humanoid bosses deliberately avoid that pool.
const PDZ_MECH_BOSS_GUNS = {
  // Axel is the first mandatory boss. An assault rifle keeps the encounter
  // readable at S0 while his weak points and grenades provide the spectacle.
  '01':{gun:'tacz:m4a1',mode:'AUTO',ammo:30},
  '04':{gun:'tacz:fn_evolys',mode:'AUTO',ammo:100},
  '06':{gun:'elitex:m249x',mode:'AUTO',ammo:100},
  '07':{gun:'elitex:fh_scar18',mode:'AUTO',ammo:30},
  '08':{gun:'tacz:scar_h',mode:'AUTO',ammo:20},
  '14':{gun:'maxstuff:scar_hamr',mode:'AUTO',ammo:50}
}

const PDZ_MECH_TEST_ENTRIES = [
  {id:'02',x:-12,z:16,entity:'pdzbosses:argus_fragment',name:'ARGUS FRAGMENT',hp:240},
  {id:'03',x:-4,z:16,entity:'pdzbosses:choir_vessel',name:'CHOIR VESSEL',hp:280},
  {id:'04',x:4,z:16,entity:'pdzbosses:cinder',name:'CINDER',hp:210},
  {id:'06',x:-12,z:25,entity:'pdzbosses:brass_hound',name:'BRASS HOUND',hp:230},
  {id:'07',x:-4,z:25,entity:'pdzbosses:white_stitch',name:'WHITE STITCH',hp:205},
  {id:'08',x:4,z:25,entity:'pdzbosses:marshal_graves',name:'MARSHAL GRAVES',hp:250},
  {id:'09',x:12,z:25,entity:'pdzbosses:primordial',name:'PRIMORDIAL',hp:300},
  {id:'10',x:-12,z:34,entity:'pdzbosses:echo_7',name:'ECHO-7',hp:225},
  {id:'11',x:-4,z:34,entity:'pdzbosses:reactor_saint',name:'REACTOR SAINT',hp:330},
  {id:'12',x:4,z:34,entity:'pdzbosses:siege_tank',name:'SIEGE TANK',hp:360,ready:true},
  {id:'13',x:12,z:34,entity:'pdzbosses:ancient_abomination',name:'ANCIENT ABOMINATION',hp:420,ready:true},
  {id:'14',x:20,z:34,entity:'pdzbosses:relay_shepherd',name:'RELAY SHEPHERD',hp:520}
]

let pdzMechClock=0
let pdzMechLastMs=0
let pdzMechAverageMs=0
let pdzMechMaxMs=0
let pdzMechSamples=0
let pdzMechActiveCount=0
let pdzMechPulseCount=0
let pdzMechHomeReturnCount=0
let pdzMechTrackedBosses=[]

function pdzMechId(entity){
  if(!entity||!entity.tags||entity.tags.contains('dz_boss_showroom')||entity.tags.contains(PDZ_MECH_FROZEN_TEST))return null
  // Gas Station now routes to the authored Axel encounter. Its story tag is
  // also the legacy mechanic-05 tag, so never initialize both systems.
  if(entity.tags.contains('dz_boss_axel'))return null
  for(let i=0;i<PDZ_MECH_DEFS.length;i++){
    let def=PDZ_MECH_DEFS[i]
    if(entity.tags.contains(def.tag)||entity.tags.contains('dz_boss_mech_'+def.id))return def.id
  }
  return null
}

function pdzMechIsBoss(entity){
  if(!entity||!entity.tags)return false
  return entity.tags.contains('dz_boss_axel')||entity.tags.contains(PDZ_MECH_ACTIVE)||pdzMechId(entity)!==null
}

function pdzMechEncounterId(entity){
  if(!entity||!entity.tags)return null
  if(entity.tags.contains('dz_boss_axel'))return '01'
  return pdzMechId(entity)
}

function pdzMechPartyProfile(boss){
  let party=0,highest=1
  boss.server.players.forEach(player=>{
    if(player.spectator||String(player.level.dimension)!==String(boss.level.dimension))return
    let dx=player.x-boss.x,dy=player.y-boss.y,dz=player.z-boss.z
    if(dx*dx+dy*dy+dz*dz>96*96)return
    party++
    try{highest=Math.max(highest,Number(PDZ_MECH_MNS_ENTITY_DATA.get(player).getLevel())||1)}catch(ignored){}
  })
  return {party:Math.max(1,party),highest:highest}
}

function pdzMechBossLevel(server){
  try{
    if(global.pdzStoryBossLevel)return Math.max(1,Number(global.pdzStoryBossLevel(server))||12)
  }catch(ignored){}
  let cap=Math.max(10,Number(server.persistentData.getInt('dz_story_mns_level_cap'))||10)
  return Math.min(102,cap+2)
}

function pdzMechApplyMnsBossProfile(boss,id){
  if(!boss||!boss.tags)return
  let profile=pdzMechPartyProfile(boss)
  let bossLevel=pdzMechBossLevel(boss.server)
  if(!boss.tags.contains('dz_mns_boss_cap_plus_2_v1')){
    let healthRatio=Math.max(0,Number(boss.health))/Math.max(1,Number(boss.maxHealth))
    try{
      let data=PDZ_MECH_MNS_ENTITY_DATA.get(boss)
      // The same policy applies to every named/side boss: exactly two levels
      // over the current story cap. A +5 gap suppressed too much of the
      // player's avoidance and other level-sensitive defenses.
      data.setLevel(bossLevel)
      data.setRarity('boss')
      data.recalcStats_DONT_CALL()
      boss.addTag('dz_mns_boss_profile')
      boss.addTag('dz_mns_boss_cap_plus_2_v1')
      boss.health=Math.max(1,Number(boss.maxHealth)*Math.min(1,healthRatio))
    }catch(err){
      console.warn('[PROJECT DEADZONE][Boss] M&S profile failed: '+err)
    }
  }
  if(boss.tags.contains('dz_boss_durability_v2'))return
  let multiplier=PDZ_MECH_PARTY_HEALTH[Math.min(PDZ_MECH_PARTY_HEALTH.length,profile.party)-1]
  multiplier*=Number(PDZ_MECH_ENCOUNTER_DURABILITY[id]||PDZ_MECH_BASE_DURABILITY)
  try{
    boss.removeAttribute('minecraft:generic.max_health',PDZ_MECH_PARTY_HEALTH_MODIFIER)
    if(multiplier>1)boss.modifyAttribute('minecraft:generic.max_health',PDZ_MECH_PARTY_HEALTH_MODIFIER,multiplier-1,'multiply_total')
  }catch(err){console.warn('[PROJECT DEADZONE][Boss] Party health modifier failed: '+err)}
  boss.health=boss.maxHealth
  boss.addTag('dz_boss_durability_v1')
  boss.addTag('dz_boss_durability_v2')
  boss.persistentData.putBoolean('dz_party_scaled',true)
  boss.persistentData.putInt('dz_party_size',profile.party)
  boss.persistentData.putDouble('dz_boss_party_health_multiplier',multiplier)
  let mnsHealth=Number(boss.maxHealth)
  try{mnsHealth=Math.round(Number(PDZ_MECH_MNS_HEALTH.getMaxHealth(boss)))}catch(ignored){}
  console.info('[PROJECT DEADZONE][Boss Durability] id='+id+' entity='+String(boss.type)+
    ' party='+profile.party+' playerLv='+profile.highest+' cap='+
    Number(boss.server.persistentData.getInt('dz_story_mns_level_cap'))+' bossLv='+bossLevel+
    ' vanillaMax='+Number(boss.maxHealth)+
    ' mnsMax='+mnsHealth+' multiplier='+multiplier)
}

function pdzMechDamageSourceId(source){
  try{return String(source.type())}catch(ignored){}
  try{return String(source.getType())}catch(ignored){}
  try{return String(source)}catch(ignored){}
  return 'unknown'
}

function pdzMechForcePhaseMechanic(boss,id){
  if(!id||id==='01')return
  try{pdzMechPulse(boss,id,true)}catch(err){
    console.warn('[PROJECT DEADZONE][Boss] Forced phase mechanic failed id='+id+': '+err)
  }
}

// A high-calibre hit may finish the current phase, but its overflow never skips
// the next authored phase. The short reconfiguration lock gives the warning and
// signature mechanic time to become readable without inventing a second HP pool.
function pdzMechGateDamage(boss,id,incoming,source){
  if(!boss||!boss.alive||incoming<=0)return false
  let sourceId=pdzMechDamageSourceId(source).toLowerCase()
  if(sourceId.indexOf('generic_kill')>=0||sourceId.indexOf('out_of_world')>=0||sourceId.indexOf('outofworld')>=0)return false
  pdzMechApplyMnsBossProfile(boss,id)
  boss.persistentData.putDouble('dz_boss_last_incoming_damage',incoming)
  boss.persistentData.putDouble('dz_boss_max_incoming_damage',Math.max(
    Number(boss.persistentData.getDouble('dz_boss_max_incoming_damage')),incoming))
  boss.persistentData.putInt('dz_boss_damage_samples',boss.persistentData.getInt('dz_boss_damage_samples')+1)
  // IDs 15+ are complete encounters adopted from dedicated boss mods. Their
  // native phase state machines own damage gates; adding the PDZ generic gate
  // would interrupt telegraphs and could make an invulnerability phase stick.
  if(Number(id)>=15)return false
  let now=Date.now()
  if(Number(boss.persistentData.getLong('dz_boss_phase_lock_until'))>now)return true
  let hp=Math.max(0,Number(boss.health)),max=Math.max(1,Number(boss.maxHealth))
  let projected=Math.max(0,hp-incoming)/max
  let stage=boss.persistentData.getInt('dz_boss_phase_gate_stage')
  let next=stage<1?0:(stage<2?1:-1)
  if(next<0||projected>PDZ_MECH_PHASE_THRESHOLDS[next])return false
  let threshold=PDZ_MECH_PHASE_THRESHOLDS[next]
  // Stay fractionally below the authored threshold so float rounding cannot
  // postpone the matching <= 66% / <= 33% phase callback by another second.
  boss.health=Math.max(1,max*Math.max(0,threshold-0.001))
  stage=next+1
  boss.persistentData.putInt('dz_boss_phase_gate_stage',stage)
  boss.persistentData.putLong('dz_boss_phase_lock_until',now+PDZ_MECH_PHASE_LOCK_MS)
  boss.runCommandSilent('particle minecraft:electric_spark ~ ~1.5 ~ 1.4 1.2 1.4 0.08 36 force @a[distance=..64]')
  boss.runCommandSilent('playsound minecraft:block.respawn_anchor.charge hostile @a[distance=..64] ~ ~ ~ 1 0.7')
  pdzMechTell(boss,'防護層を再構成中。第'+(stage+1)+'戦闘段階へ移行！','gold')
  pdzMechForcePhaseMechanic(boss,id)
  return true
}

global.pdzBossEnsureDurability=function(boss){
  let id=pdzMechEncounterId(boss)
  if(id)pdzMechApplyMnsBossProfile(boss,id)
  return id
}

function pdzMechGunTag(id){
  let gun=PDZ_MECH_BOSS_GUNS[id]
  if(!gun)return null
  return '{GunId:"'+gun.gun+'",GunFireMode:"'+gun.mode+'",GunCurrentAmmoCount:'+gun.ammo+',HasBulletInBarrel:1b,MaxDummyAmmo:'+gun.ammo+',DummyAmmo:'+gun.ammo+'}'
}

function pdzMechDedicatedBoss(entity){
  return entity&&String(entity.type).indexOf('pdzbosses:')===0
}

function pdzMechAdoptedBoss(id){
  return Number(id)>=15
}

function pdzMechEquipBossGun(boss,id){
  if(!boss||!boss.tags||boss.tags.contains('dz_boss_weapon_applied'))return
  // Dedicated bosses own their ranged attacks and visible weapons. Equipping
  // TaCZ items would reintroduce humanoid renderer/AI assumptions.
  if(pdzMechDedicatedBoss(boss)){boss.addTag('dz_boss_weapon_applied');return}
  let tag=pdzMechGunTag(id)
  if(!tag)return
  boss.runCommandSilent('item replace entity @s weapon.mainhand with tacz:modern_kinetic_gun'+tag)
  // Boss weapons are visual/combat identity, not an unlimited high-tier drop.
  boss.runCommandSilent('data merge entity @s {HandDropChances:[0.0f,0.0f]}')
  boss.addTag('dz_boss_weapon_applied')
}

function pdzMechAllowedTarget(entity){
  if(!entity)return false
  let id=String(entity.type)
  // Operator-spawned combat dummies are deliberate boss targets. Keeping the
  // tag requirement prevents ordinary decorative dummies from pulling bosses
  // away from players or settlements.
  if(id==='dummmmmmy:target_dummy'&&entity.tags&&entity.tags.contains('dz_boss_test_target'))return true
  if(id==='minecraft:player'||id==='minecraft:villager'||id==='minecraft:wandering_trader'||id==='minecolonies:citizen')return true
  if(id.indexOf('mca:')===0)return true
  // Raider/remnant bosses may actively clear infected and other hostile mobs.
  // Incoming damage protection is handled separately, making this explicitly
  // one-way so ambient mobs cannot steal the campaign kill.
  return id.indexOf('infectious:')===0||id.indexOf('apocalypse_zombies:')===0||
    id.indexOf('mutantszombies:')===0||id.indexOf('zombieawareness:')===0||
    ['minecraft:zombie','minecraft:husk','minecraft:drowned','minecraft:zombie_villager',
      'minecraft:skeleton','minecraft:stray','minecraft:creeper','minecraft:spider',
      'minecraft:cave_spider','minecraft:witch','minecraft:phantom'].indexOf(id)>=0
}

function pdzMechNearestTestDummy(boss,radius){
  let nearest=null,best=radius*radius
  try{
    let nearby=boss.level.getEntities(boss,boss.boundingBox.inflate(radius))
    nearby.forEach(candidate=>{
      if(String(candidate.type)!=='dummmmmmy:target_dummy'||!candidate.alive||!candidate.tags||
        !candidate.tags.contains('dz_boss_test_target'))return
      let dx=candidate.x-boss.x,dy=candidate.y-boss.y,dz=candidate.z-boss.z,d=dx*dx+dy*dy+dz*dz
      if(d<best){best=d;nearest=candidate}
    })
  }catch(ignored){}
  return nearest
}

function pdzMechEnsureHome(boss){
  if(!boss||!boss.persistentData||boss.persistentData.getBoolean('dz_boss_home_set'))return
  boss.persistentData.putDouble('dz_boss_home_x',Number(boss.x))
  boss.persistentData.putDouble('dz_boss_home_y',Number(boss.y))
  boss.persistentData.putDouble('dz_boss_home_z',Number(boss.z))
  boss.persistentData.putString('dz_boss_home_dimension',String(boss.level.dimension))
  boss.persistentData.putBoolean('dz_boss_home_set',true)
}

function pdzMechReturnHomeIfNeeded(boss){
  if(!boss||!boss.alive||!boss.tags||boss.tags.contains('dz_boss_showroom')||boss.tags.contains(PDZ_MECH_FROZEN_TEST))return false
  pdzMechEnsureHome(boss)
  let homeDimension=boss.persistentData.getString('dz_boss_home_dimension')
  if(homeDimension!==String(boss.level.dimension))return false
  let hx=boss.persistentData.getDouble('dz_boss_home_x')
  let hy=boss.persistentData.getDouble('dz_boss_home_y')
  let hz=boss.persistentData.getDouble('dz_boss_home_z')
  let dx=Number(boss.x)-hx,dy=Number(boss.y)-hy,dz=Number(boss.z)-hz
  if(dx*dx+dz*dz<=PDZ_MECH_HOME_RADIUS*PDZ_MECH_HOME_RADIUS&&Math.abs(dy)<=PDZ_MECH_HOME_VERTICAL)return false
  try{boss.setTarget(null)}catch(ignored){}
  boss.runCommandSilent('particle minecraft:portal ~ ~1 ~ 0.8 1.2 0.8 0.2 36 force @a[distance=..80]')
  boss.runCommandSilent('tp @s '+hx+' '+hy+' '+hz)
  boss.runCommandSilent('effect give @s minecraft:resistance 3 4 true')
  boss.runCommandSilent('particle minecraft:reverse_portal ~ ~1 ~ 0.8 1.2 0.8 0.12 36 force @a[distance=..80]')
  boss.persistentData.putInt('dz_boss_home_return_tick',pdzMechClock)
  pdzMechHomeReturnCount++
  return true
}

function pdzMechRestrictTarget(boss){
  if(!boss||!boss.alive||!boss.tags||boss.tags.contains('dz_boss_showroom')||boss.tags.contains(PDZ_MECH_FROZEN_TEST))return
  try{
    if(pdzMechReturnHomeIfNeeded(boss))return
    // A tagged dummy exists only during an operator test. Give it priority over
    // an already selected player (including the nearby creative operator), or
    // native boss AI can keep a non-attackable player and never exercise its
    // real attacks against the dummy.
    let testDummy=pdzMechNearestTestDummy(boss,PDZ_MECH_TARGET_RADIUS)
    if(testDummy){
      let currentUuid=boss.target?String(boss.target.uuid):''
      if(currentUuid!==String(testDummy.uuid))boss.setTarget(testDummy)
      return
    }
    if(boss.target&&pdzMechAllowedTarget(boss.target)&&boss.target.alive){
      let tx=boss.target.x-boss.x,ty=boss.target.y-boss.y,tz=boss.target.z-boss.z
      if(tx*tx+ty*ty+tz*tz<=PDZ_MECH_TARGET_RADIUS*PDZ_MECH_TARGET_RADIUS)return
    }
    if(boss.target)boss.setTarget(null)
    let nearest=null,best=PDZ_MECH_TARGET_RADIUS*PDZ_MECH_TARGET_RADIUS
    // Only inspect the loaded 48-block neighborhood. Villages can contain
    // hundreds of entities, so a full-level scan per boss is needlessly costly.
    let nearby=boss.level.getEntities(boss,boss.boundingBox.inflate(PDZ_MECH_TARGET_RADIUS))
    nearby.forEach(candidate=>{
      if(!pdzMechAllowedTarget(candidate)||!candidate.alive)return
      let dx=candidate.x-boss.x,dy=candidate.y-boss.y,dz=candidate.z-boss.z,d=dx*dx+dy*dy+dz*dz
      if(d<best){best=d;nearest=candidate}
    })
    if(nearest)boss.setTarget(nearest)
  }catch(ignored){}
}

function pdzMechDef(id){
  for(let i=0;i<PDZ_MECH_DEFS.length;i++)if(PDZ_MECH_DEFS[i].id===id)return PDZ_MECH_DEFS[i]
  return null
}

function pdzMechOwnerKey(entity){
  return String(entity.uuid).replace(/-/g,'').toLowerCase()
}

function pdzMechBossBarId(entity){
  return 'project_deadzone:boss_'+pdzMechOwnerKey(entity)
}

function pdzMechBossLevelOf(entity){
  try{return Math.max(1,Number(PDZ_MECH_MNS_ENTITY_DATA.get(entity).getLevel())||pdzMechBossLevel(entity.server))}
  catch(ignored){return pdzMechBossLevel(entity.server)}
}

function pdzMechPresentationInit(boss,id){
  if(!boss||!boss.tags||boss.tags.contains('dz_boss_showroom'))return
  let def=pdzMechDef(id)
  if(!def)return
  if(boss.tags.contains('dz_boss_presentation_initialized'))return
  let owner='dz_boss_owner_'+pdzMechOwnerKey(boss)
  let bar=pdzMechBossBarId(boss)
  let title=def.bossName+' // Lv '+pdzMechBossLevelOf(boss)
  if(pdzMechDedicatedBoss(boss)||pdzMechAdoptedBoss(id)){
    // PdzBossEntity supplies the one authoritative ServerBossEvent. Do not
    // create a second command bossbar or the old floating vanilla icon. The
    // same rule applies to adopted mods: their native UI stays authoritative.
    boss.persistentData.putString('dz_boss_owner_tag',owner)
    boss.persistentData.putString('dz_boss_display_name',def.bossName)
    boss.runCommandSilent('title @a[distance=..96,gamemode=!spectator] times 10 45 15')
    boss.runCommandSilent('title @a[distance=..96,gamemode=!spectator] title {"text":"'+def.bossName+'","color":"'+def.bar+'","bold":true}')
    boss.runCommandSilent('title @a[distance=..96,gamemode=!spectator] subtitle {"text":"'+def.name+'","color":"gold"}')
    boss.runCommandSilent('playsound minecraft:entity.warden.emerge hostile @a[distance=..96,gamemode=!spectator] ~ ~ ~ 0.65 1.25')
    boss.addTag('dz_boss_presentation_initialized')
    return
  }
  boss.runCommandSilent('bossbar add '+bar+' {"text":"'+title+'","color":"'+def.bar+'","bold":true}')
  boss.runCommandSilent('bossbar set '+bar+' color '+def.bar)
  boss.runCommandSilent('bossbar set '+bar+' style '+def.style)
  boss.runCommandSilent('bossbar set '+bar+' max 1000')
  boss.persistentData.putString('dz_bossbar_id',bar)
  boss.persistentData.putString('dz_boss_owner_tag',owner)
  boss.persistentData.putString('dz_boss_display_name',def.bossName)
  if(!boss.tags.contains('dz_boss_identity_applied')){
    boss.runCommandSilent('data merge entity @s {CustomName:\'{"text":"'+def.bossName+'","color":"'+def.bar+'","bold":true}\',CustomNameVisible:1b,Glowing:1b}')
    // A floating insignia gives every named encounter a readable silhouette
    // without replacing the native AI or requiring an extra entity mod.
    boss.runCommandSilent('summon minecraft:item_display ~ ~2.9 ~ {item:{id:"'+def.icon+'",Count:1b},billboard:"center",item_display:"fixed",Glowing:1b,Tags:["'+PDZ_MECH_RUNTIME+'","'+PDZ_MECH_PRESENTATION+'","'+owner+'"]}')
    boss.addTag('dz_boss_identity_applied')
  }
  boss.runCommandSilent('title @a[distance=..96,gamemode=!spectator] times 10 45 15')
  boss.runCommandSilent('title @a[distance=..96,gamemode=!spectator] title {"text":"'+def.bossName+'","color":"'+def.bar+'","bold":true}')
  boss.runCommandSilent('title @a[distance=..96,gamemode=!spectator] subtitle {"text":"'+def.name+'","color":"gold"}')
  boss.runCommandSilent('playsound minecraft:entity.warden.emerge hostile @a[distance=..96,gamemode=!spectator] ~ ~ ~ 0.65 1.25')
  boss.addTag('dz_boss_presentation_initialized')
}

function pdzMechPresentationUpdate(boss,id){
  if(!boss||!boss.alive||boss.tags.contains('dz_boss_showroom'))return
  let def=pdzMechDef(id)
  if(!def)return
  if(pdzMechDedicatedBoss(boss)||pdzMechAdoptedBoss(id)){
    if(!boss.tags.contains('dz_boss_presentation_initialized'))pdzMechPresentationInit(boss,id)
    if(id==='06'){
      let cells=pdzGunshopLiveCells(boss)
      let objective=cells>0?'弱点：弾薬供給セル ×'+cells:(boss.tags.contains('dz_brass_phase_3')?'排熱中を狙って本体を制圧':'本体を制圧')
      boss.runCommandSilent('title @a[distance=..96,gamemode=!spectator] actionbar {"text":"BRASS HOUND  '+Math.ceil(Number(boss.health))+' / '+Math.ceil(Number(boss.maxHealth))+' HP  |  '+objective+'","color":"yellow","bold":true}')
    }
    return
  }
  if(!boss.persistentData.getString('dz_bossbar_id'))pdzMechPresentationInit(boss,id)
  let bar=String(boss.persistentData.getString('dz_bossbar_id'))
  let owner=String(boss.persistentData.getString('dz_boss_owner_tag'))
  let value=Math.max(0,Math.min(1000,Math.floor(Number(boss.health)/Math.max(1,Number(boss.maxHealth))*1000)))
  let title=def.bossName+' // Lv '+pdzMechBossLevelOf(boss)
  boss.runCommandSilent('bossbar set '+bar+' name {"text":"'+title+'","color":"'+def.bar+'","bold":true}')
  boss.runCommandSilent('bossbar set '+bar+' value '+value)
  boss.runCommandSilent('execute at @s run bossbar set '+bar+' players @a[distance=..96,gamemode=!spectator]')
  if(owner)boss.runCommandSilent('execute at @s run tp @e[tag='+owner+',tag='+PDZ_MECH_PRESENTATION+',sort=nearest,limit=1,distance=..48] ~ ~2.9 ~')
  if(id==='06'){
    let cells=pdzGunshopLiveCells(boss)
    let objective=cells>0?'弱点：弾薬供給セル ×'+cells:(boss.tags.contains('dz_brass_phase_3')?'排熱中を狙って本体を制圧':'本体を制圧')
    boss.runCommandSilent('title @a[distance=..96,gamemode=!spectator] actionbar {"text":"BRASS HOUND  '+Math.ceil(Number(boss.health))+' / '+Math.ceil(Number(boss.maxHealth))+' HP  |  '+objective+'","color":"yellow","bold":true}')
  }
}

function pdzMechPresentationRemove(boss){
  if(!boss||!boss.persistentData)return
  let bar=String(boss.persistentData.getString('dz_bossbar_id'))
  let owner=String(boss.persistentData.getString('dz_boss_owner_tag'))
  if(bar)boss.runCommandSilent('bossbar remove '+bar)
  if(owner)boss.runCommandSilent('kill @e[tag='+owner+',distance=..64]')
}

function pdzMechApplyIdentity(boss,id){
  if(!boss||boss.tags.contains('dz_boss_identity_nbt_v2'))return
  if(pdzMechDedicatedBoss(boss)){boss.addTag('dz_boss_identity_nbt_v2');return}
  // The native renderers expose stable appearance variants. Reserve distinct
  // silhouettes for the four human facility bosses and ECHO-7.
  if(String(boss.type)==='tacz_bandits:bandit'){
    let variant=id==='04'?3:(id==='06'?2:(id==='07'?1:(id==='08'?2:0)))
    boss.runCommandSilent('data merge entity @s {BanditVariant:'+variant+'}')
  }else if(String(boss.type)==='simpleenemymod:ruunit'&&id==='10'){
    boss.runCommandSilent('data merge entity @s {Variant:4}')
  }
  boss.addTag('dz_boss_identity_nbt_v2')
}

function pdzGunshopSpawnCells(boss){
  if(!boss||boss.tags.contains('dz_brass_cells_spawned'))return
  boss.addTag('dz_brass_cells_spawned')
  // The cells are real model bones. Invisible slime followers leaked through
  // outlines/shaders, so side-hit routing now damages those bones directly.
  boss.persistentData.putDouble('dz_brass_cell_left_hp',36)
  boss.persistentData.putDouble('dz_brass_cell_right_hp',36)
  boss.persistentData.putInt('dz_brass_cells_destroyed_count',0)
  boss.runCommandSilent('effect give @s minecraft:resistance 9999 0 true')
  pdzMechTell(boss,'BRASS HOUND起動。側背面から左右の弾薬供給セルを破壊せよ！','gold')
}

function pdzGunshopLiveCells(boss){
  return Math.max(0,2-Number(boss.persistentData.getInt('dz_brass_cells_destroyed_count')))
}

function pdzGunshopCellDestroyed(cell){
  let owner=''
  cell.tags.forEach(tag=>{let s=String(tag);if(s.indexOf('dz_boss_owner_')===0)owner=s})
  if(!owner)return
  cell.runCommandSilent('particle minecraft:explosion_emitter ~ ~ ~ 0 0 0 0 1 force @a[distance=..96]')
  cell.runCommandSilent('playsound minecraft:entity.generic.explode hostile @a[distance=..96] ~ ~ ~ 1 1.25')
  let boss=null
  let nearby=cell.level.getEntities(cell,cell.boundingBox.inflate(48))
  nearby.forEach(entity=>{if(!boss&&entity.alive&&entity.tags&&entity.tags.contains(owner)&&entity.tags.contains('dz_boss_mech_06'))boss=entity})
  if(!boss)return
  let destroyed=boss.persistentData.getInt('dz_brass_cells_destroyed_count')+1
  boss.persistentData.putInt('dz_brass_cells_destroyed_count',destroyed)
  boss.runCommandSilent('effect give @s minecraft:slowness 5 1 true')
  boss.runCommandSilent('effect give @s minecraft:weakness 5 0 true')
  if(destroyed>=2||pdzGunshopLiveCells(boss)<=0){
    boss.addTag('dz_brass_cells_destroyed')
    boss.runCommandSilent('effect clear @s minecraft:resistance')
    boss.runCommandSilent('effect give @s minecraft:glowing 12 0 true')
    pdzMechTell(boss,'全弾薬セル破壊。重装防護と無限給弾が停止した！','aqua')
  }else pdzMechTell(boss,'弾薬セルを1基破壊。残り1基。','yellow')
}

function pdzGunshopRouteCellHit(event,boss,attacker){
  if(!boss||boss.tags.contains('dz_brass_cells_destroyed')||!attacker||
    !attacker.isPlayer||!attacker.isPlayer())return false
  let dx=Number(attacker.x)-Number(boss.x),dz=Number(attacker.z)-Number(boss.z)
  let length=Math.sqrt(dx*dx+dz*dz)
  if(length<0.01)return false
  dx/=length;dz/=length
  let yaw=Number(boss.yaw||0)*Math.PI/180
  let fx=-Math.sin(yaw),fz=Math.cos(yaw)
  // Front armour is not a cell hit. Broad side/rear cones are intentional so
  // several players can flank the moving quadruped without pixel hunting.
  if(fx*dx+fz*dz>0.35)return false
  let left=(fx*dz-fz*dx)>=0
  let leftBroken=boss.persistentData.getBoolean('dz_brass_cell_left_broken')
  let rightBroken=boss.persistentData.getBoolean('dz_brass_cell_right_broken')
  if(left&&leftBroken)left=false
  else if(!left&&rightBroken)left=true
  if((left&&leftBroken)||(!left&&rightBroken))return false
  let key=left?'dz_brass_cell_left_hp':'dz_brass_cell_right_hp'
  let hp=Number(boss.persistentData.getDouble(key))
  if(hp<=0)hp=36
  hp-=Math.min(14,Math.max(1,Number(event.damage||0)))
  boss.persistentData.putDouble(key,Math.max(0,hp))
  boss.runCommandSilent('particle minecraft:electric_spark ~ ~1.45 ~ 0.55 0.3 0.55 0.05 9 force @a[distance=..64]')
  if(hp>0)return true
  boss.persistentData.putBoolean(left?'dz_brass_cell_left_broken':'dz_brass_cell_right_broken',true)
  let destroyed=Number(boss.persistentData.getInt('dz_brass_cells_destroyed_count'))+1
  boss.persistentData.putInt('dz_brass_cells_destroyed_count',destroyed)
  boss.runCommandSilent('particle minecraft:explosion ~ ~1.4 ~ 0.15 0.15 0.15 0.02 7 force @a[distance=..96]')
  boss.runCommandSilent('playsound minecraft:entity.generic.explode hostile @a[distance=..96] ~ ~ ~ 1 1.25')
  boss.runCommandSilent('effect give @s minecraft:slowness 5 1 true')
  boss.runCommandSilent('effect give @s minecraft:weakness 5 0 true')
  if(destroyed>=2){
    boss.addTag('dz_brass_cells_destroyed')
    boss.runCommandSilent('effect clear @s minecraft:resistance')
    boss.runCommandSilent('effect give @s minecraft:glowing 12 0 true')
    pdzMechTell(boss,'全弾薬セル破壊。重装防護と無限給弾が停止した！','aqua')
  }else pdzMechTell(boss,'弾薬セルを1基破壊。残り1基。','yellow')
  return true
}

function pdzMechValidWarnTarget(boss,target,radius){
  if(!target||!target.alive||String(target.level.dimension)!==String(boss.level.dimension))return false
  let player=false
  try{player=!!(target.isPlayer&&target.isPlayer())}catch(ignored){}
  if(player){
    if(target.spectator||target.creative)return false
  }else if(String(target.type)!=='dummmmmmy:target_dummy'||!target.tags||
    !target.tags.contains('dz_boss_test_target'))return false
  let dx=target.x-boss.x,dy=target.y-boss.y,dz=target.z-boss.z
  return dx*dx+dy*dy+dz*dz<radius*radius
}

function pdzMechNearestPlayer(boss,radius){
  // Coordinate gimmicks must use the same Mob#target exposed by the aggro UI.
  // Otherwise the warning can point at one player while the scripted blast
  // silently selects another one.
  let current=null
  try{current=boss.target}catch(ignored){}
  if(pdzMechValidWarnTarget(boss,current,radius))return current
  let nearest=null,best=radius*radius
  boss.server.players.forEach(player=>{
    if(player.spectator||player.creative||String(player.level.dimension)!==String(boss.level.dimension))return
    let dx=player.x-boss.x,dy=player.y-boss.y,dz=player.z-boss.z,d=dx*dx+dy*dy+dz*dz
    if(d<best){best=d;nearest=player}
  })
  // Creative operators are excluded above, so prefer the tagged test dummy
  // when present. This also lets coordinate-based gimmicks be measured without
  // asking a real player to stand in the warning marker.
  try{
    let nearby=boss.level.getEntities(boss,boss.boundingBox.inflate(radius))
    nearby.forEach(entity=>{
      if(String(entity.type)!=='dummmmmmy:target_dummy'||!entity.tags||
        !entity.tags.contains('dz_boss_test_target')||!entity.alive)return
      let dx=entity.x-boss.x,dy=entity.y-boss.y,dz=entity.z-boss.z,d=dx*dx+dy*dy+dz*dz
      if(d<best){best=d;nearest=entity}
    })
  }catch(ignored){}
  if(nearest){
    try{boss.setTarget(nearest)}catch(ignored){}
  }
  return nearest
}

function pdzMechTargetedBlast(boss,label,color,particle,radius,damage,delay){
  let target=pdzMechNearestPlayer(boss,40)
  if(!target)return false
  let x=Number(target.x).toFixed(2),y=Number(target.y).toFixed(2),z=Number(target.z).toFixed(2)
  let positioned='execute in '+String(boss.level.dimension)+' positioned '+x+' '+y+' '+z
  boss.server.runCommandSilent(positioned+' run particle '+particle+' ~ ~0.15 ~ '+radius+' 0.08 '+radius+' 0 64 force @a[distance=..96]')
  pdzMechTell(boss,label+'：赤い予告範囲から退避！',color)
  let ref=boss
  boss.server.scheduleInTicks(delay,()=>{
    if(!ref||!ref.alive)return
    ref.server.runCommandSilent(positioned+' run particle minecraft:explosion ~ ~0.2 ~ '+radius+' 0.2 '+radius+' 0.03 28 force @a[distance=..96]')
    ref.server.runCommandSilent(positioned+' run damage @a[distance=..'+radius+',gamemode=!creative,gamemode=!spectator] '+damage+' minecraft:explosion')
    ref.server.runCommandSilent(positioned+' run damage @e[type=dummmmmmy:target_dummy,tag=dz_boss_test_target,distance=..'+radius+'] '+damage+' minecraft:explosion')
  })
  return true
}

function pdzMechTell(boss,text,color){
  boss.runCommandSilent('tellraw @a[distance=..64,gamemode=!spectator] {"text":"[BOSS] '+text+'","color":"'+color+'","bold":true}')
}

function pdzMechSpawnChoirHitboxes(boss){
  if(boss.tags.contains('dz_choir_hitboxes_spawned'))return
  boss.addTag('dz_choir_hitboxes_spawned')
  // CHOIR's native entity dimensions are 7.5 x 10.5 blocks and cover the
  // authored silhouette. Extra living hitbox slimes were both visible and
  // counted as unrelated combatants by other mods.
  boss.addTag('dz_choir_native_fullbody_hitbox')
  pdzMechTell(boss,'巨体全域のネイティブ判定が起動した。音と地面予告を読め。','light_purple')
}

function pdzMechInit(boss,id){
  pdzMechEnsureHome(boss)
  pdzMechEquipBossGun(boss,id)
  pdzMechApplyMnsBossProfile(boss,id)
  pdzMechApplyIdentity(boss,id)
  pdzMechPresentationInit(boss,id)
  if(boss.tags.contains(PDZ_MECH_ACTIVE))return
  boss.addTag(PDZ_MECH_ACTIVE)
  boss.addTag('dz_boss_mech_'+id)
  boss.persistentData.putInt('dz_boss_mech_time',0)
  boss.persistentData.putString('dz_boss_mech_id',id)
  if(id==='03')pdzMechSpawnChoirHitboxes(boss)
  if(id==='06')pdzGunshopSpawnCells(boss)
  let def=pdzMechDef(id)
  if(def)pdzMechTell(boss,'['+id+'] '+def.name+' 起動','gold')
}

function pdzMechPhaseMutation(boss){
  let ratio=Number(boss.health)/Math.max(1,Number(boss.maxHealth))
  if(ratio<=0.66&&!boss.tags.contains('dz_primordial_mutation_1')){
    boss.addTag('dz_primordial_mutation_1')
    let testTag=boss.tags.contains(PDZ_MECH_LOADTEST)?',"dz_boss_loadtest_runtime"':''
    boss.runCommandSilent('summon infectious:spore_zombie ~3 ~ ~ {PersistenceRequired:1b,Tags:["'+PDZ_MECH_RUNTIME+'","dz_boss_runtime_09","dz_pdz_boss_minion"'+testTag+']}')
    boss.runCommandSilent('summon infectious:spore_zombie ~-3 ~ ~ {PersistenceRequired:1b,Tags:["'+PDZ_MECH_RUNTIME+'","dz_boss_runtime_09","dz_pdz_boss_minion"'+testTag+']}')
    boss.runCommandSilent('effect give @s minecraft:resistance 8 0 true')
    boss.runCommandSilent('particle minecraft:sonic_boom ~ ~1.2 ~ 0 0 0 0 1 force @a[distance=..64]')
    boss.runCommandSilent('effect give @a[distance=..8,gamemode=!creative,gamemode=!spectator] minecraft:slowness 3 1 true')
    pdzMechTell(boss,'第一変異。感染胞子体を分離した。','dark_purple')
  }
  if(ratio<=0.33&&!boss.tags.contains('dz_primordial_mutation_2')){
    boss.addTag('dz_primordial_mutation_2')
    boss.runCommandSilent('effect give @s minecraft:strength 9999 0 true')
    boss.runCommandSilent('effect give @s minecraft:speed 9999 0 true')
    boss.runCommandSilent('particle minecraft:sculk_soul ~ ~1 ~ 2 1 2 0.08 50 force @a[distance=..64]')
    pdzMechTell(boss,'最終変異。攻撃性と機動力が上昇した。','red')
  }
}

function pdzGunshopPulse(boss,time,forced){
  let ratio=Number(boss.health)/Math.max(1,Number(boss.maxHealth))
  let cells=pdzGunshopLiveCells(boss)
  if(cells>0&&!boss.tags.contains('dz_brass_cells_destroyed'))boss.runCommandSilent('effect give @s minecraft:resistance 3 0 true')
  if(ratio<=0.66&&!boss.tags.contains('dz_brass_phase_2')){
    boss.addTag('dz_brass_phase_2')
    boss.runCommandSilent('summon tacz_hostiles:scavenger ~3 ~ ~3 {PersistenceRequired:1b,CustomName:\'{"text":"BRASS LOADER","color":"gold","bold":true}\',CustomNameVisible:1b,Tags:["'+PDZ_MECH_RUNTIME+'","dz_boss_runtime_06","dz_pdz_boss_minion"]}')
    boss.runCommandSilent('summon tacz_hostiles:scavenger ~-3 ~ ~-3 {PersistenceRequired:1b,CustomName:\'{"text":"BRASS LOADER","color":"gold","bold":true}\',CustomNameVisible:1b,Tags:["'+PDZ_MECH_RUNTIME+'","dz_boss_runtime_06","dz_pdz_boss_minion"]}')
    pdzMechTell(boss,'PHASE 2：弾薬手を展開。包囲される前にセルを壊せ！','red')
  }
  if(ratio<=0.33&&!boss.tags.contains('dz_brass_phase_3')){
    boss.addTag('dz_brass_phase_3')
    boss.runCommandSilent('effect give @s minecraft:speed 9999 0 true')
    boss.runCommandSilent('effect give @s minecraft:glowing 9999 0 true')
    pdzMechTell(boss,'PHASE 3：銃身過熱。排熱中が最大の攻撃機会！','dark_red')
  }
  if(forced||time%11===0){
    boss.runCommandSilent('particle minecraft:dust 1 0.55 0.05 1.2 ~ ~1.2 ~ 3 0.3 3 0 70 force @a[distance=..64]')
    pdzMechTell(boss,'制圧射撃を予告。遮蔽へ退避！','gold')
    let ref=boss
    boss.server.scheduleInTicks(30,()=>{
      if(!ref||!ref.alive)return
      ref.runCommandSilent('effect give @a[distance=..20,gamemode=!creative,gamemode=!spectator] minecraft:slowness 4 1 true')
      ref.runCommandSilent('effect give @a[distance=..20,gamemode=!creative,gamemode=!spectator] minecraft:weakness 4 0 true')
      ref.runCommandSilent('playsound minecraft:block.dispenser.launch hostile @a[distance=..64] ~ ~ ~ 1 0.65')
    })
    pdzMechPulseCount++
  }
  if(boss.tags.contains('dz_brass_phase_3')&&time%15===5){
    boss.runCommandSilent('effect give @s minecraft:slowness 5 3 true')
    boss.runCommandSilent('effect give @s minecraft:weakness 5 1 true')
    boss.runCommandSilent('particle minecraft:campfire_signal_smoke ~ ~1.6 ~ 0.5 0.8 0.5 0.02 35 force @a[distance=..64]')
    pdzMechTell(boss,'排熱開始。5秒間、防御と機動が低下！','aqua')
  }
}

function pdzMechPulse(boss,id,forced){
  let time=boss.persistentData.getInt('dz_boss_mech_time')+1
  boss.persistentData.putInt('dz_boss_mech_time',time)
  if(id==='02'&&(forced||time%14===1)){
    boss.runCommandSilent('particle minecraft:electric_spark ~ ~2 ~ 1.2 1.8 1.2 0.08 28 force @a[distance=..64]')
    pdzMechTell(boss,'適応障壁を充電中。1秒後から5秒間は射撃を止めろ！','gold')
    let ref=boss
    boss.server.scheduleInTicks(20,()=>{if(ref&&ref.alive){ref.runCommandSilent('effect give @s minecraft:resistance 5 2 true');ref.runCommandSilent('effect give @s minecraft:glowing 5 0 true')}})
    pdzMechPulseCount++
  }else if(id==='03'&&(forced||time%11===0)){
    boss.runCommandSilent('particle minecraft:dust 0.7 0.1 1 1.4 ~ ~0.2 ~ 5 0.1 5 0 80 force @a[distance=..64]')
    pdzMechTell(boss,'共鳴衝撃波を収束中。1.5秒以内に10m外へ！','dark_purple')
    let ref=boss
    boss.server.scheduleInTicks(30,()=>{if(ref&&ref.alive){ref.runCommandSilent('particle minecraft:sonic_boom ~ ~4 ~ 0 0 0 0 1 force @a[distance=..64]');ref.runCommandSilent('damage @a[distance=..10,gamemode=!creative,gamemode=!spectator] 3 minecraft:magic');ref.runCommandSilent('damage @e[type=dummmmmmy:target_dummy,tag=dz_boss_test_target,distance=..10] 3 minecraft:magic');ref.runCommandSilent('effect give @a[distance=..10,gamemode=!creative,gamemode=!spectator] minecraft:darkness 3 0 true')}})
    pdzMechPulseCount++
  }else if(id==='04'&&(forced||time%9===0)){
    if(pdzMechTargetedBlast(boss,'焼夷弾着弾予告','red','minecraft:dust 1 0.15 0.02 1.2',3.5,4,30))pdzMechPulseCount++
  }else if(id==='06'){
    pdzGunshopPulse(boss,time,forced)
  }else if(id==='07'&&(forced||time%12===0)){
    let samples=boss.persistentData.getInt('dz_boss_damage_samples'),ref=boss
    boss.runCommandSilent('particle minecraft:happy_villager ~ ~1.4 ~ 1 1 1 0.1 30 force @a[distance=..64]')
    pdzMechTell(boss,'4秒の戦場治療を開始。攻撃を当てて中断せよ！','green')
    boss.server.scheduleInTicks(80,()=>{
      if(!ref||!ref.alive)return
      if(ref.persistentData.getInt('dz_boss_damage_samples')!==samples){pdzMechTell(ref,'治療を中断した！','aqua');return}
      ref.health=Math.min(Number(ref.maxHealth),Number(ref.health)+Number(ref.maxHealth)*0.08)
      ref.runCommandSilent('effect give @e[distance=..12,tag=dz_raider] minecraft:regeneration 5 1 true')
      pdzMechTell(ref,'治療完了。HPを8%回復。','dark_green')
    })
    pdzMechPulseCount++
  }else if(id==='08'&&(forced||time%11===0)){
    let ratio=Number(boss.health)/Math.max(1,Number(boss.maxHealth))
    if(ratio<=0.66&&!boss.tags.contains('dz_graves_phase_2')){
      boss.addTag('dz_graves_phase_2')
      boss.runCommandSilent('summon tacz_bandits:bandit ~3 ~ ~3 {BanditVariant:4,PersistenceRequired:1b,CustomName:\'{"text":"GRAVES DEPUTY","color":"blue"}\',CustomNameVisible:1b,Tags:["'+PDZ_MECH_RUNTIME+'","dz_boss_runtime_08","dz_pdz_boss_minion"]}')
      pdzMechTell(boss,'PHASE 2：副官が射線を形成。先に増援を排除せよ！','blue')
    }
    if(ratio<=0.33&&!boss.tags.contains('dz_graves_phase_3')){
      boss.addTag('dz_graves_phase_3')
      boss.runCommandSilent('effect give @s minecraft:resistance 8 0 true')
      boss.runCommandSilent('effect give @s minecraft:speed 9999 0 true')
      pdzMechTell(boss,'PHASE 3：最終封鎖命令。8秒間だけ防護が上昇！','dark_blue')
    }
    let target=pdzMechNearestPlayer(boss,20),ref=boss
    if(target){target.runCommandSilent('effect give @s minecraft:glowing 3 0 true');pdzMechTell(boss,'拘束対象を標定。2秒以内に遮蔽へ！','blue');boss.server.scheduleInTicks(40,()=>{if(ref&&ref.alive&&target&&target.alive&&ref.hasLineOfSight(target)){target.runCommandSilent('effect give @s minecraft:slowness 4 3 true');target.runCommandSilent('effect give @s minecraft:weakness 4 1 true')}});pdzMechPulseCount++}
  }else if(id==='09'){
    pdzMechPhaseMutation(boss)
  }else if(id==='10'&&(forced||time%12===0)){
    let target=pdzMechNearestPlayer(boss,40),ref=boss
    if(target){target.runCommandSilent('effect give @s minecraft:glowing 4 0 true');if(target.isPlayer&&target.isPlayer())target.runCommandSilent('title @s actionbar {"text":"ECHO-7 レールガン標定：遮蔽へ移動","color":"red","bold":true}');pdzMechTell(boss,'レールガンを標定。2.5秒以内に視線を切れ！','dark_purple');boss.server.scheduleInTicks(50,()=>{if(!ref||!ref.alive||!target||!target.alive)return;if(!ref.hasLineOfSight(target)){pdzMechTell(ref,'レールガン不発。標的が遮蔽へ退避。','aqua');return}target.runCommandSilent('particle minecraft:flash ~ ~1 ~ 0 0 0 0 1 force @a[distance=..64]');target.runCommandSilent('particle minecraft:electric_spark ~ ~1 ~ 0.7 0.9 0.7 0.18 42 force @a[distance=..64]');if(target.isPlayer&&target.isPlayer())ref.runCommandSilent('damage '+String(target.username)+' 6 minecraft:sonic_boom by @s');else ref.runCommandSilent('damage @e[type=dummmmmmy:target_dummy,tag=dz_boss_test_target,sort=nearest,limit=1,distance=..48] 6 minecraft:sonic_boom by @s');ref.runCommandSilent('playsound minecraft:entity.warden.sonic_boom hostile @a[distance=..64] ~ ~ ~ 1 1.35')});pdzMechPulseCount++}
  }else if(id==='11'&&(forced||time%8===0)){
    boss.runCommandSilent('particle minecraft:dust 0.2 1 0.1 1.5 ~ ~1 ~ 3 1 3 0 60 force @a[distance=..64]')
    pdzMechTell(boss,'臨界放射環を予告。2秒以内に5m内か16m外へ！','green')
    let ref=boss
    boss.server.scheduleInTicks(40,()=>{if(ref&&ref.alive){ref.runCommandSilent('damage @a[distance=5..16,gamemode=!creative,gamemode=!spectator] 4 minecraft:magic');ref.runCommandSilent('damage @e[type=dummmmmmy:target_dummy,tag=dz_boss_test_target,distance=5..16] 4 minecraft:magic');ref.runCommandSilent('effect give @a[distance=5..16,gamemode=!creative,gamemode=!spectator] minecraft:hunger 5 1 true')}})
    pdzMechPulseCount++
  }else if(id==='12'&&(forced||time%10===0)){
    boss.runCommandSilent('particle minecraft:dust 1 0.15 0.05 1.5 ~ ~0.2 ~ 4 0.1 4 0 70 force @a[distance=..64]')
    boss.runCommandSilent('playsound minecraft:block.note_block.basedrum hostile @a[distance=..64] ~ ~ ~ 1.2 0.5')
    pdzMechTell(boss,'地面叩きつけ予告。1.5秒後に衝撃！','red')
    let ref=boss
    boss.server.scheduleInTicks(30,()=>{
      if(!ref||!ref.alive||ref.tags.contains('dz_boss_showroom'))return
      ref.runCommandSilent('particle minecraft:explosion ~ ~0.2 ~ 2.5 0.2 2.5 0.05 25 force @a[distance=..64]')
      ref.runCommandSilent('damage @a[distance=..6,gamemode=!creative,gamemode=!spectator] 7 minecraft:explosion')
      ref.runCommandSilent('damage @e[type=dummmmmmy:target_dummy,tag=dz_boss_test_target,distance=..6] 7 minecraft:explosion')
      ref.runCommandSilent('effect give @a[distance=..6,gamemode=!creative,gamemode=!spectator] minecraft:levitation 1 1 true')
    })
    pdzMechPulseCount++
  }else if(id==='13'&&(forced||time%9===0)){
    let burnedUntil=Number(boss.persistentData.getLong('dz_abomination_burn_lock_until'))
    if(burnedUntil<=Date.now())boss.health=Math.min(Number(boss.maxHealth),Number(boss.health)+Number(boss.maxHealth)*0.03)
    let testTag=boss.tags.contains(PDZ_MECH_LOADTEST)?',"dz_boss_loadtest_runtime"':''
    boss.runCommandSilent('summon minecraft:area_effect_cloud ~ ~ ~ {Duration:120,Radius:3.5f,RadiusPerTick:-0.02f,Particle:"spore_blossom_air",Effects:[{Id:19,Amplifier:0b,Duration:60}],Tags:["'+PDZ_MECH_RUNTIME+'","dz_boss_runtime_13"'+testTag+']}')
    pdzMechTell(boss,burnedUntil>Date.now()?'胞子再生は焼却により停止中。':'再生胞子を放出。火炎で再生を8秒停止できる！','dark_green');pdzMechPulseCount++
  }else if(id==='14'&&global.pdzT4BossPulse){
    try { if(global.pdzT4BossPulse(boss,time))pdzMechPulseCount++ }
    catch(err){console.warn('[PROJECT DEADZONE][Boss 14] pulse failed: '+err)}
  }
}

function pdzMechChoirMultiplier(hitbox){
  if(hitbox.tags.contains('dz_choir_multiplier_1_35'))return 1.35
  if(hitbox.tags.contains('dz_choir_multiplier_0_9'))return 0.9
  return 1
}

EntityEvents.hurt(event=>{
  let hitbox=event.entity
  let attacker=event.source?event.source.actual:null
  if(hitbox&&hitbox.tags&&hitbox.tags.contains(PDZ_MECH_COMPONENT)){
    let sourceId=pdzMechDamageSourceId(event.source).toLowerCase()
    if(sourceId.indexOf('generic_kill')<0&&sourceId.indexOf('out_of_world')<0&&
      (!attacker||!attacker.isPlayer||!attacker.isPlayer()))event.cancel()
    return
  }
  // Facility bosses belong to player-authored story combat. Hostile mobs may
  // not steal the kill or silently advance/reward the campaign. Record a
  // recent player hit so ranged attacks still carry credit into death events.
  if(hitbox&&hitbox.tags&&hitbox.tags.contains('dz_story_boss')){
    if(attacker&&attacker.isPlayer&&attacker.isPlayer()){
      hitbox.persistentData.putString('dz_story_last_player_hit_uuid',String(attacker.uuid))
      hitbox.persistentData.putLong('dz_story_last_player_hit_ms',Date.now())
    }else if(attacker){
      event.cancel()
      try{attacker.setTarget(null)}catch(ignored){}
      return
    }
  }
  let encounterId=pdzMechEncounterId(hitbox)
  if(encounterId==='06')pdzGunshopRouteCellHit(event,hitbox,attacker)
  if(encounterId==='13'&&pdzMechDamageSourceId(event.source).toLowerCase().indexOf('fire')>=0){
    hitbox.persistentData.putLong('dz_abomination_burn_lock_until',Date.now()+8000)
    hitbox.runCommandSilent('particle minecraft:flame ~ ~1 ~ 0.8 0.8 0.8 0.04 24 force @a[distance=..64]')
  }
  if(encounterId&&pdzMechGateDamage(hitbox,encounterId,Math.max(0,Number(event.damage||0)),event.source)){
    event.cancel()
    return
  }
  if(pdzMechIsBoss(attacker)&&!pdzMechAllowedTarget(hitbox)){
    event.cancel()
    try{attacker.setTarget(null)}catch(ignored){}
    return
  }
  if(!hitbox||hitbox.level.clientSide||!hitbox.tags.contains(PDZ_CHOIR_HITBOX))return
  event.cancel()
  let boss=null,best=24*24
  let nearby=hitbox.level.getEntities(hitbox,hitbox.boundingBox.inflate(24))
  nearby.forEach(candidate=>{
    if(!candidate.tags||!candidate.tags.contains('dz_boss_mech_03')||!candidate.alive)return
    let dx=candidate.x-hitbox.x,dy=candidate.y-hitbox.y,dz=candidate.z-hitbox.z,d=dx*dx+dy*dy+dz*dz
    if(d<best){best=d;boss=candidate}
  })
  if(!boss)return
  let amount=Math.max(0,Number(event.damage||0))*pdzMechChoirMultiplier(hitbox)
  if(amount<=0)return
  if(attacker&&attacker.isPlayer&&attacker.isPlayer())boss.persistentData.putString('dz_choir_last_attacker',String(attacker.uuid))
  hitbox.health=2048
  if(pdzMechGateDamage(boss,'03',amount,event.source))return
  if(amount>=Number(boss.health)){
    // Preserve the real attacker for kill credit on the lethal transferred hit.
    try{boss.hurt(event.source,100000)}catch(ignored){try{boss.attack(100000)}catch(ignored2){boss.health=0}}
  }else boss.health=Math.max(0,Number(boss.health)-amount)
})

EntityEvents.death(event=>{
  let boss=event.entity
  if(!boss||boss.level.clientSide)return
  if(boss.tags.contains('dz_brass_ammo_cell')){pdzGunshopCellDestroyed(boss);return}
  let encounterId=pdzMechEncounterId(boss)
  if(encounterId)pdzMechPresentationRemove(boss)
  if(boss.tags.contains('dz_boss_mech_03'))boss.runCommandSilent('kill @e[tag='+PDZ_CHOIR_HITBOX+',distance=..24]')
  if(boss.tags.contains('dz_boss_mech_05'))boss.runCommandSilent('kill @e[tag=dz_boss_runtime_05,distance=..48]')
  if(boss.tags.contains('dz_boss_mech_09'))boss.runCommandSilent('kill @e[tag=dz_boss_runtime_09,distance=..40]')
  if(boss.tags.contains('dz_boss_mech_06'))boss.runCommandSilent('kill @e[tag=dz_boss_runtime_06,distance=..48]')
  if(boss.tags.contains('dz_boss_mech_08'))boss.runCommandSilent('kill @e[tag=dz_boss_runtime_08,distance=..48]')
})

// Target validation stays responsive; encounter pulses and presentation remain
// on the one-second scan below. No follower hitbox entities are maintained.
ServerEvents.tick(event=>{
  pdzMechClock++
  let server=event.server
  if(pdzMechClock%5===0)pdzMechTrackedBosses.forEach(boss=>pdzMechRestrictTarget(boss))
  if(pdzMechClock%20!==0)return

  let started=Date.now(),seen={},seenLevels={},active=0,tracked=[]
  server.players.forEach(player=>{
    let dimension=String(player.level.dimension)
    if(seenLevels[dimension])return
    seenLevels[dimension]=true
    player.level.entities.forEach(entity=>{
    let uuid=String(entity.uuid)
    if(seen[uuid])return
    seen[uuid]=true
    let id=pdzMechId(entity)
    if(entity.tags&&entity.tags.contains('dz_boss_axel')&&!entity.tags.contains('dz_boss_showroom')){
      pdzMechEnsureHome(entity)
      pdzMechEquipBossGun(entity,'01')
      pdzMechApplyMnsBossProfile(entity,'01')
      pdzMechApplyIdentity(entity,'01')
      pdzMechPresentationInit(entity,'01')
      pdzMechPresentationUpdate(entity,'01')
      tracked.push(entity)
    }
    if(!id||!entity.alive)return
    pdzMechInit(entity,id)
    pdzMechPulse(entity,id)
    pdzMechPresentationUpdate(entity,id)
    tracked.push(entity)
    active++
    })
  })
  pdzMechActiveCount=active
  pdzMechTrackedBosses=tracked
  pdzMechLastMs=Date.now()-started
  pdzMechSamples++
  pdzMechAverageMs+=((pdzMechLastMs-pdzMechAverageMs)/pdzMechSamples)
  pdzMechMaxMs=Math.max(pdzMechMaxMs,pdzMechLastMs)
})

function pdzMechTestNbt(entry,frozen){
  let ready=entry.ready?',"dz_sideboss_ready"':''
  let frozenTag=frozen?',"'+PDZ_MECH_FROZEN_TEST+'"':''
  let frozenNbt=frozen?'NoAI:1b,Invulnerable:1b,Silent:1b,':''
  let gunTag=pdzMechGunTag(entry.id)
  let hands=gunTag?',HandItems:[{id:"tacz:modern_kinetic_gun",Count:1b,tag:'+gunTag+'},{}],HandDropChances:[0.0f,0.0f]':''
  return '{'+frozenNbt+'PersistenceRequired:1b,Health:'+entry.hp+'.0f,Attributes:[{Name:"minecraft:generic.max_health",Base:'+entry.hp+'.0d}],CustomName:\'{"text":"['+(frozen?'VIEW ':'COMBAT ')+entry.id+'] '+entry.name+'","color":"red","bold":true}\',CustomNameVisible:1b'+hands+',Tags:["'+PDZ_MECH_LOADTEST+'","dz_boss_mech_'+entry.id+'"'+ready+frozenTag+']}'
}

function pdzMechSpawnTestSet(player,frozen){
  pdzMechTestCleanup(player)
  player.server.runCommandSilent('team add pdz_boss_test')
  PDZ_MECH_TEST_ENTRIES.forEach(entry=>{
    player.runCommandSilent('execute positioned ^'+entry.x+' ^ ^'+entry.z+' run summon '+entry.entity+' ~ ~ ~ '+pdzMechTestNbt(entry,frozen))
  })
  player.runCommandSilent('team join pdz_boss_test @e[tag='+PDZ_MECH_LOADTEST+',distance=..80]')
}

function pdzMechSpawnSingleTest(player,entry,frozen){
  pdzMechTestCleanup(player)
  player.server.runCommandSilent('team add pdz_boss_test')
  let result=player.runCommandSilent('execute positioned ^ ^ ^10 run summon '+entry.entity+' ~ ~ ~ '+pdzMechTestNbt(entry,frozen))
  player.runCommandSilent('team join pdz_boss_test @e[tag='+PDZ_MECH_LOADTEST+',distance=..24]')
  if(result>0)player.tell(Text.of('['+entry.id+'] '+entry.name+' を10m先へ'+(frozen?'展示':'戦闘')+'召喚しました。').aqua())
  else player.tell(Text.of('['+entry.id+'] '+entry.name+' の召喚に失敗しました。').red())
  return result>0?1:0
}

function pdzMechTestCleanup(player){
  let count=0
  player.level.entities.forEach(entity=>{
    if(!entity.tags)return
    if(entity.tags.contains(PDZ_MECH_LOADTEST)||entity.tags.contains('dz_boss_loadtest_runtime')){
      let dx=entity.x-player.x,dy=entity.y-player.y,dz=entity.z-player.z
      if(dx*dx+dy*dy+dz*dz<=160*160){entity.discard();count++}
    }
  })
  return count
}

function pdzMechNearestActiveBoss(player,radius){
  let nearest=null,best=radius*radius
  player.level.entities.forEach(entity=>{
    let id=pdzMechEncounterId(entity)
    if(!id||!entity.alive)return
    let dx=entity.x-player.x,dy=entity.y-player.y,dz=entity.z-player.z,d=dx*dx+dy*dy+dz*dz
    if(d<best){best=d;nearest=entity}
  })
  return nearest
}

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonebosstest').requires(source=>source.hasPermission(2))
  root.then(Commands.literal('spawn').executes(ctx=>{
    let p=ctx.source.player
    pdzMechSpawnTestSet(p,true)
    p.tell(Text.of('見た目確認用ボス[02]～[14]を停止状態で配置しました。移動・攻撃・ギミックは無効です。').aqua())
    return 1
  }))
  root.then(Commands.literal('combat').executes(ctx=>{
    let p=ctx.source.player
    pdzMechSpawnTestSet(p,false)
    p.tell(Text.of('マルチ負荷テスト用ボス[02]～[14]を戦闘状態で配置しました。プレイヤー／村人系だけを狙います。').red())
    return 1
  }))
  PDZ_MECH_TEST_ENTRIES.forEach(entry=>{
    root.then(Commands.literal('spawn_'+entry.id).executes(ctx=>pdzMechSpawnSingleTest(ctx.source.player,entry,false)))
    root.then(Commands.literal('view_'+entry.id).executes(ctx=>pdzMechSpawnSingleTest(ctx.source.player,entry,true)))
  })
  root.then(Commands.literal('phase2').executes(ctx=>{
    let p=ctx.source.player,boss=pdzMechNearestActiveBoss(p,128)
    if(!boss){p.tell(Text.of('128m以内にBOSSがいません。').yellow());return 0}
    boss.health=Math.max(1,Number(boss.maxHealth)*0.64)
    p.tell(Text.of('最寄りBOSSをPhase 2へ移しました。').gold())
    return 1
  }))
  root.then(Commands.literal('phase3').executes(ctx=>{
    let p=ctx.source.player,boss=pdzMechNearestActiveBoss(p,128)
    if(!boss){p.tell(Text.of('128m以内にBOSSがいません。').yellow());return 0}
    boss.health=Math.max(1,Number(boss.maxHealth)*0.31)
    p.tell(Text.of('最寄りBOSSをPhase 3へ移しました。').red())
    return 1
  }))
  root.then(Commands.literal('defeat').executes(ctx=>{
    let p=ctx.source.player,boss=pdzMechNearestActiveBoss(p,128)
    if(!boss){p.tell(Text.of('128m以内にBOSSがいません。').yellow());return 0}
    boss.addTag('dz_boss_test_selected')
    let result=boss.runCommandSilent('kill @s')
    p.tell(Text.of('最寄りBOSSを撃破状態へ移しました。死亡モーションを確認してください。').aqua())
    return result>0?1:0
  }))
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player
    let runtime=0,tests=0,choirParts=0
    p.level.entities.forEach(entity=>{
      if(!entity.tags)return
      let dx=entity.x-p.x,dy=entity.y-p.y,dz=entity.z-p.z
      if(dx*dx+dy*dy+dz*dz>160*160)return
      if(entity.tags.contains(PDZ_MECH_RUNTIME))runtime++
      if(entity.tags.contains(PDZ_MECH_LOADTEST))tests++
      if(entity.tags.contains(PDZ_CHOIR_HITBOX))choirParts++
    })
    p.tell(Text.of('Boss mechanics: active='+pdzMechActiveCount+' / test bosses='+tests+' / runtime='+runtime+' / CHOIR parts='+choirParts).aqua())
    p.tell(Text.of('1秒走査: last='+pdzMechLastMs+'ms / avg='+pdzMechAverageMs.toFixed(2)+'ms / max='+pdzMechMaxMs+'ms / gimmick pulses='+pdzMechPulseCount+' / arena returns='+pdzMechHomeReturnCount).gray())
    return 1
  }))
  root.then(Commands.literal('probe').executes(ctx=>{
    let p=ctx.source.player,nearest=pdzMechNearestActiveBoss(p,128)
    if(!nearest){p.tell(Text.of('128m以内に稼働中のPDZ Bossはいません。').yellow());return 0}
    let id=pdzMechEncounterId(nearest),max=Math.max(1,Number(nearest.maxHealth))
    let mnsMax=max
    let bossLevel=pdzMechBossLevelOf(nearest),attack='native/ranged'
    try{mnsMax=Math.max(1,Number(PDZ_MECH_MNS_HEALTH.getMaxHealth(nearest)))}catch(ignored){}
    try{attack=Number(nearest.getAttributeValue('minecraft:generic.attack_damage')).toFixed(2)}catch(ignored){}
    let lock=Math.max(0,(Number(nearest.persistentData.getLong('dz_boss_phase_lock_until'))-Date.now())/1000)
    p.tell(Text.of('Boss ['+id+'] '+String(nearest.name.string)+' / HP '+Number(nearest.health).toFixed(1)+' / '+max.toFixed(1)+
      ' ('+(Number(nearest.health)/max*100).toFixed(1)+'%) / M&S Max '+Math.round(mnsMax)).aqua())
    p.tell(Text.of('M&S Lv '+bossLevel+' / Attack属性 '+attack+' / Party '+nearest.persistentData.getInt('dz_party_size')+' / HP倍率 '+
      Number(nearest.persistentData.getDouble('dz_boss_party_health_multiplier')).toFixed(2)+' / Phase '+
      nearest.persistentData.getInt('dz_boss_phase_gate_stage')+' / Lock '+lock.toFixed(1)+'秒').gray())
    p.tell(Text.of('被ダメージ: last='+Number(nearest.persistentData.getDouble('dz_boss_last_incoming_damage')).toFixed(1)+
      ' / max='+Number(nearest.persistentData.getDouble('dz_boss_max_incoming_damage')).toFixed(1)+
      ' / samples='+nearest.persistentData.getInt('dz_boss_damage_samples')).gold())
    return 1
  }))
  root.then(Commands.literal('cleanup').executes(ctx=>{
    let count=pdzMechTestCleanup(ctx.source.player)
    ctx.source.player.tell(Text.of('160m以内の負荷テスト個体・一時判定を撤去しました: '+count).yellow())
    return 1
  }))
  event.register(root)
})
