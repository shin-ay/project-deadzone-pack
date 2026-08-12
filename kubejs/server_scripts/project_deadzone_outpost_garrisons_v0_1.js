// PROJECT DEADZONE outpost garrison materialisation v0.1
// Nearby sites become physical; distant garrisons remain ledger-only.

const PDZ_GAR_LEDGER='dz_activity_outpost_ledger_v1'
const PDZ_GAR_NEAR=96
const PDZ_GAR_RELEASE=144
const PDZ_GAR_RESPAWN=15*60*1000

function pdzGarRead(server){
  try {let v=JSON.parse(server.persistentData.getString(PDZ_GAR_LEDGER)||'[]');return Array.isArray(v)?v:[]}
  catch(ignored){return []}
}
function pdzGarSiteId(marker){
  return String(marker.level.dimension)+'|'+Math.floor(marker.x)+'|'+Math.floor(marker.z)+'|'+(marker.persistentData.getString('dz_wild_structure')||'manual:site')
}
function pdzGarTag(id){
  let h=5381,s=String(id)
  for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))&0x7fffffff
  return 'dz_garrison_'+h.toString(36)
}
function pdzGarNearPlayer(server,marker,range){
  let hit=null,r2=range*range
  server.players.forEach(p=>{
    if(String(p.level.dimension)!==String(marker.level.dimension))return
    let dx=p.x-marker.x,dz=p.z-marker.z
    if(dx*dx+dz*dz<=r2)hit=p
  })
  return hit
}
function pdzGarSize(type){
  type=String(type||'')
  if(type.indexOf('military')>=0||type.indexOf('mansion')>=0||type.indexOf('laboratory')>=0||type.indexOf('command')>=0)return 'large'
  if(type.indexOf('camp')>=0||type.indexOf('station')>=0||type.indexOf('settlement')>=0||type.indexOf('outpost')>=0)return 'medium'
  return 'small'
}
function pdzGarCount(size){return size==='large'?7:(size==='medium'?5:3)}
function pdzGarEntities(level,tag){
  let found=[]
  level.entities.forEach(e=>{if(e.tags&&e.tags.contains(tag))found.push(e)})
  return found
}
function pdzGarRun(player,command,tag,limit,base){
  player.runCommandSilent(command)
  player.runCommandSilent(base+'tag @e[tag=dz_npc,tag=!dz_garrison_bound,sort=nearest,limit='+limit+',distance=..32] add '+tag)
  player.runCommandSilent(base+'tag @e[tag='+tag+',distance=..32] add dz_garrison_bound')
}
function pdzGarSpawn(marker,player,faction,size,role,tag){
  let count=pdzGarCount(size),base='execute positioned '+Math.floor(marker.x)+' '+Math.floor(marker.y)+' '+Math.floor(marker.z)+' positioned over motion_blocking_no_leaves run '
  if(faction==='survivor'){
    pdzGarRun(player,base+'function project_deadzone:factions/squad/survivors_roles',tag,3,base)
    if(count>3)pdzGarRun(player,base+'function project_deadzone:factions/squad/survivors',tag,Math.min(3,count-3),base)
  }else if(faction==='civildef'||faction==='cdf'){
    pdzGarRun(player,base+'function project_deadzone:factions/squad/civildef_roles',tag,4,base)
    if(count>4)pdzGarRun(player,base+'function project_deadzone:factions/squad/civildef',tag,Math.min(3,count-4),base)
  }else if(faction==='raider'){
    pdzGarRun(player,base+'function project_deadzone:factions/squad/raiders_roles',tag,Math.min(7,count),base)
  }else if(faction==='remnant'){
    pdzGarRun(player,base+'function project_deadzone:factions/squad/remnant_roles',tag,Math.min(5,count),base)
    if(count>5)pdzGarRun(player,base+'function project_deadzone:factions/squad/remnant',tag,Math.min(2,count-5),base)
  }else if(faction==='infected'){
    let mobs=['minecraft:zombie','infectious:zombie_runner','minecraft:zombie','infectious:screamer','infectious:muscular_zombie','minecraft:zombie','infectious:hazmat_zombie']
    for(let i=0;i<count;i++)player.runCommandSilent(base+'summon '+mobs[i%mobs.length]+' ~'+((i%3)*3-3)+' ~ ~'+(Math.floor(i/3)*3-2)+' {PersistenceRequired:1b,Tags:["dz_npc","dz_infected","dz_garrison_bound","'+tag+'"]}')
    player.runCommandSilent(base+'team join dz_infected @e[tag='+tag+',distance=..40]')
  }else if(faction==='aegis'){
    for(let i=0;i<count;i++)player.runCommandSilent(base+'summon simpleenemymod:ruunit ~'+((i%3)*3-3)+' ~ ~'+(Math.floor(i/3)*3-2)+' {PersistenceRequired:1b,CustomName:\'{"text":"AEGIS Operative","color":"light_purple"}\',Tags:["dz_npc","dz_aegis","dz_hostile","dz_garrison_bound","'+tag+'"]}')
    player.runCommandSilent(base+'team join dz_aegis @e[tag='+tag+',distance=..40]')
  }else if(faction==='warden'){
    for(let i=0;i<count;i++)player.runCommandSilent(base+'summon infectious:mecha_zombie ~'+((i%3)*3-3)+' ~ ~'+(Math.floor(i/3)*3-2)+' {PersistenceRequired:1b,CustomName:\'{"text":"WARDEN Drone","color":"gold"}\',Tags:["dz_npc","dz_warden","dz_hostile","dz_garrison_bound","'+tag+'"]}')
    player.runCommandSilent(base+'team join dz_warden @e[tag='+tag+',distance=..40]')
  }
  // Trading locations get a trader in addition to guards. Existing duplicate
  // protection in the wilderness script prevents stacking merchants.
  if(marker.persistentData.getString('dz_wild_trade')&&faction!=='infected'&&faction!=='aegis'&&faction!=='warden'){
    try { if(typeof pdzWildPlaceTrader==='function')pdzWildPlaceTrader(player) }
    catch(err){console.warn('[PDZ GARRISON] trader placement deferred: '+err)}
  }
  marker.persistentData.putBoolean('dz_garrison_active',true)
  marker.persistentData.putString('dz_garrison_tag',tag)
  marker.persistentData.putLong('dz_garrison_spawned',Date.now())
  player.tell(Text.of('[OUTPOST] '+faction+' '+role+' garrison detected.').yellow())
}
function pdzGarPulse(server){
  let ledger=pdzGarRead(server),owners={}
  ledger.forEach(s=>owners[String(s.id)]=s)
  let seen={}
  server.players.forEach(player=>player.level.entities.forEach(marker=>{
    if(!marker.tags||!marker.tags.contains('dz_wilderness_site')||seen[String(marker.uuid)])return
    seen[String(marker.uuid)]=true
    let id=pdzGarSiteId(marker),site=owners[id]||{},tag=marker.persistentData.getString('dz_garrison_tag')||pdzGarTag(id)
    let faction=site.faction||marker.persistentData.getString('dz_wild_faction')||'independent'
    let near=pdzGarNearPlayer(server,marker,PDZ_GAR_NEAR),release=pdzGarNearPlayer(server,marker,PDZ_GAR_RELEASE)
    let guards=pdzGarEntities(marker.level,tag),active=marker.persistentData.getBoolean('dz_garrison_active')
    if(!release){
      guards.forEach(e=>e.discard())
      marker.persistentData.putBoolean('dz_garrison_active',false)
      return
    }
    if(!near)return
    if(site.coreAlive===false)return
    if(active&&guards.length===0){
      marker.persistentData.putBoolean('dz_garrison_active',false)
      marker.persistentData.putLong('dz_garrison_respawn',Date.now()+PDZ_GAR_RESPAWN)
      marker.persistentData.putLong('dz_garrison_defeated',Date.now())
      return
    }
    if(guards.length||Date.now()<marker.persistentData.getLong('dz_garrison_respawn'))return
    // Occupation changes immediately replace the next physical garrison.
    marker.persistentData.putString('dz_wild_faction',String(faction))
    pdzGarSpawn(marker,near,String(faction),site.size||pdzGarSize(marker.persistentData.getString('dz_wild_type')),site.role||marker.persistentData.getString('dz_wild_role')||'shelter',tag)
  }))
}

let PDZ_GAR_TICKS=0
ServerEvents.tick(event=>{
  PDZ_GAR_TICKS++
  if(PDZ_GAR_TICKS%100===0)pdzGarPulse(event.server)
})

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzonegarrison').requires(s=>s.hasPermission(2))
  root.then(Commands.literal('pulse').executes(ctx=>{pdzGarPulse(ctx.source.server);ctx.source.player.tell(Text.of('[GARRISON] Proximity scan complete.').green());return 1}))
  root.then(Commands.literal('reset_near').executes(ctx=>{
    let p=ctx.source.player,count=0
    p.level.entities.forEach(m=>{if(m.tags&&m.tags.contains('dz_wilderness_site')&&(m.x-p.x)*(m.x-p.x)+(m.z-p.z)*(m.z-p.z)<=128*128){let tag=m.persistentData.getString('dz_garrison_tag');pdzGarEntities(p.level,tag).forEach(e=>e.discard());m.persistentData.putBoolean('dz_garrison_active',false);m.persistentData.putLong('dz_garrison_respawn',0);count++}})
    p.tell(Text.of('[GARRISON] Reset '+count+' nearby site(s).').yellow());return count
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Outpost garrison materialisation v0.1 loaded')
