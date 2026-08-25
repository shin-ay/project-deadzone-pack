// PROJECT DEADZONE settlement/faction bridge v0.3
// Village mods own generation and resident AI. PDZ records identity, faction,
// services and regional economy, then lets existing faction systems consume it.

const PDZ_SETTLEMENT_REGISTRIES = Java.loadClass('net.minecraft.core.registries.Registries')
const PDZ_SETTLEMENT_BLOCKPOS = Java.loadClass('net.minecraft.core.BlockPos')
const PDZ_SETTLEMENT_DECREE_ITEM = Java.loadClass('io.ejekta.bountiful.content.DecreeItem')
const PDZ_SETTLEMENT_LEDGER = "dz_activity_outpost_ledger_v1"
const PDZ_SETTLEMENT_POP_CAP = 36
const PDZ_SETTLEMENT_PRODUCTION_ROLES = ["food","medical","logistics","industry","research","salvage","fishery","forestry"]
const PDZ_SETTLEMENT_INDUSTRIES = {
  agrarian_colony: {quest:"6D52010000000102", decree:"agrarian_relief", label:"農業"},
  coastal_fishery: {quest:"6D52010000000103", decree:"coastal_relief", label:"沿岸漁業"},
  highland_hunting: {quest:"6D52010000000104", decree:"highland_relief", label:"山間狩猟"},
  forest_outpost: {quest:"6D52010000000105", decree:"forest_relief", label:"森林資源"},
  salvage_caravan: {quest:"6D52010000000106", decree:"salvage_relief", label:"回収・解体"}
}
const PDZ_SETTLEMENT_ECONOMY_QUESTS = {intro:"6D52010000000101", decree:"6D52010000000107", native:"6D52010000000108", network:"6D5201000000010A"}
const PDZ_SETTLEMENT_TUTORIAL_QUESTS = {find:"6D52010000000011", economy:"6D52010000000012", native:"6D52010000000013"}
let pdzSetDecreeErrorLogged = false

function pdzSetIsOverworld(entity) {
  try { return String(entity.level.dimension) === "minecraft:overworld" }
  catch (ignored) { return false }
}

function pdzSetRead(server) {
  let raw = server.persistentData.getString(PDZ_SETTLEMENT_LEDGER)
  if (!raw) return []
  try { let parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [] }
  catch (error) { console.error("[PDZ][Settlement] ledger parse failed: " + error); return [] }
}

function pdzSetWrite(server, sites) {
  server.persistentData.putString(PDZ_SETTLEMENT_LEDGER, JSON.stringify(sites))
}

