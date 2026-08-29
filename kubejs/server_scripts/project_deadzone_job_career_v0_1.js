// PROJECT DEADZONE JOB Career v0.1 - test profile
// JOB is an identity and promotion path. Mine & Slash owns the only visible
// character level; related action counters remain only as promotion evidence.

// Progression vocabulary:
//   Base JOB (chosen at game start) -> Job (M&S Lv30) -> Advanced Job (M&S Lv60)
// Mine and Slash's internal class/ascendancy is only a hidden skill discipline.
const PDZ_CAREER_MNS_ENTITY = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const PDZ_CAREER_LEGACY_EVENT_XP = false
const PDZ_CAREER_MAX_LEVEL = 100
const PDZ_CAREER_TIER2_LEVEL = 30
const PDZ_CAREER_TIER3_LEVEL = 60
const PDZ_CAREER_TIER2_RELEVANT_XP = 900
const PDZ_CAREER_TIER3_RELEVANT_XP = 3600

const PDZ_CAREER_NAMES = {
  survivor:'Survivor', weapons_expert:'Weapons Expert', medic:'Medic',
  mechanic:'Mechanic', engineer:'Engineer', scout:'Scout',
  security:'Security', survivalist:'Survivalist',
  anomaly_researcher:'Anomaly Researcher'
}

const PDZ_CAREER_PATHS = {
  survivor:{
    t2:{scavenger:'Scavenger',adapter:'Adapter'},
    t3:{scavenger:{quartermaster:'Quartermaster',prospector:'Prospector'},adapter:{expeditionist:'Expeditionist',wasteland_veteran:'Wasteland Veteran'}}
  },
  weapons_expert:{
    t2:{marksman:'Marksman',assault:'Assault Operator'},
    t3:{marksman:{sniper:'Sniper',overwatch:'Overwatch'},assault:{gunner:'Gunner',breacher:'Breacher'}}
  },
  medic:{
    t2:{surgeon:'Field Surgeon',combat_medic:'Combat Medic'},
    t3:{surgeon:{trauma_specialist:'Trauma Specialist',lifesaver:'Lifesaver'},combat_medic:{bio_support:'Bio Support',rescue_operator:'Rescue Operator'}}
  },
  mechanic:{
    t2:{ground_tech:'Ground Technician',pilot:'Pilot'},
    t3:{ground_tech:{convoy_master:'Convoy Master',armor_mechanic:'Armor Mechanic'},pilot:{ace_pilot:'Ace Pilot',crew_chief:'Air Crew Chief'}}
  },
  engineer:{
    t2:{automation:'Automation Engineer',gunsmith:'Gunsmith'},
    t3:{automation:{systems_engineer:'Systems Engineer',industrial_architect:'Industrial Architect'},gunsmith:{weapon_engineer:'Weapon Engineer',ordnance_specialist:'Ordnance Specialist'}}
  },
  scout:{
    t2:{recon:'Recon',infiltrator:'Infiltrator'},
    t3:{recon:{pathfinder:'Pathfinder',spotter:'Spotter'},infiltrator:{ghost:'Ghost',saboteur:'Saboteur'}}
  },
  security:{
    t2:{guardian:'Guardian',enforcer:'Enforcer'},
    t3:{guardian:{bulwark:'Bulwark',sentinel:'Sentinel'},enforcer:{juggernaut:'Juggernaut',riot_leader:'Riot Leader'}}
  },
  survivalist:{
    t2:{provider:'Provider',ranger:'Ranger'},
    t3:{provider:{angler:'Angler',chef:'Chef'},ranger:{hunter:'Hunter',homesteader:'Homesteader'}}
  },
  anomaly_researcher:{
    t2:{rift_analyst:'Rift Analyst',resonance_engineer:'Resonance Engineer'},
    t3:{
      rift_analyst:{rift_warden:'Rift Warden',hazard_seer:'Hazard Seer'},
      resonance_engineer:{construct_binder:'Construct Binder',null_physician:'Null Physician'}
    }
  }
}

