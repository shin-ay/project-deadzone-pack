// PROJECT DEADZONE wilderness faction sites v0.1
// Detects existing generated structures when a player enters them and assigns
// a stable occupation. ChaosZ cities are always lawless ruins. Each city keeps
// a persistent activity profile; buildings only select an expedition force,
// facility role, loot and garrison makeup from that profile.
// No forced chunks and no global structure scans.

const PDZ_WILD_REGISTRIES = Java.loadClass('net.minecraft.core.registries.Registries')
const PDZ_WILD_RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
const PDZ_WILD_BLOCKPOS = Java.loadClass('net.minecraft.core.BlockPos')
const PDZ_WILD_HEIGHTMAP = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
const PDZ_WILD_STRING_ARG = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
const PDZ_WILD_REGISTRY_KEY = 'dz_wild_site_registry_v2'
const PDZ_WILD_CITY_REGISTRY_KEY = 'dz_chaosz_city_registry_v1'
let PDZ_WILD_LOSTCITIES = null
try { PDZ_WILD_LOSTCITIES = Java.loadClass('mcjty.lostcities.LostCities') }
catch (ignored) { console.warn('[PROJECT DEADZONE] Lost Cities API unavailable; city occupation disabled') }

const PDZ_WILD_SITES = {
  // Apocalypse Now structures intentionally kept as wilderness locations.
  'apocalypsenow:military_st':        {type:'military', preferred:'remnant', trade:'civildef'},
  'apocalypsenow:post':               {type:'checkpoint', preferred:'civildef', trade:'civildef'},
  'apocalypsenow:ruins_1':            {type:'ruins', preferred:'infected'},
  'apocalypsenow:ruins_2':            {type:'ruins', preferred:'infected'},
  'apocalypsenow:scrapyard':          {type:'scrapyard', preferred:'raider', trade:'independent'},
  'apocalypsenow:survivorcamp':       {type:'survivor_camp', preferred:'survivor', trade:'survivor'},

  // Radio Towers.
  'radiotowers:radiotower':           {type:'radio', preferred:'civildef', trade:'civildef'},
  'radiotowers:radiotower_2':         {type:'radio', preferred:'remnant'},
  'radiotowers:radiotoweroverrun':    {type:'radio_overrun', preferred:'infected'},
  'radiotowers:airdrop':              {type:'airdrop', preferred:'independent'},

  // Standalone roadside structures.
  'chaoszpack_structures:watch_tower_1': {type:'watchtower', preferred:'civildef', trade:'civildef'},
  'doomsday_structures:gas_station':  {type:'gas_station', preferred:'raider', trade:'independent'},
  'doomsday_structures:shops':        {type:'shops', preferred:'independent', trade:'independent'},
  'doomsday_structures:fire_station': {type:'fire_station', preferred:'raider'},

  // Zombie Survival Kit facilities double as small settlement seeds.  Their
  // original structure remains untouched; PDZ only assigns a persistent owner,
  // garrison and (where appropriate) barter contact after discovery.
  'zombiekit:gas_station':      {type:'roadside_gas_settlement', preferred:'independent', trade:'independent', factionBias:{independent:30,raider:28,survivor:14,civildef:10}},
  'zombiekit:gathering_camps':  {type:'gathering_camp_settlement', preferred:'survivor', trade:'survivor', factionBias:{survivor:32,independent:24,raider:18,infected:10}},
  'zombiekit:jungle_shelter':   {type:'jungle_shelter_outpost', preferred:'infected', factionBias:{infected:30,aegis:20,raider:18,survivor:14,independent:10}},
  'zombiekit:pond':             {type:'pond_hamlet_settlement', preferred:'independent', trade:'independent', factionBias:{independent:32,survivor:28,raider:12,infected:8}},
  'zombiekit:prison':           {type:'prison_security_outpost', preferred:'raider', factionBias:{raider:36,remnant:24,infected:18,civildef:10}},
  'zombiekit:shelter':          {type:'shelter_settlement', preferred:'survivor', trade:'survivor', factionBias:{survivor:34,civildef:24,independent:18,raider:12,infected:10}},
  'zombiekit:touring_car':      {type:'roadside_car_camp', preferred:'independent', trade:'independent', factionBias:{independent:28,raider:24,survivor:20,remnant:10,infected:8}},

  // Horror Element structures reinterpreted for DEADZONE.
  'horror_element_mod:laboratory':       {type:'laboratory', preferred:'aegis'},
  'horror_element_mod:entitytower':      {type:'warden_tower', preferred:'warden'},
  'horror_element_mod:deathcamp':        {type:'death_camp', preferred:'raider'},
  'horror_element_mod:devastatedfarm':   {type:'infected_farm', preferred:'infected'},
  'horror_element_mod:graveyard':        {type:'graveyard', preferred:'infected'},
  'horror_element_mod:fortified_church': {type:'shelter', preferred:'survivor', trade:'survivor'},
  'horror_element_mod:laststandhouse':   {type:'safehouse', preferred:'survivor', trade:'survivor'},
  'horror_element_mod:labyrinth':        {type:'test_area', preferred:'aegis'},
  'horror_element_mod:militaryritual':   {type:'failed_military_site', preferred:'remnant'},
  'horror_element_mod:psycho_house':     {type:'hostile_house', preferred:'infected'},

  // Underground campaign layer. These structures now participate in the
  // same persistent faction/outpost ledger as surface locations.
  'underground_bunkers:underground_bunker': {type:'underground_bunker', preferred:'raider', minRegionTier:2},
  'jeffs_cursed_walking_structures:deepslatebunker': {type:'deep_military_bunker', preferred:'remnant', minRegionTier:3},
  'jeffs_cursed_walking_structures:nuclearbunker': {type:'nuclear_shelter', preferred:'aegis', minRegionTier:3},
  'jeffs_cursed_walking_structures:nuclearsilo': {type:'nuclear_silo', preferred:'remnant', minRegionTier:3},
  'jeffs_cursed_walking_structures:nuclearreactor': {type:'underground_reactor', preferred:'warden', minRegionTier:3},
  'jeffs_cursed_walking_structures:starterbunker': {type:'civilian_bunker', preferred:'survivor', trade:'survivor', minRegionTier:1},
  // Fungal Infection: Spore structures may be present in worldgen before the
  // camp-relative tier is known.  Below T3 they remain inert scenery: no PDZ
  // occupation, garrison, enhanced loot or quest credit is activated.
  'spore:biomass_tower': {type:'spore_biomass_tower', preferred:'infected', minRegionTier:3},
  'spore:cathedral': {type:'spore_cathedral', preferred:'infected', minRegionTier:3},
  'spore:cell': {type:'spore_cell', preferred:'infected', minRegionTier:3},
  'spore:celltower': {type:'spore_celltower', preferred:'infected', minRegionTier:3},
  'spore:church': {type:'spore_church', preferred:'infected', minRegionTier:3},
  'spore:hospital': {type:'spore_hospital', preferred:'infected', minRegionTier:3},
  'spore:iceberg_mines': {type:'spore_ice_mines', preferred:'infected', minRegionTier:3},
  'spore:lab': {type:'spore_laboratory', preferred:'infected', minRegionTier:3},
  'spore:lodge': {type:'spore_lodge', preferred:'infected', minRegionTier:3},
  'spore:mass_grave': {type:'spore_mass_grave', preferred:'infected', minRegionTier:3},
  'spore:military_camp': {type:'spore_military_camp', preferred:'infected', minRegionTier:3},
  'spore:mines': {type:'spore_mines', preferred:'infected', minRegionTier:3},
  'spore:prison': {type:'spore_prison', preferred:'infected', minRegionTier:3},
  'yungbetterdungeons:catacombs': {type:'infected_catacombs', preferred:'infected'},
  'yungbetterdungeons:fortress_of_the_undead': {type:'infected_fortress', preferred:'infected'},
  'yungbetterdungeons:spider_cave': {type:'infected_cavern', preferred:'infected'},

  // Vanilla structures.
  'minecraft:pillager_outpost':       {type:'outpost', preferred:'raider'},
  'minecraft:mansion':                {type:'mansion', preferred:'raider'},
  'minecraft:igloo':                  {type:'observation_post', preferred:'survivor', trade:'independent'},
  'minecraft:desert_pyramid':         {type:'desert_cache', preferred:'raider'},
  'minecraft:jungle_pyramid':         {type:'jungle_lab', preferred:'aegis'},
  'minecraft:swamp_hut':              {type:'swamp_medic', preferred:'independent', trade:'independent'},
  'minecraft:shipwreck':              {type:'shipwreck', preferred:'independent'},
  'minecraft:mineshaft':              {type:'mine', preferred:'infected'},
  'minecraft:mineshaft_mesa':         {type:'mine', preferred:'raider'},
  'minecraft:stronghold':             {type:'underground_command', preferred:'aegis'},
  'minecraft:village_plains':         {type:'settlement', preferred:'survivor', trade:'survivor'},
  'minecraft:village_desert':         {type:'settlement', preferred:'independent', trade:'independent'},
  'minecraft:village_savanna':        {type:'settlement', preferred:'independent', trade:'independent'},
  'minecraft:village_snowy':          {type:'settlement', preferred:'civildef', trade:'civildef'},
  'minecraft:village_taiga':          {type:'settlement', preferred:'survivor', trade:'survivor'}
}

