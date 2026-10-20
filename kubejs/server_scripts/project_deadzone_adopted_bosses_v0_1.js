// PROJECT DEADZONE - adopted boss integration v0.1
//
// These encounters are intentionally NOT reimplemented in KubeJS. Their
// original mods own models, animation, AI, attacks, phases, arenas and native
// loot. PDZ only supplies campaign identity, fixed profile/party pacing, music,
// participation credit and a small one-time campaign reward.

const PDZ_ADOPTED_BOSSES = [
  {
    key:'harbinger',id:'15',entity:'cataclysm:the_harbinger',
    tag:'dz_story_boss_harbinger',name:'HARBINGER // WAR MACHINE',
    role:'軍事施設ルート：レーザー／ミサイル／EMP',story:true,
    reward:[['lightmanscurrency:coin_copper',18],['immersiveengineering:ingot_steel',8],['apocalypsenow:medicalkit',1]]
  },
  {
    key:'wroughtnaut',id:'16',entity:'mowziesmobs:ferrous_wroughtnaut',
    tag:'dz_sideboss_wroughtnaut',name:'WARDEN-0 // IRON SENTINEL',
    role:'装甲遺跡の寄り道：背面弱点／重斧衝撃波',story:false,
    reward:[['lightmanscurrency:coin_copper',12],['immersiveengineering:ingot_steel',6]]
  },
  {
    key:'cornelia',id:'17',entity:'aquamirae:captain_cornelia',
    tag:'dz_story_boss_cornelia',name:'CAPTAIN CORNELIA // LAST VOYAGE',
    role:'凍結港ルート：亡霊船長／海域制圧',story:true,
    reward:[['lightmanscurrency:coin_copper',16],['apocalypsenow:medicalkit',2]]
  },
  {
    key:'frostmaw',id:'18',entity:'mowziesmobs:frostmaw',
    tag:'dz_sideboss_frostmaw',name:'FROSTMAW // WHITEOUT',
    role:'雪原の寄り道：氷結吐息／巨体制圧',story:false,
    reward:[['lightmanscurrency:coin_copper',12],['apocalypsenow:medicalkit',1]]
  }
]

function pdzAdoptedByEntity(entity){
  if(!entity)return null
  let type=String(entity.type)
  for(let i=0;i<PDZ_ADOPTED_BOSSES.length;i++)if(PDZ_ADOPTED_BOSSES[i].entity===type)return PDZ_ADOPTED_BOSSES[i]
  return null
}

function pdzAdoptedByKey(key){
  for(let i=0;i<PDZ_ADOPTED_BOSSES.length;i++)if(PDZ_ADOPTED_BOSSES[i].key===key)return PDZ_ADOPTED_BOSSES[i]
  return null
}

function pdzAdoptedInitialize(entity,def){
  if(!entity||!entity.alive||!entity.tags||!def||entity.tags.contains('dz_adopted_boss_ready'))return
  entity.addTag('dz_adopted_boss')
  entity.addTag('dz_pdz_boss')
  entity.addTag('dz_hostile')
  entity.addTag('dz_boss_mech_'+def.id)
  entity.addTag(def.tag)
  entity.addTag(def.story?'dz_story_boss':'dz_side_boss')
  entity.addTag('dz_adopted_boss_ready')
  entity.persistentData.putString('dz_adopted_boss_key',def.key)
  entity.persistentData.putString('dz_adopted_boss_role',def.role)
  entity.runCommandSilent('data merge entity @s {PersistenceRequired:1b}')
  // Apply the common cap+2 and multiplayer durability policy immediately,
  // while leaving the mod's own damage/phase code entirely untouched.
  try{if(global.pdzBossEnsureDurability)global.pdzBossEnsureDurability(entity)}catch(err){
    console.warn('[PROJECT DEADZONE][Adopted Boss] profile failed for '+def.key+': '+err)
  }
  console.info('[PROJECT DEADZONE][Adopted Boss] initialized '+def.key+' entity='+def.entity+' mechanic='+def.id)
}