const PDZ_CAREER_RELEVANCE = {
  weapons_expert:['combat','firearms','elite'], security:['combat','melee','damage'],
  medic:['medical','support'], mechanic:['mechanics','vehicle'],
  engineer:['engineering','craft'], scout:['exploration','scavenging','combat'],
  survivalist:['fishing','hunting','farming','cooking','survival'],
  survivor:['survival','scavenging','exploration'],
  anomaly_researcher:['anomaly','research','support','engineering']
}

const PDZ_CAREER_SOURCE_NAMES = {
  combat:'戦闘', firearms:'銃器戦闘', melee:'近接戦闘', damage:'防御・耐久', elite:'Named・Boss',
  medical:'治療', support:'支援', mechanics:'車両整備', vehicle:'車両運用', engineering:'工業',
  craft:'クラフト', exploration:'探索', scavenging:'物資回収', fishing:'釣り', hunting:'狩猟',
  farming:'農業', cooking:'料理', survival:'生存'
}

const PDZ_CAREER_OLD_SKILLS = ['Survival','Scavenging','Melee','Medical','Firearms','Fitness','Reload','Mechanics','Engineering','Armor']

function pdzCareerRelevantXp(player) {
  let total=0
  ;(PDZ_CAREER_RELEVANCE[pdzCareerJob(player)]||[]).forEach(source=>{
    total+=Math.max(0,player.persistentData.getInt('dz_career_source_'+source))
  })
  return total
}

function pdzCareerJob(player) {
  let id=String(player.persistentData.getString('dz_job_id'))
  return PDZ_CAREER_PATHS[id] ? id : 'survivor'
}

function pdzCareerLevel(player) {
  try{return Math.max(1,Number(PDZ_CAREER_MNS_ENTITY.get(player).getLevel())||1)}catch(ignored){}
  return 1
}

function pdzCareerGrantDisplayNode(player, stage, id) {
  // JOB Career is rendered by the dedicated pdzjobui mod.
  // Never spend or grant Passive Skill Tree nodes from here.
  return
}

function pdzCareerSyncTree(player) {
  return
}

function pdzCareerNeed(level) {
  let n=Math.max(1,level)
  return 100+(n-1)*45+Math.floor((n-1)*(n-1)*4)
}

function pdzCareerTotalForLevel(targetLevel) {
  let total=0
  for(let level=1;level<targetLevel;level++) total+=pdzCareerNeed(level)
  return total
}

function pdzCareerPreparePromotionTest(player,targetLevel,relevantXp) {
  let d=player.persistentData
  try{PDZ_CAREER_MNS_ENTITY.get(player).setLevel(Math.max(pdzCareerLevel(player),targetLevel))}catch(ignored){}
  let source=(PDZ_CAREER_RELEVANCE[pdzCareerJob(player)]||['survival'])[0]
  d.putInt('dz_career_source_'+source,Math.max(d.getInt('dz_career_source_'+source),relevantXp))
  pdzCareerRecalculate(player,true)
  player.tell(Text.of('[JOB TEST] M&S Lv'+targetLevel+' / Related Activity '+relevantXp+' ready. Open J.').aqua())
}

function pdzCareerMultiplier(job,source) {
  let relevant=PDZ_CAREER_RELEVANCE[job] || []
  return relevant.indexOf(source)>=0 ? 1.5 : 1.0
}

function pdzCareerGrantTalentPoint(player,level) {
  let key='dz_career_tp_level_'+level
  if (player.persistentData.getBoolean(key)) return
  player.persistentData.putBoolean(key,true)
  player.server.runCommandSilent('skilltree points add '+player.username+' 1')
  player.tell(Text.of('[JOB] Lv'+level+' 報酬: Talent Point +1').gold())
}

