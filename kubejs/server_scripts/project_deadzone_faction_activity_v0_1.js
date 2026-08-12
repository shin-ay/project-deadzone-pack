// PROJECT DEADZONE faction activity framework v0.1
// Persistent outpost ledger, virtual travel while unloaded, nearby materialisation.

const PDZ_ACT_STRING = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
const PDZ_ACT_LEDGER = 'dz_activity_outpost_ledger_v1'
const PDZ_ACT_LIST = 'dz_activity_list_v1'
const PDZ_ACT_RANGE = 96
const PDZ_ACT_LIMIT = 3
const PDZ_ACT_AUTO_ENABLED = 'dz_activity_director_enabled_v1'
const PDZ_ACT_AUTO_NEXT = 'dz_activity_director_next_v1'

function pdzActRead(server,key) {
  let raw=server.persistentData.getString(key)
  if(!raw) return []
  try { let v=JSON.parse(raw); return Array.isArray(v)?pdzActSanitizeList(v,key):[] }
  catch(err) {
    // Older activity data could contain JavaScript's NaN token.  NaN is not
    // legal JSON, so recover that ledger instead of discarding every route.
    try {
      let repaired=JSON.parse(String(raw).replace(/(^|[:,\[])\s*(NaN|Infinity|-Infinity)\s*(?=[,}\]])/g,'$1null'))
      if(Array.isArray(repaired)){
        repaired=pdzActSanitizeList(repaired,key)
        pdzActWrite(server,key,repaired)
        console.warn('[PDZ ACTIVITY] repaired non-finite values in '+key)
        return repaired
      }
    }catch(ignored){}
    console.error('[PDZ ACTIVITY] invalid '+key+': '+err)
    return []
  }
}
function pdzActNumber(value,fallback) {
  let n=Number(value)
  return Number.isFinite(n)?n:Number(fallback||0)
}
function pdzActSanitizeList(list,key) {
  return list.filter(v=>v&&typeof v==='object').map(v=>{
    if(key===PDZ_ACT_LIST){
      v.sx=pdzActNumber(v.sx,v.x);v.sy=pdzActNumber(v.sy,v.y);v.sz=pdzActNumber(v.sz,v.z)
      v.tx=pdzActNumber(v.tx,v.sx);v.ty=pdzActNumber(v.ty,v.sy);v.tz=pdzActNumber(v.tz,v.sz)
      v.x=pdzActNumber(v.x,v.sx);v.y=pdzActNumber(v.y,v.sy);v.z=pdzActNumber(v.z,v.sz)
      v.created=pdzActNumber(v.created,Date.now());v.departAt=pdzActNumber(v.departAt,v.created)
      v.startAt=pdzActNumber(v.startAt,v.departAt);v.arriveAt=pdzActNumber(v.arriveAt,v.startAt+180000)
      v.lastUpdate=pdzActNumber(v.lastUpdate,v.created)
    }else{
      v.x=pdzActNumber(v.x,0);v.y=pdzActNumber(v.y,64);v.z=pdzActNumber(v.z,0)
      v.supply=pdzActNumber(v.supply,0);v.alert=pdzActNumber(v.alert,0);v.defenders=pdzActNumber(v.defenders,0)
    }
    return v
  })
}
function pdzActWrite(server,key,v) {
  server.persistentData.putString(key,JSON.stringify(v,(name,value)=>typeof value==='number'&&!Number.isFinite(value)?null:value))
}
function pdzActDim(e) { return String(e.level.dimension) }
function pdzActDist2(a,b) { let x=a.x-b.x,z=a.z-b.z; return x*x+z*z }
function pdzActSiteId(e) {
  return pdzActDim(e)+'|'+Math.floor(e.x)+'|'+Math.floor(e.z)+'|'+(e.persistentData.getString('dz_wild_structure')||'manual:site')
}
function pdzActSize(type) {
  type=String(type||'')
  if(type.indexOf('military')>=0||type.indexOf('mansion')>=0||type.indexOf('laboratory')>=0||type.indexOf('command')>=0) return 'large'
  if(type.indexOf('camp')>=0||type.indexOf('station')>=0||type.indexOf('settlement')>=0||type.indexOf('outpost')>=0) return 'medium'
  return 'small'
}
function pdzActRole(type,structure,faction,trade) {
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
function pdzActNamed(type,role,faction) {
  if(type==='gas_station') return 'Axel'
  if(type==='fire_station') return 'Cinder'
  if(type==='laboratory'||role==='research') return 'Doctor Whitestitch'
  if(role==='communications'&&faction==='remnant') return 'Echo-7'
  if(role==='security'&&faction==='civildef') return 'Marshal Graves'
  if(role==='logistics'&&faction==='raider') return 'Ash Jackals Quartermaster'
  return ''
}
function pdzActInitialSupply(id,size) {
  let h=0
  for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))&0x7fffffff
  return Math.min(100,(size==='large'?65:(size==='medium'?48:32))+(h%21))
}
function pdzActRoleBonus(role) {
  return {logistics:18,trade:12,food:10,security:8,medical:6,communications:4,research:2,nest:0,machine_node:10,shelter:3}[String(role||'')]||0
}
function pdzActRouteScore(source,target,kind) {
  let score=Math.random()*20
  if(kind==='supply'){
    if(source.role==='logistics'||source.role==='food')score+=35
    if(target.role==='security'||target.role==='medical'||target.role==='communications')score+=24
    score+=Math.max(0,60-Number(target.supply||0))*0.5
  }else if(kind==='patrol'){
    if(source.role==='security'||source.role==='communications')score+=35
    if(target.role==='security'||target.role==='trade'||target.role==='shelter')score+=18
    score+=Number(target.alert||0)*0.4
  }else if(kind==='trade'){
    if(source.role==='trade'||source.role==='food'||source.role==='logistics')score+=35
    if(target.role==='trade'||target.role==='shelter'||target.role==='medical')score+=22
    score+=Math.max(0,55-Number(target.supply||0))*0.35
  }else if(kind==='reinforcement'){
    if(source.role==='security'||source.role==='communications')score+=42
    if(source.size==='large'||source.size==='medium')score+=16
    if(target.role==='medical'||target.role==='trade'||target.role==='shelter')score+=20
    score+=Number(target.alert||0)*0.75
    score+=Math.max(0,12-Number(target.defenders||0))*2.5
  }else if(kind==='assault'){
    if(source.role==='security'||source.role==='logistics'||source.role==='communications')score+=32
    if(source.size==='large')score+=18
    else if(source.size==='medium')score+=10
    if(target.role==='security'||target.role==='communications'||target.role==='trade')score+=18
    score+=Math.max(0,18-Number(target.defenders||0))*2.2
    score+=Math.max(0,55-Number(target.supply||0))*0.25
  }
  return score
}
function pdzActCargoFor(source,target) {
  if(source.role==='food')return 'food_water'
  if(source.role==='medical'||target.role==='medical')return 'medical'
  if(source.role==='communications'||target.role==='communications')return 'electronics'
  if(target.role==='security')return 'ammo_armor'
  if(source.role==='research')return 'research_materials'
  return 'general_supplies'
}
function pdzActApplyArrival(site,activity,delivered) {
  site.supply=Math.min(100,Number(site.supply||0)+delivered)
  site.lastActivity=Date.now()
  if(activity.type==='CDF_PATROL'){
    site.alert=Math.max(0,Number(site.alert||0)-12)
    site.defenders=Math.min(24,Number(site.defenders||0)+2)
  }else if(activity.type==='REINFORCEMENT'){
    site.alert=Math.max(0,Number(site.alert||0)-18)
    site.defenders=Math.min(30,Number(site.defenders||0)+Number(activity.reinforcementStrength||5))
    if(site.role==='medical')site.supply=Math.min(100,site.supply+4)
  }else if(activity.type==='TRADE_CARAVAN'){
    site.alert=Math.max(0,Number(site.alert||0)-4)
    if(site.role==='trade'||site.role==='food')site.supply=Math.min(100,site.supply+5)
  }else if(activity.type==='SUPPLY_CONVOY'){
    if(site.role==='security')site.defenders=Math.min(30,Number(site.defenders||0)+3)
    if(site.role==='communications')site.alert=Math.max(0,Number(site.alert||0)-8)
    if(site.role==='medical')site.defenders=Math.min(30,Number(site.defenders||0)+1)
  }
  return site
}
function pdzActTell(player,text,color) { player.tell(Text.of(text)[color||'white']()) }

