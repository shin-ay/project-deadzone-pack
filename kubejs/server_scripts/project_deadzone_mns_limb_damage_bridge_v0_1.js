// PROJECT DEADZONE - M&S authoritative HP -> LSO localized injury bridge v0.1
// Mine and Slash owns current/max HP, healing and death. Legendary Survival
// Overhaul only owns localized trauma ratios/effects. LSO listens to the same
// LivingDamageEvent in vanilla-health units, so its native limb loss can drift
// away from M&S when M&S uses scaled health. This bridge measures the actual
// post-mitigation M&S loss and normalizes LSO trauma to that exact ratio.

const PDZ_LIMB_MNS_HEALTH = Java.loadClass('com.robertx22.mine_and_slash.uncommon.utilityclasses.HealthUtils')
const PDZ_LIMB_BODY_UTIL = Java.loadClass('sfiomn.legendarysurvivaloverhaul.api.bodydamage.BodyDamageUtil')
const PDZ_LIMB_PART = Java.loadClass('sfiomn.legendarysurvivaloverhaul.api.bodydamage.BodyPartEnum')

const PDZ_LIMB_ALL = [
  PDZ_LIMB_PART.HEAD, PDZ_LIMB_PART.CHEST,
  PDZ_LIMB_PART.LEFT_ARM, PDZ_LIMB_PART.RIGHT_ARM,
  PDZ_LIMB_PART.LEFT_LEG, PDZ_LIMB_PART.RIGHT_LEG,
  PDZ_LIMB_PART.LEFT_FOOT, PDZ_LIMB_PART.RIGHT_FOOT
]
const PDZ_LIMB_NAMES = ['頭部','胴体','左腕','右腕','左脚','右脚','左足','右足']
let PDZ_LIMB_LAST_HEALTH = {}
let PDZ_LIMB_PENDING = {}
let PDZ_LIMB_API_ERROR = false

function pdzLimbMnsHealth(player) {
  // HealthUtils#getCurrentHealth returns an int. Preserve the real fractional
  // delta by projecting vanilla's current ratio onto the M&S max-health pool.
  try {
    let vanillaMax = Math.max(0.0001, Number(player.maxHealth))
    return Math.max(0, Number(player.health) / vanillaMax * pdzLimbMnsMax(player))
  }
  catch (ignored) { return Number(player.health) }
}

function pdzLimbMnsMax(player) {
  try { return Math.max(1, Number(PDZ_LIMB_MNS_HEALTH.getMaxHealth(player))) }
  catch (ignored) { return Math.max(1, Number(player.maxHealth)) }
}

function pdzLimbRatios(player) {
  try {
    return PDZ_LIMB_ALL.map(part => Math.max(0, Math.min(1,
      Number(PDZ_LIMB_BODY_UTIL.getHealthRatio(player, part)))))
  } catch (error) {
    if (!PDZ_LIMB_API_ERROR) {
      PDZ_LIMB_API_ERROR = true
      console.error('[PROJECT DEADZONE][M&S Limb Bridge] LSO API failed: ' + error)
    }
    return null
  }
}

function pdzLimbMaxima(player) {
  return PDZ_LIMB_ALL.map(part => Math.max(0, Number(PDZ_LIMB_BODY_UTIL.getMaxHealth(player, part))))
}

function pdzLimbKind(event) {
  let source = event.source
  let id = ''
  try { id = String(source.type || source.getMsgId() || '').toLowerCase() } catch (ignored) {}
  if (id.indexOf('fall') >= 0 || id.indexOf('fly_into_wall') >= 0) return 'fall'
  if (id.indexOf('explosion') >= 0) return 'explosion'
  if (id.indexOf('drown') >= 0 || id.indexOf('starve') >= 0 || id.indexOf('freeze') >= 0) return 'systemic'
  if (id.indexOf('fire') >= 0 || id.indexOf('lava') >= 0 || id.indexOf('hot_floor') >= 0) return 'burn'
  if (id.indexOf('arrow') >= 0 || id.indexOf('projectile') >= 0 || id.indexOf('bullet') >= 0 || id.indexOf('tacz') >= 0) return 'projectile'
  let immediate = source ? source.immediate : null
  if (immediate && immediate !== source.actual) return 'projectile'
  return 'melee'
}

function pdzLimbNativeLoss(before, after) {
  if (!before || !after || before.length !== after.length) return 0
  let loss = 0
  for (let i = 0; i < before.length; i++) loss += Math.max(0, Number(before[i]) - Number(after[i]))
  return loss
}

