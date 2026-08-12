// PROJECT DEADZONE wilderness faction sites v0.1
// Detects existing generated structures when a player enters them and assigns
// a stable occupation. No forced chunks and no global structure scans.

const PDZ_WILD_REGISTRIES = Java.loadClass('net.minecraft.core.registries.Registries')
const PDZ_WILD_RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
const PDZ_WILD_BLOCKPOS = Java.loadClass('net.minecraft.core.BlockPos')
const PDZ_WILD_STRING_ARG = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

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
  infected:'Infected', independent:'Independent'
}

const PDZ_WILD_COLORS = {
  survivor:'green', civildef:'aqua', raider:'red', remnant:'dark_red',
  aegis:'light_purple', warden:'gold', infected:'dark_green', independent:'yellow'
}

// Strategic roles are deliberately separate from faction and building size.
// Story, convoy and Named systems can therefore react to what a site does
// without hard-coding every structure ID again.
function pdzWildRole(type,structure,faction,trade) {
  let value=(String(type||'')+' '+String(structure||'')).toLowerCase()
  if(value.indexOf('hospital')>=0||value.indexOf('clinic')>=0||value.indexOf('medic')>=0) return 'medical'
  if(value.indexOf('radio')>=0||value.indexOf('watch')>=0||value.indexOf('observation')>=0) return 'communications'
  if(value.indexOf('laboratory')>=0||value.indexOf('labyrinth')>=0||value.indexOf('test_area')>=0) return 'research'
  if(value.indexOf('scrapyard')>=0||value.indexOf('mine')>=0||value.indexOf('gas_station')>=0) return 'logistics'
  if(value.indexOf('military')>=0||value.indexOf('command')>=0||value.indexOf('outpost')>=0||value.indexOf('checkpoint')>=0) return 'security'
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

function pdzWildBiomeId(player) {
  try {
    let pos=new PDZ_WILD_BLOCKPOS(Math.floor(player.x),Math.floor(player.y),Math.floor(player.z))
    let key=player.level.getBiome(pos).unwrapKey()
    return key.isPresent() ? String(key.get().location()) : 'minecraft:plains'
  } catch (ignored) { return 'minecraft:plains' }
}

function pdzWildBiomeGroup(id) {
  id=String(id)
  if (id.indexOf('desert')>=0 || id.indexOf('badlands')>=0) return ['raider','remnant']
  if (id.indexOf('savanna')>=0) return ['raider','independent']
  if (id.indexOf('swamp')>=0 || id.indexOf('mangrove')>=0) return ['infected','aegis']
  if (id.indexOf('jungle')>=0) return ['aegis','infected']
  if (id.indexOf('snow')>=0 || id.indexOf('frozen')>=0 || id.indexOf('taiga')>=0) return ['remnant','civildef']
  if (id.indexOf('mountain')>=0 || id.indexOf('peak')>=0 || id.indexOf('stony')>=0 || id.indexOf('windswept')>=0) return ['remnant','warden']
  if (id.indexOf('ocean')>=0 || id.indexOf('river')>=0 || id.indexOf('beach')>=0 || id.indexOf('coast')>=0) return ['independent','raider']
  if (id.indexOf('dark_forest')>=0) return ['raider','infected']
  if (id.indexOf('forest')>=0) return ['survivor','raider']
  return ['survivor','civildef']
}

function pdzWildPickFaction(siteId,def,player) {
  let biome=pdzWildBiomeGroup(pdzWildBiomeId(player))
  let key=String(player.level.dimension)+'|'+siteId+'|'+Math.floor(player.x/32)+'|'+Math.floor(player.z/32)
  let roll=pdzWildHash(key)%100
  // Facility identity matters, but the wilderness remains replayable.
  if (roll<45) return def.preferred
  if (roll<65) return biome[0]
  if (roll<80) return biome[1]
  if (roll<92) return 'infected'
  if (roll<98) return 'independent'
  return 'warden'
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

function pdzWildInside(player,siteId) {
  try {
    let registry=player.level.registryAccess().registryOrThrow(PDZ_WILD_REGISTRIES.STRUCTURE)
    let structure=registry.get(new PDZ_WILD_RL(siteId))
    if (!structure) return false
    let pos=new PDZ_WILD_BLOCKPOS(Math.floor(player.x),Math.floor(player.y),Math.floor(player.z))
    return player.level.structureManager().getStructureWithPieceAt(pos,structure).isValid()
  } catch (ignored) { return false }
}

function pdzWildFindCurrent(player) {
  let ids=Object.keys(PDZ_WILD_SITES)
  for (let i=0;i<ids.length;i++) if (pdzWildInside(player,ids[i])) return ids[i]
  return null
}

function pdzWildCreateMarker(player,siteId,forcedFaction) {
  let nearby=pdzWildMarkerNear(player,112)
  if(nearby && nearby.persistentData.getString('dz_wild_structure')===siteId) return nearby
  let def=PDZ_WILD_SITES[siteId] || {type:'manual',preferred:'independent',trade:'independent'}
  let faction=forcedFaction || pdzWildPickFaction(siteId,def,player)
  let temp='dz_wilderness_pending_'+Math.floor(Math.random()*1000000)
  player.runCommandSilent('summon minecraft:armor_stand ~ ~ ~ {Invisible:1b,Invulnerable:1b,NoGravity:1b,Marker:1b,Tags:["dz_wilderness_site","'+temp+'"]}')
  let marker=null
  player.level.entities.forEach(e=>{if(e.tags && e.tags.contains(temp)) marker=e})
  if(!marker) return null
  marker.tags.remove(temp)
  marker.tags.add('dz_wilderness_'+faction)
  marker.persistentData.putString('dz_wild_structure',siteId)
  marker.persistentData.putString('dz_wild_type',def.type)
  marker.persistentData.putString('dz_wild_faction',faction)
  marker.persistentData.putString('dz_wild_biome',pdzWildBiomeId(player))
  marker.persistentData.putString('dz_wild_trade',def.trade || '')
  let role=pdzWildRole(def.type,siteId,faction,def.trade||'')
  marker.persistentData.putString('dz_wild_role',role)
  marker.persistentData.putString('dz_wild_named',pdzWildNamedCandidate(def.type,role,faction))
  marker.persistentData.putLong('dz_wild_created',Date.now())
  player.tell(Text.of('[AREA DISCOVERED] ').gold()
    .append(Text.of(def.type+' / ').white())
    .append(Text.of(PDZ_WILD_NAMES[faction]||faction)[PDZ_WILD_COLORS[faction]||'gray']()))
  return marker
}

function pdzWildScan(player) {
  let current=pdzWildFindCurrent(player)
  if(!current) return null
  let near=pdzWildMarkerNear(player,112)
  if(near && near.persistentData.getString('dz_wild_structure')===current) return near
  return pdzWildCreateMarker(player,current,null)
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
  player.tell(Text.of('施設: '+marker.persistentData.getString('dz_wild_type')).white())
  player.tell(Text.of('勢力: '+(PDZ_WILD_NAMES[faction]||faction))[PDZ_WILD_COLORS[faction]||'gray']())
  player.tell(Text.of('構造物: '+marker.persistentData.getString('dz_wild_structure')).darkGray())
  let role=marker.persistentData.getString('dz_wild_role')
  if(!role) role=pdzWildRole(marker.persistentData.getString('dz_wild_type'),marker.persistentData.getString('dz_wild_structure'),faction,marker.persistentData.getString('dz_wild_trade'))
  player.tell(Text.of('戦略役割: '+role).aqua())
  let named=marker.persistentData.getString('dz_wild_named')
  if(named) player.tell(Text.of('Named候補: '+named).lightPurple())
  let trade=marker.persistentData.getString('dz_wild_trade')
  if(trade) player.tell(Text.of('取引候補: '+trade).yellow())
}

function pdzWildOffer(buyId,buyCount,sellId,sellCount,maxUses) {
  return '{buy:{id:"'+buyId+'",Count:'+buyCount+'b},buyB:{},sell:{id:"'+sellId+'",Count:'+sellCount+'b},uses:0,maxUses:'+maxUses+',rewardExp:0b,priceMultiplier:0.0f,demand:0,specialPrice:0,xp:0}'
}

function pdzWildTraderOffers(kind) {
  if(kind==='civildef') return [
    pdzWildOffer('apocalypsenow:money',2,'minecraft:bread',4,12),
    pdzWildOffer('apocalypsenow:money',3,'apocalypsenow:bandage',2,8),
    pdzWildOffer('minecraft:iron_ingot',8,'apocalypsenow:money',1,6)
  ]
  if(kind==='survivor') return [
    pdzWildOffer('apocalypsenow:money',1,'minecraft:bread',5,16),
    pdzWildOffer('minecraft:cod',8,'apocalypsenow:money',1,8),
    pdzWildOffer('minecraft:leather',12,'apocalypsenow:money',1,6)
  ]
  if(kind==='raider') return [
    pdzWildOffer('apocalypsenow:money',5,'kubejs:affix_scrap_uncommon',1,5),
    pdzWildOffer('apocalypsenow:money',12,'kubejs:affix_scrap_rare',1,2),
    pdzWildOffer('minecraft:gold_ingot',6,'apocalypsenow:money',2,4)
  ]
  return [
    pdzWildOffer('apocalypsenow:money',2,'minecraft:cooked_beef',4,10),
    pdzWildOffer('apocalypsenow:money',4,'kubejs:field_repair_kit',1,6),
    pdzWildOffer('minecraft:copper_ingot',12,'apocalypsenow:money',1,8)
  ]
}

function pdzWildPlaceTrader(player) {
  let marker=pdzWildMarkerNear(player,112)
  if(!marker){player.tell(Text.of('先に野外拠点を登録してください。').red());return false}
  let kind=marker.persistentData.getString('dz_wild_trade')
  let faction=marker.persistentData.getString('dz_wild_faction')
  if(!kind && faction!=='independent'){player.tell(Text.of('この拠点には取引機能がありません。').red());return false}
  if(faction==='raider') kind='raider'
  kind=kind||'independent'
  let siteKey=marker.persistentData.getString('dz_wild_structure')
  // Avoid duplicate traders around the same facility.
  let duplicate=false
  player.level.entities.forEach(e=>{
    if(e.tags && e.tags.contains('dz_wilderness_trader') && e.persistentData.getString('dz_wild_structure')===siteKey) duplicate=true
  })
  if(duplicate){player.tell(Text.of('この拠点の商人は既に配置済みです。').yellow());return false}
  let name={survivor:'生存者交易員',civildef:'CDF補給担当',raider:'Ash Jackals 闇商人',independent:'独立キャラバン'}[kind]||'交易員'
  let offers=pdzWildTraderOffers(kind).join(',')
  let temp='dz_wild_trader_pending_'+Math.floor(Math.random()*1000000)
  let nbt='{NoAI:1b,Invulnerable:1b,PersistenceRequired:1b,DespawnDelay:2147483647,CustomNameVisible:1b,CustomName:\'{"text":"'+name+'","color":"gold"}\',Tags:["dz_wilderness_trader","'+temp+'"],Offers:{Recipes:['+offers+']}}'
  player.runCommandSilent('summon minecraft:wandering_trader ~ ~ ~ '+nbt)
  player.level.entities.forEach(e=>{
    if(e.tags && e.tags.contains(temp)){
      e.tags.remove(temp);e.persistentData.putString('dz_wild_structure',siteKey);e.persistentData.putString('dz_wild_trade',kind)
    }
  })
  player.tell(Text.of(name+'を現在位置に配置しました。').green())
  return true
}

function pdzWildActivate(player) {
  let marker=pdzWildMarkerNear(player,112)
  if(!marker){player.tell(Text.of('先に野外拠点を登録してください。').red());return false}
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
  player.tell(Text.of((PDZ_WILD_NAMES[faction]||faction)+'拠点を有効化しました。').green())
  return true
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
  root.then(Commands.literal('scan').executes(ctx=>{
    let p=ctx.source.player,m=pdzWildScan(p)
    if(!m)p.tell(Text.of('対応する生成物の内部で実行してください。').red())
    else pdzWildStatus(p)
    return m?1:0
  }))
  root.then(Commands.literal('bind').requires(s=>s.hasPermission(2))
    .then(Commands.argument('site',PDZ_WILD_STRING_ARG.word()).executes(ctx=>{
      let p=ctx.source.player,id=PDZ_WILD_STRING_ARG.getString(ctx,'site')
      if(id.indexOf(':')<0)id='manual:'+id
      let m=pdzWildCreateMarker(p,id,null);return m?1:0
    })))
  root.then(Commands.literal('trader').requires(s=>s.hasPermission(2)).executes(ctx=>pdzWildPlaceTrader(ctx.source.player)?1:0))
  root.then(Commands.literal('activate').requires(s=>s.hasPermission(2)).executes(ctx=>pdzWildActivate(ctx.source.player)?1:0))
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
