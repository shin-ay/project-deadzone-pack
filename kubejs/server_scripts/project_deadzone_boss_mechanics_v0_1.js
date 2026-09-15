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
const PDZ_MECH_PRESENTATION = 'dz_boss_presentation'
const PDZ_MECH_COMPONENT = 'dz_boss_component'

const PDZ_MECH_DEFS = [
  {id:'01',tag:'dz_boss_axel',name:'燃料タンク＋焼夷投擲',bossName:'AXEL // ROAD KING',bar:'red',style:'notched_10',icon:'minecraft:firework_star'},
  {id:'02',tag:'dz_story_boss_argus_fragment',name:'適応障壁',bossName:'ARGUS FRAGMENT',bar:'blue',style:'notched_10',icon:'minecraft:end_crystal'},
  {id:'03',tag:'dz_story_boss_choir_vessel',name:'共鳴衝撃波＋全身判定',bossName:'CHOIR VESSEL',bar:'purple',style:'notched_12',icon:'minecraft:echo_shard'},
  {id:'04',tag:'dz_story_boss_firestation',name:'焼夷制圧',bossName:'CINDER',bar:'red',style:'notched_10',icon:'minecraft:fire_charge'},
  {id:'05',tag:'dz_story_boss_gasstation',name:'偵察機動',bossName:'FUEL ROUTE SCOUT',bar:'yellow',style:'notched_10',icon:'minecraft:crossbow'},
  {id:'06',tag:'dz_story_boss_gunshop',name:'弾薬セル＋制圧射撃',bossName:'BRASS HOUND',bar:'yellow',style:'notched_10',icon:'minecraft:netherite_chestplate'},
  {id:'07',tag:'dz_story_boss_hospital',name:'妨害可能な戦場治療',bossName:'WHITE STITCH',bar:'white',style:'notched_10',icon:'minecraft:ghast_tear'},
  {id:'08',tag:'dz_story_boss_policestation',name:'拘束命令＋増援',bossName:'MARSHAL GRAVES',bar:'blue',style:'notched_10',icon:'minecraft:shield'},
  {id:'09',tag:'dz_story_boss_primordial',name:'段階変異',bossName:'PRIMORDIAL',bar:'purple',style:'notched_12',icon:'minecraft:fermented_spider_eye'},
  {id:'10',tag:'dz_story_boss_radio_tower',name:'遮蔽可能な狙撃標定',bossName:'ECHO-7',bar:'blue',style:'notched_10',icon:'minecraft:spyglass'},
  {id:'11',tag:'dz_story_boss_reactor_saint',name:'予告式臨界放射環',bossName:'REACTOR SAINT',bar:'green',style:'notched_12',icon:'minecraft:heart_of_the_sea'},
  {id:'12',tag:'dz_sideboss_tank',name:'予告式グラウンドスラム',bossName:'SIEGE TANK',bar:'red',style:'notched_10',icon:'minecraft:iron_block'},
  {id:'13',tag:'dz_sideboss_abomination',name:'焼却可能な再生胞子',bossName:'ANCIENT ABOMINATION',bar:'green',style:'notched_10',icon:'minecraft:spore_blossom'},
  {id:'14',tag:'dz_story_boss_t4_relay_shepherd',name:'信号ノード＋座標砲撃',bossName:'RELAY SHEPHERD',bar:'purple',style:'notched_20',icon:'minecraft:recovery_compass'}
]

// Boss-only silhouettes. Ordinary bandits already use AK/M4/SMG/Deagle/
// double-barrel weapons, so named humanoid bosses deliberately avoid that pool.
const PDZ_MECH_BOSS_GUNS = {
  // Axel is the first mandatory boss. An assault rifle keeps the encounter
  // readable at S0 while his weak points and grenades provide the spectacle.
  '01':{gun:'tacz:m4a1',mode:'AUTO',ammo:30},
  '04':{gun:'tacz:fn_evolys',mode:'AUTO',ammo:100},
  // 05 is a vanilla pillager. Replacing its crossbow with a TaCZ item leaves
  // the pillager AI unable to fire, so its authored crossbow is preserved.
  '06':{gun:'elitex:m249x',mode:'AUTO',ammo:100},
  '07':{gun:'elitex:fh_scar18',mode:'AUTO',ammo:30},
  '08':{gun:'tacz:scar_h',mode:'AUTO',ammo:20},
  '14':{gun:'maxstuff:scar_hamr',mode:'AUTO',ammo:50}
}