function pdzCareerRecalculate(player,announce) {
  let d=player.persistentData
  let oldLevel=Math.max(1,d.getInt('dz_career_level'))
  let level=pdzCareerLevel(player)
  // Compatibility mirror for old quests/scripts. It is not a second level.
  d.putInt('dz_career_level',level)
  if (level>oldLevel) {
    if (oldLevel<PDZ_CAREER_TIER2_LEVEL && level>=PDZ_CAREER_TIER2_LEVEL)
      player.tell(Text.of('[JOB] 昇格候補を確認できます: J').aqua())
    if (oldLevel<PDZ_CAREER_TIER3_LEVEL && level>=PDZ_CAREER_TIER3_LEVEL)
      player.tell(Text.of('[JOB] 上位昇格候補を確認できます: J').lightPurple())
  }
  pdzCareerSyncTree(player)
  return level
}

function pdzCareerRecordAction(player,amount,source) {
  if (!player || player.level.clientSide) return 0
  let storedJob=String(player.persistentData.getString('dz_job_id'))
  if (!PDZ_CAREER_PATHS[storedJob]) return 0
  // A JOB id alone is not registration.  Class/UI integrations may seed an id
  // before the registrar grants the starter kit; auto-confirming here skipped
  // both selection and kit delivery for new players.
  if (!player.persistentData.getBoolean('dz_job_chosen')) {
    return 0
  }
  let gain=Math.max(1,Math.floor(Number(amount)||1))
  let d=player.persistentData
  d.putInt('dz_career_source_'+source,Math.max(0,d.getInt('dz_career_source_'+source))+gain)
  pdzCareerRecalculate(player,false)
  return gain
}

function pdzCareerAddXp(player,amount,source,announce) {
  // Compatibility facade for older activity bridges. New code enters through
  // unified progression, which awards M&S XP once and calls RecordAction.
  if(global.pdzUnifiedProgressionAward)return global.pdzUnifiedProgressionAward(player,source,amount,true)
  return pdzCareerRecordAction(player,amount,source)
}

// Existing-mod bridges may feed verified field activity into the JOB career.
// Keep the career script authoritative for registration checks, relevance
// multipliers and persistence instead of duplicating that logic per bridge.
global.pdzCareerAddXp = pdzCareerAddXp
global.pdzCareerRecordAction = pdzCareerRecordAction

function pdzCareerMigrate(player,force) {
  let d=player.persistentData
  if (!force && d.getBoolean('dz_career_migrated_v1')) return false
  let converted=0
  PDZ_CAREER_OLD_SKILLS.forEach(skill => {
    let level=Math.max(0,d.getInt('dz_skill_'+skill))
    let floor=Math.max(0,d.getInt('dz_skill_floor_'+skill))
    let xp=Math.max(0,d.getInt('dz_skill_xp_'+skill))
    converted+=Math.max(0,level-floor)*75+xp
  })
  d.putInt('dz_career_xp',Math.max(d.getInt('dz_career_xp'),converted))
  if (d.getInt('dz_career_rank')<1) d.putInt('dz_career_rank',1)
  d.putBoolean('dz_career_migrated_v1',true)
  pdzCareerRecalculate(player,false)
  if (converted>0) player.tell(Text.of('[JOB] 旧成長データから '+converted+' XPを移行しました。').aqua())
  return true
}

function pdzCareerCooldown(player,key,milliseconds) {
  let now=Date.now(), nbt='dz_career_cd_'+key
  let last=player.persistentData.getLong(nbt)
  if (now-last<milliseconds) return false
  player.persistentData.putLong(nbt,now)
  return true
}

function pdzCareerEntityId(entity) {
  try {return String(entity.type).toLowerCase()} catch(ignored) {return ''}
}

function pdzCareerFriendlyTarget(entity) {
  if (!entity) return false
  try {
    let friendly=['dz_friendly','dz_buddy','dz_companion','dz_camp_guard','dz_survivor','dz_usunit_friendly']
    for (let i=0;i<friendly.length;i++) if (entity.tags.contains(friendly[i])) return true
  } catch(ignored) {}
  return false
}

function pdzCareerAnimal(entity) {
  let id=pdzCareerEntityId(entity)
  return ['cow','pig','sheep','chicken','rabbit','deer','boar','bear','moose','goat','turkey','duck','fish','salmon','cod','squid'].some(x=>id.indexOf(x)>=0)
}

