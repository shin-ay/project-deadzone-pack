// PROJECT DEADZONE settlement liberation v0.1
// Village Recruits owns factions, diplomacy, rebellion, soldiers, sieges and
// claim transfer. PDZ only observes a real claim-owner change and reopens the
// settlement ledger when the new owner is the observing player's faction.

const PDZ_LIB_BLOCKPOS = Java.loadClass("net.minecraft.core.BlockPos")
const PDZ_LIB_CLAIMS = Java.loadClass("com.example.villagerecruits.claim.VillageClaimIntegration")
const PDZ_LIB_FACTIONS = Java.loadClass("com.example.villagerecruits.faction.VillageFactionManager")
const PDZ_LIB_GARRISON = Java.loadClass("com.example.villagerecruits.intel.GarrisonIntel")
const PDZ_LIB_STOCK = Java.loadClass("com.example.villagerecruits.economy.materials.VillageMaterialStock")
const PDZ_LIB_RESOURCE = Java.loadClass("com.example.villagerecruits.economy.materials.ResourceFamily")
const PDZ_LIB_POPULATION = Java.loadClass("com.example.villagerecruits.economy.VillagePopulationLedger")
const PDZ_LIB_TECH_ACCESS = Java.loadClass("com.example.villagerecruits.technology.TechAccess")
const PDZ_LIB_TECH = Java.loadClass("com.example.villagerecruits.technology.Technology")
const PDZ_LIB_MERCHANTS = Java.loadClass("com.example.villagerecruits.economy.merchant.MerchantPosts")

const PDZ_LIB_QUESTS = {
  occupied:"6D55010000000101", routes:"6D55010000000102",
  rebellion:"6D55010000000103", siege:"6D55010000000104",
  liberated:"6D55010000000105", reopened:"6D55010000000106",
  security:"6D55010000000107", supply:"6D55010000000108",
  staffed:"6D55010000000109", research:"6D55010000000110",
  services:"6D55010000000111"
}

let pdzLibErrorLogged=false

function pdzLibComplete(player,id){
  player.server.runCommandSilent("ftbquests change_progress "+player.username+" complete "+id)
}

function pdzLibPlayerFactionId(player){
  try{
    let faction=PDZ_LIB_FACTIONS.getFactionForPlayer(player)
    return faction?String(faction.id||""):""
  }catch(ignored){return ""}
}

function pdzLibClaimOwner(player,site){
  try{
    if(!site||site.vrCenterX===undefined||site.vrCenterZ===undefined)return ""
    let pos=new PDZ_LIB_BLOCKPOS(Math.floor(Number(site.vrCenterX)),Math.floor(Number(site.vrCenterY||64)),Math.floor(Number(site.vrCenterZ)))
    if(!player.level.hasChunkAt(pos))return ""
    return String(PDZ_LIB_CLAIMS.getFactionIdAt(player.level,pos)||"")
  }catch(error){
    if(!pdzLibErrorLogged){pdzLibErrorLogged=true;console.error("[PDZ][Settlement Liberation] claim read failed: "+error)}
    return ""
  }
}

function pdzLibFactionLabel(factionId){
  try{return String(PDZ_LIB_FACTIONS.getVillageOwnerName(String(factionId))||factionId)}
  catch(ignored){return String(factionId)}
}

function pdzLibSave(player,site){
  if(typeof global.pdzSetUpsert==="function")global.pdzSetUpsert(player.server,site)
}

function pdzLibCenter(site){
  return new PDZ_LIB_BLOCKPOS(Math.floor(Number(site.vrCenterX)),Math.floor(Number(site.vrCenterY||64)),Math.floor(Number(site.vrCenterZ)))
}