function pdzActScan(server) {
  let old=pdzActRead(server,PDZ_ACT_LEDGER), map={}, seen={}
  old.forEach(s=>map[s.id]=s)
  server.players.forEach(player=>player.level.entities.forEach(marker=>{
    if(!marker.tags||!marker.tags.contains('dz_wilderness_site')) return
    let id=pdzActSiteId(marker)
    if(seen[id]) return
    seen[id]=true
    let prior=map[id]||{}, type=marker.persistentData.getString('dz_wild_type')||'manual', size=pdzActSize(type)
    let structure=marker.persistentData.getString('dz_wild_structure')||'manual:site'
    let markerFaction=marker.persistentData.getString('dz_wild_faction')||'independent'
    // Captured ownership is authoritative. Otherwise the original structure
    // marker would restore its old faction every time this ledger is scanned.
    let faction=prior.ownerLocked&&prior.faction?String(prior.faction):markerFaction
    let trade=marker.persistentData.getString('dz_wild_trade')||''
    let role=marker.persistentData.getString('dz_wild_role')||pdzActRole(type,structure,faction,trade)
    let named=marker.persistentData.getString('dz_wild_named')||pdzActNamed(type,role,faction)
    marker.persistentData.putString('dz_wild_role',role)
    if(named)marker.persistentData.putString('dz_wild_named',named)
    map[id]={id:id,dimension:pdzActDim(marker),x:Math.floor(marker.x),y:Math.floor(marker.y),z:Math.floor(marker.z),
      structure:structure,type:type,faction:faction,size:size,role:role,named:named,trade:trade,
      supply:prior.supply===undefined?Math.min(100,pdzActInitialSupply(id,size)+pdzActRoleBonus(role)):prior.supply,
      alert:prior.alert===undefined?0:prior.alert,defenders:prior.defenders===undefined?0:prior.defenders,
      coreAlive:prior.coreAlive===undefined?true:prior.coreAlive,lastActivity:prior.lastActivity||0,lastSeen:Date.now(),
      ownerLocked:!!prior.ownerLocked,capturedAt:prior.capturedAt||0,capturedBy:prior.capturedBy||'',previousFaction:prior.previousFaction||''}
  }))
  let result=Object.keys(map).map(id=>map[id])
  pdzActWrite(server,PDZ_ACT_LEDGER,result)
  return result
}

function pdzActPickRoute(server) {
  let sites=pdzActScan(server).filter(s=>s.faction==='raider'&&s.coreAlive&&s.supply>=20&&Number.isFinite(Number(s.x))&&Number.isFinite(Number(s.z))), choices=[]
  for(let i=0;i<sites.length;i++) for(let j=0;j<sites.length;j++) {
    if(i===j||sites[i].dimension!==sites[j].dimension) continue
    let d=Math.sqrt(pdzActDist2(sites[i],sites[j]))
    if(d>=160&&d<=1500) choices.push({source:sites[i],target:sites[j],distance:d,score:pdzActRouteScore(sites[i],sites[j],'supply')})
  }
  choices.sort((a,b)=>b.score-a.score)
  return choices.length?choices[Math.floor(Math.random()*Math.min(3,choices.length))]:null
}

function pdzActPickFactionRoute(server,factions,minDistance,maxDistance,kind) {
  let allowed={}
  factions.forEach(f=>allowed[String(f)]=true)
  let sites=pdzActScan(server).filter(s=>allowed[String(s.faction)]&&s.coreAlive&&Number.isFinite(Number(s.x))&&Number.isFinite(Number(s.z))),choices=[]
  for(let i=0;i<sites.length;i++) for(let j=0;j<sites.length;j++) {
    if(i===j||sites[i].dimension!==sites[j].dimension) continue
    let d=Math.sqrt(pdzActDist2(sites[i],sites[j]))
    if(d>=minDistance&&d<=maxDistance) choices.push({source:sites[i],target:sites[j],distance:d,score:pdzActRouteScore(sites[i],sites[j],kind||'patrol')})
  }
  choices.sort((a,b)=>b.score-a.score)
  return choices.length?choices[Math.floor(Math.random()*Math.min(3,choices.length))]:null
}
function pdzActFactionBloc(faction) {
  faction=String(faction||'independent')
  if(['cdf','civildef','survivor'].indexOf(faction)>=0)return 'survivor'
  return faction
}
function pdzActHostile(attacker,target) {
  let a=pdzActFactionBloc(attacker),b=pdzActFactionBloc(target)
  if(a===b||a==='independent'||b==='independent')return false
  if(a==='infected'||b==='infected')return true
  return true
}
function pdzActPickAssaultRoute(server,attackerFaction) {
  let attackerBloc=pdzActFactionBloc(attackerFaction)
  let sites=pdzActScan(server).filter(s=>s.coreAlive&&Number.isFinite(Number(s.x))&&Number.isFinite(Number(s.z))),choices=[]
  sites.forEach(source=>sites.forEach(target=>{
    if(source.id===target.id||source.dimension!==target.dimension)return
    if(pdzActFactionBloc(source.faction)!==attackerBloc||!pdzActHostile(attackerBloc,target.faction))return
    if(Number(source.supply||0)<18||Number(source.defenders||0)<3)return
    let d=Math.sqrt(pdzActDist2(source,target))
    if(d<192||d>1600)return
    choices.push({source:source,target:target,distance:d,score:pdzActRouteScore(source,target,'assault')})
  }))
  choices.sort((a,b)=>b.score-a.score)
  return choices.length?choices[Math.floor(Math.random()*Math.min(3,choices.length))]:null
}
function pdzActNewId() { return 'ACT-'+Date.now().toString(36).toUpperCase()+'-'+Math.floor(Math.random()*1296).toString(36).toUpperCase() }