function pdzSetIsValidSettlementRecord(site) {
  if (!site) return false
  let id = String(site.id || ""), type = String(site.settlementType || "")
  let isSettlement = id.indexOf("settlement_") === 0 || type !== ""
  if (!isSettlement) return true
  if (type === "starter_city") {
    return id === "starter_city_01" &&
      String(site.source || "") === "starter_nearest_verified_village_v7" &&
      site.structureVerified === true &&
      String(site.structureId || "") !== "" && String(site.structureInstance || "") !== ""
  }
  if (type === "starter_colony") {
    return id === "settlement_restoration_colony_01" && String(site.source || "").indexOf("starter") >= 0
  }
  return type === "survivor_colony" && site.structureVerified === true &&
    String(site.structureId || "") !== "" && String(site.structureInstance || "") !== ""
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

function pdzRegisterStarterColony(server, arrival, village) {
  let structureId = String(village.structure || village.structureId || "")
  let structureInstance = String(village.instance || (structureId + "@" + village.x + "," + village.y + "," + village.z))
  let record = {
    id:"starter_city_01", version:7,
    dimension:"minecraft:overworld", x:Number(village.x), y:Number(village.y), z:Number(village.z),
    arrivalX:Number(arrival.x), arrivalY:Number(arrival.y), arrivalZ:Number(arrival.z),
    name:"\u706f\u706b\u5e02", source:"starter_nearest_verified_village_v7", settlementType:"starter_city",
    structureVerified:true, structureId:structureId, structureInstance:structureInstance,
    structureBounds:village.bounds || null,
    size:"large", faction:"civil_defense", factionLabel:"\u6c11\u9593\u9632\u885b\u8ecd", relation:"friendly",
    role:"starter_city", economy:"regional_hub",
    exports:["food","medical","repair_parts"], imports:["scrap","fuel","rare_materials"],
    services:{trade:true, inn:true, medical:true, job:true, repair:true},
    supply:80, alert:0, defenders:0, coreAlive:true, ownerLocked:true, residents:0
  }
  pdzSetUpsert(server, record)
  server.persistentData.putBoolean("dz_starter_colony_registered", true)
  console.info("[PDZ][Settlement] registered starter city at " + village.x + "," + village.y + "," + village.z)
  return record
}
global.pdzRegisterStarterColony = pdzRegisterStarterColony

function pdzSetRegisterNativeVillage(entity) {
  if (!pdzSetIsOverworld(entity)) return null
  // A resident position is not a settlement.  MCA villagers can wander through
  // forests, roads and adjacent chunks, so only a real village structure may
  // create a colony record.  CTOV and Towns and Towers both register their
  // villages in the vanilla structure registry and are covered here.
  let village = pdzSetFindVillageStructure(entity, 64)
  if (!village) {
    let starter = pdzSetNearest(entity, 192)
    if (starter && ["starter_city", "starter_colony"].indexOf(String(starter.settlementType || "")) >= 0) return starter
    return null
  }
  let id = "settlement_village_" + pdzSetHash(village.instance)
  let sites = pdzSetRead(entity.server)
  for (let i = 0; i < sites.length; i++) {
    if (String(sites[i].id) === id || String(sites[i].structureInstance || "") === village.instance) return sites[i]
  }
  let biome = pdzSetBiome(entity), economy = pdzSetEconomy(biome), faction = pdzSetFaction(id + biome, false)
  let site = {
    id:id, version:3, dimension:String(entity.level.dimension),
    x:village.x, y:village.y, z:village.z,
    name:economy.label, source:"verified_village_structure", settlementType:"survivor_colony",
    structureVerified:true, structureId:village.structureId, structureInstance:village.instance,
    structureBounds:village.bounds,
    size:"medium", biome:biome, faction:faction.id, factionLabel:faction.label, relation:faction.relation,
    role:economy.id, economy:economy.id, exports:economy.exports, imports:economy.imports,
    services:{trade:faction.relation!=="hostile", inn:faction.relation==="friendly", medical:false, job:false, repair:false},
    supply:40, alert:faction.relation==="hostile"?60:10, defenders:faction.relation==="hostile"?8:4,
    coreAlive:true, ownerLocked:false, residents:0
  }
  pdzSetUpsert(entity.server, site)
  console.info("[PDZ][Settlement] verified village " + village.structureId + " as " + id + " biome=" + biome + " faction=" + faction.id + " economy=" + economy.id)
  return site
}

function pdzSetIsVillageStructure(structureId) {
  structureId = String(structureId || "").toLowerCase()
  let split = structureId.split(":"), namespace = split.length > 1 ? split[0] : "", path = split.length > 1 ? split[1] : split[0]
  if (path.indexOf("pillager") >= 0 || path.indexOf("outpost") >= 0 || path.indexOf("wandering_trader") >= 0) return false
  if (namespace === "minecraft") return path.indexOf("village_") === 0
  if (namespace === "ctov" || namespace === "towns_and_towers") return path.indexOf("village") >= 0
  return false
}

function pdzSetFindVillageStructure(entity, radius) {
  if (!pdzSetIsOverworld(entity)) return null
  try {
    let registry = entity.level.registryAccess().registryOrThrow(PDZ_SETTLEMENT_REGISTRIES.STRUCTURE)
    let manager = entity.level.structureManager()
    let px = Math.floor(Number(entity.x)), py = Math.floor(Number(entity.y)), pz = Math.floor(Number(entity.z))
    let step = 16
    for (let ring = 0; ring <= radius; ring += step) {
      for (let dx = -ring; dx <= ring; dx += step) for (let dz = -ring; dz <= ring; dz += step) {
        if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue
        if (dx * dx + dz * dz > radius * radius) continue
        let probe = new PDZ_SETTLEMENT_BLOCKPOS(px + dx, py, pz + dz)
        if (!entity.level.hasChunkAt(probe)) continue
        let starts = manager.getAllStructuresAt(probe)
        if (!starts || starts.isEmpty()) continue
        let structures = starts.keySet().toArray()
        for (let i = 0; i < structures.length; i++) {
          let structure = structures[i], structureId = String(registry.getKey(structure))
          if (!pdzSetIsVillageStructure(structureId)) continue
          let start = null
          try { start = manager.getStructureAt(probe, structure) } catch (ignored) {}
          if (!start || !start.isValid()) {
            try { start = manager.getStructureWithPieceAt(probe, structure) } catch (ignored) {}
          }
          if (!start || !start.isValid()) continue
          let box = start.getBoundingBox()
          let minX = Number(box.minX()), minY = Number(box.minY()), minZ = Number(box.minZ())
          let maxX = Number(box.maxX()), maxY = Number(box.maxY()), maxZ = Number(box.maxZ())
          return {
            structureId:structureId,
            x:Math.floor((minX + maxX) / 2), y:minY + 1, z:Math.floor((minZ + maxZ) / 2),
            bounds:{minX:minX,minY:minY,minZ:minZ,maxX:maxX,maxY:maxY,maxZ:maxZ},
            instance:String(entity.level.dimension) + "|village|" + structureId + "|" + minX + "|" + minY + "|" + minZ
          }
        }
      }
    }
  } catch (err) {
    try {
      if (!entity.server.persistentData.getBoolean("dz_village_structure_scan_warned")) {
        entity.server.persistentData.putBoolean("dz_village_structure_scan_warned", true)
        console.warn("[PDZ][Settlement] village structure scan failed: " + err)
      }
    } catch (ignored) {}
  }
  return null
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

function pdzSetHasLoadedAnchor(entity, site, radius) {
  if (!entity || !site) return false
  if (site.structureVerified === true) return true
  let siteId = String(site.id || ""), found = false, r2 = radius * radius
  entity.level.entities.forEach(e => {
    if (found || !e || e === entity) return
    let dx = Number(e.x) - Number(site.x || 0), dz = Number(e.z) - Number(site.z || 0)
    if (dx * dx + dz * dz > r2) return
    let linked = ""
    try { linked = String(e.persistentData.getString("dz_settlement_site") || "") } catch (ignored) {}
    if (linked && linked === siteId) { found = true; return }
    let type = String(e.type || "")
    if (type.indexOf("mca:") === 0 || type.indexOf("recruits:") === 0 || type.indexOf("village_recruits:") === 0) {
      if (!linked && String(site.settlementType || "") === "survivor_colony") found = true
      return
    }
    try {
      if (e.tags.contains("dz_wilderness_site") || e.tags.contains("dz_basecamp_staff") || e.tags.contains("dz_settlement_force")) found = true
    } catch (ignored) {}
  })
  return found
}

function pdzSetNearestReal(entity, radius) {
  let best = null, bestD = radius * radius
  pdzSetRead(entity.server).forEach(site => {
    if (String(site.dimension) !== String(entity.level.dimension)) return
    let dx = Number(site.x) - entity.x, dz = Number(site.z) - entity.z, d = dx * dx + dz * dz
    if (d >= bestD || !pdzSetHasLoadedAnchor(entity, site, 160)) return
    bestD = d; best = site
  })
  return best
}

// Public read-only/binding hooks for bridges that integrate an existing
// settlement mod. The settlement ledger stays authoritative in this file.
global.pdzSetNearestReal = pdzSetNearestReal
global.pdzSetUpsert = pdzSetUpsert

function pdzSetDistance(entity, site) {
  let dx = Number(site.x || 0) - Number(entity.x), dz = Number(site.z || 0) - Number(entity.z)
  return Math.floor(Math.sqrt(dx * dx + dz * dz))
}

function pdzSetTellLocation(player, site) {
  let x = Math.floor(Number(site.x || 0)), y = Math.floor(Number(site.y || 64)), z = Math.floor(Number(site.z || 0))
  let distance = pdzSetDistance(player, site)
  player.tell(Text.of("中心座標: X " + x + " / Y " + y + " / Z " + z + "　現在地から約 " + distance + "m").aqua())
  player.tell(Text.of("JourneyMapには、読み込まれた住民・護衛・施設が存在する集落だけ表示されます。").gray())
}

function pdzSetComplete(player, quest) {
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + quest)
}

function pdzSetIndustryCount(player) {
  let count = 0
  Object.keys(PDZ_SETTLEMENT_INDUSTRIES).forEach(role => {
    if (player.persistentData.getBoolean("dz_settlement_industry_" + role)) count++
  })
  return count
}

function pdzSetSyncIndustry(player, site, notify) {
  if (!site || String(site.relation || "") === "hostile") return false
  if (typeof global.pdzVrMayUseSettlement === "function" && !global.pdzVrMayUseSettlement(player, site)) return false
  let role = String(site.economy || ""), industry = PDZ_SETTLEMENT_INDUSTRIES[role]
  if (!industry) return false
  let discoveredKey = "dz_settlement_industry_" + role
  if (!player.persistentData.getBoolean(discoveredKey)) {
    player.persistentData.putBoolean(discoveredKey, true)
    pdzSetComplete(player, industry.quest)
    if (notify) player.tell(Text.of("[産業発見] " + industry.label + "の地域取引が利用可能になりました。").green())
  }
  let decreeKey = "dz_settlement_decree_v2_" + role
  if (!player.persistentData.getBoolean(decreeKey)) {
    try {
      let stack = PDZ_SETTLEMENT_DECREE_ITEM.Companion.create(industry.decree)
      player.give(stack)
      player.persistentData.putBoolean(decreeKey, true)
      pdzSetComplete(player, PDZ_SETTLEMENT_ECONOMY_QUESTS.decree)
      player.tell(Text.of(industry.label + "のBountiful産業令状を受領。Bounty Boardへ挿入すると、その土地の輸入品と輸出品だけで依頼が生成されます。").aqua())
    } catch (error) {
      if (!pdzSetDecreeErrorLogged) {
        pdzSetDecreeErrorLogged = true
        console.error("[PDZ][Settlement] Bountiful decree creation failed: " + error)
      }
    }
  }
  if (pdzSetIndustryCount(player) >= 3 && !player.persistentData.getBoolean("dz_settlement_industry_network_complete")) {
    player.persistentData.putBoolean("dz_settlement_industry_network_complete", true)
    pdzSetComplete(player, PDZ_SETTLEMENT_ECONOMY_QUESTS.network)
    player.tell(Text.of("[地域産業網] 3種類の集落産業を確認。地域物流と産業令状を組み合わせられるようになりました。").gold())
  }
  return true
}

function pdzSetRoleIndex(entity) { return pdzSetHash(entity.uuid) % 6 }

function pdzSetApplyCivilian(entity) {
  let site = pdzSetRegisterNativeVillage(entity)
  if (!site) return
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
  let starterGuard = entity.tags.contains("dz_starter_colony_guard") || entity.tags.contains("dz_colony_guard") ||
    entity.tags.contains("dz_basecamp_guard") || entity.tags.contains("dz_survivor_guard")
  let site = starterGuard ? null : pdzSetNearest(entity, 160)
  let faction = starterGuard ? "civil_defense" : (site ? String(site.faction || "independent") : "independent")
  ;["civil_defense","independent","raider","remnant","ash_jackals","helix","infected"].forEach(value =>
    entity.removeTag("dz_force_" + value))
  entity.addTag("dz_settlement_force"); entity.addTag("dz_force_" + faction)
  entity.addTag("dz_loadout_" + (faction === "raider" ? "scrap" : faction === "remnant" ? "military" : faction === "civil_defense" ? "security" : "survivor"))
  entity.persistentData.putString("dz_settlement_faction", faction)
  if (site) entity.persistentData.putString("dz_settlement_site", String(site.id || ""))
  if (faction === "civil_defense" || faction === "independent") {
    entity.addTag("dz_survivor_guard"); entity.addTag("dz_survivor"); entity.addTag("dz_friendly")
    entity.removeTag("dz_hostile"); entity.removeTag("dz_enemy")
    entity.runCommandSilent("team join dz_survivors @s")
  } else {
    entity.addTag("dz_hostile"); entity.addTag("dz_enemy")
    entity.removeTag("dz_friendly"); entity.removeTag("dz_survivor")
  }
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
  if(!pdzSetIsOverworld(entity))return
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
  if(!pdzSetIsOverworld(player)){
    player.persistentData.putInt("dz_settlement_scan_tick",0)
    return
  }
  let scanTick=player.persistentData.getInt("dz_settlement_scan_tick")+1
  if(scanTick<100){player.persistentData.putInt("dz_settlement_scan_tick",scanTick);return}
  player.persistentData.putInt("dz_settlement_scan_tick",0)
  // Register discovery from the village structure itself.  This works even if
  // MCA conversion is delayed and never turns an arbitrary NPC coordinate into
  // a map settlement.
  pdzSetRegisterNativeVillage(player)
  let site=pdzSetNearestReal(player,96)
  if(!site)return
  player.persistentData.putBoolean("dz_settlement_tutorial_find",true)
  player.persistentData.putBoolean("dz_settlement_tutorial_economy",true)
  pdzSetComplete(player,PDZ_SETTLEMENT_TUTORIAL_QUESTS.find)
  pdzSetComplete(player,PDZ_SETTLEMENT_TUTORIAL_QUESTS.economy)
  pdzSetSyncIndustry(player,site,true)
  let key="dz_settlement_notice_"+String(site.id)
  if(player.persistentData.getBoolean(key))return
  player.persistentData.putBoolean(key,true)
  player.tell(Text.of("[集落発見] "+String(site.name||site.id)+" / "+String(site.factionLabel||site.faction)+" / "+String(site.relation)).gold())
  player.tell(Text.of("[地域産業] 輸出: "+(site.exports||[]).join("・")+"｜不足: "+(site.imports||[]).join("・")).aqua())
  if(String(site.relation||"")==="hostile" ||
    (typeof global.pdzVrMayUseSettlement === "function" && !global.pdzVrMayUseSettlement(player,site))){
    player.tell(Text.of("占領中の敵対集落では、商人・Noble契約・産業令状を利用できません。解放後に再訪してください。").red())
  }else{
    pdzSetComplete(player,PDZ_SETTLEMENT_ECONOMY_QUESTS.native)
    player.tell(Text.of("商人はVillage Recruitsの実在庫、Nobleは不足契約、掲示板はBountiful依頼を扱います。詳しい操作はFTB Questsの『地域集落・産業』章で確認できます。").gray())
  }
  pdzSetTellLocation(player, site)
})