const PDZ_WILD_NAMES = {
  survivor:'Survivor Network', civildef:'Civil Defense Force', raider:'Ash Jackals',
  remnant:'Remnant Military', aegis:'AEGIS Directorate', warden:'WARDEN Network',
  infected:'Infected', independent:'Independent', lawless:'Lawless Ruins'
}

const PDZ_WILD_COLORS = {
  survivor:'green', civildef:'aqua', raider:'red', remnant:'dark_red',
  aegis:'light_purple', warden:'gold', infected:'dark_green', independent:'yellow', lawless:'gray'
}

function pdzWildColoredText(value,color) {
  return Text.of(value).color(color || 'gray')
}

// Strategic roles are deliberately separate from faction and building size.
// Story, convoy and Named systems can therefore react to what a site does
// without hard-coding every structure ID again.
function pdzWildRole(type,structure,faction,trade) {
  let value=(String(type||'')+' '+String(structure||'')).toLowerCase()
  if(value.indexOf('hospital')>=0||value.indexOf('clinic')>=0||value.indexOf('medic')>=0) return 'medical'
  if(value.indexOf('radio')>=0||value.indexOf('watch')>=0||value.indexOf('observation')>=0) return 'communications'
  if(value.indexOf('laboratory')>=0||value.indexOf('labyrinth')>=0||value.indexOf('test_area')>=0||value.indexOf('reactor')>=0) return 'research'
  if(value.indexOf('scrapyard')>=0||value.indexOf('mine')>=0||value.indexOf('gas_station')>=0) return 'logistics'
  if(value.indexOf('military')>=0||value.indexOf('command')>=0||value.indexOf('outpost')>=0||value.indexOf('checkpoint')>=0||value.indexOf('bunker')>=0||value.indexOf('silo')>=0) return 'security'
  if(value.indexOf('farm')>=0) return 'food'
  if(value.indexOf('infected')>=0||value.indexOf('graveyard')>=0||value.indexOf('hostile')>=0) return 'nest'
  if(trade||value.indexOf('shops')>=0||value.indexOf('settlement')>=0||value.indexOf('camp')>=0) return 'trade'
  if(faction==='warden') return 'machine_node'
  return 'shelter'
}

function pdzWildNamedCandidate(type,role,faction) {
  if(type==='gas_station') return 'Axel / Road King Vanguard'
  if(type==='fire_station') return 'Cinder'
  if(type==='laboratory'||role==='research') return 'Doctor Whitestitch'
  if(role==='communications'&&faction==='remnant') return 'Echo-7'
  if(role==='security'&&faction==='civildef') return 'Marshal Graves'
  if(role==='logistics'&&faction==='raider') return 'Ash Jackals Quartermaster'
  return ''
}

function pdzWildHash(text) {
  let h=5381
  for (let i=0;i<text.length;i++) h=((h*33)^text.charCodeAt(i))&0x7fffffff
  return h
}

function pdzWildReadRegistry(server) {
  let raw=server.persistentData.getString(PDZ_WILD_REGISTRY_KEY)
  if(!raw)return {}
  try {let value=JSON.parse(raw);return value&&typeof value==='object'?value:{}}
  catch(err){console.error('[PDZ WILD] invalid site registry: '+err);return {}}
}

function pdzWildWriteRegistry(server,value) {
  server.persistentData.putString(PDZ_WILD_REGISTRY_KEY,JSON.stringify(value))
}

// v0.1 initially returned pre-existing markers before assigning dz_wild_name.
// Generate a stable name from the persistent site ID and migrate both the
// loaded marker and the server registry. The same site therefore keeps its
// name across restarts, while old worlds repair themselves as chunks load.
function pdzWildEnsureName(server,marker) {
  if(!marker||!marker.persistentData)return '地点情報取得中'
  let data=marker.persistentData
  let current=String(data.getString('dz_wild_name')||'').trim()
  let invalid=!current||current==='名称未登録地点'||current==='Unnamed Location'
  let instance=String(data.getString('dz_wild_instance')||'')
  if(!instance)instance=String(marker.level.dimension)+'|legacy|'+Math.floor(marker.x)+'|'+Math.floor(marker.y)+'|'+Math.floor(marker.z)+'|'+String(data.getString('dz_wild_structure')||'manual:site')
  let registry=pdzWildReadRegistry(server),record=registry[instance]||null
  if(invalid&&record&&record.name)current=String(record.name).trim()
  if(!current||current==='名称未登録地点'||current==='Unnamed Location'){
    let type=String(data.getString('dz_wild_type')||(record&&record.type)||'manual')
    let faction=String(data.getString('dz_wild_faction')||(record&&record.faction)||'independent')
    current=pdzWildPlaceName(instance,type,faction)
  }
  data.putString('dz_wild_instance',instance)
  data.putString('dz_wild_name',current)
  data.putInt('dz_wild_name_version',1)
  if(!record){
    record={instance:instance,structure:String(data.getString('dz_wild_structure')||'manual:site'),
      type:String(data.getString('dz_wild_type')||'manual'),faction:String(data.getString('dz_wild_faction')||'independent'),
      cityId:String(data.getString('dz_wild_city_id')||''),x:Math.floor(marker.x),y:Math.floor(marker.y),z:Math.floor(marker.z),
      name:current,occupancy:String(data.getString('dz_wild_occupancy')||'empty'),
      inhabited:data.getBoolean('dz_wild_inhabited'),garrison:data.getBoolean('dz_wild_garrison'),
      garrisonLimit:data.getInt('dz_wild_garrison_limit'),discoveredAt:data.getLong('dz_wild_created')||Date.now(),
      activated:data.getBoolean('dz_wild_activated'),traderSpawned:false}
    registry[instance]=record
    pdzWildWriteRegistry(server,registry)
  }else if(String(record.name||'')!==current){
    record.name=current
    pdzWildWriteRegistry(server,registry)
  }
  return current
}

function pdzWildReadCityRegistry(server) {
  let raw=server.persistentData.getString(PDZ_WILD_CITY_REGISTRY_KEY)
  if(!raw)return {}
  try {let value=JSON.parse(raw);return value&&typeof value==='object'?value:{}}
  catch(err){console.error('[PDZ WILD] invalid ChaosZ city registry: '+err);return {}}
}

function pdzWildWriteCityRegistry(server,value) {
  server.persistentData.putString(PDZ_WILD_CITY_REGISTRY_KEY,JSON.stringify(value))
}

function pdzWildInstanceKey(player,siteId,instanceKey,anchor) {
  if(instanceKey)return String(instanceKey)
  let x=anchor?Number(anchor.x):Number(player.x),z=anchor?Number(anchor.z):Number(player.z)
  // Standalone structures do not expose their start chunk here. Quantising to
  // a 64m cell is stable across players walking inside the same small site.
  return String(player.level.dimension)+'|structure|'+siteId+'|'+Math.floor(x/64)+'|'+Math.floor(z/64)
}

function pdzWildBiomeId(player) {
  try {
    let pos=new PDZ_WILD_BLOCKPOS(Math.floor(player.x),Math.floor(player.y),Math.floor(player.z))
    let key=player.level.getBiome(pos).unwrapKey()
    return key.isPresent() ? String(key.get().location()) : 'minecraft:plains'
  } catch (ignored) { return 'minecraft:plains' }
}

function pdzWildBiomeProfile(id) {
  id=String(id)
  if (id.indexOf('desert')>=0 || id.indexOf('badlands')>=0) return {id:'arid',factions:{raider:38,remnant:24,independent:14,infected:14,aegis:6,warden:4},roles:{logistics:1.5,security:1.25,trade:0.8,medical:0.6}}
  if (id.indexOf('savanna')>=0) return {id:'savanna',factions:{raider:30,independent:24,survivor:18,civildef:10,infected:12,warden:6},roles:{trade:1.35,logistics:1.25,food:1.15}}
  if (id.indexOf('swamp')>=0 || id.indexOf('mangrove')>=0) return {id:'wetland',factions:{infected:38,aegis:24,independent:14,survivor:8,raider:8,warden:8},roles:{nest:1.7,research:1.4,medical:1.2}}
  if (id.indexOf('jungle')>=0) return {id:'jungle',factions:{aegis:32,infected:30,warden:12,independent:10,raider:10,survivor:6},roles:{research:1.6,nest:1.4,communications:0.7}}
  if (id.indexOf('snow')>=0 || id.indexOf('frozen')>=0 || id.indexOf('taiga')>=0) return {id:'cold',factions:{remnant:34,civildef:26,survivor:14,infected:12,aegis:8,independent:6},roles:{security:1.45,communications:1.4,shelter:1.2}}
  if (id.indexOf('mountain')>=0 || id.indexOf('peak')>=0 || id.indexOf('stony')>=0 || id.indexOf('windswept')>=0) return {id:'highland',factions:{remnant:30,warden:26,aegis:16,raider:12,infected:10,independent:6},roles:{security:1.45,communications:1.5,research:1.25}}
  if (id.indexOf('ocean')>=0 || id.indexOf('river')>=0 || id.indexOf('beach')>=0 || id.indexOf('coast')>=0) return {id:'coast',factions:{independent:32,raider:24,survivor:16,remnant:10,infected:10,warden:8},roles:{trade:1.5,logistics:1.4,food:1.3}}
  if (id.indexOf('dark_forest')>=0) return {id:'dark_forest',factions:{raider:30,infected:30,aegis:14,warden:10,survivor:10,independent:6},roles:{nest:1.45,security:1.2,research:1.15}}
  if (id.indexOf('forest')>=0) return {id:'forest',factions:{survivor:32,raider:22,infected:18,civildef:12,independent:10,remnant:6},roles:{shelter:1.4,food:1.35,trade:1.15}}
  return {id:'temperate',factions:{survivor:28,civildef:24,raider:16,independent:12,infected:12,remnant:8},roles:{trade:1.25,food:1.2,security:1.1}}
}

