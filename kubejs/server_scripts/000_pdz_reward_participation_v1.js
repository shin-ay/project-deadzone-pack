// Encounter-scoped participation. No proximity-only credit. Fail closed at callers.
// Receipts expire after 120 seconds of wall time, including downtime. Reward range
// remains each caller's original range; only living online non-spectators qualify.
const PDZ_RP_KEY = 'pdz_reward_participation_v1'
const PDZ_RP_TTL = 120000
let pdzRpPending = []
let pdzRpEncounters = {}
let pdzRpPruneTicks = 0
function pdzRpId(e) { return e ? String(e.uuid) : '' }
function pdzRpTag(e,t) { return !!(e && e.tags && e.tags.contains(t)) }
function pdzRpExcluded(e) {
  return !e || pdzRpTag(e,'dz_boss_showroom') || pdzRpTag(e,'dz_boss_resetting') ||
    pdzRpTag(e,'dz_boss_loadtest') || pdzRpTag(e,'dz_boss_test_frozen') || pdzRpTag(e,'dz_adopted_boss_test')
}
function pdzRpPlayer(p) {
  return !!(p && p.isPlayer && p.isPlayer() && !p.spectator && p.alive && !p.level.clientSide)
}
function pdzRpBoss(e) {
  return !pdzRpExcluded(e) && (String(e.type).indexOf('pdzbosses:')===0 || pdzRpTag(e,'dz_pdz_boss') || pdzRpTag(e,'dz_boss_axel') || pdzRpTag(e,'dz_adopted_boss') ||
    pdzRpTag(e,'dz_story_boss_gasstation') || pdzRpTag(e,'dz_story_boss_policestation') ||
    pdzRpTag(e,'dz_story_boss_radio_tower') || pdzRpTag(e,'dz_stronghold_core'))
}
function pdzRpRead(boss) {
  try { return JSON.parse(String(boss.persistentData.getString(PDZ_RP_KEY)) || '{}') } catch (ignored) { return {} }
}
function pdzRpRecord(boss, player, kind) {
  if (!pdzRpBoss(boss) || !pdzRpPlayer(player) || String(boss.level.dimension)!==String(player.level.dimension)) return false
  let id=pdzRpId(boss), data=pdzRpRead(boss), key=pdzRpId(player), now=Date.now()
  if (!id || !key) return false
  Object.keys(data).forEach(k=>{ if (now-data[k].at>PDZ_RP_TTL || now<data[k].at) delete data[k] })
  let old=data[key] || {}
  data[key]={at:now, combat:kind==='damage' || kind==='received' ? now : Number(old.combat || 0), kind:kind}
  boss.persistentData.putString(PDZ_RP_KEY,JSON.stringify(data))
  pdzRpEncounters[id]=boss
  return true
}
function pdzRpEncounter(entity) {
  if (pdzRpBoss(entity)) return entity
  // Defenders/minions require an explicit owner UUID, never nearest-boss attribution.
  let owner=entity && entity.persistentData ? String(entity.persistentData.getString('pdz_reward_encounter_uuid')) : ''
  if (!owner) return null
  let found=null
  entity.level.entities.forEach(e=>{
    if (pdzRpId(e)!==owner || !e.alive || e.removed || !pdzRpBoss(e)) return
    if (pdzRpTag(e,'dz_stronghold_core') && !pdzRpTag(e,'dz_stronghold_active')) return
    found=e
  })
  return found
}
function pdzRpFlush() {
  let pending=pdzRpPending; pdzRpPending=[]
  pending.forEach(entry=>{
    try {
      // LivingDamageEvent is final damage, but later listeners may still cancel it.
      // Inspect the retained native event after dispatch (or at death, after dispatch).
      if (entry.event.isCanceled() || !(Number(entry.event.getAmount())>0)) return
      let victim=entry.event.getEntity(), source=entry.event.getSource()
      let actor=source.actual
      // KubeJS exposes DamageSource.actual; some native wrappers also expose
      // getEntity, while unattributed environmental sources expose neither.
      if (!actor && typeof source.getEntity==='function') actor=source.getEntity()
      let boss=pdzRpEncounter(victim)
      if (boss && pdzRpPlayer(actor)) pdzRpRecord(boss,actor,'damage')
      let attackingBoss=pdzRpEncounter(actor)
      if (attackingBoss && pdzRpPlayer(victim)) pdzRpRecord(attackingBoss,victim,'received')
    } catch (error) { console.error('[PDZ participation] damage evidence rejected: '+error) }
  })
}
global.pdzRewardObserveDamage = event => { pdzRpPending.push({event:event}) }
global.pdzRewardRecordAction = (boss,player,kind) => pdzRpRecord(boss,player,kind || 'objective')
global.pdzRewardParticipants = (boss,radius) => {
  pdzRpFlush()
  if (!pdzRpBoss(boss)) return []
  let data=pdzRpRead(boss), now=Date.now(), out=[]
  boss.server.players.forEach(p=>{
    let receipt=data[pdzRpId(p)]
    if (!receipt || now<receipt.at || now-receipt.at>PDZ_RP_TTL || !pdzRpPlayer(p)) return
    if (String(p.level.dimension)!==String(boss.level.dimension)) return
    let dx=p.x-boss.x, dy=p.y-boss.y, dz=p.z-boss.z
    if (dx*dx+dy*dy+dz*dz<=radius*radius) out.push(p)
  })
  return out
}
global.pdzRewardRecordSupport = (healer,target) => {
  pdzRpFlush()
  if (!pdzRpPlayer(healer) || !target || pdzRpId(healer)===pdzRpId(target)) return 0
  let now=Date.now(), credited=0
  Object.keys(pdzRpEncounters).forEach(id=>{
    let boss=pdzRpEncounters[id]
    if (!boss || !boss.alive || pdzRpExcluded(boss)) { delete pdzRpEncounters[id]; return }
    let data=pdzRpRead(boss), receipt=data[pdzRpId(target)]
    // A support-only player cannot propagate credit to another support player.
    if (!receipt || !receipt.combat || now<receipt.combat || now-receipt.combat>PDZ_RP_TTL) return
    if (String(target.level.dimension)!==String(boss.level.dimension)) return
    let dx=healer.x-target.x,dy=healer.y-target.y,dz=healer.z-target.z
    if (dx*dx+dy*dy+dz*dz>16*16) return
    if (pdzRpRecord(boss,healer,'support')) credited++
  })
  return credited
}
ServerEvents.tick(()=>{
  pdzRpFlush()
  if (++pdzRpPruneTicks % 200 !== 0) return
  let now=Date.now()
  Object.keys(pdzRpEncounters).forEach(id=>{
    let boss=pdzRpEncounters[id]
    if (!boss || !boss.alive || boss.removed || pdzRpExcluded(boss)) { delete pdzRpEncounters[id]; return }
    let data=pdzRpRead(boss), recent=false
    Object.keys(data).forEach(key=>{
      if (now>=data[key].at && now-data[key].at<=PDZ_RP_TTL) recent=true
    })
    if (!recent) delete pdzRpEncounters[id]
  })
})