const PDZ_MECH_TEST_ENTRIES = [
  {id:'02',x:-12,z:16,entity:'infectious:mecha_zombie',name:'ARGUS Fragment',hp:240},
  {id:'03',x:-4,z:16,entity:'infectious:giant_zombie',name:'CHOIR VESSEL',hp:280},
  {id:'04',x:4,z:16,entity:'tacz_bandits:bandit',name:'CINDER',hp:55},
  {id:'05',x:12,z:16,entity:'tacz_bandits:bandit',name:'Fuel Route Scout',hp:36},
  {id:'06',x:-12,z:25,entity:'tacz_bandits:bandit',name:'BRASS HOUND',hp:55},
  {id:'07',x:-4,z:25,entity:'tacz_bandits:bandit',name:'WHITE STITCH',hp:70},
  {id:'08',x:4,z:25,entity:'tacz_bandits:bandit',name:'MARSHAL GRAVES',hp:80},
  {id:'09',x:12,z:25,entity:'infectious:mutant_zombie',name:'PRIMORDIAL',hp:180},
  {id:'10',x:-12,z:34,entity:'simpleenemymod:ruunit',name:'ECHO-7',hp:75},
  {id:'11',x:-4,z:34,entity:'infectious:radioactive_zombie',name:'REACTOR SAINT',hp:220},
  {id:'12',x:4,z:34,entity:'apocalypse_zombies:tank',name:'Siege Tank',hp:90,ready:true},
  {id:'13',x:12,z:34,entity:'infectious:ancient_zombie_boss',name:'Ancient Abomination',hp:120,ready:true},
  {id:'14',x:20,z:34,entity:'simpleenemymod:ruunit',name:'FIRST VOICE // RELAY SHEPHERD',hp:180}
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
  if(boss.tags.contains('dz_boss_durability_v1'))return
  let multiplier=PDZ_MECH_PARTY_HEALTH[Math.min(PDZ_MECH_PARTY_HEALTH.length,profile.party)-1]
  try{
    boss.removeAttribute('minecraft:generic.max_health',PDZ_MECH_PARTY_HEALTH_MODIFIER)
    if(multiplier>1)boss.modifyAttribute('minecraft:generic.max_health',PDZ_MECH_PARTY_HEALTH_MODIFIER,multiplier-1,'multiply_total')
  }catch(err){console.warn('[PROJECT DEADZONE][Boss] Party health modifier failed: '+err)}
  boss.health=boss.maxHealth
  boss.addTag('dz_boss_durability_v1')
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

function pdzMechEquipBossGun(boss,id){
  if(!boss||!boss.tags||boss.tags.contains('dz_boss_weapon_applied'))return
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
    boss.runCommandSilent('execute at @s rotated as @s run tp @e[tag='+owner+',tag=dz_brass_backpack_left,sort=nearest,limit=1,distance=..16] ^-0.34 ^1.15 ^-0.38 ~ ~')
    boss.runCommandSilent('execute at @s rotated as @s run tp @e[tag='+owner+',tag=dz_brass_backpack_right,sort=nearest,limit=1,distance=..16] ^0.34 ^1.15 ^-0.38 ~ ~')
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
  let owner='dz_boss_owner_'+pdzMechOwnerKey(boss)
  let packVisual='{block_state:{Name:"create:brass_casing"},Glowing:1b,brightness:{sky:15,block:9},view_range:1.0f,transformation:{translation:[-0.16f,-0.28f,-0.16f],scale:[0.32f,0.56f,0.32f]}'
  boss.runCommandSilent('execute at @s rotated as @s run summon minecraft:block_display ^-0.34 ^1.15 ^-0.38 '+packVisual+',Tags:["'+PDZ_MECH_RUNTIME+'","dz_brass_backpack_left","'+owner+'"]}')
  boss.runCommandSilent('execute at @s rotated as @s run summon minecraft:block_display ^0.34 ^1.15 ^-0.38 '+packVisual+',Tags:["'+PDZ_MECH_RUNTIME+'","dz_brass_backpack_right","'+owner+'"]}')
  let offsets=['^-4 ^0.2 ^2','^4 ^0.2 ^2']
  for(let i=0;i<2;i++){
    let key='dz_brass_cell_'+(i+1)
    let tags='["'+PDZ_MECH_RUNTIME+'","'+PDZ_MECH_COMPONENT+'","dz_brass_ammo_cell","'+key+'","'+owner+'"]'
    let visualTags='["'+PDZ_MECH_RUNTIME+'","dz_brass_cell_visual","'+key+'_visual","'+owner+'"]'
    boss.runCommandSilent('execute at @s rotated as @s run summon minecraft:slime '+offsets[i]+' {Size:1,Invisible:1b,Glowing:1b,NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Health:36.0f,Attributes:[{Name:"minecraft:generic.max_health",Base:36.0d}],CustomName:\'{"text":"弾薬供給セル '+(i+1)+'","color":"gold","bold":true}\',CustomNameVisible:1b,Tags:'+tags+'}')
    boss.runCommandSilent('execute at @s rotated as @s run summon minecraft:block_display '+offsets[i]+' {block_state:{Name:"create:brass_casing"},Glowing:1b,brightness:{sky:15,block:10},view_range:1.0f,transformation:{translation:[-0.45f,-0.45f,-0.45f],scale:[0.9f,0.9f,0.9f]},Tags:'+visualTags+'}')
  }
  let count=boss.runCommandSilent('execute if entity @e[tag=dz_brass_ammo_cell,distance=..16,limit=1]')
  if(count<=0){
    boss.addTag('dz_brass_cells_destroyed')
    boss.runCommandSilent('effect give @s minecraft:weakness 12 0 true')
    pdzMechTell(boss,'弾薬セル生成失敗。防護を解除して戦闘を続行します。','yellow')
  }else{
    boss.runCommandSilent('effect give @s minecraft:resistance 9999 0 true')
    pdzMechTell(boss,'BRASS HOUND起動。左右の弾薬供給セルを破壊せよ！','gold')
  }
}

function pdzGunshopLiveCells(boss){
  let owner='dz_boss_owner_'+pdzMechOwnerKey(boss),count=0
  let nearby=boss.level.getEntities(boss,boss.boundingBox.inflate(32))
  nearby.forEach(entity=>{if(entity.alive&&entity.tags&&entity.tags.contains(owner)&&entity.tags.contains('dz_brass_ammo_cell'))count++})
  return count
}

function pdzGunshopCellDestroyed(cell){
  let owner=''
  cell.tags.forEach(tag=>{let s=String(tag);if(s.indexOf('dz_boss_owner_')===0)owner=s})
  if(!owner)return
  cell.runCommandSilent('kill @e[tag='+owner+',tag=dz_brass_cell_visual,distance=..8,sort=nearest,limit=1]')
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

function pdzMechNearestPlayer(boss,radius){
  let nearest=null,best=radius*radius
  boss.server.players.forEach(player=>{
    if(player.spectator||player.creative||String(player.level.dimension)!==String(boss.level.dimension))return
    let dx=player.x-boss.x,dy=player.y-boss.y,dz=player.z-boss.z,d=dx*dx+dy*dy+dz*dz
    if(d<best){best=d;nearest=player}
  })
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
  })
  return true
}

