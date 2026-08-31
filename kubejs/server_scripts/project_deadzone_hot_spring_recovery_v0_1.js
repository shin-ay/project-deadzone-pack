// PROJECT DEADZONE - Hot Bath rehabilitation bridge v0.1
// Plain Hot Bath water treats one LSO injury or one harmful effect every 30 sec.

const PDZ_SPRING_BODY_UTIL = Java.loadClass('sfiomn.legendarysurvivaloverhaul.api.bodydamage.BodyDamageUtil')
const PDZ_SPRING_BODY_PART = Java.loadClass('sfiomn.legendarysurvivaloverhaul.api.bodydamage.BodyPartEnum')
const PDZ_SPRING_EFFECTS = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const PDZ_SPRING_EFFECT_CATEGORY = Java.loadClass('net.minecraft.world.effect.MobEffectCategory')
const PDZ_SPRING_BLOCK_POS = Java.loadClass('net.minecraft.core.BlockPos')
const PDZ_SPRING_FORGE_REGISTRIES = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')

const PDZ_SPRING_BLOCK = 'hotbath:hot_water_block'
const PDZ_SPRING_FLUID = 'hotbath:hot_water_fluid'
const PDZ_SPRING_INTERVAL = 20 * 30
const PDZ_SPRING_HEAL_RATIO = 0.15
const PDZ_SPRING_HEAL_TIME = 20 * 10
const PDZ_SPRING_PARTS = [
  {part: PDZ_SPRING_BODY_PART.HEAD, name: '頭部'},
  {part: PDZ_SPRING_BODY_PART.CHEST, name: '胴体'},
  {part: PDZ_SPRING_BODY_PART.LEFT_ARM, name: '左腕'},
  {part: PDZ_SPRING_BODY_PART.RIGHT_ARM, name: '右腕'},
  {part: PDZ_SPRING_BODY_PART.LEFT_LEG, name: '左脚'},
  {part: PDZ_SPRING_BODY_PART.RIGHT_LEG, name: '右脚'},
  {part: PDZ_SPRING_BODY_PART.LEFT_FOOT, name: '左足'},
  {part: PDZ_SPRING_BODY_PART.RIGHT_FOOT, name: '右足'}
]
const PDZ_SPRING_INFECTIONS = {
  'hordes:infected': true,
  'apocalypsenow:infection': true,
  'apocalypsenow:posinfectioneffect': true,
  'infectious:infection': true
}

let pdzSpringState = {}
let pdzSpringApiErrorLogged = false

function pdzSpringKey(player) { return String(player.uuid) }
function pdzSpringNow(player) { return Number(player.level.gameTime) }

function pdzSpringIsBathing(player) {
  let x = Math.floor(Number(player.x))
  let y = Math.floor(Number(player.y))
  let z = Math.floor(Number(player.z))
  if (String(player.level.getBlock(x, y, z).id) === PDZ_SPRING_BLOCK) return true
  try {
    let state = player.level.getFluidState(new PDZ_SPRING_BLOCK_POS(x, y, z))
    let id = String(PDZ_SPRING_FORGE_REGISTRIES.FLUIDS.getKey(state.getType()))
    return id === PDZ_SPRING_FLUID
  } catch (ignored) { return false }
}

function pdzSpringReset(player, notify) {
  let key = pdzSpringKey(player)
  let state = pdzSpringState[key]
  if (notify && state && state.active) player.tell(Text.of('温泉療養が中断されました。再び30秒安静にしてください。').gray())
  delete pdzSpringState[key]
}

function pdzSpringWorstInjury(player) {
  try {
    let injured = []
    PDZ_SPRING_PARTS.forEach(entry => {
      let ratio = Math.max(0, Math.min(1, Number(PDZ_SPRING_BODY_UTIL.getHealthRatio(player, entry.part))))
      let max = Math.max(0, Number(PDZ_SPRING_BODY_UTIL.getMaxHealth(player, entry.part)))
      if (max > 0 && ratio < 0.995) injured.push({part: entry.part, name: entry.name, ratio: ratio, max: max})
    })
    injured.sort((a, b) => a.ratio - b.ratio)
    return injured.length > 0 ? injured[0] : null
  } catch (error) {
    if (!pdzSpringApiErrorLogged) {
      pdzSpringApiErrorLogged = true
      console.error('[PROJECT DEADZONE][Hot Spring] LSO body damage API failed: ' + error)
    }
    return null
  }
}