function pdzWildWeightedFaction(seed,weights) {
  let keys=Object.keys(weights),total=0
  keys.forEach(key=>total+=Math.max(0,Number(weights[key]||0)))
  if(total<=0)return 'independent'
  let roll=(pdzWildHash(seed)%100000)/100000*total
  for(let i=0;i<keys.length;i++){
    roll-=Math.max(0,Number(weights[keys[i]]||0))
    if(roll<0)return keys[i]
  }
  return keys[keys.length-1]
}

function pdzWildPickFaction(siteId,def,player,sampleX,sampleZ) {
  let biomeId=pdzWildBiomeId(player),profile=pdzWildBiomeProfile(biomeId)
  let px=Number.isFinite(Number(sampleX))?Number(sampleX):Number(player.x)
  let pz=Number.isFinite(Number(sampleZ))?Number(sampleZ):Number(player.z)
  // Territory ownership is decided on a broad cell. A building no longer
  // invents a different faction just because it is next door.
  let territory=pdzWildTerritoryFaction(player,px,pz)
  if(territory)return territory
  let key=String(player.level.dimension)+'|district|'+Math.floor(px/512)+'|'+Math.floor(pz/512)
  let weights={}
  Object.keys(profile.factions).forEach(faction=>weights[faction]=profile.factions[faction])
  // A building's intended identity remains the strongest single influence,
  // while biome politics can still produce occupied or contested variants.
  weights[def.preferred]=Number(weights[def.preferred]||0)+42
  // Per-facility weights let one structure produce several believable owners
  // without replacing the biome politics shared by every wilderness site.
  if(def.factionBias)Object.keys(def.factionBias).forEach(faction=>{
    weights[faction]=Number(weights[faction]||0)+Number(def.factionBias[faction]||0)
  })
  let role=pdzWildRole(def.type,siteId,def.preferred,def.trade||'')
  if(role==='nest')weights.infected=Number(weights.infected||0)+38
  if(role==='research')weights.aegis=Number(weights.aegis||0)+24
  if(role==='security'){
    weights.remnant=Number(weights.remnant||0)+12
    weights.civildef=Number(weights.civildef||0)+10
    weights.raider=Number(weights.raider||0)+10
  }
  if(role==='trade'||role==='food'){
    weights.survivor=Number(weights.survivor||0)+14
    weights.independent=Number(weights.independent||0)+12
  }
  return pdzWildWeightedFaction(key,weights)
}

function pdzWildMarkerNear(player,radius) {
  let found=null,best=radius*radius
  player.level.entities.forEach(e=>{
    if(!e.tags || !e.tags.contains('dz_wilderness_site')) return
    let dx=e.x-player.x,dy=e.y-player.y,dz=e.z-player.z,d=dx*dx+dy*dy+dz*dz
    if(d<best){best=d;found=e}
  })
  return found
}

function pdzWildMarkerByInstance(player,instanceKey,radius) {
  let found=null,best=radius*radius
  player.level.entities.forEach(e=>{
    if(!e.tags||!e.tags.contains('dz_wilderness_site'))return
    if(e.persistentData.getString('dz_wild_instance')!==instanceKey)return
    let dx=e.x-player.x,dy=e.y-player.y,dz=e.z-player.z,d=dx*dx+dy*dy+dz*dz
    if(d<best){best=d;found=e}
  })
  return found
}

function pdzWildTerritoryFaction(player,x,z) {
  try {
    let raw=player.server.persistentData.getString('dz_territory_cells_v1')
    if(!raw)return ''
    let cells=JSON.parse(raw),gx=Math.floor(x/128),gz=Math.floor(z/128),dim=String(player.level.dimension)
    for(let i=0;i<cells.length;i++)if(String(cells[i].dimension)===dim&&Number(cells[i].gx)===gx&&Number(cells[i].gz)===gz)return String(cells[i].faction||'')
  } catch(ignored) {}
  return ''
}

function pdzWildIsSettlementSite(siteId,def) {
  let text=(String(siteId||'')+' '+String(def.type||'')+' '+String(def.role||'')).toLowerCase()
  return text.indexOf('starter')>=0||text.indexOf('village')>=0||text.indexOf('settlement')>=0||
    text.indexOf('colony')>=0||text.indexOf('towns_and_towers')>=0||text.indexOf('ctov')>=0
}

function pdzWildPickOccupancy(instanceKey,siteId,def) {
  if(pdzWildIsSettlementSite(siteId,def))return 'settlement'
  let type=String(def.type||'').toLowerCase(),role=String(def.role||'').toLowerCase()
  if(type.indexOf('warden')>=0||type.indexOf('aegis')>=0||role==='boss')return 'outpost'
  let urban=pdzWildIsUrbanType(def.type),roll=pdzWildHash(String(instanceKey)+'|occupancy')%100
  // Lost Cities is a ruin, not a fully populated metropolis. Only 12% of
  // ordinary urban buildings have people; rural facilities stay somewhat
  // more active without turning every structure into a settlement.
  if(urban){
    if(roll<70)return 'empty'
    if(roll<88)return 'loot'
    if(roll<96)return 'patrol'
    if(roll<98)return 'trade'
    return 'outpost'
  }
  if(roll<52)return 'empty'
  if(roll<70)return 'loot'
  if(roll<84)return 'patrol'
  if(roll<91)return 'trade'
  return 'outpost'
}

function pdzWildOccupancyTrade(occupancy,def) {
  return occupancy==='trade'||occupancy==='settlement' ? String(def.trade||'independent') : ''
}

function pdzWildOccupancyGarrison(occupancy) {
  return occupancy==='patrol'||occupancy==='outpost'||occupancy==='settlement'
}

function pdzWildOccupancyLimit(occupancy) {
  if(occupancy==='patrol')return 3
  if(occupancy==='outpost')return 4
  if(occupancy==='settlement')return 6
  return 0
}

function pdzWildApplyOccupancy(player,marker,def) {
  let instanceKey=marker.persistentData.getString('dz_wild_instance')
  let occupancy=marker.persistentData.getString('dz_wild_occupancy')
  if(!occupancy)occupancy=pdzWildPickOccupancy(instanceKey,marker.persistentData.getString('dz_wild_structure'),def)
  let garrison=pdzWildOccupancyGarrison(occupancy),trade=pdzWildOccupancyTrade(occupancy,def)
  marker.persistentData.putString('dz_wild_occupancy',occupancy)
  marker.persistentData.putBoolean('dz_wild_inhabited',garrison||occupancy==='trade')
  marker.persistentData.putBoolean('dz_wild_garrison',garrison)
  marker.persistentData.putInt('dz_wild_garrison_limit',pdzWildOccupancyLimit(occupancy))
  marker.persistentData.putString('dz_wild_trade',trade)
  ;['empty','loot','patrol','trade','outpost','settlement'].forEach(value=>marker.tags.remove('dz_site_'+value))
  marker.tags.add('dz_site_'+occupancy)

  // Migration: remove defenders/traders created by the previous "every
  // building is occupied" rule, but only when they are linked to this exact
  // building. This is deliberately progressive as sites are revisited.
  if(!garrison&&occupancy!=='trade'&&occupancy!=='settlement'){
    player.level.entities.forEach(e=>{
      if(!e.tags)return
      let linked=e.persistentData.getString('dz_wild_instance')===instanceKey
      let trader=e.tags.contains('dz_wilderness_trader')
      let guard=e.tags.contains('dz_garrison_bound')||e.tags.contains('dz_wilderness_defender')
      if(linked&&(trader||guard))e.discard()
    })
  }
  let registry=pdzWildReadRegistry(player.server),record=registry[instanceKey]
  if(record&&(record.occupancy!==occupancy||record.inhabited!==(garrison||occupancy==='trade')||record.garrison!==garrison)){
    record.occupancy=occupancy;record.inhabited=garrison||occupancy==='trade';record.garrison=garrison
    record.garrisonLimit=pdzWildOccupancyLimit(occupancy)
    if(!trade)record.traderSpawned=false
    pdzWildWriteRegistry(player.server,registry)
  }
  return marker
}

function pdzWildLostClassify(buildingId) {
  let id=String(buildingId||'').toLowerCase()
  if(id.indexOf('hospital')>=0||id.indexOf('clinic')>=0||id.indexOf('medical')>=0)return {type:'hospital',preferred:'civildef',trade:'civildef',role:'medical',garrison:true,friendlyChance:72}
  if(id.indexOf('police')>=0)return {type:'police_station',preferred:'civildef',role:'security',garrison:true,friendlyChance:68}
  if(id.indexOf('fire')>=0)return {type:'fire_station',preferred:'civildef',role:'security',garrison:true,friendlyChance:68}
  if(id.indexOf('military')>=0||id.indexOf('bunker')>=0||id.indexOf('command')>=0)return {type:'military',preferred:'remnant',role:'security',garrison:true}
  if(id.indexOf('factory')>=0||id.indexOf('industrial')>=0||id.indexOf('warehouse')>=0||id.indexOf('storage')>=0)return {type:'industrial',preferred:'raider',role:'logistics',garrison:true}
  if(id.indexOf('gun')>=0||id.indexOf('weapon')>=0)return {type:'gun_store',preferred:'raider',role:'logistics',garrison:true}
  if(id.indexOf('gasstation')>=0||id.indexOf('gas_station')>=0)return {type:'gas_station',preferred:'independent',trade:'independent',role:'logistics',garrison:true,friendlyChance:60}
  if(id.indexOf('shop')>=0||id.indexOf('market')>=0||id.indexOf('mall')>=0||id.indexOf('walmart')>=0)return {type:'commercial',preferred:'independent',trade:'independent',role:'trade',garrison:false,friendlyChance:55}
  if(id.indexOf('apart')>=0||id.indexOf('house')>=0||id.indexOf('residen')>=0)return {type:'residential',preferred:'survivor',role:'shelter',garrison:false,friendlyChance:62}
  return {type:'city_building',preferred:'independent',trade:'independent',role:'shelter',garrison:false,friendlyChance:28}
}