EntityEvents.spawned(event=>{
  let entity=event.entity
  if(!entity||entity.level.clientSide)return
  let def=pdzAdoptedByEntity(entity)
  if(!def)return
  let ref=entity
  entity.server.scheduleInTicks(5,()=>pdzAdoptedInitialize(ref,def))
})

// Keep ranged kill credit for delayed projectiles and native phase attacks.
EntityEvents.hurt(event=>{
  let entity=event.entity
  if(!entity||!entity.tags||!entity.tags.contains('dz_adopted_boss'))return
  let attacker=event.source?event.source.actual:null
  if(attacker&&attacker.isPlayer&&attacker.isPlayer()){
    entity.persistentData.putString('dz_adopted_last_player_uuid',String(attacker.uuid))
    entity.persistentData.putLong('dz_adopted_last_player_hit_ms',Date.now())
  }
})

function pdzAdoptedReward(boss,def){
  if(boss.tags.contains('dz_adopted_rewarded'))return
  let lastHit=Number(boss.persistentData.getLong('dz_adopted_last_player_hit_ms'))
  if(lastHit<=0||Date.now()-lastHit>90000){
    console.info('[PROJECT DEADZONE][Adopted Boss] no campaign reward: no recent player credit for '+def.key)
    return
  }
  boss.addTag('dz_adopted_rewarded')
  boss.server.persistentData.putBoolean('dz_adopted_boss_complete_'+def.key,true)
  if(def.story)boss.server.persistentData.putBoolean('dz_story_boss_complete_'+def.key,true)
  def.reward.forEach(entry=>{
    boss.runCommandSilent('give @a[distance=..128,gamemode=!spectator] '+entry[0]+' '+entry[1])
  })
  boss.runCommandSilent('title @a[distance=..128,gamemode=!spectator] title {"text":"'+def.name+' CLEAR","color":"gold","bold":true}')
  boss.runCommandSilent('title @a[distance=..128,gamemode=!spectator] subtitle {"text":"固有戦利品は元MODのドロップを維持","color":"aqua"}')
  console.info('[PROJECT DEADZONE][Adopted Boss] campaign clear '+def.key)
}

EntityEvents.death(event=>{
  let boss=event.entity
  if(!boss||boss.level.clientSide)return
  let def=pdzAdoptedByEntity(boss)
  if(!def||!boss.tags.contains('dz_adopted_boss'))return
  pdzAdoptedReward(boss,def)
})

function pdzAdoptedSpawn(player,key){
  let def=pdzAdoptedByKey(key)
  if(!def)return 0
  player.runCommandSilent('execute positioned ^ ^ ^8 run summon '+def.entity+' ~ ~ ~ {PersistenceRequired:1b,Tags:["dz_adopted_boss_test"]}')
  player.tell(Text.of(def.name+' を8m先へ召喚しました。元MODのAI・攻撃・ボスバーをそのまま使用します。').aqua())
  if(key==='harbinger')player.tell(Text.of('Harbingerは停止状態からネザースターで起動する元MOD仕様です。').yellow())
  return 1
}

ServerEvents.commandRegistry(event=>{
  const {commands:Commands}=event
  let root=Commands.literal('deadzoneadoptedboss').requires(source=>source.hasPermission(2))
  PDZ_ADOPTED_BOSSES.forEach(def=>{
    root.then(Commands.literal('spawn_'+def.key).executes(ctx=>pdzAdoptedSpawn(ctx.source.player,def.key)))
  })
  root.then(Commands.literal('status').executes(ctx=>{
    let player=ctx.source.player
    player.tell(Text.of('--- PDZ adopted bosses ---').gold())
    PDZ_ADOPTED_BOSSES.forEach(def=>{
      let done=player.server.persistentData.getBoolean('dz_adopted_boss_complete_'+def.key)
      player.tell(Text.of('['+(done?'CLEAR':'OPEN')+'] '+def.name+' / '+def.role)[done?'green':'gray']())
    })
    return 1
  }))
  event.register(root)
})
