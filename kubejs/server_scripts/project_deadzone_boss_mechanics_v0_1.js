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

const PDZ_MECH_DEFS = [
  {id:'02',tag:'dz_story_boss_argus_fragment',name:'適応障壁'},
  {id:'03',tag:'dz_story_boss_choir_vessel',name:'共鳴衝撃波＋全身判定'},
  {id:'04',tag:'dz_story_boss_firestation',name:'焼夷制圧'},
  {id:'05',tag:'dz_story_boss_gasstation',name:'偵察機動'},
  {id:'06',tag:'dz_story_boss_gunshop',name:'制圧射撃'},
  {id:'07',tag:'dz_story_boss_hospital',name:'戦場治療'},
  {id:'08',tag:'dz_story_boss_policestation',name:'拘束命令'},
  {id:'09',tag:'dz_story_boss_primordial',name:'段階変異'},
  {id:'10',tag:'dz_story_boss_radio_tower',name:'通信妨害'},
  {id:'11',tag:'dz_story_boss_reactor_saint',name:'臨界放射環'},
  {id:'12',tag:'dz_sideboss_tank',name:'予告式グラウンドスラム'},
  {id:'13',tag:'dz_sideboss_abomination',name:'再生胞子'}
]

// Boss-only silhouettes. Ordinary bandits already use AK/M4/SMG/Deagle/
// double-barrel weapons, so named humanoid bosses deliberately avoid that pool.
const PDZ_MECH_BOSS_GUNS = {
  '01':{gun:'tacz:minigun',mode:'AUTO',ammo:100},
  '04':{gun:'tacz:fn_evolys',mode:'AUTO',ammo:100},
  '05':{gun:'elitex:mcs_spear',mode:'AUTO',ammo:30},
  '06':{gun:'elitex:m249x',mode:'AUTO',ammo:100},
  '07':{gun:'elitex:fh_scar18',mode:'AUTO',ammo:30},
  '08':{gun:'tacz:scar_h',mode:'AUTO',ammo:20}
}

const PDZ_MECH_TEST_ENTRIES = [
  {id:'02',x:-12,z:16,entity:'infectious:mecha_zombie',name:'ARGUS Fragment',hp:240},
  {id:'03',x:-4,z:16,entity:'infectious:giant_zombie',name:'CHOIR VESSEL',hp:280},
  {id:'04',x:4,z:16,entity:'tacz_bandits:bandit',name:'Raider Ash Captain',hp:55},
  {id:'05',x:12,z:16,entity:'tacz_bandits:bandit',name:'Fuel Route Scout',hp:36},
  {id:'06',x:-12,z:25,entity:'tacz_bandits:bandit',name:'Gun Shop Enforcer',hp:55},
  {id:'07',x:-4,z:25,entity:'tacz_bandits:bandit',name:'Corrupt Field Medic',hp:70},
  {id:'08',x:4,z:25,entity:'tacz_bandits:bandit',name:'Raider Warden',hp:80},
  {id:'09',x:12,z:25,entity:'infectious:mutant_zombie',name:'原初感染体',hp:180},
  {id:'10',x:-12,z:34,entity:'simpleenemymod:ruunit',name:'Remnant Signal Hunter',hp:75},
  {id:'11',x:-4,z:34,entity:'infectious:radioactive_zombie',name:'REACTOR SAINT',hp:220},
  {id:'12',x:4,z:34,entity:'apocalypse_zombies:tank',name:'Siege Tank',hp:90,ready:true},
  {id:'13',x:12,z:34,entity:'infectious:ancient_zombie_boss',name:'Ancient Abomination',hp:120,ready:true}
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
  return id.indexOf('mca:')===0||id.indexOf('recruits:')===0||id.indexOf('village_recruits:')===0||id.indexOf('workers:')===0
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
  if(boss.tags.contains(PDZ_MECH_ACTIVE))return
  boss.addTag(PDZ_MECH_ACTIVE)
  boss.addTag('dz_boss_mech_'+id)
  boss.persistentData.putInt('dz_boss_mech_time',0)
  boss.persistentData.putString('dz_boss_mech_id',id)
  if(id==='03')pdzMechSpawnChoirHitboxes(boss)
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
    pdzMechTell(boss,'第一変異。感染胞子体を分離した。','dark_purple')
  }
  if(ratio<=0.33&&!boss.tags.contains('dz_primordial_mutation_2')){
    boss.addTag('dz_primordial_mutation_2')
    boss.runCommandSilent('effect give @s minecraft:strength 9999 0 true')
    boss.runCommandSilent('effect give @s minecraft:speed 9999 0 true')
    pdzMechTell(boss,'最終変異。攻撃性と機動力が上昇した。','red')
  }
}