function pdzWildLostCityProfile(player,lost) {
  let cities=pdzWildReadCityRegistry(player.server),city=cities[lost.cityKey]||null
  // Migrate the former single-owner record. Its owner becomes the strongest
  // expedition presence, but no faction owns a Lost Cities ruin.
  if(city&&city.activityWeights){
    city.faction='lawless'
    return city
  }
  let profile=pdzWildBiomeProfile(pdzWildBiomeId(player)),weights={},legacy=city?String(city.faction||''):''
  Object.keys(profile.factions).forEach(f=>weights[f]=Number(profile.factions[f]||0))
  if(legacy&&legacy!=='lawless')weights[legacy]=Number(weights[legacy]||0)+36
  let ranked=Object.keys(weights).sort((a,b)=>{
    let av=weights[a]+(pdzWildHash(lost.cityKey+'|'+a)%19)
    let bv=weights[b]+(pdzWildHash(lost.cityKey+'|'+b)%19)
    return bv-av
  }).slice(0,3)
  let activityWeights={}
  ranked.forEach(f=>activityWeights[f]=weights[f])
  city={id:lost.cityKey,x:lost.cityX,z:lost.cityZ,radius:lost.cityRadius,
    style:lost.cityStyle,faction:'lawless',activityFactions:ranked,activityWeights:activityWeights,
    name:(city&&city.name)?String(city.name):pdzWildPlaceName(lost.cityKey,'city','lawless'),
    discoveredAt:city&&city.discoveredAt?city.discoveredAt:Date.now()}
  cities[lost.cityKey]=city
  pdzWildWriteCityRegistry(player.server,cities)
  console.info('[PDZ CITY] Registered lawless city '+lost.cityKey+' activity='+ranked.join(',')+' radius='+lost.cityRadius)
  return city
}

function pdzWildLostFaction(player,lost) {
  let city=pdzWildLostCityProfile(player,lost),weights={},def=lost.def||{}
  Object.keys(city.activityWeights||{}).forEach(f=>weights[f]=Number(city.activityWeights[f]||0))
  if(def.preferred&&weights[def.preferred]!==undefined)weights[def.preferred]+=28
  if(def.factionBias)Object.keys(def.factionBias).forEach(f=>{
    if(weights[f]!==undefined)weights[f]+=Number(def.factionBias[f]||0)
  })
  return pdzWildWeightedFaction(lost.cityKey+'|'+lost.buildingId+'|'+lost.rootX+'|'+lost.rootZ,weights)
}

function pdzWildLostCityIdentity(player,info,chunk,cx,cz) {
  let data=player.persistentData,dim=String(player.level.dimension)
  let cachedKey=data.getString('dz_chaosz_city_key')
  let cachedDim=data.getString('dz_chaosz_city_dim')
  let cachedX=data.getInt('dz_chaosz_city_x'),cachedZ=data.getInt('dz_chaosz_city_z')
  let cachedRadius=data.getInt('dz_chaosz_city_radius')
  if(cachedKey&&cachedDim===dim){
    let dx=cx*16+8-cachedX,dz=cz*16+8-cachedZ,limit=Math.max(192,cachedRadius+96)
    if(dx*dx+dz*dz<=limit*limit)return {key:cachedKey,x:cachedX,z:cachedZ,radius:cachedRadius,
      style:data.getString('dz_chaosz_city_style')}
  }
  // Lost Cities does not expose a city centre. A bounded cross-section finds
  // the centre of its contiguous city mass without loading chunks or using a
  // building as identity. The active ChaosZ profile caps cities at 300m;
  // 24 chunks (384m) leaves a safe margin without scanning unrelated cities.
  let minX=cx,maxX=cx,minZ=cz,maxZ=cz
  for(let i=1;i<=24;i++){
    let left=info.getChunkInfo(cx-i,cz),right=info.getChunkInfo(cx+i,cz)
    if(left&&left.isCity())minX=cx-i
    if(right&&right.isCity())maxX=cx+i
    let north=info.getChunkInfo(cx,cz-i),south=info.getChunkInfo(cx,cz+i)
    if(north&&north.isCity())minZ=cz-i
    if(south&&south.isCity())maxZ=cz+i
  }
  let centerChunkX=Math.floor((minX+maxX)/2),centerChunkZ=Math.floor((minZ+maxZ)/2)
  // Quantising the inferred centre absorbs small irregularities caused by
  // parks, ruins and water holes while keeping neighbouring cities distinct.
  centerChunkX=Math.floor((centerChunkX+2)/4)*4
  centerChunkZ=Math.floor((centerChunkZ+2)/4)*4
  let cityInfo=chunk.getCityInfo(),radius=384,style='chaosz'
  try {if(cityInfo){radius=Math.round(Number(cityInfo.getCityRadius())||384);style=String(cityInfo.getCityStyle()||'chaosz')}} catch(ignored) {}
  let x=centerChunkX*16+8,z=centerChunkZ*16+8,key=dim+'|chaosz_city|'+centerChunkX+'|'+centerChunkZ
  data.putString('dz_chaosz_city_key',key);data.putString('dz_chaosz_city_dim',dim)
  data.putInt('dz_chaosz_city_x',x);data.putInt('dz_chaosz_city_z',z);data.putInt('dz_chaosz_city_radius',radius)
  data.putString('dz_chaosz_city_style',style)
  return {key:key,x:x,z:z,radius:radius,style:style}
}

function pdzWildLostCurrent(player) {
  if(!PDZ_WILD_LOSTCITIES)return null
  try {
    let info=PDZ_WILD_LOSTCITIES.lostCitiesImp.getLostInfo(player.level)
    if(!info)return null
    let cx=Math.floor(player.x/16),cz=Math.floor(player.z/16),chunk=info.getChunkInfo(cx,cz)
    if(!chunk||!chunk.isCity())return null
    let building=chunk.getBuildingId()
    if(!building)return null
    let rootX=cx,rootZ=cz,multi=chunk.getMultiBuildingInfo()
    if(multi){rootX=cx-Number(multi.offsetX());rootZ=cz-Number(multi.offsetZ())}
    let buildingId=String(building),def=pdzWildLostClassify(buildingId),city=pdzWildLostCityIdentity(player,info,chunk,cx,cz)
    return {buildingId:buildingId,def:def,rootX:rootX,rootZ:rootZ,x:rootX*16+8,z:rootZ*16+8,
      instance:String(player.level.dimension)+'|lostcities|'+rootX+'|'+rootZ+'|'+buildingId,
      cityKey:city.key,cityX:city.x,cityZ:city.z,cityRadius:city.radius,cityStyle:city.style}
  } catch(err) {
    if(!player.persistentData.getBoolean('dz_lostcities_api_warned')){
      player.persistentData.putBoolean('dz_lostcities_api_warned',true)
      console.warn('[PROJECT DEADZONE] Lost Cities occupation lookup failed: '+err)
    }
    return null
  }
}

function pdzWildStructureInfo(player,siteId) {
  try {
    let registry=player.level.registryAccess().registryOrThrow(PDZ_WILD_REGISTRIES.STRUCTURE)
    let structure=registry.get(new PDZ_WILD_RL(siteId))
    if (!structure) return null
    let pos=new PDZ_WILD_BLOCKPOS(Math.floor(player.x),Math.floor(player.y),Math.floor(player.z))
    let start=player.level.structureManager().getStructureWithPieceAt(pos,structure)
    if(!start||!start.isValid())return null
    let box=start.getBoundingBox()
    let minX=Number(box.minX()),minY=Number(box.minY()),minZ=Number(box.minZ())
    let maxX=Number(box.maxX()),maxY=Number(box.maxY()),maxZ=Number(box.maxZ())
    let x=Math.floor((minX+maxX)/2),z=Math.floor((minZ+maxZ)/2)
    return {siteId:siteId,x:x,y:minY+1,z:z,minX:minX,minY:minY,minZ:minZ,maxX:maxX,maxY:maxY,maxZ:maxZ,
      instance:String(player.level.dimension)+'|structure|'+siteId+'|'+minX+'|'+minY+'|'+minZ}
  } catch (ignored) { return null }
}

function pdzWildFindCurrent(player) {
  let ids=Object.keys(PDZ_WILD_SITES)
  for (let i=0;i<ids.length;i++) {
    let info=pdzWildStructureInfo(player,ids[i])
    if(info)return info
  }
  return null
}

