// PROJECT DEADZONE settlement reputation v0.1
// Village Recruits owns standing, contracts, hostility, bounties, merchant
// demand pricing and the reputation shop. PDZ only seeds a settlement's first
// impression once and exposes the native state in its quest/status layer.

const PDZ_VR_REPUTATION = Java.loadClass("com.example.villagerecruits.contracts.FactionReputation")
const PDZ_VR_NOBLE_VILLAGE = Java.loadClass("com.example.villagerecruits.contracts.NobleVillage")
const PDZ_VR_REP_REASON = Java.loadClass("com.example.villagerecruits.contracts.RepReason")

const PDZ_VR_RELATION_QUESTS = {
  intro:"6D54010000000101", pricing:"6D54010000000102", contract:"6D54010000000103",
  trusted:"6D54010000000104", honoured:"6D54010000000105", champion:"6D54010000000106",
  consequence:"6D54010000000107"
}

let pdzVrBindingErrorLogged=false

function pdzVrComplete(player,questId){
  player.server.runCommandSilent("ftbquests change_progress "+player.username+" complete "+questId)
}

function pdzVrInitialStanding(site){
  let relation=String(site&&site.relation||"neutral")
  if(relation==="friendly")return 20
  if(relation==="hostile")return -50
  return 0
}

function pdzVrHasOpinion(player,factionId){
  try{return PDZ_VR_REPUTATION.allFor(player.uuid).containsKey(String(factionId))}
  catch(ignored){return false}
}

function pdzVrStanding(player,factionId){
  try{return Number(PDZ_VR_REPUTATION.get(player.uuid,String(factionId)))}
  catch(ignored){return 0}
}

function pdzVrTierName(player,factionId){
  try{return String(PDZ_VR_REPUTATION.tier(player.uuid,String(factionId)).display())}
  catch(ignored){return "Neutral"}
}

function pdzVrBoundFactions(player){
  let raw=String(player.persistentData.getString("dz_vr_bound_factions_json")||"")
  if(!raw)return []
  try{let list=JSON.parse(raw);return Array.isArray(list)?list.map(String):[]}
  catch(ignored){return []}
}

function pdzVrRememberFaction(player,factionId){
  let list=pdzVrBoundFactions(player),id=String(factionId)
  if(list.indexOf(id)<0){list.push(id);player.persistentData.putString("dz_vr_bound_factions_json",JSON.stringify(list))}
}

function pdzVrBindSite(player,noble,notify){
  try{
    let village=PDZ_VR_NOBLE_VILLAGE.of(player.level,noble)
    if(!village)return null
    let factionId=String(village.factionId()||"")
    if(!factionId)return null
    let site=typeof global.pdzSetNearestReal==="function"?global.pdzSetNearestReal(noble,160):null
    if(!site)return null

    let changed=String(site.vrFactionId||"")!==factionId
    // Keep the first real Village Recruits owner of a hostile site.  The
    // liberation bridge compares this immutable occupation owner with the
    // claim's current owner; merely talking to a different Noble must never
    // count as conquest.
    if(String(site.relation||"")==="hostile"&&!String(site.vrOccupationFactionId||"")){
      site.vrOccupationFactionId=factionId
      changed=true
    }
    site.vrFactionId=factionId
    site.vrCenterX=Number(village.center().getX())
    site.vrCenterY=Number(village.center().getY())
    site.vrCenterZ=Number(village.center().getZ())
    if(changed&&typeof global.pdzSetUpsert==="function")global.pdzSetUpsert(player.server,site)
    if(typeof global.pdzLiberationObserve==="function")global.pdzLiberationObserve(player,site,false)
    pdzVrRememberFaction(player,factionId)

    let initialized=false
    if(!pdzVrHasOpinion(player,factionId)){
      let initial=pdzVrInitialStanding(site)
      PDZ_VR_REPUTATION.set(player.level,player.uuid,factionId,initial)
      initialized=true
      if(notify)player.tell(Text.of("[集落Standing] "+String(site.factionLabel||site.faction)+"の第一印象: "+initial+" / "+pdzVrTierName(player,factionId)).gold())
    }
    pdzVrComplete(player,PDZ_VR_RELATION_QUESTS.intro)
    pdzVrComplete(player,PDZ_VR_RELATION_QUESTS.consequence)
    pdzVrSyncMilestones(player,notify)
    return {site:site,factionId:factionId,initialized:initialized}
  }catch(error){
    if(!pdzVrBindingErrorLogged){pdzVrBindingErrorLogged=true;console.error("[PDZ][Village Recruits Standing] Noble binding failed: "+error)}
    return null
  }
}

