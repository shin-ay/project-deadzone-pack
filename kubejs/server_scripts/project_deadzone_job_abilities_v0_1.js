// PROJECT DEADZONE JOB Abilities v0.1
// Rank-2 careers change play style; numeric attributes stay in growth_effects.

function dzcaT2(p,id) {
  return p && String(p.persistentData.getString('dz_career_t2'))===id
}
function dzcaT3(p,id) {
  return p && String(p.persistentData.getString('dz_career_t3'))===id
}
function dzcaCooldown(p,key,ticks) {
  let now=p.age,tag='dz_career_ability_cd_'+key,last=p.persistentData.getInt(tag)
  if (now-last<ticks) return false
  p.persistentData.putInt(tag,now)
  return true
}
function dzcaIndustrial(id) {
  return id.startsWith('create:')||id.startsWith('immersiveengineering:')||id.startsWith('mekanism:')
}
function dzcaVehicle(id) {
  return id.startsWith('mts:')||id.startsWith('vehicle:')||id.startsWith('blocky_bikes:')||id.startsWith('immersivevehicles:')
}
function dzcaAmmo(id) {
  return id.indexOf('ammo')>=0||id.indexOf('bullet')>=0||id.indexOf('shell')>=0||id.indexOf('cartridge')>=0
}
function dzcaAnimal(entity) {
  if (!entity) return false
  let id=String(entity.type).toLowerCase()
  return ['cow','pig','sheep','chicken','rabbit','deer','boar','bear','moose','goat','horse','turkey','duck'].some(x=>id.indexOf(x)>=0)
}

const PDZCA_T2_DESC = {
  scavenger:'戦利品回収時に追加素材を発見 / Salvage Scanner', adapter:'低HP時に自己回復 / Adaptive Survival Rig',
  marksman:'Headshot後に短時間の照準安定化 / Ballistic Rangefinder', assault:'射撃撃破で突撃バフ / Assault Injector',
  surgeon:'医療品使用時に追加再生 / Portable Trauma Station', combat_medic:'周囲の味方へ定期回復 / Responder Beacon',
  ground_tech:'車両部品を確率回収 / Vehicle Diagnostic Tool', pilot:'落下制御 / Portable Flight Computer',
  automation:'工業部品を確率回収 / Automation Control Tablet', gunsmith:'弾薬部品を確率回収 / Calibration Gauge',
  recon:'周囲の敵を索敵表示 / Recon Threat Sensor', infiltrator:'しゃがみ中に短時間隠密 / Signal Jammer',
  guardian:'瀕死時に防御上昇 / Barrier Projector', enforcer:'撃破時に近接戦闘強化 / Breaching Actuator',
  provider:'食事効果を強化 / Compact Field Cooker', ranger:'狩猟時に追加素材 / Tracking Module'
}

const PDZCA_T3_DESC = {
  quartermaster:'敵物資の回収量上昇', prospector:'鉱石採掘時に副産物', expeditionist:'長距離移動で吸収HP', wasteland_veteran:'瀕死時に緊急再生と耐性',
  sniper:'Headshot撃破でGhost Focus', overwatch:'射撃撃破時に周囲の味方を支援', gunner:'連続射撃撃破で制圧耐性', breacher:'射撃撃破で突破用近接バフ',
  trauma_specialist:'医療品の再生効果を大幅強化', lifesaver:'広範囲の味方を定期回復', bio_support:'毒を自動除去', rescue_operator:'周囲の味方へ移動支援',
  convoy_master:'車両部品回収率上昇', armor_mechanic:'車両・装甲部品回収率上昇', ace_pilot:'常時落下制御', crew_chief:'車両・航空部品回収率上昇',
  systems_engineer:'工業部品回収率上昇', industrial_architect:'工業・要塞レシピと部品回収', weapon_engineer:'弾薬部品回収と上位武器レシピ', ordnance_specialist:'弾薬・爆発物部品回収',
  pathfinder:'長距離移動で加速', spotter:'広範囲の敵を索敵表示', ghost:'しゃがみ中に高速隠密', saboteur:'撃破後に短時間隠密',
  bulwark:'瀕死時に強力な耐性', sentinel:'周囲の味方へ防御Aura', juggernaut:'撃破時に強力な攻撃バフ', riot_leader:'周囲の味方へ攻撃Aura',
  angler:'食事後のLuckと釣り性能', chef:'食事で再生と吸収HP', hunter:'狩猟素材と戦闘性能', homesteader:'収穫時に栽培副産物'
}

