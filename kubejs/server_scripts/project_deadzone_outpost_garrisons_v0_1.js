// PROJECT DEADZONE outpost garrison materialisation v0.1
// Nearby sites become physical; distant garrisons remain ledger-only.

const PDZ_GAR_LEDGER='dz_activity_outpost_ledger_v1'
// Warn before combat materialises. 160m gives the player time to read the
// faction/role, while guards only become physical inside 80m.
const PDZ_GAR_NOTICE=224
const PDZ_GAR_NEAR=112
const PDZ_GAR_RELEASE=240
const PDZ_GAR_RESPAWN=15*60*1000
const PDZ_GAR_PLACEMENT_VERSION=3

function pdzGarRead(server){
  try {let v=JSON.parse(server.persistentData.getString(PDZ_GAR_LEDGER)||'[]');return Array.isArray(v)?v:[]}
  catch(ignored){return []}
}
function pdzGarSiteId(marker){
  let instance=marker.persistentData.getString('dz_wild_instance')
  if(instance)return String(instance)
  return String(marker.level.dimension)+'|'+Math.floor(marker.x)+'|'+Math.floor(marker.z)+'|'+(marker.persistentData.getString('dz_wild_structure')||'manual:site')
}
function pdzGarTag(id){
  let h=5381,s=String(id)
  for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))&0x7fffffff
  return 'dz_garrison_'+h.toString(36)
}
function pdzGarNoticeKey(id){return 'dz_outpost_seen_'+pdzGarTag(id).substring(12)}
function pdzGarPresentationId(marker,id){
  let type=String(marker.persistentData.getString('dz_wild_type')||'')
  let urban=type.indexOf('commercial')>=0||type.indexOf('residential')>=0||
    type.indexOf('city')>=0||type.indexOf('hospital')>=0||
    type.indexOf('police')>=0||type.indexOf('firestation')>=0||
    type.indexOf('gun_store')>=0||type.indexOf('gas_station')>=0
  if(!urban)return String(id)
  return String(marker.level.dimension)+'|urban|'+Math.floor((marker.x+256)/512)+'|'+Math.floor((marker.z+256)/512)
}
function pdzGarNotice(server,marker,id,faction,role){
  let near=pdzGarNearPlayer(server,marker,PDZ_GAR_NOTICE)
  if(!near)return null
  let presentationId=pdzGarPresentationId(marker,id)
  let key=pdzGarNoticeKey(presentationId)
  let hostile=!(faction==='survivor'||faction==='civildef'||faction==='cdf'||faction==='independent')
  let first=!near.persistentData.getBoolean(key)
  if(first){
    near.persistentData.putBoolean(key,true)
    let relation=hostile?'HOSTILE':'CONTACT'
    let line='[OUTPOST] '+relation+': '+faction+' / '+role+' detected at '+Math.round(Math.sqrt((near.x-marker.x)*(near.x-marker.x)+(near.z-marker.z)*(near.z-marker.z)))+'m.'
    near.tell(hostile?Text.of(line).red():Text.of(line).aqua())
  }
  if(first){
    near.persistentData.putString('dz_current_named_site',presentationId)
    let place=marker.persistentData.getString('dz_wild_name')||'名称未登録地点'
    near.runCommandSilent('title @s times 10 55 15')
    near.runCommandSilent('title @s title {"text":"'+place+'","color":"'+(hostile?'red':'gold')+'","bold":true}')
    near.runCommandSilent('title @s subtitle {"text":"'+(hostile?'敵対勢力圏':'安全な接触地点')+' / '+faction+'","color":"gray"}')
    near.runCommandSilent('playsound minecraft:block.note_block.pling player @s ~ ~ ~ 0.45 '+(hostile?'0.65':'1.25'))
  }
  return near
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
function pdzGarAir(level,x,y,z){
  let id=String(level.getBlock(x,y,z).id)
  return id==='minecraft:air'||id==='minecraft:cave_air'||id==='minecraft:void_air'
}
function pdzGarBadFloor(id){
  id=String(id)
  return id==='minecraft:air'||id==='minecraft:cave_air'||id==='minecraft:void_air'||
    id.indexOf('water')>=0||id.indexOf('lava')>=0||id.indexOf('leaves')>=0||
    id.indexOf('vine')>=0||id.indexOf('fence')>=0||id.indexOf('_wall')>=0||
    id.indexOf('pane')>=0||id.indexOf('bars')>=0
}
function pdzGarCovered(level,x,y,z){
  // A roof/ceiling within eight blocks means this is an interior floor rather
  // than the exposed top surface selected by a heightmap.
  for(let dy=2;dy<=8;dy++)if(!pdzGarAir(level,x,y+dy,z))return true
  return false
}
function pdzGarSafeSpots(marker,wanted){
  let level=marker.level,cx=Math.floor(marker.x),cy=Math.floor(marker.y),cz=Math.floor(marker.z)
  let covered=[],open=[],seen={}
  // Search close to the marker's actual Y first. This avoids selecting the
  // roof of tall Lost Cities buildings and never asks for an unloaded heightmap.
  for(let radius=0;radius<=12;radius+=2){
    for(let dx=-radius;dx<=radius;dx+=2)for(let dz=-radius;dz<=radius;dz+=2){
      if(radius>0&&Math.abs(dx)!==radius&&Math.abs(dz)!==radius)continue
      // Stay on the facility's registered floor band. A deep downward search
      // treated caves and subway levels as valid interiors.
      for(let y=cy+3;y>=cy-4;y--){
        let key=(cx+dx)+'|'+y+'|'+(cz+dz)
        if(seen[key])continue
        seen[key]=true
        if(!pdzGarAir(level,cx+dx,y,cz+dz)||!pdzGarAir(level,cx+dx,y+1,cz+dz))continue
        if(pdzGarBadFloor(level.getBlock(cx+dx,y-1,cz+dz).id))continue
        let spot={x:cx+dx+0.5,y:y,z:cz+dz+0.5}
        if(pdzGarCovered(level,cx+dx,y,cz+dz))covered.push(spot);else open.push(spot)
        break
      }
    }
  }
  let result=covered.length?covered:open
  return result.slice(0,Math.max(wanted,1))
}
function pdzGarBase(spot){
  return 'execute positioned '+spot.x+' '+spot.y+' '+spot.z+' run '
}
function pdzGarRelocate(level,tag,spots){
  if(!spots.length)return 0
  let guards=pdzGarEntities(level,tag),moved=0
  guards.forEach((e,i)=>{
    let s=spots[i%spots.length]
    try {e.teleportTo(s.x,s.y,s.z);moved++} catch(ignored){}
  })
  return moved
}
function pdzGarRun(player,command,tag,limit,base){
  // Protect NPCs that already belonged to a neighbouring building. Squad
  // functions can create more actors than this site's occupancy budget, so
  // only newly-created overflow is removed below.
  player.runCommandSilent(base+'tag @e[tag=dz_npc,distance=..32] add dz_garrison_preexisting')
  player.runCommandSilent(command)
  player.runCommandSilent(base+'tag @e[tag=dz_npc,tag=!dz_garrison_preexisting,tag=!dz_garrison_bound,sort=nearest,limit='+limit+',distance=..32] add '+tag)
  player.runCommandSilent(base+'tag @e[tag='+tag+',distance=..32] add dz_garrison_bound')
  player.runCommandSilent(base+'kill @e[tag=dz_npc,tag=!dz_garrison_preexisting,tag=!dz_garrison_bound,distance=..32]')
  player.runCommandSilent(base+'tag @e[tag=dz_garrison_preexisting,distance=..32] remove dz_garrison_preexisting')
}
function pdzGarIsSettlementSeed(marker){
  return String(marker.persistentData.getString('dz_wild_structure')||'').indexOf('zombiekit:')===0
}
function pdzGarRecruitResidents(marker,player,faction,tag,spots){
  if(!pdzGarIsSettlementSeed(marker))return 0
  if(!(faction==='survivor'||faction==='civildef'||faction==='cdf'||faction==='independent'))return 0
  // Recruits keeps ownership and relation logic authoritative. These residents
  // are neutral settlement life, while PDZ faction squads remain the guards.
  let residentTag=tag+'_resident',types=faction==='civildef'||faction==='cdf'
    ? ['recruits:recruit','recruits:bowman']
    : ['recruits:recruit','recruits:nomad']
  let count=Math.min(2,Math.max(1,spots.length))
  for(let i=0;i<count;i++){
    let s=spots[(spots.length-1-i+spots.length)%spots.length]
    player.runCommandSilent('execute positioned '+s.x+' '+s.y+' '+s.z+' run summon '+types[i%types.length]+' ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_settlement_resident","dz_external_faction_npc","dz_garrison_bound","'+tag+'","'+residentTag+'"]}')
  }
  return count
}
function pdzGarSpawn(marker,player,faction,size,role,tag){
  let count=pdzGarCount(size)
  if(marker.persistentData.contains('dz_wild_garrison_limit')){
    let limit=marker.persistentData.getInt('dz_wild_garrison_limit')
    if(limit<=0)return
    count=Math.min(count,limit)
  }
  let spots=pdzGarSafeSpots(marker,count)
  if(!spots.length){
    marker.persistentData.putBoolean('dz_garrison_active',false)
    marker.persistentData.putLong('dz_garrison_respawn',Date.now()+30000)
    console.warn('[PDZ GARRISON] No safe floor/headroom near '+pdzGarSiteId(marker)+'; spawn deferred')
    return
  }
  let base=pdzGarBase(spots[0])
  if(faction==='survivor'){
    pdzGarRun(player,base+'function project_deadzone:factions/squad/survivors_roles',tag,Math.min(3,count),base)
    if(count>3)pdzGarRun(player,base+'function project_deadzone:factions/squad/survivors',tag,Math.min(3,count-3),base)
  }else if(faction==='civildef'||faction==='cdf'){
    pdzGarRun(player,base+'function project_deadzone:factions/squad/civildef_roles',tag,Math.min(4,count),base)
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
  pdzGarRecruitResidents(marker,player,faction,tag,spots)
  pdzGarRelocate(marker.level,tag,spots)
  // Trading locations get a trader in addition to guards. Existing duplicate
  // protection in the wilderness script prevents stacking merchants.
  if(marker.persistentData.getString('dz_wild_trade')&&faction!=='infected'&&faction!=='aegis'&&faction!=='warden'){
    try { if(typeof pdzWildPlaceTrader==='function')pdzWildPlaceTrader(player,marker) }
    catch(err){console.warn('[PDZ GARRISON] trader placement deferred: '+err)}
  }
  marker.persistentData.putBoolean('dz_garrison_active',true)
  marker.persistentData.putString('dz_garrison_tag',tag)
  marker.persistentData.putLong('dz_garrison_spawned',Date.now())
  marker.persistentData.putInt('dz_garrison_placement_version',PDZ_GAR_PLACEMENT_VERSION)
}
function pdzGarPulse(server){
  let ledger=pdzGarRead(server),owners={}
  ledger.forEach(s=>owners[String(s.id)]=s)
  let seen={}
  server.players.forEach(player=>{
    let closeToAny=false
    player.level.entities.forEach(marker=>{
    if(marker.tags&&marker.tags.contains('dz_wilderness_site')&&(marker.x-player.x)*(marker.x-player.x)+(marker.z-player.z)*(marker.z-player.z)<=PDZ_GAR_NOTICE*PDZ_GAR_NOTICE)closeToAny=true
    if(!marker.tags||!marker.tags.contains('dz_wilderness_site')||seen[String(marker.uuid)])return
    seen[String(marker.uuid)]=true
    let id=pdzGarSiteId(marker),site=owners[id]||{},tag=marker.persistentData.getString('dz_garrison_tag')||pdzGarTag(id)
    if(marker.persistentData.contains('dz_wild_garrison')&&!marker.persistentData.getBoolean('dz_wild_garrison')){
      pdzGarEntities(marker.level,tag).forEach(e=>e.discard())
      marker.persistentData.putBoolean('dz_garrison_active',false)
      marker.persistentData.putLong('dz_garrison_respawn',0)
      return
    }
    let faction=site.faction||marker.persistentData.getString('dz_wild_faction')||'independent'
    let role=site.role||marker.persistentData.getString('dz_wild_role')||'shelter'
    pdzGarNotice(server,marker,id,String(faction),String(role))
    let near=pdzGarNearPlayer(server,marker,PDZ_GAR_NEAR),release=pdzGarNearPlayer(server,marker,PDZ_GAR_RELEASE)
    let guards=pdzGarEntities(marker.level,tag),active=marker.persistentData.getBoolean('dz_garrison_active')
    // One-time migration: remove guards created by the old heightmap logic
    // (roof/leaf/air spawns) and recreate them using validated floor spots.
    if(guards.length&&marker.persistentData.getInt('dz_garrison_placement_version')<PDZ_GAR_PLACEMENT_VERSION){
      guards.forEach(e=>e.discard())
      guards=[]
      marker.persistentData.putBoolean('dz_garrison_active',false)
      marker.persistentData.putLong('dz_garrison_respawn',0)
      active=false
    }
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
    pdzGarSpawn(marker,near,String(faction),site.size||pdzGarSize(marker.persistentData.getString('dz_wild_type')),role,tag)
    })
    if(!closeToAny)player.persistentData.remove('dz_current_named_site')
  })
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
  root.then(Commands.literal('repair_near').executes(ctx=>{
    let p=ctx.source.player,count=0
    p.level.entities.forEach(m=>{
      if(!m.tags||!m.tags.contains('dz_wilderness_site'))return
      if((m.x-p.x)*(m.x-p.x)+(m.z-p.z)*(m.z-p.z)>160*160)return
      let tag=m.persistentData.getString('dz_garrison_tag')||pdzGarTag(pdzGarSiteId(m))
      pdzGarEntities(p.level,tag).forEach(e=>e.discard())
      m.persistentData.putBoolean('dz_garrison_active',false)
      m.persistentData.putLong('dz_garrison_respawn',0)
      m.persistentData.putInt('dz_garrison_placement_version',0)
      count++
    })
    pdzGarPulse(ctx.source.server)
    p.tell(Text.of('[GARRISON] Rebuilt '+count+' nearby site(s) with safe-floor placement.').green())
    return count
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE] Outpost garrison materialisation v0.1 loaded')