// Hostile WARDEN towers must be registered before the player crosses the
// structure boundary.  Sampling already loaded terrain avoids /locate and
// forced chunk generation while still giving the garrison system its 160m
// warning and 80m activation windows.
function pdzWildFindNearbyWarden(player,radius) {
  let siteId='horror_element_mod:entitytower'
  try {
    let registry=player.level.registryAccess().registryOrThrow(PDZ_WILD_REGISTRIES.STRUCTURE)
    let structure=registry.get(new PDZ_WILD_RL(siteId))
    if(!structure)return null
    let px=Math.floor(player.x),pz=Math.floor(player.z),step=16
    for(let dx=-radius;dx<=radius;dx+=step)for(let dz=-radius;dz<=radius;dz+=step){
      if(dx*dx+dz*dz>radius*radius)continue
      let x=px+dx,z=pz+dz,y=player.level.getHeight(PDZ_WILD_HEIGHTMAP.WORLD_SURFACE,x,z)
      let start=player.level.structureManager().getStructureWithPieceAt(new PDZ_WILD_BLOCKPOS(x,y,z),structure)
      if(!start||!start.isValid())continue
      let box=start.getBoundingBox(),minX=Number(box.minX()),minY=Number(box.minY()),minZ=Number(box.minZ())
      let maxX=Number(box.maxX()),maxZ=Number(box.maxZ())
      return {siteId:siteId,x:Math.floor((minX+maxX)/2),y:minY+1,z:Math.floor((minZ+maxZ)/2),
        instance:String(player.level.dimension)+'|structure|'+siteId+'|'+minX+'|'+minY+'|'+minZ}
    }
  } catch(err) {
    if(!player.persistentData.getBoolean('dz_warden_prescan_warned')){
      player.persistentData.putBoolean('dz_warden_prescan_warned',true)
      console.warn('[PROJECT DEADZONE] WARDEN pre-scan failed: '+err)
    }
  }
  return null
}

// Pre-detect any registered surface facility in already loaded terrain.  The
// old implementation special-cased WARDEN and discovered every other site only
// after the player entered its bounding box.  Querying all structures at each
// sample point avoids a 55-structure brute-force loop and never loads chunks.
function pdzWildFindNearbySite(player,radius) {
  try {
    let registry=player.level.registryAccess().registryOrThrow(PDZ_WILD_REGISTRIES.STRUCTURE)
    let px=Math.floor(player.x),pz=Math.floor(player.z),step=24
    for(let ring=0;ring<=radius;ring+=step){
      for(let dx=-ring;dx<=ring;dx+=step)for(let dz=-ring;dz<=ring;dz+=step){
        if(ring>0&&Math.abs(dx)!==ring&&Math.abs(dz)!==ring)continue
        if(dx*dx+dz*dz>radius*radius)continue
        let x=px+dx,z=pz+dz,probe=new PDZ_WILD_BLOCKPOS(x,64,z)
        if(!player.level.hasChunkAt(probe))continue
        let y=player.level.getHeight(PDZ_WILD_HEIGHTMAP.WORLD_SURFACE,x,z)
        let starts=player.level.structureManager().getAllStructuresAt(new PDZ_WILD_BLOCKPOS(x,y,z))
        if(!starts||starts.isEmpty())continue
        // FastUtil's private entry iterator is blocked by Java 17 reflection
        // under Rhino on some Forge builds. Copy the public key view instead.
        let structures=starts.keySet().toArray()
        for(let si=0;si<structures.length;si++){
          let structure=structures[si],siteId=String(registry.getKey(structure))
          let isVillage=typeof pdzVillageIsVillageStructure==='function'&&pdzVillageIsVillageStructure(siteId)
          if(!PDZ_WILD_SITES[siteId]&&!isVillage)continue
          let start=player.level.structureManager().getStructureWithPieceAt(new PDZ_WILD_BLOCKPOS(x,y,z),structure)
          if(!start||!start.isValid())continue
          // Village public services piggyback on this already-loaded structure
          // sample. No second player tick loop or forced chunk scan is added.
          if(isVillage&&typeof pdzVillageEnsureServices==='function')pdzVillageEnsureServices(player,siteId,start,{x:x,y:y,z:z})
          if(!PDZ_WILD_SITES[siteId])continue
          let box=start.getBoundingBox(),minX=Number(box.minX()),minY=Number(box.minY()),minZ=Number(box.minZ())
          let maxX=Number(box.maxX()),maxZ=Number(box.maxZ())
          return {siteId:siteId,x:Math.floor((minX+maxX)/2),y:minY+1,z:Math.floor((minZ+maxZ)/2),
            instance:String(player.level.dimension)+'|structure|'+siteId+'|'+minX+'|'+minY+'|'+minZ}
        }
      }
    }
  } catch(err) {
    if(!player.persistentData.getBoolean('dz_site_prescan_warned')){
      player.persistentData.putBoolean('dz_site_prescan_warned',true)
      console.warn('[PROJECT DEADZONE] Facility pre-scan failed: '+err)
    }
  }
  return null
}

function pdzWildIsUrbanType(type) {
  let value=String(type||'')
  return value.indexOf('commercial')>=0 || value.indexOf('residential')>=0 ||
    value.indexOf('city')>=0 || value.indexOf('hospital')>=0 ||
    value.indexOf('police')>=0 || value.indexOf('firestation')>=0 || value.indexOf('fire_station')>=0 ||
    value.indexOf('gun_store')>=0 || value.indexOf('gas_station')>=0
}

// Lost Cities exposes each building as a separate structure. Announcing every
// building made one city look like a new discovery every five seconds. Urban
// sites are therefore grouped into 512-block districts and announcements are
// rate-limited per player. The marker/registry itself remains per building.
function pdzWildShouldAnnounce(player,def,stableKey,ax,az,cityKey) {
  let now=Date.now(),data=player.persistentData
  let urban=pdzWildIsUrbanType(def.type)
  let noticeId=urban
    ? (cityKey||String(player.level.dimension)+'|urban|'+Math.floor((ax+256)/512)+'|'+Math.floor((az+256)/512))
    : stableKey
  let seenKey='dz_wild_notice_'+pdzWildHash(noticeId)
  if(data.getBoolean(seenKey))return false
  let last=data.getLong('dz_wild_last_notice_at')
  let cooldown=urban?60000:15000
  if(last>0 && now-last<cooldown)return false
  data.putBoolean(seenKey,true)
  data.putLong('dz_wild_last_notice_at',now)
  data.putString('dz_wild_last_notice_id',noticeId)
  return true
}