TimelessGunEvents.entityKillByGun(event=>{
  let p=event.attacker
  if (!p || !p.isPlayer || !p.isPlayer() || p.level.clientSide) return
  if (dzcaT2(p,'marksman') && event.headShot) {
    p.potionEffects.add('minecraft:speed',100,0,false,false)
    p.potionEffects.add('minecraft:luck',160,0,false,false)
  }
  if (dzcaT2(p,'assault')) {
    p.potionEffects.add('minecraft:speed',80,0,false,false)
    p.potionEffects.add('minecraft:resistance',60,0,false,false)
  }
  if (dzcaT3(p,'sniper') && event.headShot) {
    p.potionEffects.add('minecraft:speed',140,1,false,false)
    p.potionEffects.add('minecraft:luck',240,1,false,false)
    p.tell(Text.of('[JOB] Ghost Focus').aqua())
  }
  if (dzcaT3(p,'overwatch')) {
    p.server.runCommandSilent('execute at '+p.username+' run effect give @a[distance=0.1..10] minecraft:speed 6 0 true')
    p.server.runCommandSilent('execute at '+p.username+' run effect give @a[distance=0.1..10] minecraft:resistance 6 0 true')
  }
  if (dzcaT3(p,'gunner')) {
    p.potionEffects.add('minecraft:resistance',100,1,false,false)
    p.potionEffects.add('minecraft:absorption',160,0,false,false)
  }
  if (dzcaT3(p,'breacher')) {
    p.potionEffects.add('minecraft:speed',100,1,false,false)
    p.potionEffects.add('minecraft:strength',100,1,false,false)
  }
})

// Scavenger and Ranger reward their own farming loops without multiplying
// every loot table in the pack.
EntityEvents.death(event=>{
  let p=event.source?event.source.actual:null
  if (!p||!p.isPlayer||!p.isPlayer()||p.level.clientSide) return
  let target=event.entity
  if (dzcaT2(p,'scavenger')&&target&&target.isMonster&&target.isMonster()&&Math.random()<0.12) {
    p.give(Item.of(Math.random()<0.55?'minecraft:iron_nugget':'minecraft:string',1))
  }
  if (dzcaT2(p,'ranger')&&dzcaAnimal(target)&&Math.random()<0.25) {
    p.give(Item.of(Math.random()<0.65?'minecraft:leather':'minecraft:bone',1))
  }
  if (dzcaT2(p,'enforcer')&&target&&target.isMonster&&target.isMonster()) {
    p.potionEffects.add('minecraft:strength',100,0,false,false)
  }
  if (dzcaT3(p,'quartermaster')&&target&&target.isMonster&&target.isMonster()&&Math.random()<0.18) {
    p.give(Item.of(Math.random()<0.6?'minecraft:iron_nugget':'minecraft:string',2))
  }
  if (dzcaT3(p,'juggernaut')&&target&&target.isMonster&&target.isMonster()) {
    p.potionEffects.add('minecraft:strength',140,1,false,false)
  }
  if (dzcaT3(p,'saboteur')&&target&&target.isMonster&&target.isMonster()) {
    p.potionEffects.add('minecraft:invisibility',80,0,false,false)
  }
  if (dzcaT3(p,'hunter')&&dzcaAnimal(target)&&Math.random()<0.50) {
    p.give(Item.of(Math.random()<0.7?'minecraft:leather':'minecraft:bone',2))
  }
})