function pdzActCanCreate(server,player) {
  let list=pdzActRead(server,PDZ_ACT_LIST)
  let active=list.filter(a=>['ARRIVED','DESTROYED','CANCELLED','RETREATED'].indexOf(a.state)<0).length
  if(active>=PDZ_ACT_LIMIT){if(player)pdzActTell(player,'[ACTIVITY] Active activity limit reached.','red');return false}
  return true
}

function pdzActCreatePatrol(server,player) {
  if(!pdzActCanCreate(server,player))return null
  let route=pdzActPickFactionRoute(server,['cdf','civildef','survivor'],128,1200,'patrol')
  if(!route){pdzActTell(player,'[ACTIVITY] Need two CDF/Survivor sites 128-1200m apart.','red');return null}
  let now=Date.now(),duration=Math.max(150000,Math.floor(route.distance*700))
  let a={version:1,id:pdzActNewId(),type:'CDF_PATROL',faction:'cdf',state:'PLANNED',dimension:route.source.dimension,
    sourceId:route.source.id,targetId:route.target.id,sx:route.source.x,sy:route.source.y,sz:route.source.z,
    tx:route.target.x,ty:route.target.y,tz:route.target.z,x:route.source.x,y:route.source.y,z:route.source.z,
    sourceRole:route.source.role,targetRole:route.target.role,mission:route.target.role==='communications'?'signal_security':'area_security',
    created:now,departAt:now+10000,startAt:now+10000,arriveAt:now+10000+duration,materialized:false,lastUpdate:now}
  let list=pdzActRead(server,PDZ_ACT_LIST);list.push(a);pdzActWrite(server,PDZ_ACT_LIST,list)
  server.runCommandSilent('tellraw @a [{"text":"[RADIO] ","color":"aqua","bold":true},{"text":"CDF patrol has departed for a nearby friendly outpost.","color":"white"}]')
  pdzActTell(player,'[ACTIVITY] Created CDF patrol '+a.id,'green')
  return a
}

function pdzActCreateTradeCaravan(server,player) {
  if(!pdzActCanCreate(server,player))return null
  let route=pdzActPickFactionRoute(server,['cdf','civildef','survivor','independent'],128,1200,'trade')
  if(!route){pdzActTell(player,'[ACTIVITY] Need two friendly/independent sites 128-1200m apart.','red');return null}
  let now=Date.now(),duration=Math.max(180000,Math.floor(route.distance*800))
  let a={version:1,id:pdzActNewId(),type:'TRADE_CARAVAN',faction:'independent',state:'PLANNED',dimension:route.source.dimension,
    sourceId:route.source.id,targetId:route.target.id,sx:route.source.x,sy:route.source.y,sz:route.source.z,
    tx:route.target.x,ty:route.target.y,tz:route.target.z,x:route.source.x,y:route.source.y,z:route.source.z,
    sourceRole:route.source.role,targetRole:route.target.role,cargo:pdzActCargoFor(route.source,route.target),
    created:now,departAt:now+10000,startAt:now+10000,arriveAt:now+10000+duration,materialized:false,lastUpdate:now}
  let list=pdzActRead(server,PDZ_ACT_LIST);list.push(a);pdzActWrite(server,PDZ_ACT_LIST,list)
  let ledger=pdzActRead(server,PDZ_ACT_LEDGER).map(s=>{if(s.id===a.sourceId){s.supply=Math.max(0,s.supply-10);s.lastActivity=now}return s})
  pdzActWrite(server,PDZ_ACT_LEDGER,ledger)
  server.runCommandSilent('tellraw @a [{"text":"[RADIO] ","color":"yellow","bold":true},{"text":"An independent trade caravan is moving between settlements.","color":"white"}]')
  pdzActTell(player,'[ACTIVITY] Created trade caravan '+a.id,'green')
  return a
}

function pdzActCreateReinforcement(server,player) {
  if(!pdzActCanCreate(server,player))return null
  let route=pdzActPickFactionRoute(server,['cdf','civildef','survivor'],128,1400,'reinforcement')
  if(!route){if(player)pdzActTell(player,'[ACTIVITY] Need two friendly sites 128-1400m apart.','red');return null}
  // Reinforcements are meaningful only when the destination is under pressure.
  if(Number(route.target.alert||0)<15&&Number(route.target.defenders||0)>=8){
    if(player)pdzActTell(player,'[ACTIVITY] No friendly outpost currently needs reinforcements.','yellow')
    return null
  }
  let now=Date.now(),duration=Math.max(150000,Math.floor(route.distance*680))
  let strength=route.source.size==='large'?7:(route.source.size==='medium'?5:4)
  let a={version:1,id:pdzActNewId(),type:'REINFORCEMENT',faction:'cdf',state:'PLANNED',dimension:route.source.dimension,
    sourceId:route.source.id,targetId:route.target.id,sx:route.source.x,sy:route.source.y,sz:route.source.z,
    tx:route.target.x,ty:route.target.y,tz:route.target.z,x:route.source.x,y:route.source.y,z:route.source.z,
    sourceRole:route.source.role,targetRole:route.target.role,mission:'outpost_relief',reinforcementStrength:strength,
    created:now,departAt:now+10000,startAt:now+10000,arriveAt:now+10000+duration,materialized:false,lastUpdate:now}
  let list=pdzActRead(server,PDZ_ACT_LIST);list.push(a);pdzActWrite(server,PDZ_ACT_LIST,list)
  let ledger=pdzActRead(server,PDZ_ACT_LEDGER).map(s=>{if(s.id===a.sourceId){s.defenders=Math.max(0,Number(s.defenders||0)-2);s.lastActivity=now}return s})
  pdzActWrite(server,PDZ_ACT_LEDGER,ledger)
  server.runCommandSilent('tellraw @a [{"text":"[RADIO] ","color":"aqua","bold":true},{"text":"CDF relief force dispatched to a pressured outpost.","color":"white"}]')
  if(player)pdzActTell(player,'[ACTIVITY] Created reinforcement '+a.id,'green')
  return a
}

function pdzActCreateHorde(server,player,forced) {
  if(!pdzActCanCreate(server,forced?player:null))return null
  let angle=Math.random()*Math.PI*2,distance=240+Math.random()*160
  let sx=player.x+Math.cos(angle)*distance,sz=player.z+Math.sin(angle)*distance
  let now=Date.now(),duration=180000+Math.floor(distance*300)
  let a={version:1,id:pdzActNewId(),type:'INFECTED_HORDE',faction:'infected',state:'EN_ROUTE',dimension:String(player.level.dimension),
    sourceId:'noise:'+player.uuid,targetId:'player:'+player.uuid,targetPlayer:String(player.username),
    sx:sx,sy:player.y,sz:sz,tx:player.x,ty:player.y,tz:player.z,x:sx,y:player.y,z:sz,
    created:now,departAt:now,startAt:now,arriveAt:now+duration,materialized:false,lastUpdate:now}
  let list=pdzActRead(server,PDZ_ACT_LIST);list.push(a);pdzActWrite(server,PDZ_ACT_LIST,list)
  player.persistentData.putInt('dz_activity_noise',Math.max(0,player.persistentData.getInt('dz_activity_noise')-60))
  player.persistentData.putLong('dz_activity_horde_cooldown',now+900000)
  player.tell(Text.of('[WARNING] Distant infected are responding to your noise.').red())
  player.runCommandSilent('playsound minecraft:entity.zombie.ambient player @s ~ ~ ~ 0.45 0.55')
  return a
}