function pdzVrContractDone(player,factionId){
  try{
    let ledger=PDZ_VR_REPUTATION.ledgerFor(player.uuid,String(factionId))
    let value=ledger.get(PDZ_VR_REP_REASON.CONTRACT_DONE)
    return value!==null&&value!==undefined&&Number(value)>0
  }catch(ignored){return false}
}

function pdzVrSyncMilestones(player,notify){
  let best=-2147483648,hasContract=false
  pdzVrBoundFactions(player).forEach(factionId=>{
    if(!pdzVrHasOpinion(player,factionId))return
    best=Math.max(best,pdzVrStanding(player,factionId))
    if(pdzVrContractDone(player,factionId))hasContract=true
  })
  if(hasContract&&!player.persistentData.getBoolean("dz_vr_contract_milestone")){
    player.persistentData.putBoolean("dz_vr_contract_milestone",true)
    pdzVrComplete(player,PDZ_VR_RELATION_QUESTS.contract)
    if(notify)player.tell(Text.of("[Standing] Village Recruitsの実契約完了を確認しました。").green())
  }
  ;[[20,"trusted"],[50,"honoured"],[80,"champion"]].forEach(entry=>{
    let threshold=entry[0],key=entry[1],flag="dz_vr_tier_"+key
    if(best<threshold||player.persistentData.getBoolean(flag))return
    player.persistentData.putBoolean(flag,true)
    pdzVrComplete(player,PDZ_VR_RELATION_QUESTS[key])
    if(notify)player.tell(Text.of("[Standing] "+key+"帯へ到達。Nobleの契約・Reputation Shopを確認してください。").aqua())
  })
}

function pdzVrMayUseSettlement(player,site){
  if(!player||!site)return false
  let factionId=String(site.vrFactionId||"")
  if(factionId&&pdzVrHasOpinion(player,factionId)){
    try{return !PDZ_VR_REPUTATION.isBarred(player.uuid,factionId)}catch(ignored){}
  }
  return String(site.relation||"")!=="hostile"
}
global.pdzVrMayUseSettlement=pdzVrMayUseSettlement

function pdzVrRelationStatus(player){
  let site=typeof global.pdzSetNearestReal==="function"?global.pdzSetNearestReal(player,256):null
  if(!site){player.tell(Text.of("256m以内に稼働中の集落はありません。").yellow());return 0}
  let factionId=String(site.vrFactionId||"")
  player.tell(Text.of("=== "+String(site.name||site.id)+" / Standing ===").gold())
  player.tell(Text.of("PDZ初期関係: "+String(site.relation||"neutral")+" / "+String(site.factionLabel||site.faction)).gray())
  if(!factionId){
    player.tell(Text.of("Village Recruits勢力は未確認です。集落のNobleへ話しかけてください。").yellow())
    return 1
  }
  let value=pdzVrStanding(player,factionId),tier=pdzVrTierName(player,factionId)
  player.tell(Text.of("Village Recruits: "+factionId+" / "+value+" / "+tier).aqua())
  player.tell(Text.of(value<=-50?"攻撃対象・賞金首・契約停止":value<=-10?"契約と入隊を拒否":value<20?"日常契約":value<50?"Trusted契約・装備":value<80?"Honoured危険任務・上位装備":"Champion最高Standing")[value<=-10?"red":value>=20?"green":"gray"]())
  player.tell(Text.of("買取価格はStandingではなく村の実在庫不足で変動。高品質品はNobleのReputation ShopでStandingを支払います。").yellow())
  pdzVrComplete(player,PDZ_VR_RELATION_QUESTS.pricing)
  pdzVrSyncMilestones(player,true)
  return 1
}
global.pdzVrRelationStatus=pdzVrRelationStatus

ItemEvents.entityInteracted(event=>{
  let player=event.player,target=event.target
  if(!player||player.level.clientSide||!target||String(target.type)!=="recruits:villager_noble")return
  // Do not cancel: Village Recruits must still open its own Noble UI.
  pdzVrBindSite(player,target,true)
})

PlayerEvents.loggedIn(event=>event.server.scheduleInTicks(120,()=>pdzVrSyncMilestones(event.player,false)))
PlayerEvents.tick(event=>{if(event.player.age%200===0)pdzVrSyncMilestones(event.player,true)})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal("deadzonestanding")
  root.executes(ctx=>pdzVrRelationStatus(ctx.source.player))
  root.then(Commands.literal("status").executes(ctx=>pdzVrRelationStatus(ctx.source.player)))
  root.then(Commands.literal("native").executes(ctx=>{ctx.source.player.runCommandSilent("vrcontracts standing");return 1}))
  root.then(Commands.literal("sync").executes(ctx=>{pdzVrSyncMilestones(ctx.source.player,true);return 1}))
  event.register(root)
})

console.info("[PROJECT DEADZONE][Settlement Standing] v0.1 Village Recruits native reputation bridge loaded")