// Industrial specialists occasionally recover one extra component. The copy
// is given directly and therefore does not recursively fire another craft.
ItemEvents.crafted(event=>{
  let p=event.player
  if (!p||p.level.clientSide) return
  let id=String(event.item.id),chance=0
  if (dzcaT2(p,'ground_tech')&&dzcaVehicle(id)) chance=0.15
  if (dzcaT2(p,'automation')&&dzcaIndustrial(id)) chance=Math.max(chance,0.10)
  if (dzcaT2(p,'gunsmith')&&dzcaAmmo(id)) chance=Math.max(chance,0.12)
  if (dzcaT3(p,'convoy_master')&&dzcaVehicle(id)) chance=Math.max(chance,0.25)
  if (dzcaT3(p,'armor_mechanic')&&dzcaVehicle(id)) chance=Math.max(chance,0.20)
  if (dzcaT3(p,'crew_chief')&&dzcaVehicle(id)) chance=Math.max(chance,0.25)
  if (dzcaT3(p,'systems_engineer')&&dzcaIndustrial(id)) chance=Math.max(chance,0.18)
  if (dzcaT3(p,'industrial_architect')&&dzcaIndustrial(id)) chance=Math.max(chance,0.15)
  if (dzcaT3(p,'weapon_engineer')&&dzcaAmmo(id)) chance=Math.max(chance,0.20)
  if (dzcaT3(p,'ordnance_specialist')&&(dzcaAmmo(id)||id.indexOf('explosive')>=0||id.indexOf('grenade')>=0)) chance=Math.max(chance,0.18)
  if (chance>0&&Math.random()<chance) {
    let bonus=event.item.copy();bonus.count=1;p.give(bonus)
    p.tell(Text.of('[JOB] Component Recovery +1').gold())
  }
})

ItemEvents.foodEaten(event=>{
  let p=event.entity
  if (!p||!p.isPlayer||!p.isPlayer()||p.level.clientSide) return
  let prepared=global.pdzIsPreparedMeal&&global.pdzIsPreparedMeal(event.item)
  if (dzcaT2(p,'provider')) p.potionEffects.add('minecraft:saturation',40,0,false,false)
  if (dzcaT3(p,'chef')&&prepared) {
    p.potionEffects.add('minecraft:regeneration',100,0,false,false)
    p.potionEffects.add('minecraft:absorption',600,0,false,false)
  }
  if (dzcaT3(p,'angler')&&global.pdzIsFishMeal&&global.pdzIsFishMeal(event.item)) p.potionEffects.add('minecraft:luck',1200,0,false,false)
})

ItemEvents.rightClicked(event=>{
  let p=event.player
  if (!p||p.level.clientSide) return
  let id=String(event.item.id).toLowerCase()
  let medical=id.indexOf('bandage')>=0||id.indexOf('medical')>=0||id.indexOf('medkit')>=0||id.indexOf('morphine')>=0||id.indexOf('syringe')>=0
  if (medical&&dzcaT2(p,'surgeon')&&dzcaCooldown(p,'surgeon',100)) {
    p.potionEffects.add('minecraft:regeneration',100,0,false,false)
  }
  if (medical&&dzcaT3(p,'trauma_specialist')&&dzcaCooldown(p,'trauma',100)) {
    p.potionEffects.add('minecraft:regeneration',160,1,false,false)
  }
})