function pdzSpringHealOne(player) {
  let injury = pdzSpringWorstInjury(player)
  if (!injury) return false
  let missing = injury.max * (1 - injury.ratio)
  let amount = Math.min(missing, injury.max * PDZ_SPRING_HEAL_RATIO)
  if (amount <= 0.001) return false
  PDZ_SPRING_BODY_UTIL.applyHealingTimeBodyPart(player, injury.part, amount, PDZ_SPRING_HEAL_TIME)
  player.tell(Text.of('♨ 温泉療養：' + injury.name + 'の回復が進んでいます（最大15%）。').green())
  return true
}

function pdzSpringHarmfulEffects(player) {
  let result = []
  try {
    player.getActiveEffects().forEach(instance => {
      let effect = instance.getEffect()
      let id = String(PDZ_SPRING_EFFECTS.MOB_EFFECT.getKey(effect))
      if (id !== 'null' && !PDZ_SPRING_INFECTIONS[id] && effect.getCategory() === PDZ_SPRING_EFFECT_CATEGORY.HARMFUL) result.push(id)
    })
  } catch (error) { console.error('[PROJECT DEADZONE][Hot Spring] Effect scan failed: ' + error) }
  return result
}

function pdzSpringCleanseOne(player) {
  let effects = pdzSpringHarmfulEffects(player)
  if (effects.length <= 0) return false
  let id = effects[Math.floor(Math.random() * effects.length)]
  player.removeEffect(id)
  player.tell(Text.of('♨ 温泉療養：不調がひとつ和らぎました（' + id + '）。').aqua())
  return true
}

function pdzSpringTreat(player) {
  if (pdzSpringHealOne(player)) return
  if (pdzSpringCleanseOne(player)) return
  player.tell(Text.of('♨ 温泉療養：治療が必要な負傷や不調はありません。').gray())
}

ServerEvents.tick(event => {
  if (Number(event.server.tickCount) % 20 !== 0) return
  event.server.players.forEach(player => {
    let key = pdzSpringKey(player)
    if (!pdzSpringIsBathing(player)) {
      pdzSpringReset(player, false)
      return
    }
    let now = pdzSpringNow(player)
    let state = pdzSpringState[key]
    if (!state) {
      pdzSpringState[key] = {active: true, next: now + PDZ_SPRING_INTERVAL}
      player.tell(Text.of('♨ 温泉療養を開始しました。30秒間、安静にしてください。').gold())
      return
    }
    if (now < state.next) return
    pdzSpringTreat(player)
    state.next = now + PDZ_SPRING_INTERVAL
  })
})

EntityEvents.hurt(event => {
  let player = event.entity
  if (!player || player.level.clientSide || !player.isPlayer || !player.isPlayer()) return
  if (pdzSpringState[pdzSpringKey(player)]) pdzSpringReset(player, true)
})

PlayerEvents.loggedOut(event => pdzSpringReset(event.player, false))

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  event.register(Commands.literal('deadzonehotspring')
    .then(Commands.literal('status').executes(ctx => {
      let player = ctx.source.player
      let state = pdzSpringState[pdzSpringKey(player)]
      if (!pdzSpringIsBathing(player)) {
        player.tell(Text.of('温泉療養：入浴していません。').gray())
        return 1
      }
      let seconds = state ? Math.max(0, Math.ceil((state.next - pdzSpringNow(player)) / 20)) : 30
      player.tell(Text.of('温泉療養：次の処置まで ' + seconds + '秒').gold())
      return 1
    }))
    .then(Commands.literal('treat_now').requires(source => source.hasPermission(2)).executes(ctx => {
      pdzSpringTreat(ctx.source.player)
      return 1
    })))
})

console.info('[PROJECT DEADZONE][Hot Spring] v0.1 loaded: Hot Bath -> paced LSO rehabilitation.')