function pdzActCreateConvoy(server,player) {
  let list=pdzActRead(server,PDZ_ACT_LIST)
  let active=list.filter(a=>['ARRIVED','DESTROYED','CANCELLED','RETREATED'].indexOf(a.state)<0).length
  if(active>=PDZ_ACT_LIMIT){pdzActTell(player,'[ACTIVITY] Active activity limit reached.','red');return null}
  let route=pdzActPickRoute(server)
  if(!route){pdzActTell(player,'[ACTIVITY] Need two Raider sites 160-1500m apart and 20+ supply. Run scan first.','red');return null}
  let now=Date.now(),duration=Math.max(180000,Math.floor(route.distance*850))
  let a={version:1,id:pdzActNewId(),type:'SUPPLY_CONVOY',faction:'raider',state:'PLANNED',dimension:route.source.dimension,
    sourceId:route.source.id,targetId:route.target.id,sx:route.source.x,sy:route.source.y,sz:route.source.z,
    tx:route.target.x,ty:route.target.y,tz:route.target.z,x:route.source.x,y:route.source.y,z:route.source.z,
    sourceRole:route.source.role,targetRole:route.target.role,cargo:pdzActCargoFor(route.source,route.target),
    created:now,departAt:now+10000,startAt:now+10000,arriveAt:now+10000+duration,materialized:false,lastUpdate:now}
  list.push(a);pdzActWrite(server,PDZ_ACT_LIST,list)
  let ledger=pdzActRead(server,PDZ_ACT_LEDGER).map(s=>{if(s.id===a.sourceId){s.supply=Math.max(0,s.supply-20);s.lastActivity=now}return s})
  pdzActWrite(server,PDZ_ACT_LEDGER,ledger)
  server.runCommandSilent('tellraw @a [{"text":"[RADIO] ","color":"gold","bold":true},{"text":"Ash Jackals supply traffic detected.","color":"red"}]')
  pdzActTell(player,'[ACTIVITY] Created '+a.id+' / '+Math.floor(route.distance)+'m','green')
  return a
}

function pdzActCreateAssault(server,player,attackerFaction) {
  if(!pdzActCanCreate(server,player))return null
  attackerFaction=String(attackerFaction||'raider')
  let route=pdzActPickAssaultRoute(server,attackerFaction)
  if(!route){if(player)pdzActTell(player,'[ACTIVITY] No hostile outpost route is available for '+attackerFaction+'.','red');return null}
  let now=Date.now(),duration=Math.max(210000,Math.floor(route.distance*900))
  let base=route.source.size==='large'?11:(route.source.size==='medium'?8:5)
  let strength=Math.max(4,Math.floor(base+Number(route.source.defenders||0)*0.45+Number(route.source.supply||0)*0.06))
  let a={version:2,id:pdzActNewId(),type:'OUTPOST_ASSAULT',faction:attackerFaction,state:'PLANNED',dimension:route.source.dimension,
    sourceId:route.source.id,targetId:route.target.id,targetFaction:route.target.faction,sx:route.source.x,sy:route.source.y,sz:route.source.z,
    tx:route.target.x,ty:route.target.y,tz:route.target.z,x:route.source.x,y:route.source.y,z:route.source.z,
    sourceRole:route.source.role,targetRole:route.target.role,attackStrength:strength,
    created:now,departAt:now+15000,startAt:now+15000,arriveAt:now+15000+duration,materialized:false,lastUpdate:now}
  let list=pdzActRead(server,PDZ_ACT_LIST);list.push(a);pdzActWrite(server,PDZ_ACT_LIST,list)
  let ledger=pdzActRead(server,PDZ_ACT_LEDGER).map(s=>{
    if(s.id===a.sourceId){s.supply=Math.max(0,Number(s.supply||0)-18);s.defenders=Math.max(1,Number(s.defenders||0)-3);s.lastActivity=now}
    if(s.id===a.targetId)s.alert=Math.min(100,Number(s.alert||0)+35)
    return s
  })
  pdzActWrite(server,PDZ_ACT_LEDGER,ledger)
  server.runCommandSilent('tellraw @a [{"text":"[WAR REPORT] ","color":"dark_red","bold":true},{"text":"'+attackerFaction+' assault force is moving toward a hostile outpost.","color":"gold"}]')
  if(player)pdzActTell(player,'[ACTIVITY] Created assault '+a.id+' / '+Math.floor(route.distance)+'m','green')
  return a
}

function pdzActPlayerNear(server,a,range) {
  let best=null,bestD=range*range
  server.players.forEach(p=>{
    if(String(p.level.dimension)!==a.dimension) return
    let d=(p.x-a.x)*(p.x-a.x)+(p.z-a.z)*(p.z-a.z)
    if(d<bestD){bestD=d;best=p}
  })
  return best
}

function pdzActMaterializePatrol(server,a,player) {
  let tag='dz_activity_'+a.id.replace(/[^A-Za-z0-9_]/g,'_')
  let at='execute in '+a.dimension+' positioned '+Math.floor(a.x)+' '+Math.floor(a.y)+' '+Math.floor(a.z)+' run '
  for(let i=0;i<4;i++)server.runCommandSilent(at+'function project_deadzone:factions/test/single_civildef')
  server.runCommandSilent(at+'tag @e[tag=dz_civildef,tag=!dz_activity,sort=nearest,limit=4,distance=..20] add dz_activity')
  server.runCommandSilent(at+'tag @e[tag=dz_activity,tag=dz_civildef,sort=nearest,limit=4,distance=..20] add '+tag)
  server.runCommandSilent(at+'tag @e[tag='+tag+',distance=..20] add dz_friendly')
  server.runCommandSilent(at+'team join dz_survivors @e[tag='+tag+',distance=..20]')
  a.materialized=true;a.state='ENGAGED';a.entityTag=tag;a.lastUpdate=Date.now();a.despawnAt=Date.now()+240000
  player.tell(Text.of('[RADIO] CDF patrol contact nearby.').aqua())
}

