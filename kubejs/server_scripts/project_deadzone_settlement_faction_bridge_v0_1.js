// PROJECT DEADZONE settlement/faction bridge v0.1
// Native settlement mods own AI/economy. PDZ supplies world identity, quest
// layers and story consequences without replacing their proven simulations.

const PDZ_SETTLEMENT_LEDGER="dz_activity_outpost_ledger_v1"
const PDZ_SETTLEMENT_POP_CAP=28
const PDZ_SETTLEMENT_PRODUCTION_ROLES=["food","medical","logistics","industry","research","salvage"]

function pdzSetRead(server){
  let raw=server.persistentData.getString(PDZ_SETTLEMENT_LEDGER)
  if(!raw)return []
  try{return JSON.parse(raw)}catch(e){return []}
}
function pdzSetNearest(entity,radius){
  let best=null,bestD=radius*radius
  pdzSetRead(entity.server).forEach(site=>{
    if(String(site.dimension)!==String(entity.level.dimension))return
    let dx=Number(site.x)-entity.x,dz=Number(site.z)-entity.z,d=dx*dx+dz*dz
    if(d<bestD){bestD=d;best=site}
  })
  return best
}
function pdzSetRoleIndex(entity){
  let text=String(entity.uuid),n=0
  for(let i=0;i<text.length;i++)n=(n*31+text.charCodeAt(i))&0x7fffffff
  return n%6
}
function pdzSetApplyCivilian(entity){
  let role=["scavenger","medic","cook","mechanic","quartermaster","resident"][pdzSetRoleIndex(entity)]
  entity.addTag("dz_resident_role_"+role)
  entity.addTag("dz_quest_layer_resident")
  entity.persistentData.putString("dz_settlement_role",role)
  let site=pdzSetNearest(entity,128)
  if(site)entity.persistentData.putString("dz_settlement_site",String(site.id||""))
}
function pdzSetApplyRecruit(entity){
  let site=pdzSetNearest(entity,160),faction=site?String(site.faction||"independent"):"independent"
  entity.addTag("dz_settlement_force")
  entity.addTag("dz_force_"+faction)
  entity.addTag("dz_loadout_"+(faction==="raider"?"scrap":faction==="remnant"?"military":faction==="cdf"||faction==="civildef"?"security":"survivor"))
  entity.persistentData.putString("dz_settlement_faction",faction)
}
function pdzSetWorkerAllowed(entity){
  let site=pdzSetNearest(entity,96)
  if(!site)return false
  let role=String(site.role||"")
  return PDZ_SETTLEMENT_PRODUCTION_ROLES.indexOf(role)>=0
}
function pdzSetCountMca(entity){
  let count=0
  entity.level.entities.forEach(e=>{
    let id=String(e.type)
    if(id.indexOf("mca:")!==0)return
    let dx=e.x-entity.x,dz=e.z-entity.z
    if(dx*dx+dz*dz<=96*96)count++
  })
  return count
}

EntityEvents.spawned(event=>{
  let entity=event.entity,id=String(entity.type)
  if(id.indexOf("mca:")===0){
    if(pdzSetCountMca(entity)>PDZ_SETTLEMENT_POP_CAP){
      entity.server.scheduleInTicks(1,()=>entity.discard())
      return
    }
    entity.server.scheduleInTicks(4,()=>pdzSetApplyCivilian(entity))
  }else if(id.indexOf("recruits:")===0||id.indexOf("village_recruits:")===0){
    entity.server.scheduleInTicks(4,()=>pdzSetApplyRecruit(entity))
  }else if(id.indexOf("workers:")===0){
    entity.server.scheduleInTicks(4,()=>{
      if(!pdzSetWorkerAllowed(entity))entity.discard()
      else{entity.addTag("dz_limited_production_worker");entity.addTag("dz_friendly")}
    })
  }else if(id.indexOf("easy_npc:")===0){
    entity.server.scheduleInTicks(8,()=>{
      let site=pdzSetNearest(entity,144)
      if(site){
        entity.persistentData.putString("dz_settlement_site",String(site.id||""))
        entity.persistentData.putString("dz_settlement_faction",String(site.faction||"independent"))
      }
      if(entity.tags.contains("dz_wilderness_trader")||entity.tags.contains("dz_basecamp_staff"))entity.addTag("dz_quest_layer_resident")
      if(entity.tags.contains("dz_named")||entity.tags.contains("dz_faction_officer"))entity.addTag("dz_quest_layer_faction")
      if(entity.tags.contains("dz_story_npc")||entity.tags.contains("dz_story_boss"))entity.addTag("dz_quest_layer_story")
    })
  }
})

function pdzQuestLayers(player){
  player.tell(Text.of("=== PDZ QUEST LAYERS ===").gold())
  player.tell(Text.of("[住民依頼] ").green().append(Text.of("生活・納品・探索の短期契約 /deadzonecontracts").white()))
  player.tell(Text.of("[勢力依頼] ").aqua().append(Text.of("拠点・交易・関係改善 /deadzonestorybranch status").white()))
  player.tell(Text.of("[メイン] ").lightPurple().append(Text.of("世界Tier・ボス・終末の真相はFTB Questsで進行").white()))
  return 1
}

function pdzStoryChoiceEffect(player,key){
  let server=player.server,created=null
  // An actual field response is queued when a verdict is made. The native
  // settlement simulation remains authoritative; this adds only story beats.
  try{
    if(key==="cdf_order"||key==="remnant_defect"||key==="aegis_release")created=pdzActCreateReinforcement(server,player)
    else if(key==="cdf_coalition"||key==="raider_truce")created=pdzActCreateTradeCaravan(server,player)
    else if(key==="raider_break")created=pdzActCreateAssault(server,player,"raider")
    else if(key==="remnant_decommission")created=pdzActCreateAssault(server,player,"remnant")
  }catch(err){console.warn("[PDZ CONSEQUENCE] route unavailable for "+key+": "+err)}
  server.persistentData.putInt("dz_consequence_"+key,server.persistentData.getInt("dz_consequence_"+key)+1)
  server.persistentData.putLong("dz_camp_shops_next_rotation",0)
  player.tell(Text.of("[結果反映] 交易価格と勢力活動が変化しました。キャンプの商品は次回更新で新価格になります。").yellow())
  console.info("[PDZ CONSEQUENCE] choice="+key+" player="+player.username+" activity="+(created?created.type:"native"))
}
global.pdzStoryChoiceEffect=pdzStoryChoiceEffect

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal("deadzonequests")
  root.executes(ctx=>pdzQuestLayers(ctx.source.player))
  root.then(Commands.literal("resident").executes(ctx=>{ctx.source.player.runCommandSilent("deadzonecontracts");return 1}))
  root.then(Commands.literal("faction").executes(ctx=>{ctx.source.player.runCommandSilent("deadzonestorybranch status");return 1}))
  root.then(Commands.literal("story").executes(ctx=>{ctx.source.player.tell(Text.of("クエストブックのメインストーリー章を開いてください。").aqua());return 1}))
  event.register(root)
})

console.info("[PROJECT DEADZONE][Settlement Bridge] resident/faction/story layers and consequences loaded")