function pdzMechTell(boss,text,color){
  boss.runCommandSilent('tellraw @a[distance=..64,gamemode=!spectator] {"text":"[BOSS] '+text+'","color":"'+color+'","bold":true}')
}

function pdzMechSpawnChoirHitboxes(boss){
  if(boss.tags.contains('dz_choir_hitboxes_spawned'))return
  boss.addTag('dz_choir_hitboxes_spawned')
  let parts=[
    {key:'head',label:'頭部',size:4,x:0,y:8.2,m:1.35},
    {key:'arm_left',label:'左腕',size:3,x:-2.25,y:5.2,m:0.9},
    {key:'arm_right',label:'右腕',size:3,x:2.25,y:5.2,m:0.9},
    {key:'leg_left',label:'左脚',size:3,x:-0.85,y:2.0,m:0.9},
    {key:'leg_right',label:'右脚',size:3,x:0.85,y:2.0,m:0.9}
  ]
  let testTag=boss.tags.contains(PDZ_MECH_LOADTEST)?',"dz_boss_loadtest_runtime"':''
  parts.forEach(part=>{
    let nbt='{Size:'+part.size+',Invisible:1b,NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b,Health:2048.0f,Attributes:[{Name:"minecraft:generic.max_health",Base:2048.0d}],CustomName:\'{"text":"CHOIR '+part.label+'判定","color":"dark_purple"}\',Tags:["'+PDZ_MECH_RUNTIME+'","'+PDZ_CHOIR_HITBOX+'","dz_choir_part_'+part.key+'","dz_choir_multiplier_'+String(part.m).replace('.','_')+'"'+testTag+']}'
    boss.runCommandSilent('execute at @s rotated as @s run summon minecraft:slime ^'+part.x+' ^'+part.y+' ^0 '+nbt)
  })
  let count=boss.runCommandSilent('execute if entity @e[tag='+PDZ_CHOIR_HITBOX+',distance=..16,limit=1]')
  if(count<=0){boss.addTag('dz_choir_hitboxes_failed');pdzMechTell(boss,'全身判定の生成に失敗。胴体判定のまま続行します。','yellow')}
  else pdzMechTell(boss,'頭部・両腕・両脚へ攻撃判定が接続された。頭部は1.35倍。','light_purple')
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
    boss.server.scheduleInTicks(30,()=>{if(ref&&ref.alive){ref.runCommandSilent('particle minecraft:sonic_boom ~ ~4 ~ 0 0 0 0 1 force @a[distance=..64]');ref.runCommandSilent('damage @a[distance=..10,gamemode=!creative,gamemode=!spectator] 3 minecraft:magic');ref.runCommandSilent('effect give @a[distance=..10,gamemode=!creative,gamemode=!spectator] minecraft:darkness 3 0 true')}})
    pdzMechPulseCount++
  }else if(id==='04'&&(forced||time%9===0)){
    if(pdzMechTargetedBlast(boss,'焼夷弾着弾予告','red','minecraft:dust 1 0.15 0.02 1.2',3.5,4,30))pdzMechPulseCount++
  }else if(id==='05'){
    let ratio=Number(boss.health)/Math.max(1,Number(boss.maxHealth))
    if(ratio<=0.66&&!boss.tags.contains('dz_gas_scout_phase_2')){
      boss.addTag('dz_gas_scout_phase_2')
      boss.runCommandSilent('effect give @s minecraft:resistance 8 1 true')
      boss.runCommandSilent('summon minecraft:pillager ~3 ~ ~3 {PersistenceRequired:1b,HandItems:[{id:"minecraft:crossbow",Count:1b},{}],HandDropChances:[0.0f,0.0f],Tags:["dz_boss_runtime_05","dz_pdz_boss_minion","dz_raider","dz_hostile"]}')
      boss.runCommandSilent('summon minecraft:pillager ~-3 ~ ~-3 {PersistenceRequired:1b,HandItems:[{id:"minecraft:crossbow",Count:1b},{}],HandDropChances:[0.0f,0.0f],Tags:["dz_boss_runtime_05","dz_pdz_boss_minion","dz_raider","dz_hostile"]}')
      boss.runCommandSilent('playsound minecraft:item.crossbow.loading_end hostile @a[distance=..64] ~ ~ ~ 1.2 0.75')
      pdzMechTell(boss,'増援信号。護衛射手が展開した！','red');pdzMechPulseCount++
    }
    if(ratio<=0.33&&!boss.tags.contains('dz_gas_scout_phase_3')){
      boss.addTag('dz_gas_scout_phase_3')
      boss.runCommandSilent('effect give @s minecraft:regeneration 10 1 true')
      boss.runCommandSilent('effect give @s minecraft:speed 9999 1 true')
      boss.runCommandSilent('effect give @s minecraft:resistance 9999 0 true')
      pdzMechTell(boss,'最終退避機動。回復を止めて追い詰めろ！','dark_red');pdzMechPulseCount++
    }
    if(forced||time%8===0){
      boss.runCommandSilent('effect give @s minecraft:speed 4 2 true')
      boss.runCommandSilent('effect give @s minecraft:invisibility 2 0 true')
      boss.runCommandSilent('effect give @p[distance=..24,gamemode=!spectator] minecraft:glowing 5 0 true')
      boss.runCommandSilent('particle minecraft:campfire_cosy_smoke ~ ~1 ~ 1.8 0.8 1.8 0.03 45 force @a[distance=..64]')
      boss.runCommandSilent('effect give @a[distance=..8,gamemode=!creative,gamemode=!spectator] minecraft:blindness 2 0 true')
      pdzMechTell(boss,'煙幕標定。発光した対象へ高速接近。','yellow');pdzMechPulseCount++
    }
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
    if(target){target.runCommandSilent('effect give @s minecraft:glowing 4 0 true');target.runCommandSilent('title @s actionbar {"text":"ECHO-7 狙撃標定：遮蔽へ移動","color":"red","bold":true}');pdzMechTell(boss,'長距離狙撃を標定。2.5秒以内に視線を切れ！','dark_purple');boss.server.scheduleInTicks(50,()=>{if(!ref||!ref.alive||!target||!target.alive)return;if(!ref.hasLineOfSight(target)){pdzMechTell(ref,'狙撃失敗。標的が遮蔽へ退避。','aqua');return}ref.runCommandSilent('damage '+String(target.username)+' 6 minecraft:arrow by @s');ref.runCommandSilent('playsound minecraft:entity.firework_rocket.blast hostile @a[distance=..64] ~ ~ ~ 1 0.5')});pdzMechPulseCount++}
  }else if(id==='11'&&(forced||time%8===0)){
    boss.runCommandSilent('particle minecraft:dust 0.2 1 0.1 1.5 ~ ~1 ~ 3 1 3 0 60 force @a[distance=..64]')
    pdzMechTell(boss,'臨界放射環を予告。2秒以内に5m内か16m外へ！','green')
    let ref=boss
    boss.server.scheduleInTicks(40,()=>{if(ref&&ref.alive){ref.runCommandSilent('damage @a[distance=5..16,gamemode=!creative,gamemode=!spectator] 4 minecraft:magic');ref.runCommandSilent('effect give @a[distance=5..16,gamemode=!creative,gamemode=!spectator] minecraft:hunger 5 1 true')}})
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

// Five attached CHOIR parts need responsive tracking; all expensive mechanics
// remain on the one-second pulse below.
ServerEvents.tick(event=>{
  pdzMechClock++
  let server=event.server
  if(pdzMechClock%5===0)pdzMechTrackedBosses.forEach(boss=>pdzMechRestrictTarget(boss))
  if(pdzMechClock%2===0){
    let parts=[['head',0,8.2],['arm_left',-2.25,5.2],['arm_right',2.25,5.2],['leg_left',-0.85,2],['leg_right',0.85,2]]
    parts.forEach(part=>server.runCommandSilent('execute as @e[tag=dz_boss_mech_03,tag=!dz_boss_showroom] at @s rotated as @s run tp @e[tag=dz_choir_part_'+part[0]+',distance=..16,sort=nearest,limit=1] ^'+part[1]+' ^'+part[2]+' ^0 ~ ~'))
  }
  if(pdzMechClock%60===0)server.runCommandSilent('execute as @e[tag='+PDZ_CHOIR_HITBOX+'] at @s unless entity @e[tag=dz_boss_mech_03,distance=..32,limit=1] run kill @s')
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
    // v1 used a vanilla pillager which could not operate the assigned TaCZ
    // weapon. Remove only that saved legacy story boss; the site trigger will
    // replace it with the Brutal Bosses soldier while preserving progression.
    if(id==='05'&&String(entity.type)==='minecraft:pillager'&&!entity.tags.contains('dz_gas_scout_brutal_v1')){
      console.info('[PROJECT DEADZONE][Boss 05] Retiring legacy pillager '+uuid)
      entity.discard()
      return
    }
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
    let p=ctx.source.player,nearest=null,best=128*128
    p.level.entities.forEach(entity=>{
      let id=pdzMechEncounterId(entity)
      if(!id||!entity.alive)return
      let dx=entity.x-p.x,dy=entity.y-p.y,dz=entity.z-p.z,d=dx*dx+dy*dy+dz*dz
      if(d<best){best=d;nearest=entity}
    })
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