function pdzActMaterializeReinforcement(server,a,player) {
  let tag='dz_activity_'+a.id.replace(/[^A-Za-z0-9_]/g,'_')
  let at='execute in '+a.dimension+' positioned '+Math.floor(a.x)+' '+Math.floor(a.y)+' '+Math.floor(a.z)+' positioned over motion_blocking_no_leaves run '
  for(let i=0;i<3;i++)server.runCommandSilent(at+'function project_deadzone:factions/test/single_civildef')
  server.runCommandSilent(at+'function project_deadzone:factions/test/single_civildef_medic')
  server.runCommandSilent(at+'tag @e[tag=dz_civildef,tag=!dz_activity,sort=nearest,limit=4,distance=..24] add dz_activity')
  server.runCommandSilent(at+'tag @e[tag=dz_activity,tag=dz_civildef,sort=nearest,limit=4,distance=..24] add '+tag)
  server.runCommandSilent(at+'tag @e[tag='+tag+',distance=..24] add dz_friendly')
  server.runCommandSilent(at+'team join dz_survivors @e[tag='+tag+',distance=..24]')
  a.materialized=true;a.state='ENGAGED';a.entityTag=tag;a.lastUpdate=Date.now();a.despawnAt=Date.now()+240000
  player.tell(Text.of('[RADIO] CDF reinforcement column nearby.').aqua())
  player.runCommandSilent('playsound minecraft:block.note_block.bell player @s ~ ~ ~ 0.7 1.25')
}

function pdzActMaterializeHorde(server,a,player) {
  let tag='dz_activity_'+a.id.replace(/[^A-Za-z0-9_]/g,'_')
  let at='execute in '+a.dimension+' positioned '+Math.floor(a.x)+' '+Math.floor(a.y)+' '+Math.floor(a.z)+' run '
  let mobs=['infectious:zombie_runner','minecraft:zombie','infectious:zombie_runner','minecraft:zombie','infectious:screamer','minecraft:zombie']
  mobs.forEach((mob,index)=>{
    let ox=(index%3)*2-2,oz=Math.floor(index/3)*3-2
    server.runCommandSilent(at+'summon '+mob+' ~'+ox+' ~ ~'+oz+' {PersistenceRequired:1b,Tags:["dz_activity","dz_infected","'+tag+'"]}')
  })
  server.runCommandSilent(at+'team join dz_infected @e[tag='+tag+',distance=..24]')
  a.materialized=true;a.state='ENGAGED';a.entityTag=tag;a.lastUpdate=Date.now()
  server.runCommandSilent('tellraw @a [{"text":"[HORDE] ","color":"dark_red","bold":true},{"text":"An infected group has followed the noise.","color":"red"}]')
  player.runCommandSilent('playsound minecraft:entity.zombie_villager.converted player @s ~ ~ ~ 0.7 0.55')
}

function pdzActMaterializeTrade(server,a,player) {
  let tag='dz_activity_'+a.id.replace(/[^A-Za-z0-9_]/g,'_')
  // Resolve the current surface only when the caravan becomes physical.
  // Virtual routes may cross hills, so reusing the source Y can bury NPCs.
  let at='execute in '+a.dimension+' positioned '+Math.floor(a.x)+' '+Math.floor(a.y)+' '+Math.floor(a.z)+' positioned over motion_blocking_no_leaves run '
  server.runCommandSilent(at+'function project_deadzone:factions/activity/spawn_trade_caravan')
  server.runCommandSilent(at+'tag @e[tag=dz_trade_caravan,tag=!dz_activity_bound,sort=nearest,limit=3,distance=..24] add '+tag)
  server.runCommandSilent(at+'tag @e[tag='+tag+',distance=..24] add dz_activity_bound')
  server.runCommandSilent(at+'team join dz_survivors @e[tag='+tag+',distance=..24]')
  a.materialized=true;a.state='TRADING';a.entityTag=tag;a.lastUpdate=Date.now();a.despawnAt=Date.now()+300000
  player.tell(Text.of('[RADIO] Independent traders have stopped nearby for five minutes.').yellow())
  player.runCommandSilent('playsound minecraft:entity.wandering_trader.ambient player @s ~ ~ ~ 0.8 1.0')
}

function pdzActMaterializeAssault(server,a,player) {
  let tag='dz_activity_'+a.id.replace(/[^A-Za-z0-9_]/g,'_')
  let at='execute in '+a.dimension+' positioned '+Math.floor(a.x)+' '+Math.floor(a.y)+' '+Math.floor(a.z)+' positioned over motion_blocking_no_leaves run '
  if(pdzActFactionBloc(a.faction)==='remnant'){
    server.runCommandSilent(at+'function project_deadzone:factions/squad/remnant_roles')
    server.runCommandSilent(at+'tag @e[tag=dz_remnant,tag=!dz_activity_bound,sort=nearest,limit=5,distance=..24] add '+tag)
    server.runCommandSilent(at+'team join dz_remnant @e[tag='+tag+',distance=..24]')
  }else{
    server.runCommandSilent(at+'function project_deadzone:factions/squad/raiders_roles')
    server.runCommandSilent(at+'tag @e[tag=dz_raider,tag=!dz_activity_bound,sort=nearest,limit=6,distance=..24] add '+tag)
    server.runCommandSilent(at+'team join dz_raiders @e[tag='+tag+',distance=..24]')
  }
  server.runCommandSilent(at+'tag @e[tag='+tag+',distance=..24] add dz_activity')
  server.runCommandSilent(at+'tag @e[tag='+tag+',distance=..24] add dz_activity_bound')
  a.materialized=true;a.state='ENGAGED';a.entityTag=tag;a.lastUpdate=Date.now();a.despawnAt=Date.now()+240000
  player.tell(Text.of('[WAR REPORT] '+a.faction+' assault force contact nearby.').red())
  player.runCommandSilent('playsound minecraft:block.note_block.didgeridoo master @s ~ ~ ~ 0.9 0.55')
}

function pdzActResolveAssault(server,a,observedStrength) {
  let ledger=pdzActRead(server,PDZ_ACT_LEDGER),target=null
  ledger.forEach(s=>{if(s.id===a.targetId)target=s})
  if(!target){a.state='CANCELLED';a.outcome='TARGET_LOST';return}
  let sizeBase=target.size==='large'?12:(target.size==='medium'?8:5)
  let attack=Math.max(1,Number(observedStrength===undefined?a.attackStrength:observedStrength)||1)+(Math.random()*7)
  let defense=sizeBase+Number(target.defenders||0)+Number(target.supply||0)*0.07+(Math.random()*8)
  let captured=attack>defense
  ledger=ledger.map(s=>{
    if(s.id!==a.targetId)return s
    s.lastActivity=Date.now();s.alert=captured?55:Math.max(15,Number(s.alert||0)-12)
    if(captured){
      s.previousFaction=s.faction;s.faction=a.faction;s.ownerLocked=true;s.capturedAt=Date.now();s.capturedBy=a.id
      s.defenders=Math.max(2,Math.floor(attack-defense/2));s.supply=Math.max(8,Math.floor(Number(s.supply||0)*0.35));s.coreAlive=true
    }else{
      s.defenders=Math.max(1,Math.floor(Number(s.defenders||0)-Math.max(1,attack*0.35)))
      s.supply=Math.max(0,Math.floor(Number(s.supply||0)-Math.max(3,attack*0.25)))
    }
    return s
  })
  pdzActWrite(server,PDZ_ACT_LEDGER,ledger)
  a.state=captured?'ARRIVED':'RETREATED';a.outcome=captured?'CAPTURED':'REPELLED';a.lastUpdate=Date.now()
  server.runCommandSilent('deadzoneterritory rebuild')
  if(captured)server.runCommandSilent('tellraw @a [{"text":"[TERRITORY] ","color":"red","bold":true},{"text":"'+a.faction+' captured '+target.role+' outpost at '+Math.floor(target.x)+', '+Math.floor(target.z)+'.","color":"gold"}]')
  else server.runCommandSilent('tellraw @a [{"text":"[TERRITORY] ","color":"aqua","bold":true},{"text":"Defenders repelled '+a.faction+' at '+Math.floor(target.x)+', '+Math.floor(target.z)+'.","color":"white"}]')
}

