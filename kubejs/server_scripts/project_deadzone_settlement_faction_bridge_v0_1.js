// PROJECT DEADZONE settlement/faction bridge v0.2
// Village mods own generation and resident AI. PDZ records identity, faction,
// services and regional economy, then lets existing faction systems consume it.

const PDZ_SETTLEMENT_LEDGER = "dz_activity_outpost_ledger_v1"
const PDZ_SETTLEMENT_POP_CAP = 32
const PDZ_SETTLEMENT_PRODUCTION_ROLES = ["food","medical","logistics","industry","research","salvage","fishery","forestry"]

function pdzSetRead(server) {
  let raw = server.persistentData.getString(PDZ_SETTLEMENT_LEDGER)
  if (!raw) return []
  try { let parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [] }
  catch (error) { console.error("[PDZ][Settlement] ledger parse failed: " + error); return [] }
}

function pdzSetWrite(server, sites) {
  server.persistentData.putString(PDZ_SETTLEMENT_LEDGER, JSON.stringify(sites))
}

function pdzSetUpsert(server, site) {
  let sites = pdzSetRead(server), replaced = false
  for (let i = 0; i < sites.length; i++) {
    if (String(sites[i].id || "") === String(site.id)) { sites[i] = site; replaced = true; break }
  }
  if (!replaced) sites.push(site)
  pdzSetWrite(server, sites)
  return site
}

function pdzSetHash(text) {
  text = String(text); let n = 0
  for (let i = 0; i < text.length; i++) n = (n * 31 + text.charCodeAt(i)) & 0x7fffffff
  return n
}

function pdzSetBiome(entity) {
  try { return String(entity.level.getBiome(entity.blockPosition())).toLowerCase() }
  catch (ignored) {}
  try { return String(entity.block.biomeId).toLowerCase() }
  catch (ignored) {}
  return "unknown"
}

function pdzSetEconomy(biome) {
  if (/ocean|beach|coast|river/.test(biome)) return {id:"coastal_fishery", label:"海岸漁業集落", exports:["fish","salt","ship_supplies"], imports:["medicine","tools"]}
  if (/mountain|peak|hill|slope/.test(biome)) return {id:"highland_hunting", label:"山間狩猟集落", exports:["game_meat","timber","herbs"], imports:["ammunition","fuel"]}
  if (/forest|taiga|grove/.test(biome)) return {id:"forest_outpost", label:"森林資源集落", exports:["timber","herbs","resin"], imports:["food","machine_parts"]}
  if (/desert|badlands|savanna/.test(biome)) return {id:"salvage_caravan", label:"乾燥地回収拠点", exports:["scrap","ore","fuel"], imports:["water","food"]}
  return {id:"agrarian_colony", label:"農業生存者集落", exports:["food","alcohol","medical_materials"], imports:["tools","ammunition"]}
}

function pdzSetFaction(seed, starter) {
  if (starter) return {id:"civil_defense", relation:"friendly", label:"民間防衛隊"}
  let roll = pdzSetHash(seed) % 100
  if (roll < 55) return {id:"independent", relation:"friendly", label:"独立生存者"}
  if (roll < 85) return {id:"neutral", relation:"neutral", label:"中立共同体"}
  return {id:(roll % 2 ? "raider" : "remnant"), relation:"hostile", label:(roll % 2 ? "レイダー占領地" : "残存軍占領地")}
}

function pdzRegisterStarterColony(server, site, village) {
  let record = {
    id:"settlement_restoration_colony_01", version:2,
    dimension:"minecraft:overworld", x:Number(village.x), y:Number(village.y), z:Number(village.z),
    campX:Number(site.x), campY:Number(site.y), campZ:Number(site.z),
    name:"灯火市復興コロニー", source:"mod_village_plus_survivor_camp", settlementType:"starter_colony",
    size:"large", faction:"civil_defense", factionLabel:"民間防衛隊", relation:"friendly",
    role:"restoration_hub", economy:"restoration_hub",
    exports:["starter_supplies","food","medical"], imports:["scrap","fuel","rare_materials"],
    services:{trade:true, inn:true, medical:true, job:true, repair:true},
    supply:80, alert:0, defenders:12, coreAlive:true, ownerLocked:true, residents:0
  }
  pdzSetUpsert(server, record)
  server.persistentData.putBoolean("dz_starter_colony_registered", true)
  console.info("[PDZ][Settlement] registered starter colony and Survivor Camp at " + site.x + "," + site.y + "," + site.z)
  return record
}
global.pdzRegisterStarterColony = pdzRegisterStarterColony