function pdzLibRecoveryState(player,site){
  if(!site||site.liberated!==true)return null
  try{
    let owner=pdzLibClaimOwner(player,site),mine=pdzLibPlayerFactionId(player)
    if(!owner||owner!==mine)return null
    let faction=PDZ_LIB_FACTIONS.getFaction(owner),center=pdzLibCenter(site)
    if(!faction||!player.level.hasChunkAt(center))return null
    let report=PDZ_LIB_GARRISON.survey(player.level,owner,center,96.0)
    let wood=Number(PDZ_LIB_STOCK.get(faction,PDZ_LIB_RESOURCE.WOOD))
    let stone=Number(PDZ_LIB_STOCK.get(faction,PDZ_LIB_RESOURCE.STONE))
    let sand=Number(PDZ_LIB_STOCK.get(faction,PDZ_LIB_RESOURCE.SAND))
    let wool=Number(PDZ_LIB_STOCK.get(faction,PDZ_LIB_RESOURCE.WOOL))
    let population=Number(PDZ_LIB_POPULATION.population(player.level,faction,center))
    let workers=Number(faction.getWorkers())
    let militia=Number(PDZ_LIB_TECH_ACCESS.effectiveLevel(faction,PDZ_LIB_TECH.MILITIA))
    let garrisons=Number(PDZ_LIB_TECH_ACCESS.effectiveLevel(faction,PDZ_LIB_TECH.GARRISONS))
    let firearms=Number(PDZ_LIB_TECH_ACCESS.effectiveLevel(faction,PDZ_LIB_TECH.BASIC_FIREARMS))
    let merchants=Number(PDZ_LIB_MERCHANTS.countFor(center))
    let state={
      soldiers:Number(report.soldiers()),strength:Number(report.strength()),firearmSoldiers:Number(report.firearms()),
      wood:wood,stone:stone,sand:sand,wool:wool,population:population,workers:workers,
      militia:militia,garrisons:garrisons,firearms:firearms,merchants:merchants
    }
    state.security=state.soldiers>=3
    state.supply=state.security&&wood>=64&&stone>=64&&(sand+wool)>=32
    state.staffed=state.supply&&population>=4&&workers>=1
    state.research=state.staffed&&militia>=1&&(garrisons>=1||firearms>=1)
    state.services=state.research&&merchants>=1
    return state
  }catch(error){
    if(!pdzLibErrorLogged){pdzLibErrorLogged=true;console.error("[PDZ][Settlement Recovery] native state read failed: "+error)}
    return null
  }
}

function pdzLibObserveRecovery(player,site){
  let state=pdzLibRecoveryState(player,site)
  if(!state)return null
  if(state.security)pdzLibComplete(player,PDZ_LIB_QUESTS.security)
  if(state.supply)pdzLibComplete(player,PDZ_LIB_QUESTS.supply)
  if(state.staffed)pdzLibComplete(player,PDZ_LIB_QUESTS.staffed)
  if(state.research)pdzLibComplete(player,PDZ_LIB_QUESTS.research)
  if(state.services)pdzLibComplete(player,PDZ_LIB_QUESTS.services)
  return state
}

function pdzLibObserve(player,site,notify){
  if(!player||!site)return false
  let relation=String(site.relation||"neutral")
  let occupation=String(site.vrOccupationFactionId||"")
  let bound=String(site.vrFactionId||"")

  if(relation==="hostile"&&!occupation&&bound){
    occupation=bound
    site.vrOccupationFactionId=occupation
    site.vrObservedOwnerFactionId=occupation
    pdzLibSave(player,site)
  }
  if(!occupation)return false
  pdzLibComplete(player,PDZ_LIB_QUESTS.occupied)

  let current=pdzLibClaimOwner(player,site)
  if(!current)return false
  let observed=String(site.vrObservedOwnerFactionId||occupation)
  if(bound!==current){site.vrPreviousFactionId=bound;site.vrFactionId=current}

  // Only the first nearby observation of a real owner transition may award a
  // liberation. Joining the winning faction later must not retroactively turn
  // somebody else's conquest into the player's achievement.
  if(observed===current){pdzLibSave(player,site);return false}
  site.vrObservedOwnerFactionId=current
  site.vrOwnerChangedAt=Number(player.level.gameTime)

  let playerFaction=pdzLibPlayerFactionId(player)
  if(current===occupation||!playerFaction||playerFaction!==current){pdzLibSave(player,site);return false}

  if(site.liberated!==true){
    site.liberated=true
    site.liberatedAt=Number(player.level.gameTime)
    site.liberatedByFactionId=current
    site.relation="neutral"
    site.faction=current
    site.factionLabel=pdzLibFactionLabel(current)
    site.alert=Math.min(Number(site.alert||20),20)
    if(!site.services)site.services={}
    site.services.trade=true
    pdzLibSave(player,site)
    if(notify)player.tell(Text.of("[集落解放] "+String(site.name||site.id)+"のClaim所有者があなたの勢力へ移りました。市場を再開します。").green())
  }
  pdzLibComplete(player,PDZ_LIB_QUESTS.liberated)
  pdzLibComplete(player,PDZ_LIB_QUESTS.reopened)
  pdzLibObserveRecovery(player,site)
  return true
}
global.pdzLiberationObserve=pdzLibObserve