function pdzActMaterialize(server,a,player) {
  if(a.type==='OUTPOST_ASSAULT'){pdzActMaterializeAssault(server,a,player);return}
  if(a.type==='CDF_PATROL'){pdzActMaterializePatrol(server,a,player);return}
  if(a.type==='REINFORCEMENT'){pdzActMaterializeReinforcement(server,a,player);return}
  if(a.type==='INFECTED_HORDE'){pdzActMaterializeHorde(server,a,player);return}
  if(a.type==='TRADE_CARAVAN'){pdzActMaterializeTrade(server,a,player);return}
  let tag='dz_activity_'+a.id.replace(/[^A-Za-z0-9_]/g,'_')
  let at='execute in '+a.dimension+' positioned '+Math.floor(a.x)+' '+Math.floor(a.y)+' '+Math.floor(a.z)+' run '
  // Use the Raider faction's own humanoid base. A mutant brute ignores parts
  // of scoreboard-team allegiance and caused the escort to kill its leader.
  server.runCommandSilent(at+'function project_deadzone:factions/spawn/raider_warden')
  server.runCommandSilent(at+'tag @e[tag=dz_raider_warden,tag=!dz_activity,sort=nearest,limit=1,distance=..8] add dz_activity')
  server.runCommandSilent(at+'tag @e[tag=dz_raider_warden,tag=dz_activity,sort=nearest,limit=1,distance=..8] add dz_t0_convoy')
  server.runCommandSilent(at+'tag @e[tag=dz_raider_warden,tag=dz_activity,sort=nearest,limit=1,distance=..8] add dz_named')
  server.runCommandSilent(at+'tag @e[tag=dz_raider_warden,tag=dz_activity,sort=nearest,limit=1,distance=..8] add '+tag)
  server.runCommandSilent(at+'team join dz_raiders @e[tag='+tag+',sort=nearest,limit=1,distance=..8]')
  server.runCommandSilent(at+'attribute @e[tag='+tag+',sort=nearest,limit=1,distance=..8] minecraft:generic.max_health base set 80')
  server.runCommandSilent(at+'attribute @e[tag='+tag+',sort=nearest,limit=1,distance=..8] minecraft:generic.armor base set 12')
  server.runCommandSilent(at+'data merge entity @e[tag='+tag+',sort=nearest,limit=1,distance=..8] {Health:80.0f,CustomName:\'{"text":"Ash Jackals Quartermaster","color":"dark_red","bold":true}\',CustomNameVisible:1b,DeathLootTable:"project_deadzone:entities/ash_jackals_quartermaster"}')
  server.runCommandSilent(at+'function project_deadzone:factions/squad/raiders_roles')
  server.runCommandSilent(at+'tag @e[tag=dz_raider,tag=!dz_activity,sort=nearest,limit=6,distance=..20] add dz_activity')
  server.runCommandSilent(at+'tag @e[tag=dz_raider,tag=dz_activity,sort=nearest,limit=6,distance=..20] add '+tag)
  server.runCommandSilent(at+'team join dz_raiders @e[tag='+tag+',distance=..20]')
  server.runCommandSilent('tellraw @a [{"text":"[CONTACT] ","color":"red","bold":true},{"text":"Ash Jackals convoy at '+Math.floor(a.x)+', '+Math.floor(a.z)+'","color":"gold"}]')
  a.materialized=true;a.state='ENGAGED';a.entityTag=tag;a.lastUpdate=Date.now()
  player.runCommandSilent('playsound minecraft:block.note_block.bit master @s ~ ~ ~ 0.8 0.6')
}

function pdzActAdvance(server,force) {
  let now=Date.now(),list=pdzActRead(server,PDZ_ACT_LIST),changed=false
  list.forEach(a=>{
    if(['ARRIVED','DESTROYED','CANCELLED','RETREATED'].indexOf(a.state)>=0)return
    if(a.materialized){
      let near=pdzActPlayerNear(server,a,128)
      let alive=server.runCommandSilent('execute in '+a.dimension+' positioned '+Math.floor(a.x)+' '+Math.floor(a.y)+' '+Math.floor(a.z)+' if entity @e[tag='+a.entityTag+',distance=..256]')
      if(near&&alive===0){
        a.state='DESTROYED';a.lastUpdate=now;changed=true
        if(a.type==='CDF_PATROL')
          server.runCommandSilent('tellraw @a [{"text":"[RADIO] ","color":"aqua"},{"text":"Contact with a CDF patrol has been lost.","color":"red"}]')
        else {
          server.runCommandSilent('deadzoneterritory rebuild')
          server.runCommandSilent('tellraw @a [{"text":"[ACTIVITY] ","color":"gold"},{"text":"Hostile activity destroyed.","color":"green"}]')
        }
      }
      if(a.type==='OUTPOST_ASSAULT'&&a.state!=='DESTROYED'&&now>=Number(a.despawnAt||0)){
        let surviving=Math.max(1,Math.floor(Number(a.attackStrength||5)*(alive>0?0.75:0.15)))
        server.runCommandSilent('execute in '+a.dimension+' run kill @e[tag='+a.entityTag+']')
        pdzActResolveAssault(server,a,surviving);changed=true
      }
      if((a.type==='CDF_PATROL'||a.type==='REINFORCEMENT'||a.type==='TRADE_CARAVAN')&&a.state!=='DESTROYED'&&now>=Number(a.despawnAt||0)){
        server.runCommandSilent('execute in '+a.dimension+' run tp @e[tag='+a.entityTag+'] '+Math.floor(a.tx)+' '+Math.floor(a.ty)+' '+Math.floor(a.tz))
        if(a.type==='TRADE_CARAVAN')server.runCommandSilent('execute in '+a.dimension+' run kill @e[tag='+a.entityTag+']')
        a.state='ARRIVED';a.lastUpdate=now;changed=true
        if(a.type==='TRADE_CARAVAN'){
          let ledger=pdzActRead(server,PDZ_ACT_LEDGER).map(s=>s.id===a.targetId?pdzActApplyArrival(s,a,10):s)
          pdzActWrite(server,PDZ_ACT_LEDGER,ledger)
        }
      }
      return
    }
    if(a.type==='INFECTED_HORDE'){
      server.players.forEach(p=>{
        if(String(p.username)!==String(a.targetPlayer)||String(p.level.dimension)!==a.dimension)return
        a.tx=p.x;a.ty=p.y;a.tz=p.z
      })
    }
    if(now<a.departAt){a.state='PLANNED';return}
    let span=Math.max(1,a.arriveAt-a.startAt),t=Math.max(0,Math.min(1,(now-a.startAt)/span))
    a.state=t<=0.03?'DEPARTING':'EN_ROUTE';a.x=a.sx+(a.tx-a.sx)*t;a.y=a.sy+(a.ty-a.sy)*t;a.z=a.sz+(a.tz-a.sz)*t;a.lastUpdate=now;changed=true
    if(t>=1){
      if(a.type==='OUTPOST_ASSAULT'){
        pdzActResolveAssault(server,a);changed=true;return
      }
      a.state='ARRIVED'
      let delivered=a.type==='TRADE_CARAVAN'?10:((a.type==='CDF_PATROL'||a.type==='REINFORCEMENT')?5:20)
      let ledger=pdzActRead(server,PDZ_ACT_LEDGER).map(s=>s.id===a.targetId?pdzActApplyArrival(s,a,delivered):s)
      pdzActWrite(server,PDZ_ACT_LEDGER,ledger)
      server.runCommandSilent('deadzoneterritory rebuild')
      return
    }
    let near=pdzActPlayerNear(server,a,PDZ_ACT_RANGE)
    if(near)pdzActMaterialize(server,a,near)
  })
  if(changed||force)pdzActWrite(server,PDZ_ACT_LIST,list)
  return list
}