function pdzCareerGun(stack) {
  if (!stack || stack.empty) return false
  let id=String(stack.id).toLowerCase()
  return id.startsWith('tacz:')||id.indexOf('gun')>=0||id.indexOf('rifle')>=0||id.indexOf('pistol')>=0||id.indexOf('shotgun')>=0
}

function pdzCareerKillReward(player,target) {
  if (!target || pdzCareerFriendlyTarget(target)) return null
  let id=pdzCareerEntityId(target)
  if (target.tags.contains('dz_story_boss')||target.tags.contains('dz_sideboss')) return {source:'elite',amount:40}
  if (target.tags.contains('dz_elite')||target.tags.contains('dz_named')) return {source:'elite',amount:12}
  if (pdzCareerAnimal(target)) return {source:'hunting',amount:3}
  let armed=id.indexOf('tacz')>=0||id.indexOf('soldier')>=0||id.indexOf('raider')>=0||id.indexOf('unit')>=0||id.indexOf('pmc')>=0
  if (armed) return {source:pdzCareerGun(player.mainHandItem)?'firearms':'melee',amount:7}
  let enhanced=id.indexOf('simple')>=0||id.indexOf('runner')>=0||id.indexOf('brute')>=0||id.indexOf('infected')>=0
  if (enhanced) return {source:pdzCareerGun(player.mainHandItem)?'firearms':'melee',amount:5}
  try {if (target.isMonster&&target.isMonster()) return {source:pdzCareerGun(player.mainHandItem)?'firearms':'melee',amount:4}} catch(ignored) {}
  return null
}

function pdzCareerSourceStatus(player) {
  let d=player.persistentData
  player.tell(Text.of('=== JOB関連行動実績 ===').gold())
  Object.keys(PDZ_CAREER_SOURCE_NAMES).forEach(source=>{
    let value=Math.max(0,d.getInt('dz_career_source_'+source))
    if (value<=0) return
    let relevant=(PDZ_CAREER_RELEVANCE[pdzCareerJob(player)]||[]).indexOf(source)>=0
    let line=Text.of((relevant?'★ ':'  ')+PDZ_CAREER_SOURCE_NAMES[source]+': '+value+(relevant?'  [JOB適性]':''))
    player.tell(relevant?line.aqua():line.gray())
  })
  player.tell(Text.of('★の適性行動はM&S XP +25%。実績値はJOB昇格条件へ加算されます。').yellow())
}

function pdzCareerLegacyMultiplayerMigrate(player) {
  let d=player.persistentData
  if (d.getBoolean('dz_career_multiplayer_migrated_v2')) return false
  // Existing Career XP, Action source XP and Passive Skill Tree capability are
  // deliberately left untouched. Only repair missing derived fields and the
  // single SP formerly spent on the retired JOB board.
  if (d.getInt('dz_career_rank')<1) d.putInt('dz_career_rank',1)
  if (d.getInt('dz_career_level')<1) pdzCareerRecalculate(player,false)
  let legacy=0
  PDZ_CAREER_OLD_SKILLS.forEach(skill=>legacy+=Math.max(0,d.getInt('dz_skill_'+skill)))
  if (legacy>0 && !d.getBoolean('dz_career_job_sp_refunded')) {
    player.server.runCommandSilent('skilltree points add '+player.username+' 1')
    d.putBoolean('dz_career_job_sp_refunded',true)
  }
  d.putBoolean('dz_career_multiplayer_migrated_v2',true)
  return true
}

