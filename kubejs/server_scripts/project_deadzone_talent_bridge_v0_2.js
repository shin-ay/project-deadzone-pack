// PROJECT DEADZONE unified Talent bridge v0.2 - test profile
// JOB decides the initial position. Talent nodes contain passive effects only.

const PDZ_TALENT_PROVIDER = Java.loadClass('daripher.skilltree.capability.skill.PlayerSkillsProvider')
const PDZ_TALENT_RESPEC_COST = 16
const PDZ_TALENT_RESPEC_CURRENCY = 'apocalypsenow:money'

const PDZ_TALENT_JOB_START = {
  weapons_expert: 'talent_start_weapons',
  security:       'talent_start_security',
  medic:          'talent_start_medic',
  engineer:       'talent_start_engineer',
  mechanic:       'talent_start_mechanic',
  survivalist:    'talent_start_survivalist',
  survivor:       'talent_start_survivor',
  scout:          'talent_start_scout'
}
const PDZ_TALENT_ALL_STARTS = Object.keys(PDZ_TALENT_JOB_START).map(k=>PDZ_TALENT_JOB_START[k])

function pdzTalentJob(player) {
  let id=String(player.persistentData.getString('dz_job_id'))
  return PDZ_TALENT_JOB_START[id] ? id : 'survivor'
}

function pdzTalentGrant(player,id) {
  player.server.runCommandSilent('skilltree grant_skill ' + player.username + ' project_deadzone:' + id)
}

function pdzTalentHas(player,id) {
  return pdzTalentIds(player).indexOf('project_deadzone:' + id) >= 0
}

// JOB career and Talent use separate UIs, but the selected base JOB still
// determines the free entry node on the unified Talent board.  Always repair
// a missing entry node without consuming Talent SP.
function pdzTalentEnsureJobStart(player,announce) {
  let job=pdzTalentJob(player)
  let start=PDZ_TALENT_JOB_START[job]
  if (!start) return false
  let ids=pdzTalentIds(player)
  let wrong=PDZ_TALENT_ALL_STARTS.filter(id=>id!==start && ids.indexOf('project_deadzone:'+id)>=0)
  let seeded=String(player.persistentData.getString('pdz_talent_seed_job'))
  if ((wrong.length>0 || (seeded && seeded!==job)) && !player.persistentData.getBoolean('pdz_talent_origin_repair_pending')) {
    player.persistentData.putBoolean('pdz_talent_origin_repair_pending',true)
    player.server.runCommandSilent('skilltree reset '+player.username)
    player.server.scheduleInTicks(3,()=>{
      pdzTalentGrant(player,start)
      player.persistentData.putString('pdz_talent_seed_job',job)
      player.persistentData.putBoolean('pdz_talent_origin_repair_pending',false)
      pdzTalentSyncTags(player)
      player.tell(Text.of('[Talent] JOB開始地点を '+job+' に修正し、使用済みTPを返還しました。').green())
    })
    return true
  }
  if (pdzTalentHas(player,start)) return false
  pdzTalentGrant(player,start)
  player.persistentData.putString('pdz_talent_seed_job',job)
  if (announce) player.tell(Text.of('[Talent] 現在のJOBに対応する開始ノードを復旧しました: ' + job).aqua())
  return true
}

function pdzTalentIds(player) {
  let out=[]
  try {
    PDZ_TALENT_PROVIDER.get(player).getPlayerSkills().forEach(skill => {
      let id=String(skill.getId())
      if (id.startsWith('project_deadzone:talent_')) out.push(id)
    })
  } catch (ignored) {}
  return out
}

function pdzTalentAllProjectIds(player) {
  let out=[]
  try {
    PDZ_TALENT_PROVIDER.get(player).getPlayerSkills().forEach(skill => {
      let id=String(skill.getId())
      if (id.startsWith('project_deadzone:')) out.push(id)
    })
  } catch (ignored) {}
  return out
}