PlayerEvents.tick(event=>{
  let p=event.player
  if (p.level.clientSide||p.age%20!==0) return
  if (dzcaT2(p,'infiltrator')&&p.isCrouching()) {
    p.potionEffects.add('minecraft:invisibility',30,0,false,false)
  }
  if (dzcaT2(p,'guardian')&&p.health<=p.maxHealth*0.35) {
    p.potionEffects.add('minecraft:resistance',30,0,false,false)
  }
  if (dzcaT3(p,'bulwark')&&p.health<=p.maxHealth*0.40) {
    p.potionEffects.add('minecraft:resistance',30,1,false,false)
  }
  if (dzcaT3(p,'wasteland_veteran')&&p.health<=p.maxHealth*0.30&&dzcaCooldown(p,'veteran',600)) {
    p.potionEffects.add('minecraft:regeneration',100,1,false,false)
    p.potionEffects.add('minecraft:resistance',100,0,false,false)
  }
  if (dzcaT2(p,'adapter')&&p.health<=p.maxHealth*0.50&&dzcaCooldown(p,'adapter',600)) {
    p.potionEffects.add('minecraft:regeneration',60,0,false,false)
  }
  if (dzcaT2(p,'pilot')&&p.fallDistance>5&&dzcaCooldown(p,'pilot_landing',200)) {
    p.potionEffects.add('minecraft:slow_falling',40,0,false,false)
  }
  if (dzcaT3(p,'ace_pilot')&&p.fallDistance>3) p.potionEffects.add('minecraft:slow_falling',40,0,false,false)
  if (dzcaT3(p,'ghost')&&p.isCrouching()) {
    p.potionEffects.add('minecraft:invisibility',30,0,false,false)
    p.potionEffects.add('minecraft:speed',30,0,false,false)
  }
  if (dzcaT3(p,'bio_support')&&p.age%40===0) {
    p.server.runCommandSilent('effect clear '+String(p.username)+' minecraft:poison')
  }
  if (p.age%200!==0) return
  let name=String(p.username)
  if (dzcaT3(p,'expeditionist')||dzcaT3(p,'pathfinder')) {
    let d=p.persistentData,x=Math.floor(p.x),z=Math.floor(p.z)
    let ox=d.getInt('dz_career_ability_travel_x'),oz=d.getInt('dz_career_ability_travel_z')
    let dx=x-ox,dz=z-oz
    d.putInt('dz_career_ability_travel_x',x);d.putInt('dz_career_ability_travel_z',z)
    if (ox!==0&&oz!==0&&dx*dx+dz*dz>=4096) {
      if (dzcaT3(p,'expeditionist')) p.potionEffects.add('minecraft:absorption',200,0,false,false)
      if (dzcaT3(p,'pathfinder')) p.potionEffects.add('minecraft:speed',200,1,false,false)
    }
  }
  if (dzcaT2(p,'combat_medic')) {
    p.server.runCommandSilent('execute at '+name+' run effect give @a[distance=0.1..6] minecraft:regeneration 2 0 true')
  }
  if (dzcaT3(p,'lifesaver')) {
    p.server.runCommandSilent('execute at '+name+' run effect give @a[distance=0.1..8] minecraft:regeneration 4 0 true')
  }
  if (dzcaT3(p,'rescue_operator')) {
    p.server.runCommandSilent('execute at '+name+' run effect give @a[distance=0.1..8] minecraft:speed 4 0 true')
  }
  if (dzcaT2(p,'recon')) {
    p.server.runCommandSilent('execute at '+name+' run effect give @e[type=#minecraft:hostile,distance=..12,sort=nearest,limit=6] minecraft:glowing 2 0 true')
  }
  if (dzcaT3(p,'spotter')) {
    p.server.runCommandSilent('execute at '+name+' run effect give @e[type=#minecraft:hostile,distance=..24,sort=nearest,limit=10] minecraft:glowing 3 0 true')
  }
  if (dzcaT3(p,'sentinel')) {
    p.server.runCommandSilent('execute at '+name+' run effect give @a[distance=0.1..6] minecraft:resistance 3 0 true')
  }
  if (dzcaT3(p,'riot_leader')) {
    p.server.runCommandSilent('execute at '+name+' run effect give @a[distance=0.1..6] minecraft:strength 3 0 true')
  }
})

BlockEvents.broken(event=>{
  let p=event.player
  if (!p||p.level.clientSide) return
  if (dzcaT3(p,'prospector')&&event.block.hasTag('forge:ores')&&Math.random()<0.20) {
    p.give(Item.of('minecraft:iron_nugget',2))
  }
  let id=String(event.block.id)
  if (dzcaT3(p,'homesteader')&&(id.indexOf('crop')>=0||id.indexOf('wheat')>=0||id.indexOf('carrot')>=0||id.indexOf('potato')>=0)&&Math.random()<0.25) {
    p.give(Item.of('minecraft:bone_meal',1))
  }
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonecareerability')
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player,t2=String(p.persistentData.getString('dz_career_t2')),t3=String(p.persistentData.getString('dz_career_t3'))
    p.tell(Text.of('=== JOB ABILITY ===').gold())
    p.tell(Text.of('T2 '+(t2||'-')+': '+(PDZCA_T2_DESC[t2]||'未選択')).aqua())
    p.tell(Text.of('T3 '+(t3||'-')+': '+(PDZCA_T3_DESC[t3]||'未選択')).lightPurple())
    return 1
  }))
  root.then(Commands.literal('pulse_test').requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player
    p.potionEffects.add('minecraft:regeneration',100,0,false,false)
    p.tell(Text.of('[JOB TEST] Ability event pipeline OK').green());return 1
  }))
  event.register(root)
})
