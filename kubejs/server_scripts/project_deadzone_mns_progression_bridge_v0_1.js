// PROJECT DEADZONE -> Mine and Slash progression bridge v0.1
// Owns permanent JOB attributes and Talent-derived M&S stats.
// Every stat uses a stable key, so refresh/login never stacks duplicates.

const PDZMNS_LOAD = Java.loadClass('com.robertx22.mine_and_slash.uncommon.datasaving.Load')
const PDZMNS_MOD_TYPE = Java.loadClass('com.robertx22.mine_and_slash.uncommon.enumclasses.ModType')

const PDZMNS_JOB_STATS = {
  survivor:{strength:4,dexterity:3,intelligence:3},
  weapons_expert:{strength:2,dexterity:7,intelligence:1},
  medic:{strength:2,dexterity:2,intelligence:6},
  mechanic:{strength:3,dexterity:3,intelligence:4},
  engineer:{strength:3,dexterity:2,intelligence:5},
  scout:{strength:1,dexterity:7,intelligence:2},
  security:{strength:7,dexterity:2,intelligence:1},
  survivalist:{strength:4,dexterity:4,intelligence:2},
  anomaly_researcher:{strength:1,dexterity:2,intelligence:7}
}

// value = M&S stat gained per weighted branch rank.
// PERCENT values deliberately start small; Notable/Keystone/Mastery weighting is
// already included by pdzMnsBranchRank(). Non-M&S mechanics remain in the old
// TaCZ/vehicle/medical bridges and are not duplicated here.
const PDZMNS_BRANCH_STATS = {
  weapons:{
    precision:[['accuracy',0.55,'PERCENT'],['critical_hit',0.22,'PERCENT'],['critical_damage',0.35,'PERCENT']],
    assault:[['weapon_damage',0.48,'PERCENT'],['energy_on_hit',0.10,'FLAT'],['physical_damage',0.30,'PERCENT']],
    handling:[['energy_regen',0.22,'PERCENT'],['dodge',0.18,'PERCENT']],
    ammo:[['increased_quantity',0.35,'PERCENT'],['currency_find',0.18,'PERCENT']]
  },
  security:{
    melee:[['physical_weapon_damage',0.52,'PERCENT'],['lifesteal',0.12,'PERCENT'],['bleed_chance',0.20,'PERCENT']],
    speed:[['energy',0.18,'FLAT'],['energy_regen',0.28,'PERCENT'],['dodge',0.22,'PERCENT']],
    guard:[['health',0.20,'FLAT'],['armor',0.55,'PERCENT'],['block_chance',0.18,'PERCENT'],['physical_resist',0.20,'PERCENT']],
    control:[['chance_of_slow',0.20,'PERCENT'],['knockback_resistance',0.35,'PERCENT']]
  },
  medic:{
    healing:[['increase_healing',0.62,'PERCENT'],['health_regen',0.24,'PERCENT']],
    revive:[['damage_reduction',0.22,'PERCENT'],['health',0.16,'FLAT']],
    aura:[['aura_effect',0.34,'PERCENT'],['mana_regen',0.18,'PERCENT']],
    stim:[['energy_regen',0.32,'PERCENT'],['move_speed',0.10,'PERCENT']]
  },
  engineer:{
    processing:[['stat_roll_quality',0.42,'PERCENT'],['currency_find',0.22,'PERCENT']],
    power:[['mana',0.18,'FLAT'],['mana_regen',0.25,'PERCENT'],['magic_shield',0.15,'FLAT']],
    automation:[['increased_quantity',0.32,'PERCENT'],['extra_mob_drops',0.16,'PERCENT']],
    gunsmith:[['weapon_damage',0.25,'PERCENT'],['stat_roll_quality',0.30,'PERCENT']]
  },
  mechanic:{
    repair:[['gear_defense',0.35,'PERCENT'],['stat_roll_quality',0.28,'PERCENT']],
    road:[['energy',0.15,'FLAT'],['dodge',0.16,'PERCENT']],
    aviation:[['dodge',0.22,'PERCENT'],['move_speed',0.08,'PERCENT']],
    marine:[['water_resist',0.28,'PERCENT'],['health',0.12,'FLAT']]
  },
  survivalist:{
    cooking:[['health_regen',0.26,'PERCENT'],['increase_healing',0.25,'PERCENT']],
    farming:[['harvest_extra_drops',0.40,'PERCENT'],['increased_quantity',0.20,'PERCENT']],
    fishing:[['treasure_quantity',0.42,'PERCENT'],['treasure_quality',0.30,'PERCENT']],
    hunting:[['extra_mob_drops',0.34,'PERCENT'],['accuracy',0.20,'PERCENT'],['bleed_chance',0.12,'PERCENT']]
  },
  survivor:{
    health:[['health',0.26,'FLAT'],['health_regen',0.18,'PERCENT']],
    hazard:[['fire_resist',0.24,'PERCENT'],['water_resist',0.24,'PERCENT'],['chaos_resist',0.18,'PERCENT']],
    carry:[['strength',0.055,'FLAT'],['armor',0.20,'PERCENT']],
    recovery:[['health_regen',0.32,'PERCENT'],['out_of_combat_regen',0.32,'PERCENT']]
  },
  scout:{
    stealth:[['dodge',0.30,'PERCENT'],['move_speed',0.10,'PERCENT']],
    scavenge:[['increased_quantity',0.42,'PERCENT'],['stat_roll_quality',0.28,'PERCENT']],
    mobility:[['energy',0.16,'FLAT'],['energy_regen',0.30,'PERCENT'],['move_speed',0.12,'PERCENT']],
    tracking:[['accuracy',0.32,'PERCENT'],['critical_hit',0.18,'PERCENT'],['rare_monster_chance',0.12,'PERCENT']]
  }
}