function pdzLibNearest(player){
  return typeof global.pdzSetNearestReal==="function"?global.pdzSetNearestReal(player,256):null
}

function pdzLibStatus(player){
  let site=pdzLibNearest(player)
  if(!site){player.tell(Text.of("256m以内に稼働中の集落はありません。").yellow());return 0}
  pdzLibObserve(player,site,true)
  let occupation=String(site.vrOccupationFactionId||"未記録")
  let current=pdzLibClaimOwner(player,site)||"未読込"
  let mine=pdzLibPlayerFactionId(player)||"未所属"
  player.tell(Text.of("=== "+String(site.name||site.id)+" / Claim ===").gold())
  player.tell(Text.of("占領開始時: "+occupation).gray())
  player.tell(Text.of("現在の所有者: "+current+" / 自勢力: "+mine).aqua())
  player.tell(Text.of(site.liberated===true?"状態: 解放済み・交易再開":"状態: 占領継続。所有者変更だけではなく、自勢力による取得が必要")[site.liberated===true?"green":"red"]())
  let recovery=pdzLibObserveRecovery(player,site)
  if(recovery){
    player.tell(Text.of("守備兵 "+recovery.soldiers+" / 戦力 "+recovery.strength.toFixed(1)+" / 銃兵 "+recovery.firearmSoldiers).gray())
    player.tell(Text.of("備蓄 木材 "+recovery.wood+"・石材 "+recovery.stone+"・砂 "+recovery.sand+"・羊毛 "+recovery.wool).gray())
    player.tell(Text.of("人口 "+recovery.population+" / Worker "+recovery.workers+" / 商人拠点 "+recovery.merchants).aqua())
    player.tell(Text.of("技術 Militia "+recovery.militia+"・Garrisons "+recovery.garrisons+"・Basic Firearms "+recovery.firearms).lightPurple())
  }
  return 1
}

function pdzLibGuide(player){
  player.tell(Text.of("=== Village Recruits純正・解放手順 ===").gold())
  player.tell(Text.of("外部攻略: 勢力へ参加または作成 → 純正外交で宣戦 → Recruitと攻撃 → 守備隊を排除 → Claim占領完了まで維持。").aqua())
  player.tell(Text.of("内部反乱: 村勢力の一員・自前Recruit 3人・村不満度50%以上 → Village Leaderへ申請 → 承認後60秒以内に自勢力を作成。").yellow())
  player.tell(Text.of("勢力画面は /vrfaction（管理者権限が必要な環境あり）。村・戦況の通常UIとLeader会話を優先してください。").gray())
  player.tell(Text.of("PDZは兵士Spawn、宣戦、Claim移譲を代行しません。集落の状態表示は純正システムの結果を読むだけです。").gray())
  pdzLibComplete(player,PDZ_LIB_QUESTS.routes)
  pdzLibComplete(player,PDZ_LIB_QUESTS.rebellion)
  pdzLibComplete(player,PDZ_LIB_QUESTS.siege)
  return 1
}

PlayerEvents.tick(event=>{
  let player=event.player
  if(player.age%200!==0)return
  let site=pdzLibNearest(player)
  if(site){pdzLibObserve(player,site,true);pdzLibObserveRecovery(player,site)}
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal("deadzoneliberation")
  root.executes(ctx=>pdzLibStatus(ctx.source.player))
  root.then(Commands.literal("status").executes(ctx=>pdzLibStatus(ctx.source.player)))
  root.then(Commands.literal("guide").executes(ctx=>pdzLibGuide(ctx.source.player)))
  root.then(Commands.literal("sync").executes(ctx=>{let p=ctx.source.player,s=pdzLibNearest(p);return s&&pdzLibObserve(p,s,true)?1:pdzLibStatus(p)}))
  event.register(root)
})

console.info("[PROJECT DEADZONE][Settlement Liberation] v0.1 native Village Recruits claim observer loaded")