function pdzCareerStatus(player) {
  pdzCareerMigrate(player,false)
  let d=player.persistentData,job=pdzCareerJob(player)
  let mns=PDZ_CAREER_MNS_ENTITY.get(player),level=pdzCareerLevel(player)
  pdzCareerRecalculate(player,false)
  player.tell(Text.of('=== JOB Career ===').gold())
  player.tell(Text.of((PDZ_CAREER_NAMES[job]||job)+' / M&S Lv'+level+' / Rank '+Math.max(1,d.getInt('dz_career_rank'))).aqua())
  player.tell(Text.of('M&S XP: '+mns.getExp()+' / '+mns.getExpRequiredForLevelUp()).gray())
  let t2=String(d.getString('dz_career_t2')),t3=String(d.getString('dz_career_t3'))
  player.tell(Text.of('基本JOB: '+(PDZ_CAREER_NAMES[job]||job)).aqua())
  if (t2) player.tell(Text.of('JOB: '+t2).yellow())
  if (t3) player.tell(Text.of('上位JOB: '+t3).lightPurple())
  player.tell(Text.of('関連行動XP: '+pdzCareerRelevantXp(player)).gray())
}

function pdzCareerPaths(player) {
  let d=player.persistentData,job=pdzCareerJob(player),data=PDZ_CAREER_PATHS[job]
  let level=pdzCareerLevel(player),t2=String(d.getString('dz_career_t2'))
  player.tell(Text.of('=== '+(PDZ_CAREER_NAMES[job]||job)+' Career Paths ===').gold())
  if (!t2) {
    Object.keys(data.t2).forEach(id=>player.tell(Text.of('/deadzonecareer promote2_'+id+' - '+data.t2[id]).gray()))
    if (level<PDZ_CAREER_TIER2_LEVEL || pdzCareerRelevantXp(player)<PDZ_CAREER_TIER2_RELEVANT_XP)
      player.tell(Text.of('JOB解放条件: M&S Lv30 / 関連行動実績 900').red())
  } else {
    let list=data.t3[t2]||{}
    Object.keys(list).forEach(id=>player.tell(Text.of('/deadzonecareer promote3_'+id+' - '+list[id]).gray()))
    if (level<PDZ_CAREER_TIER3_LEVEL || pdzCareerRelevantXp(player)<PDZ_CAREER_TIER3_RELEVANT_XP)
      player.tell(Text.of('上位JOB解放条件: M&S Lv60 / 関連行動実績 3600').red())
  }
}

function pdzCareerPromote2(player,id) {
  let d=player.persistentData,job=pdzCareerJob(player),data=PDZ_CAREER_PATHS[job]
  if (player.server.runCommandSilent('execute at '+player.username+' if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,distance=..6,limit=1]')<=0) {
    player.tell(Text.of('[JOB] 昇格はキャンプのミナト（JOB管理官）に相談してください。').yellow())
    return false
  }
  if (pdzCareerLevel(player)<PDZ_CAREER_TIER2_LEVEL || pdzCareerRelevantXp(player)<PDZ_CAREER_TIER2_RELEVANT_XP || d.getString('dz_career_t2') || !data.t2[id]) return false
  d.putString('dz_career_t2',id);d.putInt('dz_career_rank',2);player.addTag('dz_career_t2_'+id)
  pdzCareerSyncTree(player)
  player.tell(Text.of('[JOB] '+data.t2[id]+' に昇格しました。').gold())
  return true
}

function pdzCareerPromote3(player,id) {
  let d=player.persistentData,job=pdzCareerJob(player),t2=String(d.getString('dz_career_t2'))
  if (player.server.runCommandSilent('execute at '+player.username+' if entity @e[type=easy_npc:humanoid,tag=dz_basecamp_job_guide,distance=..6,limit=1]')<=0) {
    player.tell(Text.of('[JOB] 上位昇格はキャンプのミナト（JOB管理官）に相談してください。').yellow())
    return false
  }
  let list=(PDZ_CAREER_PATHS[job].t3[t2]||{})
  if (pdzCareerLevel(player)<PDZ_CAREER_TIER3_LEVEL || pdzCareerRelevantXp(player)<PDZ_CAREER_TIER3_RELEVANT_XP || d.getString('dz_career_t3') || !list[id]) return false
  d.putString('dz_career_t3',id);d.putInt('dz_career_rank',3);player.addTag('dz_career_t3_'+id)
  pdzCareerSyncTree(player)
  player.tell(Text.of('[JOB] 上位JOB '+list[id]+' に昇格しました。').lightPurple())
  return true
}

PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(80,()=>{pdzCareerMigrate(event.player,false);pdzCareerLegacyMultiplayerMigrate(event.player);pdzCareerRecalculate(event.player,false);pdzCareerSyncTree(event.player)})
})

EntityEvents.death(event => {
  if(!PDZ_CAREER_LEGACY_EVENT_XP)return
  let player=event.source?event.source.actual:null
  if (!player || !player.isPlayer || !player.isPlayer()) return
  let reward=pdzCareerKillReward(player,event.entity)
  if (reward) pdzCareerAddXp(player,reward.amount,reward.source,false)
})

EntityEvents.hurt(event=>{
  if(!PDZ_CAREER_LEGACY_EVENT_XP)return
  let p=event.entity
  if (!p||!p.isPlayer||!p.isPlayer()||p.level.clientSide||Number(event.damage)<=0) return
  if (pdzCareerCooldown(p,'damage_taken',8000)) pdzCareerAddXp(p,1,'damage',false)
})

ItemEvents.foodEaten(event => {
  if(!PDZ_CAREER_LEGACY_EVENT_XP)return
  let p=event.entity
  if (p && p.isPlayer && p.isPlayer() && pdzCareerCooldown(p,'food',30000)) pdzCareerAddXp(p,1,'survival',false)
})

ItemEvents.rightClicked(event => {
  if(!PDZ_CAREER_LEGACY_EVENT_XP)return
  let p=event.player
  if (!p || p.level.clientSide) return
  let id=String(event.item.id)
  if ((id.indexOf('bandage')>=0||id.indexOf('medical')>=0||id.indexOf('medkit')>=0||id.indexOf('morphine')>=0||id.indexOf('syringe')>=0)
      && pdzCareerCooldown(p,'medical',10000)) pdzCareerAddXp(p,3,'medical',false)
  if ((id.indexOf('wrench')>=0||id.indexOf('repair')>=0||id.indexOf('maintenance')>=0||id.indexOf('diagnostic')>=0)
      && pdzCareerCooldown(p,'vehicle',10000)) pdzCareerAddXp(p,3,'vehicle',false)
})

ItemEvents.crafted(event => {
  if(!PDZ_CAREER_LEGACY_EVENT_XP)return
  let p=event.player,id=String(event.item.id)
  if (!p || p.level.clientSide) return
  let food=false
  try {food=event.item.foodProperties!=null} catch(ignored) {}
  if (food||id.startsWith('farmersdelight:')||id.startsWith('cuisine:')||id.indexOf('meal')>=0||id.indexOf('cooked')>=0) pdzCareerAddXp(p,2,'cooking',false)
  else if (id.startsWith('mts:')||id.startsWith('vehicle:')||id.startsWith('blocky_bikes:')||id.startsWith('immersivevehicles:')) pdzCareerAddXp(p,3,'mechanics',false)
  else if (id.startsWith('create:')||id.startsWith('immersiveengineering:')||id.startsWith('mekanism:')) pdzCareerAddXp(p,3,'engineering',false)
  else pdzCareerAddXp(p,1,'craft',false)
})

BlockEvents.broken(event => {
  if(!PDZ_CAREER_LEGACY_EVENT_XP)return
  let p=event.player
  if (!p || p.level.clientSide) return
  let id=String(event.block.id).toLowerCase()
  let crop=id.indexOf('wheat')>=0||id.indexOf('carrot')>=0||id.indexOf('potato')>=0||id.indexOf('beetroot')>=0||id.indexOf('crop')>=0||id.indexOf('tomato')>=0||id.indexOf('cabbage')>=0||id.indexOf('rice')>=0
  if (crop&&pdzCareerCooldown(p,'farming',2500)) pdzCareerAddXp(p,2,'farming',false)
  else if ((event.block.hasTag('forge:ores')||event.block.hasTag('minecraft:logs'))&&pdzCareerCooldown(p,'gather',6000)) pdzCareerAddXp(p,1,'scavenging',false)
})