const PDZMNS_SECTORS = Object.keys(PDZMNS_BRANCH_STATS)
const PDZMNS_JOB_KEYS = ['strength','dexterity','intelligence']

function pdzMnsBranchRank(player,sector,branch){
  let count=0
  let prefix='pdz_talent_node_talent_'+sector+'_'+branch+'_'
  for(let i=1;i<=15;i++)if(player.tags.contains(prefix+i))count+=(i===4||i===8||i===13||i===15?1.5:1)
  ;[4,8].forEach(depth=>{
    if(player.tags.contains(prefix+'side'+depth+'_1'))count+=1
    if(player.tags.contains(prefix+'side'+depth+'_2'))count+=1.5
  })
  if(player.tags.contains(prefix+'keystone'))count+=3
  if(player.tags.contains(prefix+'master_power'))count+=6
  if(player.tags.contains(prefix+'master_utility'))count+=4
  for(let i=16;i<=20;i++){
    if(player.tags.contains(prefix+'power_'+i))count+=(i===18||i===20?1.5:1)
    if(player.tags.contains(prefix+'utility_'+i))count+=(i===18||i===20?0.75:0.5)
  }
  if(player.tags.contains(prefix+'doctrine_power'))count+=8
  if(player.tags.contains(prefix+'doctrine_utility'))count+=4
  return count
}

function pdzMnsValues(player){
  let values={}
  PDZMNS_SECTORS.forEach(sector=>Object.keys(PDZMNS_BRANCH_STATS[sector]).forEach(branch=>{
    let rank=pdzMnsBranchRank(player,sector,branch)
    PDZMNS_BRANCH_STATS[sector][branch].forEach(row=>{
      let key=row[0]+'|'+row[2]
      values[key]=(values[key]||0)+(rank*row[1])
    })
  }))
  return values
}

function pdzMnsAllTalentKeys(){
  let result={}
  PDZMNS_SECTORS.forEach(sector=>Object.keys(PDZMNS_BRANCH_STATS[sector]).forEach(branch=>{
    PDZMNS_BRANCH_STATS[sector][branch].forEach(row=>result[row[0]+'|'+row[2]]=true)
  }))
  return Object.keys(result)
}

const PDZMNS_TALENT_KEYS = pdzMnsAllTalentKeys()

function pdzMnsSignature(player){
  let parts=[String(player.persistentData.getString('dz_job_id'))]
  PDZMNS_SECTORS.forEach(sector=>Object.keys(PDZMNS_BRANCH_STATS[sector]).forEach(branch=>parts.push(pdzMnsBranchRank(player,sector,branch).toFixed(2))))
  return parts.join('|')
}

function pdzMnsModType(id){
  if(id==='FLAT')return PDZMNS_MOD_TYPE.FLAT
  if(id==='MORE')return PDZMNS_MOD_TYPE.MORE
  return PDZMNS_MOD_TYPE.PERCENT
}