function pdzWildCreateMarker(player,siteId,forcedFaction,instanceKey,anchor,overrideDef,cityProfile) {
  let stableKey=pdzWildInstanceKey(player,siteId,instanceKey,anchor)
  let nearby=pdzWildMarkerByInstance(player,stableKey,512)
  if(nearby){pdzWildEnsureName(player.server,nearby);return nearby}
  let def=overrideDef||PDZ_WILD_SITES[siteId] || {type:'manual',preferred:'independent',trade:'independent'}
  let registry=pdzWildReadRegistry(player.server),prior=registry[stableKey]||null
  let ax=anchor?Math.floor(anchor.x):Math.floor(player.x),az=anchor?Math.floor(anchor.z):Math.floor(player.z)
  let ay=prior&&Number.isFinite(Number(prior.y))?Math.floor(Number(prior.y)):
    (anchor&&Number.isFinite(Number(anchor.y))?Math.floor(Number(anchor.y)):
      Math.floor(player.level.getHeight(PDZ_WILD_HEIGHTMAP.WORLD_SURFACE,ax,az)))
  // Underground campaign facilities are allowed to exist as inert scenery in
  // worldgen, but they do not activate, spawn factions, unlock loot or count
  // for quests before their intended Region Tier. Static structure sets cannot
  // read the camp position, so activation is the reliable dynamic gate.
  let currentRegionTier=0
  try { currentRegionTier=Number(dzRegionTierAt(player.server,ax,az)||0) } catch(ignored) {}
  let requiredRegionTier=Number(def.minRegionTier||0)
  if(requiredRegionTier>currentRegionTier){
    let noticeKey='dz_site_tier_blocked_'+pdzWildHash(stableKey)
    if(!player.persistentData.getBoolean(noticeKey)){
      player.persistentData.putBoolean(noticeKey,true)
      player.tell(Text.of('[封鎖施設] ').darkGray()
        .append(Text.of('この施設は Region T'+requiredRegionTier+' 到達後に攻略可能です。').yellow()))
    }
    return null
  }
  let legacyFaction=''
  // v0.1 used the player's moving position as a facility ID. Adopt and remove
  // those nearby duplicates when the stable structure-start ID is first seen.
  player.level.entities.forEach(e=>{
    if(!e.tags)return
    let isMarker=e.tags.contains('dz_wilderness_site'),isTrader=e.tags.contains('dz_wilderness_trader')
    if(!isMarker&&!isTrader)return
    if(e.persistentData.getString('dz_wild_structure')!==String(siteId))return
    let dx=e.x-ax,dz=e.z-az
    if(dx*dx+dz*dz>56*56)return
    if(isMarker&&!legacyFaction)legacyFaction=e.persistentData.getString('dz_wild_faction')
    e.discard()
  })
  let urban=pdzWildIsUrbanType(def.type)
  let faction=(urban&&forcedFaction)?forcedFaction:((prior&&prior.faction)||forcedFaction||legacyFaction||pdzWildPickFaction(siteId,def,player,ax,az))
  let occupancy=(prior&&prior.occupancy)||pdzWildPickOccupancy(stableKey,siteId,def)
  let occupiedGarrison=pdzWildOccupancyGarrison(occupancy)
  // Claim the instance before summoning. This closes the multiplayer race in
  // which several players discovered one building on the same server tick.
  if(!prior){
    registry[stableKey]={instance:stableKey,structure:String(siteId),type:String(def.type),faction:faction,
      cityId:cityProfile?String(cityProfile.id):'',x:ax,y:ay,z:az,
      name:cityProfile?String(cityProfile.name):pdzWildPlaceName(stableKey,def.type,faction),
      occupancy:occupancy,inhabited:occupiedGarrison||occupancy==='trade',garrison:occupiedGarrison,
      garrisonLimit:pdzWildOccupancyLimit(occupancy),discoveredAt:Date.now(),activated:false,traderSpawned:false}
    pdzWildWriteRegistry(player.server,registry)
  }else if(urban&&cityProfile){
    prior.faction=faction;prior.cityId=String(cityProfile.id);prior.name=String(cityProfile.name)
    pdzWildWriteRegistry(player.server,registry)
  }
  let temp='dz_wilderness_pending_'+Math.floor(Math.random()*1000000)
  let summon='execute positioned '+ax+' '+ay+' '+az+' run summon '
  player.runCommandSilent(summon+'minecraft:armor_stand ~ ~ ~ {Invisible:1b,Invulnerable:1b,NoGravity:1b,Marker:1b,Tags:["dz_wilderness_site","'+temp+'"]}')
  let marker=null
  player.level.entities.forEach(e=>{if(e.tags && e.tags.contains(temp)) marker=e})
  if(!marker) return null
  marker.tags.remove(temp)
  marker.tags.add('dz_wilderness_'+faction)
  marker.persistentData.putString('dz_wild_structure',siteId)
  marker.persistentData.putString('dz_wild_instance',stableKey)
  marker.persistentData.putString('dz_wild_type',def.type)
  marker.persistentData.putString('dz_wild_faction',faction)
  marker.persistentData.putString('dz_wild_city_id',cityProfile?String(cityProfile.id):'')
  marker.persistentData.putString('dz_wild_biome',pdzWildBiomeId(player))
  marker.persistentData.putString('dz_wild_biome_profile',pdzWildBiomeProfile(pdzWildBiomeId(player)).id)
  marker.persistentData.putString('dz_wild_trade',pdzWildOccupancyTrade(occupancy,def))
  let role=def.role||pdzWildRole(def.type,siteId,faction,def.trade||'')
  marker.persistentData.putString('dz_wild_role',role)
  marker.persistentData.putString('dz_wild_occupancy',occupancy)
  marker.persistentData.putBoolean('dz_wild_inhabited',occupiedGarrison||occupancy==='trade')
  marker.persistentData.putBoolean('dz_wild_garrison',occupiedGarrison)
  marker.persistentData.putInt('dz_wild_garrison_limit',pdzWildOccupancyLimit(occupancy))
  marker.tags.add('dz_site_'+occupancy)
  marker.persistentData.putString('dz_wild_named',pdzWildNamedCandidate(def.type,role,faction))
  let placeName=cityProfile?String(cityProfile.name):((prior&&prior.name)||pdzWildPlaceName(stableKey,def.type,faction))
  marker.persistentData.putString('dz_wild_name',placeName)
  marker.persistentData.putLong('dz_wild_created',Date.now())
  if(!prior&&pdzWildShouldAnnounce(player,def,stableKey,ax,az,cityProfile?cityProfile.id:'')){
    let label=cityProfile
      ? String(cityProfile.name)+' / 無法地帯 / 活動: '+(PDZ_WILD_NAMES[faction]||faction)
      : def.type+' / '+(PDZ_WILD_NAMES[faction]||faction)
    player.tell(Text.of('[AREA DISCOVERED] ').gold()
      .append(Text.of(label).color(cityProfile?'gray':(PDZ_WILD_COLORS[faction]||'white'))))
  }
  return pdzWildApplyOccupancy(player,marker,def)
}

function pdzWildPlaceName(key,type,faction){
  let a=['灰谷','白樺','霧丘','赤錆','静水','鉄路','月影','風見','高原','灯台','深森','青波']
  let b=['集落','避難区','交易所','前哨地','居住区','停車場','共同体','復興区']
  let urban=['ノースゲート','リバーサイド','オールド・クロッシング','グレイウォール','セントラル・ヘイヴン','サウスヤード']
  let h=pdzWildHash(key),t=String(type||'')
  if(t.indexOf('commercial')>=0||t.indexOf('residential')>=0||t.indexOf('hospital')>=0||t.indexOf('police')>=0||t.indexOf('city')>=0)return urban[h%urban.length]
  if(faction==='raider')return ['焦土市場','ジャッカルズ・レスト','赤錆関所'][h%3]
  if(faction==='infected')return ['沈黙区','腐食街区','ブラックサイト'][h%3]
  return a[h%a.length]+b[Math.floor(h/a.length)%b.length]
}

function pdzWildScan(player) {
  let nearbyWarden=pdzWildFindNearbyWarden(player,176)
  if(nearbyWarden){
    let known=pdzWildMarkerByInstance(player,nearbyWarden.instance,512)
    if(known)return pdzWildApplyOccupancy(player,known,PDZ_WILD_SITES[nearbyWarden.siteId]||{type:'warden',role:'boss'})
    return pdzWildCreateMarker(player,nearbyWarden.siteId,'warden',nearbyWarden.instance,nearbyWarden)
  }
  let nearbySite=pdzWildFindNearbySite(player,216)
  if(nearbySite){
    let known=pdzWildMarkerByInstance(player,nearbySite.instance,512)
    if(known)return pdzWildApplyOccupancy(player,known,PDZ_WILD_SITES[nearbySite.siteId]||{type:'facility'})
    return pdzWildCreateMarker(player,nearbySite.siteId,null,nearbySite.instance,nearbySite)
  }
  let current=pdzWildFindCurrent(player)
  if(!current){
    let lost=pdzWildLostCurrent(player)
    if(!lost)return null
    let city=pdzWildLostCityProfile(player,lost),faction=pdzWildLostFaction(player,lost)
    let existing=pdzWildMarkerByInstance(player,lost.instance,384)
    if(existing){
      let old=existing.persistentData.getString('dz_wild_faction')
      if(old!==faction){existing.tags.remove('dz_wilderness_'+old);existing.tags.add('dz_wilderness_'+faction);existing.persistentData.putString('dz_wild_faction',faction)}
      existing.persistentData.putString('dz_wild_city_id',String(city.id));existing.persistentData.putString('dz_wild_name',String(city.name))
      return pdzWildApplyOccupancy(player,existing,lost.def)
    }
    return pdzWildCreateMarker(player,lost.buildingId,faction,lost.instance,{x:lost.x,z:lost.z},lost.def,city)
  }
  let existing=pdzWildMarkerByInstance(player,current.instance,512)
  if(existing)return pdzWildApplyOccupancy(player,existing,PDZ_WILD_SITES[current.siteId]||{type:'facility'})
  return pdzWildCreateMarker(player,current.siteId,null,current.instance,{x:current.x,y:current.y,z:current.z})
}

function pdzWildStatus(player) {
  let marker=pdzWildMarkerNear(player,112)
  if(!marker){
    let current=pdzWildFindCurrent(player)
    player.tell(Text.of(current ? '未登録の野外施設: '+current : '登録された野外拠点の範囲外です。').gray())
    return
  }
  let faction=marker.persistentData.getString('dz_wild_faction')
  player.tell(Text.of('=== WILDERNESS SITE ===').gold())
  player.tell(Text.of('地点名: '+pdzWildEnsureName(player.server,marker)).aqua())
  player.tell(Text.of('施設: '+marker.persistentData.getString('dz_wild_type')).white())
  player.tell(pdzWildColoredText('勢力: '+(PDZ_WILD_NAMES[faction]||faction),PDZ_WILD_COLORS[faction]))
  player.tell(Text.of('構造物: '+marker.persistentData.getString('dz_wild_structure')).darkGray())
  let role=marker.persistentData.getString('dz_wild_role')
  if(!role) role=pdzWildRole(marker.persistentData.getString('dz_wild_type'),marker.persistentData.getString('dz_wild_structure'),faction,marker.persistentData.getString('dz_wild_trade'))
  player.tell(Text.of('戦略役割: '+role).aqua())
  let occupancy=marker.persistentData.getString('dz_wild_occupancy')||'empty'
  player.tell(Text.of('常駐状態: '+occupancy).yellow())
  let named=marker.persistentData.getString('dz_wild_named')
  if(named) player.tell(Text.of('Named候補: '+named).lightPurple())
  let trade=marker.persistentData.getString('dz_wild_trade')
  if(trade) player.tell(Text.of('取引候補: '+trade).yellow())
}

function pdzWildOffer(buyId,buyCount,sellId,sellCount,maxUses) {
  return '{buy:{id:"'+buyId+'",Count:'+buyCount+'b},buyB:{},sell:{id:"'+sellId+'",Count:'+sellCount+'b},uses:0,maxUses:'+maxUses+',rewardExp:0b,priceMultiplier:0.0f,demand:0,specialPrice:0,xp:0}'
}

function pdzWildBarter(buyId,buyCount,buyBId,buyBCount,sellId,sellCount,maxUses) {
  let second=buyBId?'{id:"'+buyBId+'",Count:'+buyBCount+'b}':'{}'
  return '{buy:{id:"'+buyId+'",Count:'+buyCount+'b},buyB:'+second+',sell:{id:"'+sellId+'",Count:'+sellCount+'b},uses:0,maxUses:'+maxUses+',rewardExp:0b,priceMultiplier:0.0f,demand:0,specialPrice:0,xp:0}'
}