function pdzMechPulse(boss,id){
  let time=boss.persistentData.getInt('dz_boss_mech_time')+1
  boss.persistentData.putInt('dz_boss_mech_time',time)
  if(id==='02'&&time%14===1){
    boss.runCommandSilent('effect give @s minecraft:resistance 5 2 true')
    boss.runCommandSilent('particle minecraft:electric_spark ~ ~2 ~ 1.2 1.8 1.2 0.08 28 force @a[distance=..64]')
    pdzMechTell(boss,'適応障壁を5秒展開。発光が消えるまで防御上昇。','gold');pdzMechPulseCount++
  }else if(id==='03'&&time%11===0){
    boss.runCommandSilent('particle minecraft:sonic_boom ~ ~4 ~ 0 0 0 0 1 force @a[distance=..64]')
    boss.runCommandSilent('damage @a[distance=..10,gamemode=!creative,gamemode=!spectator] 3 minecraft:magic')
    boss.runCommandSilent('effect give @a[distance=..10,gamemode=!creative,gamemode=!spectator] minecraft:darkness 3 0 true')
    pdzMechTell(boss,'共鳴衝撃波。距離を取れ！','dark_purple');pdzMechPulseCount++
  }else if(id==='04'&&time%9===0){
    boss.runCommandSilent('particle minecraft:flame ~ ~1 ~ 2 0.5 2 0.06 45 force @a[distance=..64]')
    boss.runCommandSilent('damage @a[distance=..7,gamemode=!creative,gamemode=!spectator] 4 minecraft:on_fire')
    boss.runCommandSilent('effect give @a[distance=..7,gamemode=!creative,gamemode=!spectator] minecraft:weakness 4 0 true')
    pdzMechTell(boss,'焼夷制圧。炎上範囲から離脱！','red');pdzMechPulseCount++
  }else if(id==='05'&&time%8===0){
    boss.runCommandSilent('effect give @s minecraft:speed 4 2 true')
    boss.runCommandSilent('effect give @s minecraft:invisibility 2 0 true')
    boss.runCommandSilent('effect give @p[distance=..24,gamemode=!spectator] minecraft:glowing 5 0 true')
    pdzMechTell(boss,'偵察標定。発光した対象へ高速接近。','yellow');pdzMechPulseCount++
  }else if(id==='06'&&time%10===0){
    boss.runCommandSilent('effect give @a[distance=..18,gamemode=!creative,gamemode=!spectator] minecraft:slowness 4 1 true')
    boss.runCommandSilent('effect give @a[distance=..18,gamemode=!creative,gamemode=!spectator] minecraft:weakness 4 0 true')
    boss.runCommandSilent('playsound minecraft:block.dispenser.launch hostile @a[distance=..64] ~ ~ ~ 1 0.65')
    pdzMechTell(boss,'制圧射撃。移動・近接火力低下。','dark_red');pdzMechPulseCount++
  }else if(id==='07'&&time%12===0){
    boss.health=Math.min(Number(boss.maxHealth),Number(boss.health)+10)
    boss.runCommandSilent('effect give @e[distance=..12,tag=dz_raider] minecraft:regeneration 5 1 true')
    boss.runCommandSilent('particle minecraft:happy_villager ~ ~1.4 ~ 1 1 1 0.1 30 force @a[distance=..64]')
    pdzMechTell(boss,'戦場治療。自身と周辺部隊を回復。','green');pdzMechPulseCount++
  }else if(id==='08'&&time%11===0){
    boss.runCommandSilent('effect give @p[distance=..16,gamemode=!creative,gamemode=!spectator] minecraft:slowness 4 3 true')
    boss.runCommandSilent('effect give @p[distance=..16,gamemode=!creative,gamemode=!spectator] minecraft:weakness 4 1 true')
    boss.runCommandSilent('effect give @p[distance=..16,gamemode=!creative,gamemode=!spectator] minecraft:glowing 5 0 true')
    pdzMechTell(boss,'拘束命令。最寄りの生存者を制圧。','blue');pdzMechPulseCount++
  }else if(id==='09'){
    pdzMechPhaseMutation(boss)
  }else if(id==='10'&&time%12===0){
    boss.runCommandSilent('effect give @a[distance=..18,gamemode=!creative,gamemode=!spectator] minecraft:darkness 3 0 true')
    boss.runCommandSilent('effect give @a[distance=..18,gamemode=!creative,gamemode=!spectator] minecraft:glowing 6 0 true')
    boss.runCommandSilent('playsound minecraft:block.respawn_anchor.deplete hostile @a[distance=..64] ~ ~ ~ 0.8 0.55')
    pdzMechTell(boss,'通信妨害。視界喪失・位置暴露。','dark_purple');pdzMechPulseCount++
  }else if(id==='11'&&time%8===0){
    boss.runCommandSilent('particle minecraft:dust 0.2 1 0.1 1.5 ~ ~1 ~ 3 1 3 0 60 force @a[distance=..64]')
    boss.runCommandSilent('damage @a[distance=5..16,gamemode=!creative,gamemode=!spectator] 4 minecraft:magic')
    boss.runCommandSilent('effect give @a[distance=5..16,gamemode=!creative,gamemode=!spectator] minecraft:hunger 5 1 true')
    pdzMechTell(boss,'臨界放射環。懐へ入るか16m外へ退避！','green');pdzMechPulseCount++
  }else if(id==='12'&&time%10===0){
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
  }else if(id==='13'&&time%9===0){
    boss.health=Math.min(Number(boss.maxHealth),Number(boss.health)+4)
    let testTag=boss.tags.contains(PDZ_MECH_LOADTEST)?',"dz_boss_loadtest_runtime"':''
    boss.runCommandSilent('summon minecraft:area_effect_cloud ~ ~ ~ {Duration:120,Radius:3.5f,RadiusPerTick:-0.02f,Particle:"spore_blossom_air",Effects:[{Id:19,Amplifier:0b,Duration:60}],Tags:["'+PDZ_MECH_RUNTIME+'","dz_boss_runtime_13"'+testTag+']}')
    pdzMechTell(boss,'再生胞子を放出。汚染域から離れろ！','dark_green');pdzMechPulseCount++
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
  if(amount>=Number(boss.health)){
    // Preserve the real attacker for kill credit on the lethal transferred hit.
    try{boss.hurt(event.source,100000)}catch(ignored){try{boss.attack(100000)}catch(ignored2){boss.health=0}}
  }else boss.health=Math.max(0,Number(boss.health)-amount)
  hitbox.health=2048
})