function pdzMnsApply(player,force){
  if(!player||player.level.clientSide)return false
  let signature=pdzMnsSignature(player)
  if(!force&&String(player.persistentData.getString('dz_mns_signature'))===signature)return false
  try{
    let cap=PDZMNS_LOAD.Unit(player)
    let exact=cap.getCustomExactStats()

    PDZMNS_JOB_KEYS.forEach(stat=>exact.removeExactStat('pdz_job_'+stat))
    let job=String(player.persistentData.getString('dz_job_id'))
    let jobStats=PDZMNS_JOB_STATS[job]||PDZMNS_JOB_STATS.survivor
    PDZMNS_JOB_KEYS.forEach(stat=>exact.addExactStat('pdz_job_'+stat,stat,jobStats[stat],PDZMNS_MOD_TYPE.FLAT))

    PDZMNS_TALENT_KEYS.forEach(composite=>{
      let bits=composite.split('|')
      exact.removeExactStat('pdz_talent_'+bits[0]+'_'+bits[1].toLowerCase())
    })
    let values=pdzMnsValues(player)
    Object.keys(values).forEach(composite=>{
      let amount=values[composite]
      if(Math.abs(amount)<0.0001)return
      let bits=composite.split('|')
      exact.addExactStat('pdz_talent_'+bits[0]+'_'+bits[1].toLowerCase(),bits[0],amount,pdzMnsModType(bits[1]))
    })

    cap.setEquipsChanged()
    cap.setAllDirtyOnLoginEtc()
    cap.syncToClient(player)
    player.persistentData.putString('dz_mns_signature',signature)
    player.persistentData.putBoolean('dz_mns_bridge_ok',true)
    return true
  }catch(error){
    player.persistentData.putBoolean('dz_mns_bridge_ok',false)
    let previous=String(player.persistentData.getString('dz_mns_last_error'))
    let message=String(error)
    if(previous!==message){
      player.persistentData.putString('dz_mns_last_error',message)
      console.error('[PDZ M&S] progression bridge failed for '+player.name.string+': '+message)
    }
    return false
  }
}

function pdzMnsStatus(player){
  let job=String(player.persistentData.getString('dz_job_id'))
  let base=PDZMNS_JOB_STATS[job]||PDZMNS_JOB_STATS.survivor
  player.tell(Text.of('=== PROJECT DEADZONE / M&S連携 ===').gold())
  player.tell(Text.of('JOB '+job+'  STR '+base.strength+' / DEX '+base.dexterity+' / INT '+base.intelligence).aqua())
  player.tell(Text.of('Bridge: '+(player.persistentData.getBoolean('dz_mns_bridge_ok')?'OK':'ERROR')).color(player.persistentData.getBoolean('dz_mns_bridge_ok')?'green':'red'))
  let values=pdzMnsValues(player), shown=0
  Object.keys(values).sort().forEach(key=>{
    if(Math.abs(values[key])<0.01||shown>=12)return
    let bits=key.split('|')
    player.tell(Text.of(bits[0]+' +'+values[key].toFixed(2)+' '+bits[1]).gray())
    shown++
  })
  if(shown===0)player.tell(Text.of('取得済みTalent効果はまだありません。').yellow())
  if(!player.persistentData.getBoolean('dz_mns_bridge_ok'))player.tell(Text.of(String(player.persistentData.getString('dz_mns_last_error'))).red())
}

PlayerEvents.loggedIn(event=>event.server.scheduleInTicks(100,()=>pdzMnsApply(event.player,true)))
PlayerEvents.respawned(event=>event.server.scheduleInTicks(40,()=>pdzMnsApply(event.player,true)))
PlayerEvents.tick(event=>{if(event.player.age%200===0)pdzMnsApply(event.player,false)})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonemns')
  root.executes(ctx=>{pdzMnsApply(ctx.source.player,true);pdzMnsStatus(ctx.source.player);return 1})
  root.then(Commands.literal('status').executes(ctx=>{pdzMnsStatus(ctx.source.player);return 1}))
  root.then(Commands.literal('refresh').executes(ctx=>{
    let ok=pdzMnsApply(ctx.source.player,true)
    ctx.source.player.tell(Text.of(ok?'M&Sステータスを再計算しました。':'M&S再計算に失敗しました。').color(ok?'green':'red'))
    return ok?1:0
  }))
  event.register(root)
})