function pdzSetRegisterNativeVillage(entity) {
  let cellX = Math.floor(Number(entity.x) / 64), cellZ = Math.floor(Number(entity.z) / 64)
  let id = "settlement_native_" + cellX + "_" + cellZ
  let sites = pdzSetRead(entity.server)
  for (let i = 0; i < sites.length; i++) if (String(sites[i].id) === id) return sites[i]
  let biome = pdzSetBiome(entity), economy = pdzSetEconomy(biome), faction = pdzSetFaction(id + biome, false)
  let site = {
    id:id, version:2, dimension:String(entity.level.dimension),
    x:Math.floor(entity.x), y:Math.floor(entity.y), z:Math.floor(entity.z),
    name:economy.label, source:"ctov_towns_towers_or_native_village", settlementType:"survivor_colony",
    size:"medium", biome:biome, faction:faction.id, factionLabel:faction.label, relation:faction.relation,
    role:economy.id, economy:economy.id, exports:economy.exports, imports:economy.imports,
    services:{trade:faction.relation!=="hostile", inn:faction.relation==="friendly", medical:false, job:false, repair:false},
    supply:40, alert:faction.relation==="hostile"?60:10, defenders:faction.relation==="hostile"?8:4,
    coreAlive:true, ownerLocked:false, residents:0
  }
  pdzSetUpsert(entity.server, site)
  console.info("[PDZ][Settlement] discovered " + id + " biome=" + biome + " faction=" + faction.id + " economy=" + economy.id)
  return site
}

function pdzSetNearest(entity, radius) {
  let best = null, bestD = radius * radius
  pdzSetRead(entity.server).forEach(site => {
    if (String(site.dimension) !== String(entity.level.dimension)) return
    let dx = Number(site.x) - entity.x, dz = Number(site.z) - entity.z, d = dx*dx + dz*dz
    if (d < bestD) { bestD = d; best = site }
  })
  return best
}

function pdzSetRoleIndex(entity) { return pdzSetHash(entity.uuid) % 6 }

function pdzSetApplyCivilian(entity) {
  let site = pdzSetNearest(entity, 128) || pdzSetRegisterNativeVillage(entity)
  let role = ["scavenger","medic","cook","mechanic","quartermaster","resident"][pdzSetRoleIndex(entity)]
  entity.addTag("dz_resident_role_" + role); entity.addTag("dz_quest_layer_resident")
  entity.addTag("dz_relation_" + String(site.relation || "neutral"))
  entity.persistentData.putString("dz_settlement_role", role)
  entity.persistentData.putString("dz_settlement_site", String(site.id || ""))
  entity.persistentData.putString("dz_settlement_faction", String(site.faction || "independent"))
  site.residents = Number(site.residents || 0) + 1
  pdzSetUpsert(entity.server, site)
}

function pdzSetApplyRecruit(entity) {
  let site = pdzSetNearest(entity, 160), faction = site ? String(site.faction || "independent") : "independent"
  entity.addTag("dz_settlement_force"); entity.addTag("dz_force_" + faction)
  entity.addTag("dz_loadout_" + (faction === "raider" ? "scrap" : faction === "remnant" ? "military" : faction === "civil_defense" ? "security" : "survivor"))
  entity.persistentData.putString("dz_settlement_faction", faction)
  if (site) entity.persistentData.putString("dz_settlement_site", String(site.id || ""))
}

function pdzSetWorkerAllowed(entity) {
  let site = pdzSetNearest(entity, 96)
  return !!site && PDZ_SETTLEMENT_PRODUCTION_ROLES.indexOf(String(site.role || "")) >= 0
}

function pdzSetCountMca(entity) {
  let count = 0
  entity.level.entities.forEach(e => {
    if (String(e.type).indexOf("mca:") !== 0) return
    let dx=e.x-entity.x,dz=e.z-entity.z
    if(dx*dx+dz*dz<=96*96) count++
  })
  return count
}