function pdzLimbNativePart(before, after) {
  let best = -1
  let bestLoss = 0
  for (let i = 0; i < before.length; i++) {
    let loss = Math.max(0, Number(before[i]) - Number(after[i]))
    if (loss > bestLoss) { best = i; bestLoss = loss }
  }
  return best >= 0 ? PDZ_LIMB_ALL[best] : null
}

function pdzLimbNormalizeNative(player, before, after, desiredLoss) {
  let actual = pdzLimbNativeLoss(before, after)
  let difference = desiredLoss - actual
  if (Math.abs(difference) <= 0.001) return actual

  let maxima = pdzLimbMaxima(player)
  let changed = []
  for (let i = 0; i < before.length; i++) {
    let loss = Math.max(0, Number(before[i]) - Number(after[i]))
    if (loss > 0.0001 && maxima[i] > 0) changed.push({index: i, loss: loss})
  }

  if (difference < 0 && changed.length > 0) {
    // LSO over-recorded the hit. Heal only the excess it added for this hit;
    // older injuries and the real M&S HP pool are never touched here.
    let excess = -difference
    let changedTotal = changed.reduce((sum, entry) => sum + entry.loss, 0)
    changed.forEach(entry => {
      let ratio = Math.min(entry.loss, excess * entry.loss / Math.max(0.0001, changedTotal))
      PDZ_LIMB_BODY_UTIL.healBodyPart(player, PDZ_LIMB_ALL[entry.index], maxima[entry.index] * ratio)
    })
    return desiredLoss
  }
  return actual
}

function pdzLimbPick(player, kind) {
  let seed = Math.abs((Number(player.level.gameTime) + String(player.uuid).length * 31) % 100)
  let left = seed % 2 === 0
  if (kind === 'fall') return seed < 35 ? (left ? PDZ_LIMB_PART.LEFT_FOOT : PDZ_LIMB_PART.RIGHT_FOOT) :
    (left ? PDZ_LIMB_PART.LEFT_LEG : PDZ_LIMB_PART.RIGHT_LEG)
  if (kind === 'projectile') {
    if (seed < 15) return PDZ_LIMB_PART.HEAD
    if (seed < 60) return PDZ_LIMB_PART.CHEST
    if (seed < 80) return left ? PDZ_LIMB_PART.LEFT_ARM : PDZ_LIMB_PART.RIGHT_ARM
    return left ? PDZ_LIMB_PART.LEFT_LEG : PDZ_LIMB_PART.RIGHT_LEG
  }
  if (seed < 12) return PDZ_LIMB_PART.HEAD
  if (seed < 58) return PDZ_LIMB_PART.CHEST
  if (seed < 82) return left ? PDZ_LIMB_PART.LEFT_ARM : PDZ_LIMB_PART.RIGHT_ARM
  return left ? PDZ_LIMB_PART.LEFT_LEG : PDZ_LIMB_PART.RIGHT_LEG
}

function pdzLimbHurtRatio(player, part, ratio) {
  let max = Number(PDZ_LIMB_BODY_UTIL.getMaxHealth(player, part))
  if (!isFinite(max) || max <= 0) return 0
  let amount = Math.max(0, Math.min(max * 0.40, max * ratio))
  if (amount <= 0) return 0
  PDZ_LIMB_BODY_UTIL.hurtBodyPart(player, part, amount)
  return amount
}

function pdzLimbApplyMissing(player, kind, missingRatio, nativePart) {
  if (kind === 'systemic' || missingRatio <= 0) return 0
  let ratio = Math.max(0, Math.min(0.40, missingRatio))
  if (kind === 'explosion' || kind === 'burn') {
    let amount = 0
    let parts = kind === 'explosion' ? PDZ_LIMB_ALL :
      [PDZ_LIMB_PART.CHEST, PDZ_LIMB_PART.LEFT_ARM, PDZ_LIMB_PART.RIGHT_ARM]
    let each = ratio / parts.length
    parts.forEach(part => { amount += pdzLimbHurtRatio(player, part, each) })
    return amount
  }
  return pdzLimbHurtRatio(player, nativePart || pdzLimbPick(player, kind), ratio)
}