// v4 migration keeps every current Talent node and unused TP, removes nodes
// left behind by the retired JOB/Skill boards, and refunds one TP per removed
// node.  Re-granting current nodes after reset avoids forcing multiplayer
// testers to rebuild their existing Talent route.
function pdzTalentMigrateLegacyBoard(player,announce) {
  let d=player.persistentData
  if (d.getBoolean('pdz_talent_migrated_v4')) return false
  let all=pdzTalentAllProjectIds(player)
  let retired=all.filter(id=>!id.startsWith('project_deadzone:talent_'))
  if (retired.length===0) {
    d.putBoolean('pdz_talent_migrated_v4',true)
    return false
  }

  let cap=PDZ_TALENT_PROVIDER.get(player)
  let unused=Math.max(0,Number(cap.getSkillPoints()))
  let keep=pdzTalentIds(player)
  let job=pdzTalentJob(player)
  let start='project_deadzone:'+PDZ_TALENT_JOB_START[job]
  keep=keep.filter(id=>PDZ_TALENT_ALL_STARTS.indexOf(id.substring('project_deadzone:'.length))<0 || id===start)
  d.putBoolean('pdz_talent_migrated_v4',true)
  d.putBoolean('pdz_talent_legacy_migration_pending',true)
  player.server.runCommandSilent('skilltree reset '+player.username)
  player.server.scheduleInTicks(4,()=>{
    keep.forEach(id=>player.server.runCommandSilent('skilltree grant_skill '+player.username+' '+id))
    if (keep.indexOf(start)<0) player.server.runCommandSilent('skilltree grant_skill '+player.username+' '+start)
    player.server.runCommandSilent('skilltree points set '+player.username+' '+(unused+retired.length))
    d.putString('pdz_talent_seed_job',job)
    d.putBoolean('pdz_talent_seed_v2',true)
    d.putBoolean('pdz_talent_legacy_migration_pending',false)
    pdzTalentSyncTags(player)
    if (announce) player.tell(Text.of('[Talent] 旧ツリーを移行しました: 現在のTalentを維持 / 旧ノード '+retired.length+' TP返還').aqua())
  })
  return true
}

function pdzTalentSeed(player,force) {
  if (!force && player.persistentData.getBoolean('pdz_talent_seed_v2')) return false
  let job=pdzTalentJob(player)
  let start=PDZ_TALENT_JOB_START[job]
  pdzTalentGrant(player,start)
  player.server.runCommandSilent('skilltree points add ' + player.username + ' 4')
  player.persistentData.putBoolean('pdz_talent_seed_v2',true)
  player.persistentData.putString('pdz_talent_seed_job',job)
  player.tell(Text.of('[Talent] ' + job + ' の開始ノードを取得 / 初期TP +4').aqua())
  return true
}

function pdzTalentSyncTags(player) {
  let wanted=pdzTalentIds(player).map(id => 'pdz_talent_node_' + id.substring('project_deadzone:'.length))
  let stale=[]
  player.tags.forEach(tag => {
    let value=String(tag)
    if (value.startsWith('pdz_talent_node_') && wanted.indexOf(value)<0) stale.push(value)
  })
  stale.forEach(tag => player.removeTag(tag))
  wanted.forEach(tag => { if (!player.tags.contains(tag)) player.addTag(tag) })
}

PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(60, () => {
    if (pdzTalentMigrateLegacyBoard(event.player,true)) return
    pdzTalentSeed(event.player,false)
    pdzTalentEnsureJobStart(event.player,true)
  })
})