function pdzWildTraderOffers(kind) {
  if(kind==='civildef') return [
    pdzWildOffer('lightmanscurrency:coin_copper',2,'minecraft:bread',4,12),
    pdzWildOffer('lightmanscurrency:coin_copper',3,'apocalypsenow:bandage',2,8),
    pdzWildOffer('minecraft:iron_ingot',8,'lightmanscurrency:coin_copper',1,6),
    pdzWildOffer('minecraft:gunpowder',12,'minecraft:iron_ingot',4,8),
    pdzWildBarter('minecraft:copper_ingot',12,'minecraft:redstone',8,'kubejs:field_repair_kit',1,5),
    pdzWildOffer('minecraft:leather',10,'apocalypsenow:bandage',2,6),
    pdzWildOffer('minecraft:coal',20,'minecraft:iron_ingot',3,8),
    pdzWildOffer('minecraft:paper',24,'lightmanscurrency:coin_copper',1,8)
  ]
  if(kind==='survivor') return [
    pdzWildOffer('lightmanscurrency:coin_copper',1,'minecraft:bread',5,16),
    pdzWildOffer('minecraft:cod',8,'lightmanscurrency:coin_copper',1,8),
    pdzWildOffer('minecraft:leather',12,'lightmanscurrency:coin_copper',1,6),
    pdzWildOffer('minecraft:wheat',20,'minecraft:cooked_beef',4,10),
    pdzWildOffer('minecraft:potato',24,'minecraft:bread',6,10),
    pdzWildBarter('minecraft:string',12,'minecraft:leather',4,'apocalypsenow:bandage',2,7),
    pdzWildOffer('minecraft:charcoal',16,'minecraft:torch',24,10),
    pdzWildOffer('minecraft:bone',16,'minecraft:leather',3,8)
  ]
  if(kind==='raider') return [
    pdzWildOffer('lightmanscurrency:coin_copper',5,'immersiveengineering:component_iron',2,5),
    pdzWildOffer('lightmanscurrency:coin_copper',12,'immersiveengineering:component_steel',2,2),
    pdzWildOffer('minecraft:gold_ingot',6,'lightmanscurrency:coin_copper',2,4),
    pdzWildBarter('minecraft:gunpowder',16,'minecraft:iron_ingot',6,'immersiveengineering:component_iron',1,5),
    pdzWildOffer('minecraft:copper_ingot',24,'kubejs:field_repair_kit',1,5),
    pdzWildOffer('minecraft:coal',24,'minecraft:gunpowder',8,7),
    pdzWildOffer('minecraft:leather',16,'minecraft:iron_ingot',5,6),
    pdzWildOffer('minecraft:redstone',24,'lightmanscurrency:coin_copper',2,5)
  ]
  return [
    pdzWildOffer('lightmanscurrency:coin_copper',2,'minecraft:cooked_beef',4,10),
    pdzWildOffer('lightmanscurrency:coin_copper',4,'kubejs:field_repair_kit',1,6),
    pdzWildOffer('minecraft:copper_ingot',12,'lightmanscurrency:coin_copper',1,8),
    pdzWildOffer('minecraft:cod',10,'minecraft:iron_ingot',3,8),
    pdzWildOffer('minecraft:salmon',8,'minecraft:leather',4,8),
    pdzWildBarter('minecraft:coal',16,'minecraft:copper_ingot',8,'kubejs:field_repair_kit',1,6),
    pdzWildOffer('minecraft:wheat',24,'minecraft:string',8,10),
    pdzWildOffer('minecraft:rotten_flesh',32,'minecraft:bone',8,6)
  ]
}

function pdzWildAir(level,x,y,z){
  let id=String(level.getBlock(x,y,z).id)
  return id==='minecraft:air'||id==='minecraft:cave_air'||id==='minecraft:void_air'
}

function pdzWildBadFloor(id){
  id=String(id)
  return id==='minecraft:air'||id==='minecraft:cave_air'||id==='minecraft:void_air'||
    id.indexOf('water')>=0||id.indexOf('lava')>=0||id.indexOf('leaves')>=0||
    id.indexOf('vine')>=0||id.indexOf('fence')>=0||id.indexOf('_wall')>=0||
    id.indexOf('pane')>=0||id.indexOf('bars')>=0
}

function pdzWildTraderSpot(marker){
  let level=marker.level,cx=Math.floor(marker.x),cy=Math.floor(marker.y),cz=Math.floor(marker.z)
  let indoor=[],outdoor=[]
  for(let radius=0;radius<=14;radius+=2){
    for(let dx=-radius;dx<=radius;dx+=2)for(let dz=-radius;dz<=radius;dz+=2){
      if(radius>0&&Math.abs(dx)!==radius&&Math.abs(dz)!==radius)continue
      // Never descend into caves below a facility anchor. Old code searched
      // 48 blocks down and routinely selected an underground floor.
      // The registry anchor is the facility ground/foundation. Going deeper
      // than four blocks can select caves, subway floors, or bunker roofs.
      for(let y=cy+6;y>=Math.max(-60,cy-4);y--){
        let x=cx+dx,z=cz+dz
        if(!pdzWildAir(level,x,y,z)||!pdzWildAir(level,x,y+1,z))continue
        if(pdzWildBadFloor(level.getBlock(x,y-1,z).id))continue
        let covered=false
        for(let up=2;up<=9;up++)if(!pdzWildAir(level,x,y+up,z)){covered=true;break}
        let spot={x:x+0.5,y:y,z:z+0.5}
        if(covered)indoor.push(spot);else outdoor.push(spot)
        break
      }
    }
  }
  // Traders prefer an interior floor and never inherit the player's altitude.
  return indoor.length?indoor[0]:(outdoor.length?outdoor[0]:null)
}

function pdzWildPlaceTrader(player,explicitMarker) {
  let marker=explicitMarker||pdzWildMarkerNear(player,160)
  if(!marker){player.tell(Text.of('先に野外拠点を登録してください。').red());return false}
  let occupancy=marker.persistentData.getString('dz_wild_occupancy')||'empty'
  if(!pdzWildOccupancyTrade(occupancy)){
    player.tell(Text.of('この建物には常駐トレーダーがいません。').red())
    return false
  }
  let kind=marker.persistentData.getString('dz_wild_trade')
  let faction=marker.persistentData.getString('dz_wild_faction')
  if(!kind && faction!=='independent'){player.tell(Text.of('この拠点には取引機能がありません。').red());return false}
  if(faction==='raider') kind='raider'
  kind=kind||'independent'
  let siteKey=marker.persistentData.getString('dz_wild_structure')
  let instanceKey=marker.persistentData.getString('dz_wild_instance')||pdzWildInstanceKey(player,siteKey,'',{x:marker.x,z:marker.z})
  let registry=pdzWildReadRegistry(player.server),record=registry[instanceKey]||null
  if(record&&record.traderSpawned){player.tell(Text.of('この拠点の商人は既に登録済みです。').yellow());return false}
  // Avoid duplicate traders around the same facility.
  let duplicate=false
  player.level.entities.forEach(e=>{
    if(e.tags && e.tags.contains('dz_wilderness_trader') && e.persistentData.getString('dz_wild_instance')===instanceKey) duplicate=true
  })
  if(duplicate){player.tell(Text.of('この拠点の商人は既に配置済みです。').yellow());return false}
  let spot=pdzWildTraderSpot(marker)
  if(!spot){player.tell(Text.of('商人用の安全な床を施設内に発見できませんでした。').red());return false}
  let name={survivor:'生存者交易員',civildef:'CDF補給担当',raider:'Ash Jackals 闇商人',independent:'独立キャラバン'}[kind]||'交易員'
  let offers=pdzWildTraderOffers(kind).join(',')
  let temp='dz_wild_trader_pending_'+Math.floor(Math.random()*1000000)
  let nbt='{NoAI:1b,Invulnerable:1b,PersistenceRequired:1b,CustomNameVisible:1b,CustomName:\'{"text":"'+name+'","color":"gold"}\',Tags:["dz_wilderness_trader","'+temp+'"],Offers:{Inventory:{},Recipes:{Recipes:['+offers+']}}}'
  // Easy NPC gives wilderness traders a human model while retaining the
  // established offer data used by the base-camp staff.
  player.runCommandSilent('execute positioned '+spot.x+' '+spot.y+' '+spot.z+' run summon easy_npc:humanoid ~ ~ ~ '+nbt)
  player.level.entities.forEach(e=>{
    if(e.tags && e.tags.contains(temp)){
      e.tags.remove(temp);e.persistentData.putString('dz_wild_structure',siteKey);e.persistentData.putString('dz_wild_instance',instanceKey);e.persistentData.putString('dz_wild_trade',kind)
    }
  })
  if(!record)record={instance:instanceKey,structure:siteKey,type:marker.persistentData.getString('dz_wild_type'),faction:faction,x:marker.x,y:marker.y,z:marker.z,discoveredAt:Date.now(),activated:false}
  record.traderSpawned=true;record.traderX=spot.x;record.traderY=spot.y;record.traderZ=spot.z
  registry[instanceKey]=record;pdzWildWriteRegistry(player.server,registry)
  player.tell(Text.of(name+'を施設内の安全地点へ配置しました。').green())
  return true
}