function pdzActList(player) {
  let sites=pdzActScan(player.server),acts=pdzActAdvance(player.server,true)
  pdzActTell(player,'=== FACTION ACTIVITY ===','gold')
  pdzActTell(player,'Known outposts: '+sites.length+' / Activities: '+acts.length,'aqua')
  acts.slice(-12).forEach(a=>pdzActTell(player,a.id+' | '+a.faction+' '+a.type+' | '+a.state+' | '+Math.floor(a.x)+','+Math.floor(a.z),a.state==='ENGAGED'?'red':'gray'))
}

function pdzActSites(player) {
  let sites=pdzActScan(player.server)
  pdzActTell(player,'=== OUTPOST LEDGER ===','gold')
  sites.slice(-24).forEach(s=>{
    let named=s.named?' | Named '+s.named:''
    pdzActTell(player,s.faction+' / '+(s.role||'shelter')+' / '+s.size+' | Supply '+Math.floor(s.supply)+' | '+s.structure+named,s.coreAlive===false?'dark_gray':'aqua')
  })
}

function pdzActWorldTier(server) {
  return Math.max(0,Math.min(5,server.persistentData.getInt('deadzone_world_tier')))
}

function pdzActDirectorCooldown(tier) {
  // T0 remains deliberately calm; strategic traffic accelerates gradually.
  if(tier<=0)return 30*60*1000
  if(tier===1)return 24*60*1000
  if(tier===2)return 19*60*1000
  return 15*60*1000
}

function pdzActDirectorPulse(server,player,forced) {
  let now=Date.now(),tier=pdzActWorldTier(server)
  if(!forced&&now<server.persistentData.getLong(PDZ_ACT_AUTO_NEXT))return null
  if(!pdzActCanCreate(server,null))return null

  // Only select activities for which a route currently exists.  This avoids
  // repeating red "need two sites" messages on servers with a partial ledger.
  let friendly=pdzActPickFactionRoute(server,['cdf','civildef','survivor','independent'],128,1200)
  let raider=pdzActPickRoute(server),raiderAssault=tier>=1?pdzActPickAssaultRoute(server,'raider'):null
  let remnantAssault=tier>=2?pdzActPickAssaultRoute(server,'remnant'):null,pool=[]
  if(friendly){
    let tradeWeight=tier<=0?5:(tier===1?4:3)
    let patrolWeight=tier<=0?4:3
    for(let i=0;i<tradeWeight;i++)pool.push('trade')
    for(let i=0;i<patrolWeight;i++)pool.push('patrol')
    let pressured=pdzActScan(server).some(s=>['cdf','civildef','survivor'].indexOf(String(s.faction))>=0&&s.coreAlive&&(Number(s.alert||0)>=15||Number(s.defenders||0)<8))
    if(pressured)for(let i=0;i<(tier<=0?1:3);i++)pool.push('reinforcement')
  }
  if(raider){
    let hostileWeight=tier<=0?1:(tier===1?3:5)
    for(let i=0;i<hostileWeight;i++)pool.push('raider')
  }
  if(raiderAssault)for(let i=0;i<(tier===1?1:3);i++)pool.push('raider_assault')
  if(remnantAssault)for(let i=0;i<2;i++)pool.push('remnant_assault')
  if(!pool.length){
    server.persistentData.putLong(PDZ_ACT_AUTO_NEXT,now+5*60*1000)
    if(forced&&player)pdzActTell(player,'[DIRECTOR] No valid outpost route is currently available.','red')
    return null
  }
  let type=pool[Math.floor(Math.random()*pool.length)],created=null
  if(type==='trade')created=pdzActCreateTradeCaravan(server,player)
  else if(type==='patrol')created=pdzActCreatePatrol(server,player)
  else if(type==='reinforcement')created=pdzActCreateReinforcement(server,player)
  else if(type==='raider_assault')created=pdzActCreateAssault(server,player,'raider')
  else if(type==='remnant_assault')created=pdzActCreateAssault(server,player,'remnant')
  else created=pdzActCreateConvoy(server,player)
  server.persistentData.putLong(PDZ_ACT_AUTO_NEXT,now+pdzActDirectorCooldown(tier))
  if(created)console.info('[PDZ ACTIVITY] director created '+created.type+' '+created.id+' at world tier '+tier)
  return created
}

let PDZ_ACT_TICKS=0
ServerEvents.tick(event=>{
  PDZ_ACT_TICKS++
  if(PDZ_ACT_TICKS%200!==0)return
  pdzActAdvance(event.server,false)
  if(PDZ_ACT_TICKS%1200===0){
    pdzActScan(event.server)
    let now=Date.now()
    event.server.players.forEach(player=>{
      let noise=player.persistentData.getInt('dz_activity_noise')
      if(noise>=40&&now>=player.persistentData.getLong('dz_activity_horde_cooldown')&&Math.random()<0.35)
        pdzActCreateHorde(event.server,player,false)
      player.persistentData.putInt('dz_activity_noise',Math.max(0,noise-8))
    })
  }
  if(PDZ_ACT_TICKS%6000===0&&event.server.persistentData.getBoolean(PDZ_ACT_AUTO_ENABLED)){
    let player=event.server.players.length?event.server.players[0]:null
    if(player)pdzActDirectorPulse(event.server,player,false)
  }
})

