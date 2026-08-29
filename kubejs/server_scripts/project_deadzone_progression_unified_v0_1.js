// PROJECT DEADZONE unified progression v0.1
// One visible character level: Mine & Slash. JOB modifies relevant activity
// gains and records promotion progress. Talent points come from M&S level-ups.

const PDZUP_MNS_ENTITY_DATA = Java.loadClass('com.robertx22.mine_and_slash.capability.entity.EntityData')
const PDZUP_LOOT_MODIFIERS = Java.loadClass('com.robertx22.mine_and_slash.loot.LootModifiersList')

const PDZUP_JOB_RELEVANCE = {
  survivor:['survival','scavenging','exploration'],
  weapons_expert:['combat','firearms','elite'],
  medic:['medical','support'],
  mechanic:['mechanics','vehicle'],
  engineer:['engineering','craft'],
  scout:['exploration','scavenging','combat'],
  security:['combat','melee','damage'],
  survivalist:['fishing','hunting','farming','cooking','survival'],
  anomaly_researcher:['anomaly','research','support','engineering']
}

const PDZUP_SOURCE_NAMES = {
  combat:'戦闘',firearms:'銃器戦闘',melee:'近接戦闘',elite:'強敵撃破',
  survival:'生存',scavenging:'採集・採掘',exploration:'探索',
  hunting:'狩猟',fishing:'釣り',farming:'農業',cooking:'料理',
  engineering:'工業',craft:'製作',mechanics:'整備',vehicle:'交通',
  medical:'医療',support:'支援',damage:'防衛',anomaly:'アノマリー',research:'研究'
}

function pdzUnifiedJob(player){
  let id=String(player.persistentData.getString('dz_job_id'))
  return PDZUP_JOB_RELEVANCE[id]?id:'survivor'
}

function pdzUnifiedMnsLevel(player){
  try{return Math.max(1,Number(PDZUP_MNS_ENTITY_DATA.get(player).getLevel())||1)}catch(ignored){}
  return 1
}

function pdzUnifiedAward(player,source,base,awardMns){
  if(!player||player.level.clientSide)return 0
  source=String(source||'survival')
  let raw=Math.max(1,Math.floor(Number(base)||1))
  let relevant=(PDZUP_JOB_RELEVANCE[pdzUnifiedJob(player)]||[]).indexOf(source)>=0
  let amount=Math.max(1,Math.ceil(raw*(relevant?1.25:1.0)))

  // Native M&S already rewards hostile kills. Those events still record JOB
  // activity, but pass awardMns=false so combat XP is never doubled.
  if(awardMns!==false){
    try{
      PDZUP_MNS_ENTITY_DATA.get(player).GiveExp(player,amount,new PDZUP_LOOT_MODIFIERS())
      let pending=player.persistentData.getInt('dz_unified_xp_pending')
      player.persistentData.putInt('dz_unified_xp_pending',Math.max(0,pending)+amount)
      player.persistentData.putString('dz_unified_xp_source',source)
    }catch(error){
      console.error('[PDZ Progression] M&S XP '+source+' : '+error)
      return 0
    }
  }

  try{
    if(global.pdzCareerRecordAction)global.pdzCareerRecordAction(player,amount,source)
  }catch(error){console.error('[PDZ Progression] JOB activity '+source+' : '+error)}
  return amount
}

global.pdzUnifiedProgressionAward=pdzUnifiedAward
global.pdzUnifiedMnsLevel=pdzUnifiedMnsLevel

function pdzUnifiedSyncTalentPoints(player){
  let level=pdzUnifiedMnsLevel(player),d=player.persistentData
  if(!d.getBoolean('dz_unified_talent_level_schema_v1')){
    // Existing players already received points from the retired rank/career
    // systems. Start from their current level so migration never duplicates SP.
    d.putInt('dz_unified_talent_level_awarded',level)
    d.putBoolean('dz_unified_talent_level_schema_v1',true)
    return 0
  }
  let previous=Math.max(1,d.getInt('dz_unified_talent_level_awarded'))
  if(level<=previous)return 0
  let gained=level-previous
  player.server.runCommandSilent('skilltree points add '+player.username+' '+gained)
  d.putInt('dz_unified_talent_level_awarded',level)
  player.tell(Text.of('[Level] M&S Lv'+level+' / Talent SP +'+gained).gold())
  return gained
}

// Fishing is routed through project_deadzone_growth_fishing_v0_1.js, whose
// successful-catch bridge calls /deadzonecareer event_fishing. Keeping that
// single path prevents one catch from being rewarded twice.

PlayerEvents.tick(event=>{
  let p=event.player
  if(p.level.clientSide)return
  if(p.age%20===0)pdzUnifiedSyncTalentPoints(p)
  if(p.age%40!==0)return
  let pending=Math.max(0,p.persistentData.getInt('dz_unified_xp_pending'))
  if(pending<=0)return
  let source=String(p.persistentData.getString('dz_unified_xp_source'))
  p.persistentData.putInt('dz_unified_xp_pending',0)
  let label=PDZUP_SOURCE_NAMES[source]||source
  p.server.runCommandSilent('title '+p.username+' actionbar {"text":"+'+pending+' M&S XP  ['+label+']","color":"aqua"}')
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonelevel')
  root.then(Commands.literal('status').executes(ctx=>{
    let p=ctx.source.player,data=PDZUP_MNS_ENTITY_DATA.get(p)
    p.tell(Text.of('総合Lv '+data.getLevel()+' / M&S XP '+data.getExp()+' / 次Lv '+data.getExpRequiredForLevelUp()).aqua())
    p.tell(Text.of('JOB '+pdzUnifiedJob(p)+' / JOB適性行動はM&S XP +25%').gold())
    p.tell(Text.of('M&SレベルアップごとにPDZ Talent SP +1').gray())
    return 1
  }))
  event.register(root)
})
