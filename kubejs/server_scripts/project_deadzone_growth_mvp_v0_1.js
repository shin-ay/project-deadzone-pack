// PROJECT DEADZONE Growth MVP v0.1
// Test-only bridge: JOB aptitude, safe legacy preview, activity XP and mastery grades.

const DZG_CATEGORIES = ['dz_survival','dz_scavenging','dz_livelihood','dz_mobility','dz_industry','dz_combat']
const DZG_LEGACY = ['firearms','melee','reload','armor','survival','medical','scavenging','fitness','mechanics','engineering']
const DZG_JOB = {
  survivor:       {primary:'dz_survival',   secondary:'dz_scavenging', seed:3},
  weapons_expert: {primary:'dz_combat',     secondary:'dz_industry',   seed:3},
  medic:          {primary:'dz_survival',   secondary:'dz_livelihood', seed:3},
  mechanic:       {primary:'dz_mobility',   secondary:'dz_industry',   seed:3},
  engineer:       {primary:'dz_industry',   secondary:'dz_mobility',   seed:3},
  scout:          {primary:'dz_scavenging', secondary:'dz_survival',   seed:3},
  security:       {primary:'dz_combat',     secondary:'dz_survival',   seed:3},
  survivalist:    {primary:'dz_livelihood', secondary:'dz_survival',   seed:3}
}

function dzgJobId(player) {
  let id = String(player.persistentData.getString('dz_job_id'))
  return DZG_JOB[id] ? id : 'survivor'
}

function dzgPoints(player, category) {
  try { return Number(PufferfishSkills.getPointsLeft(player, category)) }
  catch (error) { return 0 }
}

function dzgLevel(player, category) {
  try { return Number(PufferfishSkills.getExperienceLevel(player, category)) }
  catch (error) { return 0 }
}

function dzgPstTrack(category) {
  if (category === 'dz_combat') return 'combat'
  if (category === 'dz_livelihood') return 'life'
  if (category === 'dz_industry' || category === 'dz_mobility') return 'industry'
  return 'survival'
}

function dzgPstTrackName(track) {
  if (track === 'combat') return '戦闘'
  if (track === 'life') return '生活'
  if (track === 'industry') return '工業'
  return 'サバイバル'
}

function dzgPstThreshold(rank) {
  return 60 + Math.min(240, rank * 20)
}

function dzgPstXp(player, category, amount) {
  let track=dzgPstTrack(category)
  let xpKey='pdz_pst_xp_' + track
  let rankKey='pdz_pst_rank_' + track
  let xp=player.persistentData.getInt(xpKey) + amount
  let rank=player.persistentData.getInt(rankKey)
  let gained=0
  let threshold=dzgPstThreshold(rank)
  while (xp >= threshold && gained < 8) {
    xp -= threshold
    rank++
    gained++
    threshold=dzgPstThreshold(rank)
  }
  player.persistentData.putInt(xpKey,xp)
  player.persistentData.putInt(rankKey,rank)
  if (gained > 0) {
    player.server.runCommandSilent('skilltree points add ' + player.username + ' ' + gained)
    player.tell(Text.of('[行動熟練] ' + dzgPstTrackName(track) + ' Rank ' + rank + ' / Talent SP +' + gained).gold())
  }
  return {track:track,xp:xp,rank:rank,next:threshold,gained:gained}
}

function dzgXp(player, category, base) {
  let source=arguments.length>=4?String(arguments[3]):({
    dz_combat:'combat',dz_livelihood:'survival',dz_industry:'craft',
    dz_mobility:'vehicle',dz_scavenging:'scavenging',dz_survival:'survival'
  }[category]||'survival')
  let awardMns=arguments.length>=5?arguments[4]:source!=='combat'&&source!=='firearms'&&source!=='melee'&&source!=='elite'
  if(global.pdzUnifiedProgressionAward)return global.pdzUnifiedProgressionAward(player,source,base,awardMns)
  return 0
}

function dzgSetPoints(player, category, points) {
  player.server.runCommandSilent('puffish_skills points set ' + player.username + ' ' + category + ' ' + Math.max(0, Math.floor(points)))
}

function dzgAddPoints(player, category, amount) {
  dzgSetPoints(player, category, dzgPoints(player, category) + amount)
}

function dzgCooldown(player, key, ms) {
  let now = Date.now()
  let nbt = 'dzg_cd_' + key
  let last = player.persistentData.getLong(nbt)
  if (now - last < ms) return false
  player.persistentData.putLong(nbt, now)
  return true
}