// Noise is deliberately coarse. We record meaningful survival actions rather
// than inspecting every nearby mob each tick.
BlockEvents.broken(event=>{
  if(!event.player||event.player.level.clientSide)return
  event.player.persistentData.putInt('dz_activity_noise',Math.min(100,event.player.persistentData.getInt('dz_activity_noise')+3))
})

EntityEvents.hurt('minecraft:player',event=>{
  let player=event.entity
  if(!player||player.level.clientSide)return
  player.persistentData.putInt('dz_activity_noise',Math.min(100,player.persistentData.getInt('dz_activity_noise')+5))
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzoneactivity').requires(s=>s.hasPermission(2))
  root.then(Commands.literal('scan').executes(ctx=>{let n=pdzActScan(ctx.source.server).length;pdzActTell(ctx.source.player,'[ACTIVITY] Registered outposts: '+n,'green');return n}))
  root.then(Commands.literal('list').executes(ctx=>{pdzActList(ctx.source.player);return 1}))
  root.then(Commands.literal('sites').executes(ctx=>{pdzActSites(ctx.source.player);return 1}))
  root.then(Commands.literal('spawn').then(Commands.literal('raider_supply').executes(ctx=>pdzActCreateConvoy(ctx.source.server,ctx.source.player)?1:0)))
  root.then(Commands.literal('spawn').then(Commands.literal('cdf_patrol').executes(ctx=>pdzActCreatePatrol(ctx.source.server,ctx.source.player)?1:0)))
  root.then(Commands.literal('spawn').then(Commands.literal('cdf_reinforcement').executes(ctx=>pdzActCreateReinforcement(ctx.source.server,ctx.source.player)?1:0)))
  root.then(Commands.literal('spawn').then(Commands.literal('infected_horde').executes(ctx=>pdzActCreateHorde(ctx.source.server,ctx.source.player,true)?1:0)))
  root.then(Commands.literal('spawn').then(Commands.literal('trade_caravan').executes(ctx=>pdzActCreateTradeCaravan(ctx.source.server,ctx.source.player)?1:0)))
  root.then(Commands.literal('spawn').then(Commands.literal('raider_assault').executes(ctx=>pdzActCreateAssault(ctx.source.server,ctx.source.player,'raider')?1:0)))
  root.then(Commands.literal('spawn').then(Commands.literal('remnant_assault').executes(ctx=>pdzActCreateAssault(ctx.source.server,ctx.source.player,'remnant')?1:0)))
  root.then(Commands.literal('auto').then(Commands.literal('on').executes(ctx=>{
    ctx.source.server.persistentData.putBoolean(PDZ_ACT_AUTO_ENABLED,true)
    ctx.source.server.persistentData.putLong(PDZ_ACT_AUTO_NEXT,Date.now()+60000)
    pdzActTell(ctx.source.player,'[DIRECTOR] Automatic faction activity enabled. First check in 60s.','green');return 1
  })))
  root.then(Commands.literal('auto').then(Commands.literal('off').executes(ctx=>{
    ctx.source.server.persistentData.putBoolean(PDZ_ACT_AUTO_ENABLED,false)
    pdzActTell(ctx.source.player,'[DIRECTOR] Automatic faction activity disabled.','yellow');return 1
  })))
  root.then(Commands.literal('auto').then(Commands.literal('status').executes(ctx=>{
    let server=ctx.source.server,on=server.persistentData.getBoolean(PDZ_ACT_AUTO_ENABLED)
    let wait=Math.max(0,Math.ceil((server.persistentData.getLong(PDZ_ACT_AUTO_NEXT)-Date.now())/1000))
    pdzActTell(ctx.source.player,'[DIRECTOR] '+(on?'ON':'OFF')+' | Tier '+pdzActWorldTier(server)+' | next check '+wait+'s',on?'green':'gray');return on?1:0
  })))
  root.then(Commands.literal('auto').then(Commands.literal('pulse').executes(ctx=>pdzActDirectorPulse(ctx.source.server,ctx.source.player,true)?1:0)))
  root.then(Commands.literal('noise').executes(ctx=>{
    let p=ctx.source.player
    pdzActTell(p,'[ACTIVITY] Noise '+p.persistentData.getInt('dz_activity_noise')+'/100 | horde cooldown '+Math.max(0,Math.ceil((p.persistentData.getLong('dz_activity_horde_cooldown')-Date.now())/1000))+'s','yellow')
    return p.persistentData.getInt('dz_activity_noise')
  }))
  root.then(Commands.literal('tick').executes(ctx=>{pdzActAdvance(ctx.source.server,true);pdzActTell(ctx.source.player,'[ACTIVITY] Advanced virtual activities.','green');return 1}))
  root.then(Commands.literal('test_near').then(Commands.argument('id',PDZ_ACT_STRING.word()).executes(ctx=>{
    let id=PDZ_ACT_STRING.getString(ctx,'id'),player=ctx.source.player,hit=0,list=pdzActRead(ctx.source.server,PDZ_ACT_LIST)
    list.forEach(a=>{
      if(a.id!==id||a.materialized||['ARRIVED','DESTROYED','CANCELLED'].indexOf(a.state)>=0)return
      a.dimension=String(player.level.dimension);a.x=player.x+8;a.y=player.y;a.z=player.z;a.state='EN_ROUTE'
      pdzActMaterialize(ctx.source.server,a,player);hit=1
    })
    pdzActWrite(ctx.source.server,PDZ_ACT_LIST,list)
    pdzActTell(player,hit?'[ACTIVITY] Forced nearby contact: '+id:'[ACTIVITY] Activity cannot be materialized.',hit?'green':'red')
    return hit
  })))
  root.then(Commands.literal('trace').then(Commands.argument('id',PDZ_ACT_STRING.word()).executes(ctx=>{
    let id=PDZ_ACT_STRING.getString(ctx,'id'),found=pdzActRead(ctx.source.server,PDZ_ACT_LIST).filter(a=>a.id===id)[0]
    if(!found){pdzActTell(ctx.source.player,'[ACTIVITY] Unknown id: '+id,'red');return 0}
    pdzActTell(ctx.source.player,JSON.stringify(found),'yellow');return 1
  })))
  root.then(Commands.literal('cancel').then(Commands.argument('id',PDZ_ACT_STRING.word()).executes(ctx=>{
    let id=PDZ_ACT_STRING.getString(ctx,'id'),hit=0,list=pdzActRead(ctx.source.server,PDZ_ACT_LIST)
    list.forEach(a=>{if(a.id===id&&a.state!=='DESTROYED'&&a.state!=='ARRIVED'){a.state='CANCELLED';hit=1}})
    pdzActWrite(ctx.source.server,PDZ_ACT_LIST,list);pdzActTell(ctx.source.player,hit?'[ACTIVITY] Cancelled '+id:'[ACTIVITY] Nothing cancelled.',hit?'green':'red');return hit
  })))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Faction activity framework v0.1 loaded')
