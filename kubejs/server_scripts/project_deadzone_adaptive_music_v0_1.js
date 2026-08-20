// PROJECT DEADZONE adaptive music bridge v0.1
// Applies short invisible marker effects per player. Ambience Mini reads
// $effects client-side, so multiplayer players can hear different themes.
const PDZ_MUSIC_LEDGER = 'dz_activity_outpost_ledger_v1'
const PDZ_MUSIC_DURATION = 4
const PDZ_MUSIC_NAMED_RADIUS = 56
const PDZ_MUSIC_CAMP_RADIUS = 96

const PDZ_MUSIC_EFFECTS = [
  'music_camp','music_survivor','music_cdf','music_raider','music_remnant',
  'music_aegis','music_warden','music_infected','music_named_survivor',
  'music_named_cdf','music_named_raider','music_named_remnant',
  'music_named_aegis','music_named_warden','music_named_infected','music_named_unknown'
]

function pdzMusicDim(entity) { return String(entity.level.dimension) }
function pdzMusicDist2(player, x, y, z) {
  let dx=player.x-Number(x),dy=player.y-Number(y),dz=player.z-Number(z)
  return dx*dx+dy*dy+dz*dz
}
function pdzMusicHorizontalDist2(player, x, z) {
  let dx=player.x-Number(x),dz=player.z-Number(z)
  return dx*dx+dz*dz
}
function pdzMusicEffect(player, key) {
  if(!key)return
  player.runCommandSilent('effect give @s project_deadzone:'+key+' '+PDZ_MUSIC_DURATION+' 0 true')
}
function pdzMusicReadSites(server) {
  try {
    let data=JSON.parse(server.persistentData.getString(PDZ_MUSIC_LEDGER)||'[]')
    return Array.isArray(data)?data:[]
  } catch(err) {
    console.warn('[PROJECT DEADZONE][Music] Cannot read site ledger: '+err)
    return []
  }
}
function pdzMusicFaction(raw) {
  let faction=String(raw||'independent').toLowerCase()
  if(faction==='civildef'||faction==='civil_defense'||faction==='cdf')return 'cdf'
  if(faction==='survivor'||faction==='survivors')return 'survivor'
  if(faction==='raiders'||faction==='ash_jackals')return 'raider'
  if(faction==='ruunit'||faction==='remnants')return 'remnant'
  if(faction==='aegis_directorate')return 'aegis'
  if(faction==='warden_network')return 'warden'
  if(faction==='zombie'||faction==='horde')return 'infected'
  return ['cdf','survivor','raider','remnant','aegis','warden','infected'].indexOf(faction)>=0?faction:''
}
function pdzMusicFactionFromEntity(entity) {
  let tags=entity.tags
  if(!tags)return ''
  if(tags.contains('dz_civildef')||tags.contains('dz_cdf'))return 'cdf'
  if(tags.contains('dz_survivor'))return 'survivor'
  if(tags.contains('dz_raider'))return 'raider'
  if(tags.contains('dz_remnant')||tags.contains('dz_ruunit'))return 'remnant'
  if(tags.contains('dz_aegis'))return 'aegis'
  if(tags.contains('dz_warden'))return 'warden'
  if(tags.contains('dz_infected')||tags.contains('dz_biome_named'))return 'infected'
  return ''
}
function pdzMusicIsNamed(entity) {
  let tags=entity.tags
  return tags&&(tags.contains('dz_named')||tags.contains('dz_sideboss')||
    tags.contains('dz_story_boss')||tags.contains('dz_biome_named')||tags.contains('dz_apex'))
}
function pdzMusicNamedNear(player) {
  let best=null,bestD=PDZ_MUSIC_NAMED_RADIUS*PDZ_MUSIC_NAMED_RADIUS
  player.level.entities.forEach(entity=>{
    if(entity===player||!entity.isAlive()||!pdzMusicIsNamed(entity))return
    let d=pdzMusicDist2(player,entity.x,entity.y,entity.z)
    if(d<=bestD){bestD=d;best=entity}
  })
  return best
}
function pdzMusicSiteRadius(site) {
  let size=String(site.size||site.type||'small').toLowerCase()
  if(size.indexOf('large')>=0)return 112
  if(size.indexOf('medium')>=0)return 80
  return 56
}
function pdzMusicNearestSite(player, sites) {
  let dim=pdzMusicDim(player),best=null,bestD=Infinity
  sites.forEach(site=>{
    if(site.coreAlive===false||String(site.dimension)!==dim)return
    // A site theme belongs to its whole footprint, including high-rise floors.
    let radius=pdzMusicSiteRadius(site),d=pdzMusicHorizontalDist2(player,site.x,site.z)
    if(d<=radius*radius&&d<bestD){bestD=d;best=site}
  })
  return best
}
function pdzMusicInCamp(player, server) {
  let data=server.persistentData
  if(data.getInt('dz_auto_basecamp_state')!==2)return false
  let x=data.getInt('dz_auto_basecamp_origin_x'),y=data.getInt('dz_auto_basecamp_origin_y'),z=data.getInt('dz_auto_basecamp_origin_z')
  return pdzMusicDim(player)==='minecraft:overworld'&&pdzMusicHorizontalDist2(player,x,z)<=PDZ_MUSIC_CAMP_RADIUS*PDZ_MUSIC_CAMP_RADIUS
}
function pdzMusicUpdatePlayer(player, server, sites) {
  let named=pdzMusicNamedNear(player)
  if(named){
    let faction=pdzMusicFactionFromEntity(named)||'unknown'
    pdzMusicEffect(player,'music_named_'+faction)
    return
  }
  if(pdzMusicInCamp(player,server)){
    pdzMusicEffect(player,'music_camp')
    return
  }
  let site=pdzMusicNearestSite(player,sites)
  if(site){
    let faction=pdzMusicFaction(site.faction)
    if(faction)pdzMusicEffect(player,'music_'+faction)
  }
}

let PDZ_MUSIC_TICKS=0
ServerEvents.tick(event=>{
  PDZ_MUSIC_TICKS++
  if(PDZ_MUSIC_TICKS%40!==0)return
  let sites=pdzMusicReadSites(event.server)
  event.server.players.forEach(player=>pdzMusicUpdatePlayer(player,event.server,sites))
})

// OP test shortcuts. Effects expire by themselves and never leave saved state.
ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('pdzbgmtest').requires(source=>source.hasPermission(2))
  PDZ_MUSIC_EFFECTS.forEach(key=>root.then(Commands.literal(key).executes(ctx=>{
    let player=ctx.source.player
    player.runCommandSilent('effect give @s project_deadzone:'+key+' 30 0 true')
    player.tell(Text.of('[PDZ BGM TEST] '+key+' / 30 seconds').aqua())
    return 1
  })))
  event.register(root)
})