EntityEvents.death(event=>{
  let boss=event.entity
  if(!boss||boss.level.clientSide)return
  if(boss.tags.contains('dz_boss_mech_03'))boss.runCommandSilent('kill @e[tag='+PDZ_CHOIR_HITBOX+',distance=..24]')
  if(boss.tags.contains('dz_boss_mech_09'))boss.runCommandSilent('kill @e[tag=dz_boss_runtime_09,distance=..40]')
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
    if(entity.tags&&entity.tags.contains('dz_boss_axel')&&!entity.tags.contains('dz_boss_showroom')){
      pdzMechEnsureHome(entity)
      pdzMechEquipBossGun(entity,'01')
      tracked.push(entity)
    }
    if(!id||!entity.alive)return
    pdzMechInit(entity,id)
    pdzMechPulse(entity,id)
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
    p.tell(Text.of('見た目確認用ボス[02]～[13]を停止状態で配置しました。移動・攻撃・ギミックは無効です。').aqua())
    return 1
  }))
  root.then(Commands.literal('combat').executes(ctx=>{
    let p=ctx.source.player
    pdzMechSpawnTestSet(p,false)
    p.tell(Text.of('マルチ負荷テスト用ボス[02]～[13]を戦闘状態で配置しました。プレイヤー／村人系だけを狙います。').red())
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
  root.then(Commands.literal('cleanup').executes(ctx=>{
    let count=pdzMechTestCleanup(ctx.source.player)
    ctx.source.player.tell(Text.of('160m以内の負荷テスト個体・一時判定を撤去しました: '+count).yellow())
    return 1
  }))
  event.register(root)
})
