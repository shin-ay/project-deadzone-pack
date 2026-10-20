// PROJECT DEADZONE - BOSS target-board progression v0.1
//
// The target board is presentation and completion tracking only. Models, AI,
// attacks and phases remain owned by the native boss mod or the adopted mod.

const PDZ_BOSS_ROSTER = {
  'pdzbosses:axel':'B055000000000201',
  'pdzbosses:brass_hound':'B055000000000202',
  'pdzbosses:marshal_graves':'B055000000000203',
  'pdzbosses:white_stitch':'B055000000000204',
  'pdzbosses:cinder':'B055000000000205',
  'pdzbosses:echo_7':'B055000000000206',
  'pdzbosses:primordial':'B055000000000207',
  'pdzbosses:reactor_saint':'B055000000000208',
  'pdzbosses:argus_fragment':'B055000000000209',
  'pdzbosses:choir_vessel':'B055000000000210',
  'pdzbosses:relay_shepherd':'B055000000000211',
  'pdzbosses:siege_tank':'B055000000000212',
  'pdzbosses:ancient_abomination':'B055000000000213',
  'cataclysm:the_harbinger':'B055000000000214',
  'mowziesmobs:ferrous_wroughtnaut':'B055000000000215',
  'aquamirae:captain_cornelia':'B055000000000216',
  'mowziesmobs:frostmaw':'B055000000000217'
}

function pdzBossRosterTestEntity(boss){
  if(!boss||!boss.tags)return true
  return boss.tags.contains('dz_boss_showroom')||
    boss.tags.contains('dz_boss_loadtest')||
    boss.tags.contains('dz_boss_test_frozen')||
    boss.tags.contains('dz_adopted_boss_test')
}

function pdzBossRosterPlayerCredit(event,boss){
  let attacker=event.source?event.source.actual:null
  if(attacker&&attacker.isPlayer&&attacker.isPlayer())return true
  let storyHit=Number(boss.persistentData.getLong('dz_story_last_player_hit_ms')||0)
  let adoptedHit=Number(boss.persistentData.getLong('dz_adopted_last_player_hit_ms')||0)
  let last=Math.max(storyHit,adoptedHit)
  return last>0&&Date.now()-last<=90000
}

EntityEvents.death(event=>{
  let boss=event.entity
  if(!boss||boss.level.clientSide||pdzBossRosterTestEntity(boss))return
  let quest=PDZ_BOSS_ROSTER[String(boss.type)]
  if(!quest||boss.persistentData.getBoolean('dz_boss_roster_recorded'))return
  if(!pdzBossRosterPlayerCredit(event,boss)){
    console.info('[PROJECT DEADZONE][Boss Roster] ignored '+String(boss.type)+': no recent player credit')
    return
  }
  boss.persistentData.putBoolean('dz_boss_roster_recorded',true)
  boss.runCommandSilent('ftbquests change_progress @a[distance=..128,gamemode=!spectator] complete '+quest)
  console.info('[PROJECT DEADZONE][Boss Roster] completed '+quest+' from '+String(boss.type))
})
