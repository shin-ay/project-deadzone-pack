// PROJECT DEADZONE survivor ledger v0.1
// Read-only overview. Existing mods and their PDZ bridges remain authoritative;
// this command only makes their scattered status screens discoverable.

const PDZ_LEDGER_QUEST = '6D56010000000101'

function pdzLedgerStoryUnlock(player){
  let tier=Math.max(0,Number(player.server.persistentData.getInt('deadzone_world_tier')))
  for(let i=0;i<=5;i++)if(player.stages.has('deadzone_tier_'+i))tier=Math.max(tier,i)
  return tier
}

function pdzLedgerWorldTier(player){
  try{
    if(typeof global.pdzWorldTierAt==='function')return Math.max(0,Number(global.pdzWorldTierAt(player.server,player.block.x,player.block.z)))
  }catch(ignored){}
  return Math.max(0,Number(player.persistentData.getInt('dz_world_tier')))
}

function pdzLedgerSectorRank(value){
  if(value>=50)return 3
  if(value>=25)return 2
  if(value>=10)return 1
  return 0
}

function pdzLedgerCamp(player){
  let d=player.server.persistentData
  let level=Math.max(0,Math.min(3,Number(d.getInt('dz_camp_development_level'))))
  let supply=pdzLedgerSectorRank(Number(d.getInt('dz_life_supply_reputation')))
  let security=pdzLedgerSectorRank(Number(d.getInt('dz_camp_security_reputation')))
  let restoration=pdzLedgerSectorRank(Number(d.getInt('dz_camp_restoration_reputation')))
  return {level:level,rank:Math.min(level,supply,security,restoration),debt:Math.max(0,Number(d.getInt('dz_defense_repair_debt')))}
}

function pdzLedgerCondition(player){
  let injury='正常',color='green',infection=false
  try{
    if(typeof dzHealthSnapshot==='function'){
      let snap=dzHealthSnapshot(player)
      if(snap&&snap.severity===1){injury='軽傷';color='yellow'}
      if(snap&&snap.severity>=2){injury='重傷';color='red'}
    }
  }catch(ignored){}
  try{
    infection=typeof dzHealthHasInfection==='function'?dzHealthHasInfection(player):false
  }catch(ignored){}
  return {injury:injury,infection:infection,color:infection?'red':color}
}

function pdzLedgerChoices(player){
  let d=player.persistentData,count=0
  ;['cdf','raider','remnant','aegis'].forEach(k=>{if(String(d.getString('dz_branch_choice_'+k)))count++})
  if(String(player.server.persistentData.getString('dz_story_argus_outcome')))count++
  return count
}

function pdzLedgerLink(label,command,color){
  return Text.of('['+label+']')[color||'aqua']().clickRunCommand(command).hover(Text.of('クリックして開く').gray())
}

function pdzLedgerStatus(player){
  player.server.runCommandSilent('ftbquests change_progress '+player.username+' complete '+PDZ_LEDGER_QUEST)
  let job=String(player.persistentData.getString('dz_job_id'))||'未選択'
  let t2=String(player.persistentData.getString('dz_career_t2'))||'-'
  let t3=String(player.persistentData.getString('dz_career_t3'))||'-'
  let camp=pdzLedgerCamp(player),condition=pdzLedgerCondition(player)
  let logistics=String(player.persistentData.getString('dz_log_active'))||'なし'
  let site=null
  try{if(typeof global.pdzSetNearestReal==='function')site=global.pdzSetNearestReal(player,256)}catch(ignored){}

  player.tell(Text.of('=== PROJECT DEADZONE / 生存者台帳 ===').gold())
  player.tell(Text.of('現在地 World T'+pdzLedgerWorldTier(player)+'｜Story S'+pdzLedgerStoryUnlock(player)+'｜JOB '+job+'｜T2 '+t2+'｜T3 '+t3).aqua())
  player.tell(Text.of('M&S連携 '+(player.persistentData.getBoolean('dz_mns_bridge_ok')?'OK':'未確認')+'｜身体 '+condition.injury+(condition.infection?'・感染中':'・感染なし'))[condition.color]())
  player.tell(Text.of('Survivor Camp Lv'+camp.level+' / 総合Rank '+camp.rank+(camp.debt>0?' / 復旧負債 '+camp.debt:'')).color(camp.debt>0?'red':'green'))
  player.tell(Text.of('進行中の物流 '+logistics+'｜勢力判断 '+pdzLedgerChoices(player)+'/5｜近隣集落 '+(site?String(site.name||site.id):'256m以内なし')).gray())

  player.tell(pdzLedgerLink('成長・SP','/deadzoneprogress status','lightPurple').append(Text.of(' ')).append(pdzLedgerLink('M&S装備','/deadzonemns status','aqua')).append(Text.of(' ')).append(pdzLedgerLink('身体・感染','/deadzonehealth status','red')))
  player.tell(pdzLedgerLink('Camp地域経済','/deadzonecommunity status','green').append(Text.of(' ')).append(pdzLedgerLink('依頼掲示板','/deadzonecontracts','yellow')).append(Text.of(' ')).append(pdzLedgerLink('個人信頼','/deadzonepeople status','lightPurple')))
  player.tell(pdzLedgerLink('近隣集落','/deadzonecolony status','gold').append(Text.of(' ')).append(pdzLedgerLink('物流','/deadzonelogistics status','aqua')).append(Text.of(' ')).append(pdzLedgerLink('MineColonies','/deadzonecolonyops status','green')))
  player.tell(pdzLedgerLink('勢力判断','/deadzonestorybranch status','yellow').append(Text.of(' ')).append(pdzLedgerLink('ストーリー解禁','/deadzonetier status','lightPurple')).append(Text.of(' ')).append(pdzLedgerLink('現在地Tier','/deadzonezone status','aqua')).append(Text.of(' ')).append(pdzLedgerLink('クエスト区分','/deadzonequests','gray')))
  return 1
}

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzone')
  root.executes(ctx=>pdzLedgerStatus(ctx.source.player))
  root.then(Commands.literal('status').executes(ctx=>pdzLedgerStatus(ctx.source.player)))
  root.then(Commands.literal('help').executes(ctx=>pdzLedgerStatus(ctx.source.player)))
  event.register(root)
})

console.info('[PROJECT DEADZONE][Survivor Ledger] v0.1 read-only status hub loaded')
