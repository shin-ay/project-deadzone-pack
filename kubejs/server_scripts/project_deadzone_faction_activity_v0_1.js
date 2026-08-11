// PROJECT DEADZONE faction activity framework v0.1
// Persistent outpost ledger, virtual travel while unloaded, nearby materialisation.

const PDZ_ACT_STRING = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
const PDZ_ACT_LEDGER = 'dz_activity_outpost_ledger_v1'
const PDZ_ACT_LIST = 'dz_activity_list_v1'
const PDZ_ACT_RANGE = 96
const PDZ_ACT_LIMIT = 3

function pdzActRead(server,key) {
  let raw=server.persistentData.getString(key)
  if(!raw) return []
  try { let v=JSON.parse(raw); return Array.isArray(v)?v:[] }
  catch(err) { console.error('[PDZ ACTIVITY] invalid '+key+': '+err); return [] }
}
function pdzActWrite(server,key,v) { server.persistentData.putString(key,JSON.stringify(v)) }
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
function pdzActInitialSupply(id,size) {
  let h=0
  for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))&0x7fffffff
  return Math.min(100,(size==='large'?65:(size==='medium'?48:32))+(h%21))
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
    map[id]={id:id,dimension:pdzActDim(marker),x:Math.floor(marker.x),y:Math.floor(marker.y),z:Math.floor(marker.z),
      structure:marker.persistentData.getString('dz_wild_structure')||'manual:site',type:type,
      faction:marker.persistentData.getString('dz_wild_faction')||'independent',size:size,
      supply:prior.supply===undefined?pdzActInitialSupply(id,size):prior.supply,
      alert:prior.alert===undefined?0:prior.alert,defenders:prior.defenders===undefined?0:prior.defenders,
      coreAlive:prior.coreAlive===undefined?true:prior.coreAlive,lastActivity:prior.lastActivity||0,lastSeen:Date.now()}
  }))
  let result=Object.keys(map).map(id=>map[id])
  pdzActWrite(server,PDZ_ACT_LEDGER,result)
  return result
}

function pdzActPickRoute(server) {
  let sites=pdzActScan(server).filter(s=>s.faction==='raider'&&s.coreAlive&&s.supply>=20), choices=[]
  for(let i=0;i<sites.length;i++) for(let j=0;j<sites.length;j++) {
    if(i===j||sites[i].dimension!==sites[j].dimension) continue
    let d=Math.sqrt(pdzActDist2(sites[i],sites[j]))
    if(d>=160&&d<=1500) choices.push({source:sites[i],target:sites[j],distance:d})
  }
  return choices.length?choices[Math.floor(Math.random()*choices.length)]:null
}
function pdzActNewId() { return 'ACT-'+Date.now().toString(36).toUpperCase()+'-'+Math.floor(Math.random()*1296).toString(36).toUpperCase() }

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
    created:now,departAt:now+10000,startAt:now+10000,arriveAt:now+10000+duration,materialized:false,lastUpdate:now}
  list.push(a);pdzActWrite(server,PDZ_ACT_LIST,list)
  let ledger=pdzActRead(server,PDZ_ACT_LEDGER).map(s=>{if(s.id===a.sourceId){s.supply=Math.max(0,s.supply-20);s.lastActivity=now}return s})
  pdzActWrite(server,PDZ_ACT_LEDGER,ledger)
  server.runCommandSilent('tellraw @a [{"text":"[RADIO] ","color":"gold","bold":true},{"text":"Ash Jackals supply traffic detected.","color":"red"}]')
  pdzActTell(player,'[ACTIVITY] Created '+a.id+' / '+Math.floor(route.distance)+'m','green')
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
function pdzActMaterialize(server,a,player) {
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
      if(near&&server.runCommandSilent('execute in '+a.dimension+' positioned '+Math.floor(a.x)+' '+Math.floor(a.y)+' '+Math.floor(a.z)+' if entity @e[tag='+a.entityTag+',distance=..256]')===0){
        a.state='DESTROYED';a.lastUpdate=now;changed=true
        server.runCommandSilent('tellraw @a [{"text":"[ACTIVITY] ","color":"gold"},{"text":"Enemy supply convoy destroyed.","color":"green"}]')
      }
      return
    }
    if(now<a.departAt){a.state='PLANNED';return}
    let span=Math.max(1,a.arriveAt-a.startAt),t=Math.max(0,Math.min(1,(now-a.startAt)/span))
    a.state=t<=0.03?'DEPARTING':'EN_ROUTE';a.x=a.sx+(a.tx-a.sx)*t;a.y=a.sy+(a.ty-a.sy)*t;a.z=a.sz+(a.tz-a.sz)*t;a.lastUpdate=now;changed=true
    if(t>=1){
      a.state='ARRIVED'
      let ledger=pdzActRead(server,PDZ_ACT_LEDGER).map(s=>{if(s.id===a.targetId){s.supply=Math.min(100,s.supply+20);s.lastActivity=now}return s})
      pdzActWrite(server,PDZ_ACT_LEDGER,ledger);return
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

let PDZ_ACT_TICKS=0
ServerEvents.tick(event=>{
  PDZ_ACT_TICKS++
  if(PDZ_ACT_TICKS%200!==0)return
  pdzActAdvance(event.server,false)
  if(PDZ_ACT_TICKS%1200===0)pdzActScan(event.server)
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzoneactivity').requires(s=>s.hasPermission(2))
  root.then(Commands.literal('scan').executes(ctx=>{let n=pdzActScan(ctx.source.server).length;pdzActTell(ctx.source.player,'[ACTIVITY] Registered outposts: '+n,'green');return n}))
  root.then(Commands.literal('list').executes(ctx=>{pdzActList(ctx.source.player);return 1}))
  root.then(Commands.literal('spawn').then(Commands.literal('raider_supply').executes(ctx=>pdzActCreateConvoy(ctx.source.server,ctx.source.player)?1:0)))
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