PlayerEvents.tick(event => {
  let p=event.player
  if (p.level.clientSide) return
  if(p.age%40===0)pdzCareerRecalculate(p,false)
  if(!PDZ_CAREER_LEGACY_EVENT_XP)return
  if (p.age%600!==0 || !PDZ_CAREER_PATHS[String(p.persistentData.getString('dz_job_id'))]) return
  let d=p.persistentData,x=Math.floor(p.x),z=Math.floor(p.z)
  let ox=d.getInt('dz_career_explore_x'),oz=d.getInt('dz_career_explore_z')
  if (ox===0&&oz===0) {d.putInt('dz_career_explore_x',x);d.putInt('dz_career_explore_z',z);return}
  let dx=x-ox,dz=z-oz
  if (dx*dx+dz*dz>=16384) {
    d.putInt('dz_career_explore_x',x);d.putInt('dz_career_explore_z',z)
    pdzCareerAddXp(p,3,'exploration',false)
  }
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal('deadzonecareer')
  root.then(Commands.literal('status').executes(ctx=>{pdzCareerStatus(ctx.source.player);return 1}))
  root.then(Commands.literal('action_status').executes(ctx=>{pdzCareerSourceStatus(ctx.source.player);return 1}))
  root.then(Commands.literal('sync').executes(ctx=>{pdzCareerSyncTree(ctx.source.player);pdzCareerStatus(ctx.source.player);return 1}))
  root.then(Commands.literal('refund_job_sp').requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player,d=p.persistentData
    if (d.getBoolean('dz_career_job_sp_refunded')) {p.tell(Text.of('[JOB] JOB盤のSP返却は完了済みです。').yellow());return 0}
    p.server.runCommandSilent('skilltree points add '+p.username+' 1')
    d.putBoolean('dz_career_job_sp_refunded',true)
    p.tell(Text.of('[JOB] 旧JOB盤で消費したTalent SPを1返却しました。').green())
    return 1
  }))
  root.then(Commands.literal('paths').executes(ctx=>{pdzCareerPaths(ctx.source.player);return 1}))
    root.then(Commands.literal('diagnose').executes(ctx=>{
    let p=ctx.source.player,d=p.persistentData,job=pdzCareerJob(p),lv=pdzCareerLevel(p),rx=pdzCareerRelevantXp(p)
    p.tell(Text.of('=== JOB Career Diagnosis ===').gold())
    p.tell(Text.of('JOB='+job+' Lv='+lv+' RelevantXP='+rx).aqua())
    p.tell(Text.of('JOB '+(lv>=PDZ_CAREER_TIER2_LEVEL&&rx>=PDZ_CAREER_TIER2_RELEVANT_XP?'READY':'LOCKED')+' (M&S Lv30 / Activity 900)').yellow())
    p.tell(Text.of('ADVANCED JOB '+(lv>=PDZ_CAREER_TIER3_LEVEL&&rx>=PDZ_CAREER_TIER3_RELEVANT_XP?'READY':'LOCKED')+' (M&S Lv60 / Activity 3600)').lightPurple())
      p.tell(Text.of('Selected: '+(d.getString('dz_career_t2')||'-')+' > '+(d.getString('dz_career_t3')||'-')).gray())
      p.tell(Text.of('ChosenFlag='+d.getBoolean('dz_job_chosen')+' ArchivedLegacyXP='+Math.max(0,d.getInt('dz_career_xp'))).gray())
      ;['combat','firearms','elite','melee','damage','medical','support','mechanics','vehicle','engineering','craft','exploration','scavenging','fishing','hunting','farming','survival'].forEach(source=>{
        let value=Math.max(0,d.getInt('dz_career_source_'+source))
        if (value>0) p.tell(Text.of('  '+source+': '+value).darkGray())
      })
      return 1
    }))
  root.then(Commands.literal('migrate').executes(ctx=>{pdzCareerMigrate(ctx.source.player,true);pdzCareerStatus(ctx.source.player);return 1}))
  root.then(Commands.literal('xp_test_100').requires(s=>s.hasPermission(2)).executes(ctx=>{pdzCareerAddXp(ctx.source.player,100,'test',true);return 1}))
  root.then(Commands.literal('xp_test_2500').requires(s=>s.hasPermission(2)).executes(ctx=>{pdzCareerAddXp(ctx.source.player,2500,'test',true);return 1}))
  root.then(Commands.literal('xp_test_20000').requires(s=>s.hasPermission(2)).executes(ctx=>{pdzCareerAddXp(ctx.source.player,20000,'test',true);return 1}))
  root.then(Commands.literal('action_test_300').requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player,source=(PDZ_CAREER_RELEVANCE[pdzCareerJob(p)]||['survival'])[0]
    pdzCareerAddXp(p,300,source,true);return 1
  }))
  root.then(Commands.literal('action_test_1200').requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player,source=(PDZ_CAREER_RELEVANCE[pdzCareerJob(p)]||['survival'])[0]
    pdzCareerAddXp(p,1200,source,true);return 1
  }))
  root.then(Commands.literal('event_fishing').executes(ctx=>{
    let p=ctx.source.player,d=p.persistentData,until=d.getLong('dz_career_bridge_fishing_until')
    d.remove('dz_career_bridge_fishing_until')
    if (until<=p.level.gameTime) return 0
    pdzCareerAddXp(p,4,'fishing',false);return 1
  }))
  root.then(Commands.literal('event_treatment').executes(ctx=>{
    let p=ctx.source.player,d=p.persistentData,until=d.getLong('dz_career_bridge_treatment_until')
    d.remove('dz_career_bridge_treatment_until')
    if (until<=p.level.gameTime) return 0
    pdzCareerAddXp(p,3,'support',false);return 1
  }))
  root.then(Commands.literal('prepare_t2_test').requires(s=>s.hasPermission(2)).executes(ctx=>{
    pdzCareerPreparePromotionTest(ctx.source.player,PDZ_CAREER_TIER2_LEVEL,PDZ_CAREER_TIER2_RELEVANT_XP);return 1
  }))
  root.then(Commands.literal('prepare_t3_test').requires(s=>s.hasPermission(2)).executes(ctx=>{
    pdzCareerPreparePromotionTest(ctx.source.player,PDZ_CAREER_TIER3_LEVEL,PDZ_CAREER_TIER3_RELEVANT_XP);return 1
  }))
  let allT2={},allT3={}
  Object.keys(PDZ_CAREER_PATHS).forEach(job=>{
    let data=PDZ_CAREER_PATHS[job]
    Object.keys(data.t2).forEach(id=>allT2[id]=true)
    Object.keys(data.t3).forEach(t2=>Object.keys(data.t3[t2]).forEach(id=>allT3[id]=true))
  })
  Object.keys(allT2).forEach(id=>root.then(Commands.literal('promote2_'+id).executes(ctx=>pdzCareerPromote2(ctx.source.player,id)?1:0)))
  Object.keys(allT3).forEach(id=>root.then(Commands.literal('promote3_'+id).executes(ctx=>pdzCareerPromote3(ctx.source.player,id)?1:0)))
  root.then(Commands.literal('reset_test').requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player,d=p.persistentData
    let remove=[]
    p.tags.forEach(t=>{if(String(t).startsWith('dz_career_'))remove.push(String(t))})
    remove.forEach(t=>p.removeTag(t))
    ;['dz_career_xp','dz_career_level','dz_career_rank','dz_career_t2','dz_career_t3','dz_career_migrated_v1'].forEach(k=>d.remove(k))
    for(let lv=5;lv<=PDZ_CAREER_MAX_LEVEL;lv+=5)d.remove('dz_career_tp_level_'+lv)
    pdzCareerMigrate(p,false);p.tell(Text.of('[JOB] Career test data reset.').yellow());return 1
  }))
  event.register(root)
})
