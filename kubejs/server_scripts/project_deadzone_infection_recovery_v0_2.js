// PROJECT DEADZONE unified infection recovery v0.2
// Infection remains owned by each source mod. Treatment rules are owned here.

const PDZ_INFECTION_EFFECTS = [
  'hordes:infected',
  'apocalypsenow:infection',
  'apocalypsenow:posinfectioneffect',
  'infectious:infection'
]
const PDZ_INFECTION_REGISTRY = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').MOB_EFFECT
const PDZ_INFECTION_IMMUNITY_KEY = 'dz_infection_immunity_until_ms'

function dzInfectionEffectId(instance) {
  try { return String(PDZ_INFECTION_REGISTRY.getKey(instance.effect)) }
  catch (ignored) { return String(instance.effect) }
}

function dzInfectionSnapshot(player) {
  let found = []
  player.potionEffects.active.forEach(instance => {
    let id = dzInfectionEffectId(instance)
    if (PDZ_INFECTION_EFFECTS.indexOf(id) < 0) return
    found.push({
      id: id,
      amplifier: Math.max(0, Number(instance.amplifier || 0)),
      duration: Math.max(200, Number(instance.duration || 6000))
    })
  })
  let severity = 0
  found.forEach(entry => {
    severity = Math.max(severity, entry.amplifier + 1)
    // Apocalypse Now's post-infection effect is its dangerous late state.
    if (entry.id === 'apocalypsenow:posinfectioneffect') severity = Math.max(severity, 3)
  })
  if (found.length > 1) severity = Math.max(severity, 2)
  // A partial treatment holds the reduced stage for two minutes. After that,
  // the source mods may progress it again if the player has not finished care.
  let heldStage = Number(player.persistentData.getInt('dz_infection_care_stage'))
  let heldUntil = Number(player.persistentData.getLong('dz_infection_care_until'))
  if (severity <= 0) {
    player.persistentData.putInt('dz_infection_care_stage', 0)
    player.persistentData.putLong('dz_infection_care_until', 0)
  } else if (heldStage > 0 && heldUntil > Date.now()) {
    severity = Math.min(severity, heldStage)
  }
  return {effects: found, severity: Math.min(3, severity)}
}

function dzInfectionHas(player) {
  return dzInfectionSnapshot(player).severity > 0
}

function dzInfectionName(stage) {
  return stage >= 3 ? '重症' : stage === 2 ? '中等症' : stage === 1 ? '軽症' : '陰性'
}

function dzInfectionClear(player, immunityTicks) {
  let snapshot = dzInfectionSnapshot(player)
  if (snapshot.severity <= 0) return false
  snapshot.effects.forEach(entry => player.removeEffect(entry.id))
  player.persistentData.putInt('dz_infection_care_stage', 0)
  player.persistentData.putLong('dz_infection_care_until', 0)
  if (immunityTicks > 0) player.potionEffects.add('hordes:immunity', immunityTicks, 0, false, true)
  if (immunityTicks > 0)
    player.persistentData.putLong(PDZ_INFECTION_IMMUNITY_KEY, Date.now() + immunityTicks * 50)
  if (typeof dzHealthRecordInfectionTreatment === 'function') dzHealthRecordInfectionTreatment(player)
  return true
}

function dzInfectionReduceOneStage(player, snapshot) {
  snapshot.effects.forEach(entry => {
    player.removeEffect(entry.id)
    if (entry.id === 'apocalypsenow:posinfectioneffect') {
      // Return late Apocalypse Now infection to its ordinary infection state.
      player.potionEffects.add('apocalypsenow:infection', Math.max(1200, entry.duration), 0, false, true)
    } else {
      player.potionEffects.add(entry.id, Math.max(1200, entry.duration), Math.max(0, entry.amplifier - 1), false, true)
    }
  })
  player.persistentData.putInt('dz_infection_care_stage', Math.max(1, snapshot.severity - 1))
  player.persistentData.putLong('dz_infection_care_until', Date.now() + 120000)
}

// power: 1 early treatment, 2 advanced treatment, 3 complete treatment.
function dzInfectionTreat(player, power, immunityTicks, label) {
  let snapshot = dzInfectionSnapshot(player)
  if (snapshot.severity <= 0) return {treated:false, cured:false, before:0, after:0}
  if (power >= snapshot.severity) {
    dzInfectionClear(player, immunityTicks)
    player.tell(Text.of(label + 'で感染症を完全治療しました。').green())
    return {treated:true, cured:true, before:snapshot.severity, after:0}
  }
  dzInfectionReduceOneStage(player, snapshot)
  let after = Math.max(1, snapshot.severity - 1)
  player.tell(Text.of(label + 'で感染を一段階抑えました（' + dzInfectionName(snapshot.severity) + ' → ' + dzInfectionName(after) + '）。').yellow())
  return {treated:true, cured:false, before:snapshot.severity, after:after}
}

function dzInfectionConsumeMedicine(event, power, immunityTicks, label) {
  let player = event.player
  if (!player || player.level.clientSide || !dzInfectionHas(player)) return
  event.cancel()
  let result = dzInfectionTreat(player, power, immunityTicks, label)
  if (!result.treated) return
  if (!player.creative) event.item.count--
  player.runCommandSilent('playsound minecraft:block.brewing_stand.brew player @s ~ ~ ~ 0.7 1.15')
}

ItemEvents.rightClicked('apocalypsenow:homemadeantibiotics', event =>
  dzInfectionConsumeMedicine(event, 1, 0, '自家製抗生物質'))
ItemEvents.rightClicked('infectious:antibiotics', event =>
  dzInfectionConsumeMedicine(event, 2, 0, '広域抗生物質'))
ItemEvents.rightClicked('apocalypsenow:antibiotics', event =>
  dzInfectionConsumeMedicine(event, 3, 6000, '正規抗生物質'))

// Golden apples retain their normal food effects. Infection treatment happens
// after eating, and applies to every supported infection rather than Hordes only.
ItemEvents.foodEaten(event => {
  let id = String(event.item.id)
  if (id === 'minecraft:golden_apple') dzInfectionTreat(event.player, 1, 0, '金のリンゴ')
  if (id === 'minecraft:enchanted_golden_apple') dzInfectionTreat(event.player, 3, 12000, 'エンチャントされた金のリンゴ')
})

// Keep complete-treatment immunity consistent across all supported infection
// mods, not only Hordes' own immunity effect.
PlayerEvents.tick(event => {
  let player = event.player
  if (!player || player.level.clientSide || player.age % 10 !== 0) return
  let until = Number(player.persistentData.getLong(PDZ_INFECTION_IMMUNITY_KEY))
  if (until <= Date.now()) return
  let snapshot = dzInfectionSnapshot(player)
  snapshot.effects.forEach(entry => player.removeEffect(entry.id))
})

console.info('[PROJECT DEADZONE][Infection] v0.3 loaded: registry-safe detection and cross-mod treatment immunity.')