function pdzWildActivate(player) {
  let marker=pdzWildMarkerNear(player,112)
  if(!marker){player.tell(Text.of('先に野外拠点を登録してください。').red());return false}
  let occupancy=marker.persistentData.getString('dz_wild_occupancy')||'empty'
  if(!pdzWildOccupancyGarrison(occupancy)){
    player.tell(Text.of('この建物は無人です。Lootや探索対象として利用できます。').gray())
    return false
  }
  if(marker.persistentData.getBoolean('dz_wild_activated')){
    player.tell(Text.of('この拠点は既に有効化されています。').yellow());return false
  }
  let faction=marker.persistentData.getString('dz_wild_faction')
  let fn={
    survivor:'project_deadzone:factions/squad/survivors_roles',
    civildef:'project_deadzone:factions/squad/civildef_roles',
    raider:'project_deadzone:factions/squad/raiders_roles',
    remnant:'project_deadzone:factions/squad/remnant_roles'
  }[faction]
  if(fn) player.runCommandSilent('function '+fn)
  else if(faction==='infected') {
    player.runCommandSilent('summon minecraft:zombie ~3 ~ ~3 {PersistenceRequired:1b,Tags:["dz_wilderness_defender","dz_infected"]}')
    player.runCommandSilent('summon minecraft:zombie ~-3 ~ ~2 {PersistenceRequired:1b,Tags:["dz_wilderness_defender","dz_infected"]}')
    player.runCommandSilent('summon minecraft:zombie ~2 ~ ~-3 {PersistenceRequired:1b,Tags:["dz_wilderness_defender","dz_infected"]}')
  } else if(faction==='independent') {
    if(!pdzWildPlaceTrader(player)) return false
  } else {
    player.tell(Text.of(PDZ_WILD_NAMES[faction]+'の専用Mobは予約済みですが、まだ導入されていません。').yellow())
    return false
  }
  marker.persistentData.putBoolean('dz_wild_activated',true)
  let instanceKey=marker.persistentData.getString('dz_wild_instance'),registry=pdzWildReadRegistry(player.server)
  if(instanceKey&&registry[instanceKey]){registry[instanceKey].activated=true;pdzWildWriteRegistry(player.server,registry)}
  player.tell(Text.of((PDZ_WILD_NAMES[faction]||faction)+'拠点を有効化しました。').green())
  return true
}

function pdzWildRepairNear(player) {
  let info=pdzWildFindCurrent(player)
  if(!info){
    let lost=pdzWildLostCurrent(player)
    if(lost)info={siteId:lost.buildingId,instance:lost.instance,x:lost.x,y:player.y,z:lost.z,def:lost.def}
  }
  if(!info){player.tell(Text.of('現在地では施設を特定できません。').red());return false}
  let siteId=info.siteId,instance=info.instance,count=0
  player.level.entities.forEach(e=>{
    if(!e.tags||!(e.tags.contains('dz_wilderness_site')||e.tags.contains('dz_wilderness_trader')))return
    if(e.persistentData.getString('dz_wild_structure')!==String(siteId))return
    let dx=e.x-info.x,dz=e.z-info.z
    if(dx*dx+dz*dz<=96*96){e.discard();count++}
  })
  let registry=pdzWildReadRegistry(player.server)
  Object.keys(registry).forEach(key=>{
    let r=registry[key]
    if(key===instance||(r&&String(r.structure)===String(siteId)&&Math.pow(Number(r.x)-info.x,2)+Math.pow(Number(r.z)-info.z,2)<=96*96))delete registry[key]
  })
  pdzWildWriteRegistry(player.server,registry)
  let def=info.def||PDZ_WILD_SITES[siteId]
  let marker=pdzWildCreateMarker(player,siteId,null,instance,{x:info.x,y:info.y,z:info.z},def)
  player.tell(Text.of('施設台帳を再構築しました。削除: '+count+' / 固定ID: '+instance).green())
  return marker!==null
}

PlayerEvents.tick(event=>{
  let p=event.player
  if(p.level.clientSide) return
  let ticks=p.persistentData.getInt('dz_wild_scan_ticks')+1
  if(ticks<100){p.persistentData.putInt('dz_wild_scan_ticks',ticks);return}
  p.persistentData.putInt('dz_wild_scan_ticks',0)
  let chunk=Math.floor(p.x/16)+','+Math.floor(p.z/16)+','+String(p.level.dimension)
  if(p.persistentData.getString('dz_wild_last_chunk')===chunk) return
  p.persistentData.putString('dz_wild_last_chunk',chunk)
  pdzWildScan(p)
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonewild')
  root.then(Commands.literal('status').executes(ctx=>{pdzWildStatus(ctx.source.player);return 1}))
  root.then(Commands.literal('biome').executes(ctx=>{
    let p=ctx.source.player,id=pdzWildBiomeId(p),profile=pdzWildBiomeProfile(id)
    p.tell(Text.of('=== BIOME FACTION PROFILE ===').gold())
    p.tell(Text.of(id+' / '+profile.id).aqua())
    Object.keys(profile.factions).sort((a,b)=>profile.factions[b]-profile.factions[a]).forEach(f=>p.tell(Text.of((PDZ_WILD_NAMES[f]||f)+': '+profile.factions[f]).yellow()))
    p.tell(Text.of('Favored facilities: '+Object.keys(profile.roles).sort((a,b)=>profile.roles[b]-profile.roles[a]).join(', ')).green())
    return 1
  }))
  root.then(Commands.literal('scan').executes(ctx=>{
    let p=ctx.source.player,m=pdzWildScan(p)
    if(!m)p.tell(Text.of('対応する生成物の内部で実行してください。').red())
    else pdzWildStatus(p)
    return m?1:0
  }))
  root.then(Commands.literal('lostcity').executes(ctx=>{
    let p=ctx.source.player,lost=pdzWildLostCurrent(p)
    if(!lost){p.tell(Text.of('Lost Cities building: none at current position').gray());return 0}
    let faction=pdzWildLostFaction(p,lost)
    p.tell(Text.of('=== LOST CITIES ACTIVITY ===').gold())
    p.tell(Text.of('Building: '+lost.buildingId).white())
    let city=pdzWildLostCityProfile(p,lost)
    p.tell(Text.of('City: '+city.name+' / '+city.id).aqua())
    p.tell(Text.of('Class: '+lost.def.type+' / '+lost.def.role).aqua())
    p.tell(Text.of('Status: 無法地帯').gray())
    p.tell(pdzWildColoredText('Active expedition: '+(PDZ_WILD_NAMES[faction]||faction),PDZ_WILD_COLORS[faction]))
    p.tell(Text.of('City activity pool: '+(city.activityFactions||[]).map(f=>PDZ_WILD_NAMES[f]||f).join(' / ')).yellow())
    p.tell(Text.of('Garrison: '+(lost.def.garrison?'enabled':'light occupation only')).yellow())
    p.tell(Text.of('Facility role: '+lost.def.role+' (does not imply ownership)').yellow())
    p.tell(Text.of('Instance: '+lost.instance).darkGray())
    return 1
  }))
  root.then(Commands.literal('bind').requires(s=>s.hasPermission(2))
    .then(Commands.argument('site',PDZ_WILD_STRING_ARG.word()).executes(ctx=>{
      let p=ctx.source.player,id=PDZ_WILD_STRING_ARG.getString(ctx,'site')
      if(id.indexOf(':')<0)id='manual:'+id
      let m=pdzWildCreateMarker(p,id,null);return m?1:0
    })))
  root.then(Commands.literal('trader').requires(s=>s.hasPermission(2)).executes(ctx=>pdzWildPlaceTrader(ctx.source.player)?1:0))
  root.then(Commands.literal('activate').requires(s=>s.hasPermission(2)).executes(ctx=>pdzWildActivate(ctx.source.player)?1:0))
  root.then(Commands.literal('repair_near').requires(s=>s.hasPermission(2)).executes(ctx=>pdzWildRepairNear(ctx.source.player)?1:0))
  root.then(Commands.literal('force_faction').requires(s=>s.hasPermission(2))
    .then(Commands.argument('faction',PDZ_WILD_STRING_ARG.word()).executes(ctx=>{
      let p=ctx.source.player,m=pdzWildMarkerNear(p,112)
      if(!m){p.tell(Text.of('近くに野外拠点マーカーがありません。').red());return 0}
      let faction=PDZ_WILD_STRING_ARG.getString(ctx,'faction')
      if(!PDZ_WILD_NAMES[faction]){p.tell(Text.of('不明な勢力: '+faction).red());return 0}
      let old=m.persistentData.getString('dz_wild_faction')
      m.tags.remove('dz_wilderness_'+old);m.tags.add('dz_wilderness_'+faction)
      m.persistentData.putString('dz_wild_faction',faction)
      m.persistentData.putBoolean('dz_wild_activated',false)
      p.tell(Text.of('占拠勢力を '+PDZ_WILD_NAMES[faction]+' へ変更しました。').green());return 1
    })))
  root.then(Commands.literal('remove_near').requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player,count=0
    p.level.entities.forEach(e=>{
      if(!e.tags || !(e.tags.contains('dz_wilderness_site')||e.tags.contains('dz_wilderness_trader')))return
      let dx=e.x-p.x,dy=e.y-p.y,dz=e.z-p.z
      if(dx*dx+dy*dy+dz*dz<=128*128){e.discard();count++}
    })
    p.tell(Text.of('野外拠点マーカー／商人を削除: '+count).yellow());return count
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Wilderness faction sites v0.1 loaded: '+Object.keys(PDZ_WILD_SITES).length+' structures')