PlayerEvents.tick(event => {
  let p=event.player
  if (p.level.clientSide || p.age % 100 !== 0) return
  pdzTalentEnsureJobStart(p,false)
  pdzTalentSyncTags(p)
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal('deadzonetalent')

  root.then(Commands.literal('status').executes(ctx => {
    let p=ctx.source.player
    let cap=PDZ_TALENT_PROVIDER.get(p)
    let ids=pdzTalentIds(p)
    p.tell(Text.of('Talent / JOB: ' + pdzTalentJob(p)).gold())
    p.tell(Text.of('未使用TP: ' + cap.getSkillPoints() + ' / 取得ノード: ' + ids.length).aqua())
    p.tell(Text.of('開始ノード: ' + PDZ_TALENT_JOB_START[pdzTalentJob(p)]).gray())
    return 1
  }))

  root.then(Commands.literal('migration_status').executes(ctx => {
    let p=ctx.source.player,d=p.persistentData,cap=PDZ_TALENT_PROVIDER.get(p)
    let all=pdzTalentAllProjectIds(p)
    let retired=all.filter(id=>!id.startsWith('project_deadzone:talent_'))
    p.tell(Text.of('=== Talent Migration Audit ===').gold())
    p.tell(Text.of('Talentノード: '+pdzTalentIds(p).length+' / 未使用TP: '+cap.getSkillPoints()).aqua())
    p.tell(Text.of('旧ノード残存: '+retired.length+' / v4移行済み: '+d.getBoolean('pdz_talent_migrated_v4')).gray())
    p.tell(Text.of('JOB: '+pdzTalentJob(p)+' / 開始点: '+PDZ_TALENT_JOB_START[pdzTalentJob(p)]).gray())
    return 1
  }))

  root.then(Commands.literal('migrate_legacy').requires(s=>s.hasPermission(2)).executes(ctx=>{
    let p=ctx.source.player
    p.persistentData.putBoolean('pdz_talent_migrated_v4',false)
    if (!pdzTalentMigrateLegacyBoard(p,true)) p.tell(Text.of('[Talent] 移行対象の旧ノードはありません。').green())
    return 1
  }))

  root.then(Commands.literal('seed').requires(s => s.hasPermission(2)).executes(ctx => {
    pdzTalentEnsureJobStart(ctx.source.player,true)
    return 1
  }))

  root.then(Commands.literal('points_test').requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    p.server.runCommandSilent('skilltree points add ' + p.username + ' 40')
    p.tell(Text.of('[Talent Test] TP +40').green())
    return 1
  }))

  root.then(Commands.literal('list').executes(ctx => {
    let p=ctx.source.player
    pdzTalentIds(p).forEach(id => p.tell(Text.of(id).gray()))
    return 1
  }))

  root.then(Commands.literal('respec').executes(ctx => {
    let p=ctx.source.player, d=p.persistentData
    let free=!d.getBoolean('pdz_talent_respec_free_used')
    d.putLong('pdz_talent_respec_pending_until',p.level.gameTime+1200)
    p.tell(Text.of('=== Talent振り直し ===').gold())
    p.tell(Text.of(free ? '初回は無料です。' : '費用: Money ×'+PDZ_TALENT_RESPEC_COST).yellow())
    p.tell(Text.of('取得ノードを初期化し、使ったTPは返還されます。JOBとJOB開始ノードは維持します。').gray())
    p.tell(Text.of('[ 振り直しを実行 ]').red().clickRunCommand('/deadzonetalent respec_confirm'))
    return 1
  }))

  root.then(Commands.literal('respec_confirm').executes(ctx => {
    let p=ctx.source.player, d=p.persistentData
    if (d.getLong('pdz_talent_respec_pending_until') < p.level.gameTime) {
      p.tell(Text.of('確認の有効期限が切れました。/deadzonetalent respec からやり直してください。').red())
      return 0
    }
    let free=!d.getBoolean('pdz_talent_respec_free_used')
    if (!free) {
      let held=p.server.runCommandSilent('clear '+p.username+' '+PDZ_TALENT_RESPEC_CURRENCY+' 0')
      if (held < PDZ_TALENT_RESPEC_COST) {
        p.tell(Text.of('Moneyが不足しています（必要: '+PDZ_TALENT_RESPEC_COST+' / 所持: '+held+'）。').red())
        return 0
      }
      p.server.runCommandSilent('clear '+p.username+' '+PDZ_TALENT_RESPEC_CURRENCY+' '+PDZ_TALENT_RESPEC_COST)
    }
    p.server.runCommandSilent('skilltree reset '+p.username)
    d.putBoolean('pdz_talent_respec_free_used',true)
    d.remove('pdz_talent_respec_pending_until')
    p.server.scheduleInTicks(2, () => {
      pdzTalentEnsureJobStart(p,false)
      pdzTalentSyncTags(p)
      p.tell(Text.of('[Talent] 振り直し完了。返還されたTPで再設計できます。').green())
    })
    return 1
  }))

  event.register(root)
})