function pdzLimbResolve(player, key) {
  let pending = PDZ_LIMB_PENDING[key]
  delete PDZ_LIMB_PENDING[key]
  if (!pending || !player || !player.alive) return
  let after = pdzLimbMnsHealth(player)
  let max = pdzLimbMnsMax(player)
  let loss = Math.max(0, Number(pending.before) - after)
  PDZ_LIMB_LAST_HEALTH[key] = after
  if (!isFinite(loss) || loss <= 0 || max <= 0) return

  let ratiosAfter = pdzLimbRatios(player)
  if (!ratiosAfter) return
  // Systemic damage still belongs to M&S but should not invent a broken limb.
  let desired = pending.kind === 'systemic' ? 0 : Math.max(0, Math.min(0.40, loss / max))
  let native = 0
  let applied = 0
  try {
    native = pdzLimbNormalizeNative(player, pending.ratios, ratiosAfter, desired)
    let missing = Math.max(0, desired - native)
    applied = pdzLimbApplyMissing(player, pending.kind, missing,
      pdzLimbNativePart(pending.ratios, ratiosAfter))
  }
  catch (error) {
    if (!PDZ_LIMB_API_ERROR) {
      PDZ_LIMB_API_ERROR = true
      console.error('[PROJECT DEADZONE][M&S Limb Bridge] Injury apply failed: ' + error)
    }
  }
  if (player.persistentData.getBoolean('dz_limb_bridge_monitor')) {
    player.tell(Text.of('[負傷監査] M&S -' + loss.toFixed(1) + ' / ' + pending.kind +
      ' / HP比 ' + (loss / max * 100).toFixed(2) + '% / 部位比 ' +
      (desired * 100).toFixed(2) + '%').yellow())
  }
}

EntityEvents.hurt(event => {
  let player = event.entity
  if (!player || player.level.clientSide || !player.isPlayer || !player.isPlayer()) return
  let key = String(player.uuid)
  let current = pdzLimbMnsHealth(player)
  let known = PDZ_LIMB_LAST_HEALTH[key]
  let before = isFinite(Number(known)) ? Math.max(current, Number(known)) : current
  if (PDZ_LIMB_PENDING[key]) {
    PDZ_LIMB_PENDING[key].before = Math.max(PDZ_LIMB_PENDING[key].before, before)
    // Prefer physical impact classification over an incidental burn tick.
    if (PDZ_LIMB_PENDING[key].kind === 'systemic') PDZ_LIMB_PENDING[key].kind = pdzLimbKind(event)
    return
  }
  let ratios = pdzLimbRatios(player)
  if (!ratios) return
  PDZ_LIMB_PENDING[key] = {before: before, ratios: ratios, kind: pdzLimbKind(event)}
  player.server.scheduleInTicks(2, () => pdzLimbResolve(player, key))
})

ServerEvents.tick(event => {
  event.server.players.forEach(player => {
    let key = String(player.uuid)
    if (!PDZ_LIMB_PENDING[key]) PDZ_LIMB_LAST_HEALTH[key] = pdzLimbMnsHealth(player)
  })
})

PlayerEvents.loggedOut(event => {
  let key = String(event.player.uuid)
  delete PDZ_LIMB_LAST_HEALTH[key]
  delete PDZ_LIMB_PENDING[key]
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal('deadzoneinjury').requires(source => source.hasPermission(2))
  root.then(Commands.literal('monitor').executes(ctx => {
    let player = ctx.source.player
    let next = !player.persistentData.getBoolean('dz_limb_bridge_monitor')
    player.persistentData.putBoolean('dz_limb_bridge_monitor', next)
    player.tell(Text.of('M&S→LSO負傷監査: ' + (next ? 'ON' : 'OFF')).color(next ? 'green' : 'gray'))
    return 1
  }))
  root.then(Commands.literal('status').executes(ctx => {
    let player = ctx.source.player
    let ratios = pdzLimbRatios(player)
    player.tell(Text.of('M&S HP ' + pdzLimbMnsHealth(player) + '/' + pdzLimbMnsMax(player)).aqua())
    if (ratios) ratios.forEach((ratio, i) => player.tell(Text.of(PDZ_LIMB_NAMES[i] + ' ' +
      Math.round(ratio * 100) + '%').color(ratio < 0.4 ? 'red' : ratio < 0.7 ? 'yellow' : 'green')))
    return 1
  }))
  event.register(root)
})

console.info('[PROJECT DEADZONE][M&S Limb Bridge] v0.2 loaded: authoritative M&S HP ratio -> normalized LSO trauma.')