function dzgIsCrop(id) {
  return id === 'minecraft:wheat' || id === 'minecraft:carrots' || id === 'minecraft:potatoes'
    || id === 'minecraft:beetroots' || id === 'minecraft:nether_wart'
    || id.indexOf('pam') === 0 || id.indexOf('farmersdelight:') === 0
}

function dzgIsContainer(id) {
  return id.indexOf('chest') >= 0 || id.indexOf('crate') >= 0 || id.indexOf('barrel') >= 0
    || id.indexOf('locker') >= 0 || id.indexOf('cabinet') >= 0 || id.indexOf('shelf') >= 0
    || id.indexOf('drawer') >= 0 || id.indexOf('cupboard') >= 0 || id.indexOf('cache') >= 0
}

function dzgPositionKey(block) {
  return String(block.x) + ',' + String(block.y) + ',' + String(block.z)
}

function dzgActionbar(player, text, color) {
  let safe=String(text).replace(/\\/g,'\\\\').replace(/"/g,'\\"')
  player.server.runCommandSilent('title ' + player.username + ' actionbar {"text":"' + safe + '","color":"' + color + '"}')
}

// Keep hunting inside the Livelihood/Survival trees for the MVP.  A dedicated
// hunting branch can later consume these same categories without migrating XP.
function dzgAnimalKill(target) {
  let id=String(target.type)
  let vanilla=[
    'minecraft:cow','minecraft:pig','minecraft:sheep','minecraft:chicken','minecraft:rabbit',
    'minecraft:goat','minecraft:horse','minecraft:donkey','minecraft:mule','minecraft:llama',
    'minecraft:fox','minecraft:wolf','minecraft:ocelot','minecraft:cat','minecraft:parrot',
    'minecraft:turtle','minecraft:frog','minecraft:axolotl','minecraft:camel','minecraft:mooshroom',
    'minecraft:cod','minecraft:salmon','minecraft:pufferfish','minecraft:tropical_fish','minecraft:squid','minecraft:glow_squid',
    'minecraft:dolphin','minecraft:polar_bear','minecraft:panda','minecraft:bee'
  ]
  if (vanilla.indexOf(id)>=0) return true
  return id.startsWith('naturalist:') || id.startsWith('alexsmobs:')
    || id.startsWith('hybrid_aquatic:') || id.startsWith('aquaculture:')
}

function dzgAquaticKill(target) {
  let id=String(target.type)
  return id.indexOf('fish')>=0 || id.indexOf('shark')>=0 || id.indexOf('ray')>=0
    || id.indexOf('squid')>=0 || id.indexOf('octopus')>=0 || id.indexOf('whale')>=0
    || id.indexOf('dolphin')>=0 || id.indexOf('jelly')>=0 || id.indexOf('crab')>=0
    || id.startsWith('hybrid_aquatic:') || id.startsWith('aquaculture:')
}

function dzgDangerousWildlife(target) {
  let id=String(target.type)
  return id.indexOf('bear')>=0 || id.indexOf('lion')>=0 || id.indexOf('tiger')>=0
    || id.indexOf('croc')>=0 || id.indexOf('alligator')>=0 || id.indexOf('shark')>=0
    || id.indexOf('rhino')>=0 || id.indexOf('elephant')>=0 || id.indexOf('boar')>=0
    || id.indexOf('anaconda')>=0 || id.indexOf('komodo')>=0
}

function dzgSeed(player) {
  if (player.persistentData.getBoolean('dz_growth_seed_v1')) return false
  player.addTag('dz_growth_job_' + dzgJobId(player))
  player.persistentData.putBoolean('dz_growth_seed_v1', true)
  return true
}

function dzgTagCount(player, prefix) {
  let count = 0
  player.tags.forEach(tag => { if (String(tag).startsWith(prefix)) count++ })
  return count
}

function dzgSyncMastery(player) {
  let jobId = dzgJobId(player)
  let job = DZG_JOB[jobId]
  let a = dzgTagCount(player, 'dz_growth_' + job.primary.substring(3) + '_')
  let b = dzgTagCount(player, 'dz_growth_' + job.secondary.substring(3) + '_')
  let invested = a + b
  let grade = invested >= 12 ? 3 : invested >= 8 ? 2 : invested >= 4 ? 1 : 0
  for (let i=1;i<=3;i++) {
    let generic='dz_job_mastery_' + i
    let specific='dz_job_' + jobId + '_mastery_' + i
    if (i <= grade) { player.addTag(generic); player.addTag(specific) }
    else { player.removeTag(generic); player.removeTag(specific) }
  }
  player.persistentData.putInt('dz_growth_mastery_grade', grade)
  player.persistentData.putInt('dz_growth_related_nodes', invested)
  return {grade:grade, invested:invested}
}

PlayerEvents.loggedIn(event => {
  event.player.server.scheduleInTicks(40, () => dzgSyncMastery(event.player))
})

PlayerEvents.tick(event => {
  let player=event.player
  if (player.level.clientSide || player.age % 100 !== 0) return
  dzgSyncMastery(player)

  // Exploration rewards actual travel, not standing still or circling one block.
  let x=Number(player.x), y=Number(player.y), z=Number(player.z)
  let hasSample=player.persistentData.getBoolean('dzg_travel_sampled')
  if (!hasSample) {
    player.persistentData.putBoolean('dzg_travel_sampled',true)
    player.persistentData.putDouble('dzg_travel_x',x)
    player.persistentData.putDouble('dzg_travel_y',y)
    player.persistentData.putDouble('dzg_travel_z',z)
    return
  }
  let dx=x-player.persistentData.getDouble('dzg_travel_x')
  let dy=y-player.persistentData.getDouble('dzg_travel_y')
  let dz=z-player.persistentData.getDouble('dzg_travel_z')
  let distance=Math.sqrt(dx*dx+dy*dy+dz*dz)
  if (distance >= 48) {
    player.persistentData.putDouble('dzg_travel_x',x)
    player.persistentData.putDouble('dzg_travel_y',y)
    player.persistentData.putDouble('dzg_travel_z',z)
    if (dzgCooldown(player,'travel_xp',45000)) {
      dzgXp(player,'dz_survival',3,'exploration',true)
    }
  }
  try {
    if (player.isPassenger() && dzgCooldown(player,'vehicle_travel',60000)) dzgXp(player,'dz_mobility',2,'vehicle',true)
  } catch (ignored) {}
  try {
    if (player.isSprinting() && dzgCooldown(player,'field_endurance',90000)) dzgXp(player,'dz_survival',1,'survival',true)
  } catch (ignored) {}
})

ItemEvents.foodEaten(event => {
  let p=event.entity
  if (!p || !p.isPlayer() || p.level.clientSide || !dzgCooldown(p,'food',30000)) return
  dzgXp(p,'dz_survival',1,'survival',true)
})

ItemEvents.crafted(event => {
  let p=event.player
  if (!p || p.level.clientSide || !dzgCooldown(p,'craft',8000)) return
  let id=String(event.item.id)
  if (id.startsWith('create:') || id.startsWith('immersiveengineering:') || id.startsWith('mekanism:') || id.startsWith('tfmg:') || id.startsWith('buildinggadgets2:')) dzgXp(p,'dz_industry',3,'engineering',true)
  else if (id.startsWith('vehicle:') || id.startsWith('mts:') || id.startsWith('blocky_bikes:') || id.startsWith('smallships:') || id.startsWith('immersive_aircraft:')) dzgXp(p,'dz_mobility',4,'vehicle',true)
  else if (id.includes('food') || id.includes('meal') || id.includes('stew') || id.includes('soup') || id.includes('sandwich') || id.includes('pie')) dzgXp(p,'dz_livelihood',2,'cooking',true)
  else dzgXp(p,'dz_industry',1,'craft',true)
})

BlockEvents.broken(event => {
  let p=event.player
  if (!p || p.level.clientSide) return
  let id=String(event.block.id)
  if (dzgIsCrop(id)) {
    if (dzgCooldown(p,'farming',3000)) dzgXp(p,'dz_livelihood',2,'farming',true)
    return
  }
  if (!dzgCooldown(p,'salvage',15000)) return
  if (event.block.hasTag('forge:ores') || event.block.hasTag('forge:storage_blocks')) dzgXp(p,'dz_scavenging',2,'scavenging',true)
  else if (event.block.hasTag('minecraft:logs')) dzgXp(p,'dz_survival',1,'scavenging',true)
})

BlockEvents.rightClicked(event => {
  let p=event.player
  if (!p || p.level.clientSide) return
  let id=String(event.block.id)
  if (!dzgIsContainer(id)) return
  let key=dzgPositionKey(event.block)
  if (String(p.persistentData.getString('dzg_last_container')) === key) return
  if (!dzgCooldown(p,'container_search',10000)) return
  p.persistentData.putString('dzg_last_container',key)
  dzgXp(p,'dz_scavenging',2,'scavenging',true)
})

// TaCZ exposes a reliable server-side gun kill event. Mark it so the generic
// death event below cannot award the same kill a second time.
TimelessGunEvents.entityKillByGun(event => {
  let p=event.attacker
  if (!p || !p.isPlayer() || p.level.clientSide) return
  p.persistentData.putLong('dzg_last_gun_kill_ms',Date.now())
  dzgXp(p,'dz_combat',event.headShot ? 7 : 5,'firearms',false)
})

// Generic player kills cover Epic Fight melee and other non-TaCZ combat.
EntityEvents.death(event => {
  let p=event.source ? event.source.actual : null
  if (!p || !p.isPlayer || !p.isPlayer() || p.level.clientSide) return
  if (Date.now()-p.persistentData.getLong('dzg_last_gun_kill_ms') < 500) return
  let target=event.entity
  if (dzgAnimalKill(target)) {
    // No XP for pets/tamed companions. This also closes the easiest breeding exploit.
    try { if (target.isTame && target.isTame()) return } catch (ignored) {}
    let aquatic=dzgAquaticKill(target)
    let dangerous=dzgDangerousWildlife(target)
    dzgXp(p,'dz_livelihood',dangerous ? 5 : aquatic ? 3 : 2,'hunting',true)
    return
  }
  let base=3
  try {
    if (target.tags.contains('dz_boss') || target.tags.contains('dz_named_boss')) base=12
    else if (target.tags.contains('dz_elite') || target.tags.contains('dz_named')) base=7
  } catch (ignored) {}
  dzgXp(p,'dz_combat',base,'combat',false)
})

ServerEvents.commandRegistry(event => {
  const {commands:Commands}=event
  let root=Commands.literal('deadzoneprogress')

  root.then(Commands.literal('status').executes(ctx => {
    let p=ctx.source.player
    let m=dzgSyncMastery(p)
    p.tell(Text.of('JOB: ' + dzgJobId(p) + ' / Mastery G' + m.grade + ' (' + m.invested + '/12 related nodes)').gold())
    p.tell(Text.of('総合レベルと経験値はM&Sへ統合済み。J=JOB / M&S画面=Talent').aqua())
    return 1
  }))

  root.then(Commands.literal('job_seed').executes(ctx => {
    let p=ctx.source.player
    if (dzgSeed(p)) p.tell(Text.of('JOB適性を同期しました。旧6カテゴリSPの新規配布は廃止済みです。').green())
    else p.tell(Text.of('JOB適性は同期済みです。').yellow())
    return 1
  }))

  root.then(Commands.literal('migration_preview').executes(ctx => {
    let p=ctx.source.player
    let total=0
    p.tell(Text.of('旧進捗の安全プレビュー（まだ変換・削除しません）').aqua())
    DZG_LEGACY.forEach(c => {
      let lv=dzgLevel(p,c), sp=dzgPoints(p,c)
      total += lv
      p.tell(Text.of(c + ': Lv' + lv + ' / 未使用SP ' + sp).gray())
    })
    p.tell(Text.of('暫定変換基準値: ' + total + '（正式配分前に保存予定）').gold())
    return 1
  }))

  root.then(Commands.literal('grant_test').requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    DZG_CATEGORIES.forEach(c => dzgSetPoints(p,c,20))
    p.tell(Text.of('新6カテゴリへ各20テストSPを付与しました。').aqua())
    return 1
  }))

  root.then(Commands.literal('xp_test').requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    dzgXp(p,'dz_survival',100,'survival',true)
    p.tell(Text.of('M&S総合XPをテスト付与しました。').aqua())
    return 1
  }))

  root.then(Commands.literal('reset_test').requires(s => s.hasPermission(2)).executes(ctx => {
    let p=ctx.source.player
    DZG_CATEGORIES.forEach(c => {
      p.server.runCommandSilent('puffish_skills category erase ' + p.username + ' ' + c)
      dzgSetPoints(p,c,0)
    })
    p.persistentData.putBoolean('dz_growth_seed_v1',false)
    p.tell(Text.of('新6カテゴリのみリセットしました。旧進捗は保持されています。').gray())
    return 1
  }))

  event.register(root)
})