ServerEvents.loaded(event => {
  let server=event.server,d=server.persistentData
  // Remove coordinate-cell colonies created by pre-v0.3 builds.  They were not
  // backed by a village structure and are the source of empty map labels.
  let before=pdzSetRead(server),after=before.filter(site=>pdzSetIsValidSettlementRecord(site))
  if(after.length!==before.length){
    pdzSetWrite(server,after)
    console.info("[PDZ][Settlement] removed "+(before.length-after.length)+" unverified legacy village cells")
  }
  if(d.getInt("dz_starter_village_state")!==2)return
  let site={x:d.getInt("dz_starter_village_origin_x"),y:d.getInt("dz_starter_village_origin_y"),z:d.getInt("dz_starter_village_origin_z")}
  let village={x:d.getInt("dz_starter_native_village_x"),y:d.getInt("dz_starter_native_village_y"),z:d.getInt("dz_starter_native_village_z")}
  pdzRegisterStarterColony(server,site,village)
})

function pdzQuestLayers(player){
  player.tell(Text.of("=== PDZ QUEST LAYERS ===").gold())
  player.tell(Text.of("[住民依頼] ").green().append(Text.of("Base Coreの依頼掲示板：生活・納品・探索の短期契約").white()))
  player.tell(Text.of("[勢力依頼] ").aqua().append(Text.of("Base Coreの勢力判断：拠点・交易・関係改善").white()))
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
    let p=ctx.source.player,site=pdzSetNearestReal(p,256)
    if(!site){p.tell(Text.of("256m以内に登録済み集落はありません。").yellow());return 0}
    p.tell(Text.of("=== "+String(site.name||site.id)+" ===").gold())
    p.tell(Text.of("勢力: "+String(site.factionLabel||site.faction)+" / 関係: "+String(site.relation)).aqua())
    p.tell(Text.of("経済: "+String(site.economy)+" / 輸出: "+(site.exports||[]).join("・")+" / 需要: "+(site.imports||[]).join("・")).gray())
    p.persistentData.putBoolean("dz_settlement_tutorial_find",true)
    pdzSetComplete(p,PDZ_SETTLEMENT_TUTORIAL_QUESTS.find)
    pdzSetTellLocation(p,site)
    return 1
  }))
  c.then(Commands.literal("economy").executes(ctx=>{
    let p=ctx.source.player,site=pdzSetNearestReal(p,128)
    if(!site){p.tell(Text.of("128m以内に稼働中の集落はありません。").yellow());return 0}
    p.persistentData.putBoolean("dz_settlement_tutorial_find",true)
    p.persistentData.putBoolean("dz_settlement_tutorial_economy",true)
    pdzSetComplete(p,PDZ_SETTLEMENT_TUTORIAL_QUESTS.find)
    pdzSetComplete(p,PDZ_SETTLEMENT_TUTORIAL_QUESTS.economy)
    if(p.persistentData.getBoolean("dz_settlement_tutorial_native"))pdzSetComplete(p,PDZ_SETTLEMENT_ECONOMY_QUESTS.intro)
    p.tell(Text.of("=== "+String(site.name||site.id)+" 地域産業 ===").gold())
    p.tell(Text.of("輸出: "+(site.exports||[]).join("・")+"｜不足: "+(site.imports||[]).join("・")).aqua())
    if(String(site.relation||"")==="hostile" ||
      (typeof global.pdzVrMayUseSettlement === "function" && !global.pdzVrMayUseSettlement(p,site))){
      p.tell(Text.of("占領中の敵対集落では商人、Noble契約、産業令状を利用できません。").red())
      return 1
    }
    pdzSetSyncIndustry(p,site,true)
    pdzSetComplete(p,PDZ_SETTLEMENT_ECONOMY_QUESTS.native)
    p.tell(Text.of("Village Recruits: 商人は実在庫、Nobleは実際の不足から契約を生成。Bountiful Boardには受領した産業令状を挿入します。").gray())
    p.tell(Text.of("[Village Recruits案内]").aqua().clickRunCommand("/deadzonecolony native_help"))
    return 1
  }))
  c.then(Commands.literal("relation").executes(ctx=>{
    let p=ctx.source.player
    if(typeof global.pdzVrRelationStatus==="function")return global.pdzVrRelationStatus(p)
    p.tell(Text.of("Village Recruits Standing連携は現在利用できません。").yellow())
    return 0
  }))
  c.then(Commands.literal("nearest").executes(ctx=>{
    let p=ctx.source.player,site=pdzSetNearestReal(p,2048)
    if(!site){p.tell(Text.of("半径2048m以内に登録済みの集落はありません。").yellow());return 0}
    p.persistentData.putBoolean("dz_settlement_tutorial_find",true)
    pdzSetComplete(p,PDZ_SETTLEMENT_TUTORIAL_QUESTS.find)
    p.tell(Text.of("[最寄りの集落] "+String(site.name||site.id)+" / "+String(site.factionLabel||site.faction)).gold())
    pdzSetTellLocation(p,site)
    return 1
  }))
  c.then(Commands.literal("sites").requires(s=>s.hasPermission(2)).executes(ctx=>{ctx.source.player.tell(Text.of("登録集落数: "+pdzSetRead(ctx.source.server).filter(s=>String(s.id||"").indexOf("settlement_")===0).length).green());return 1}))
  c.then(Commands.literal("cleanup_legacy").requires(s=>s.hasPermission(2)).executes(ctx=>{
    let server=ctx.source.server,before=pdzSetRead(server)
    let after=before.filter(site=>pdzSetIsValidSettlementRecord(site))
    pdzSetWrite(server,after)
    ctx.source.player.tell(Text.of("[PDZ] Removed "+(before.length-after.length)+" unverified legacy settlement markers.").green())
    return before.length-after.length
  }))
  c.then(Commands.literal("rescan").requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player,site=pdzSetRegisterNativeVillage(p)
    if(!site){
      p.tell(Text.of("[PDZ] No supported village structure was found within 64m.").yellow())
      return 0
    }
    p.tell(Text.of("[PDZ] Verified village: "+String(site.name||site.id)+" / "+String(site.structureId||"unknown")).green())
    pdzSetTellLocation(p,site)
    return 1
  }))
  c.then(Commands.literal("native_help").executes(ctx=>{
    let p=ctx.source.player
    if(p.persistentData.getBoolean("dz_settlement_tutorial_economy")){
      p.persistentData.putBoolean("dz_settlement_tutorial_native",true)
      pdzSetComplete(p,PDZ_SETTLEMENT_TUTORIAL_QUESTS.native)
    }else{
      p.tell(Text.of("チュートリアル進行には先に実在集落で /deadzonecolony economy を実行してください。").yellow())
    }
    p.tell(Text.of("=== Village Recruits settlement layer ===").gold())
    p.tell(Text.of("/vrvillages : village/faction overview").aqua())
    p.tell(Text.of("/villcenters : registered village centers").aqua())
    p.tell(Text.of("/vrconvoy : ground convoy status").aqua())
    p.tell(Text.of("/vrcontracts : settlement contracts").aqua())
    p.tell(Text.of("PDZ owns story/economy labels; Village Recruits owns AI, defense, trade and convoys.").gray())
    return 1
  }))
  c.then(Commands.literal("native_status").requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player
    p.runCommandSilent("vrvillages")
    p.runCommandSilent("villcenters")
    p.runCommandSilent("vrconvoy")
    return 1
  }))
  event.register(c)
})

console.info("[PROJECT DEADZONE][Settlement Bridge] v0.3 structure-verified village registry loaded")