EntityEvents.spawned(event => {
  let entity=event.entity,id=String(entity.type)
  if(id.indexOf("mca:")===0){
    if(pdzSetCountMca(entity)>PDZ_SETTLEMENT_POP_CAP){entity.server.scheduleInTicks(1,()=>entity.discard());return}
    entity.server.scheduleInTicks(4,()=>pdzSetApplyCivilian(entity))
  }else if(id.indexOf("recruits:")===0||id.indexOf("village_recruits:")===0){
    entity.server.scheduleInTicks(4,()=>pdzSetApplyRecruit(entity))
  }else if(id.indexOf("workers:")===0){
    entity.server.scheduleInTicks(4,()=>{if(!pdzSetWorkerAllowed(entity))entity.discard();else{entity.addTag("dz_limited_production_worker");entity.addTag("dz_friendly")}})
  }else if(id.indexOf("easy_npc:")===0){
    entity.server.scheduleInTicks(8,()=>{
      let site=pdzSetNearest(entity,144)
      if(site){entity.persistentData.putString("dz_settlement_site",String(site.id||""));entity.persistentData.putString("dz_settlement_faction",String(site.faction||"independent"))}
      if(entity.tags.contains("dz_wilderness_trader")||entity.tags.contains("dz_basecamp_staff"))entity.addTag("dz_quest_layer_resident")
      if(entity.tags.contains("dz_named")||entity.tags.contains("dz_faction_officer"))entity.addTag("dz_quest_layer_faction")
      if(entity.tags.contains("dz_story_npc")||entity.tags.contains("dz_story_boss"))entity.addTag("dz_quest_layer_story")
    })
  }
})

PlayerEvents.tick(event => {
  let player=event.player
  if(!player||!player.alive)return
  let scanTick=player.persistentData.getInt("dz_settlement_scan_tick")+1
  if(scanTick<100){player.persistentData.putInt("dz_settlement_scan_tick",scanTick);return}
  player.persistentData.putInt("dz_settlement_scan_tick",0)
  let site=pdzSetNearest(player,96)
  if(!site)return
  let key="dz_settlement_notice_"+String(site.id)
  if(player.persistentData.getBoolean(key))return
  player.persistentData.putBoolean(key,true)
  player.tell(Text.of("[集落発見] "+String(site.name||site.id)+" / "+String(site.factionLabel||site.faction)+" / "+String(site.relation)).gold())
  player.tell(Text.of("地域経済: "+String(site.economy||"unknown")+"　輸出: "+(site.exports||[]).join("・")).gray())
})

ServerEvents.loaded(event => {
  let server=event.server,d=server.persistentData
  if(d.getInt("dz_starter_village_state")!==2)return
  let site={x:d.getInt("dz_starter_village_origin_x"),y:d.getInt("dz_starter_village_origin_y"),z:d.getInt("dz_starter_village_origin_z")}
  let village={x:d.getInt("dz_starter_native_village_x"),y:d.getInt("dz_starter_native_village_y"),z:d.getInt("dz_starter_native_village_z")}
  pdzRegisterStarterColony(server,site,village)
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
  let q=Commands.literal("deadzonequests")
  q.executes(ctx=>pdzQuestLayers(ctx.source.player))
  q.then(Commands.literal("resident").executes(ctx=>{ctx.source.player.runCommandSilent("deadzonecontracts");return 1}))
  q.then(Commands.literal("faction").executes(ctx=>{ctx.source.player.runCommandSilent("deadzonestorybranch status");return 1}))
  q.then(Commands.literal("story").executes(ctx=>{ctx.source.player.tell(Text.of("クエストブックのメインストーリー章を開いてください。").aqua());return 1}))
  event.register(q)
  let c=Commands.literal("deadzonecolony")
  c.then(Commands.literal("status").executes(ctx=>{
    let p=ctx.source.player,site=pdzSetNearest(p,256)
    if(!site){p.tell(Text.of("256m以内に登録済み集落はありません。").yellow());return 0}
    p.tell(Text.of("=== "+String(site.name||site.id)+" ===").gold())
    p.tell(Text.of("勢力: "+String(site.factionLabel||site.faction)+" / 関係: "+String(site.relation)).aqua())
    p.tell(Text.of("経済: "+String(site.economy)+" / 輸出: "+(site.exports||[]).join("・")).gray())
    return 1
  }))
  c.then(Commands.literal("sites").requires(s=>s.hasPermission(2)).executes(ctx=>{ctx.source.player.tell(Text.of("登録集落数: "+pdzSetRead(ctx.source.server).filter(s=>String(s.id||"").indexOf("settlement_")===0).length).green());return 1}))
  event.register(c)
})

console.info("[PROJECT DEADZONE][Settlement Bridge] v0.2 settlement identity/economy/faction registry loaded")
