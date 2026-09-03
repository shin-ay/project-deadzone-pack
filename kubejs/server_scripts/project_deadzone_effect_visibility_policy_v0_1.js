// PROJECT DEADZONE effect visibility policy v0.1
// Keeps explicit food buffs visible while making short internal combat/job
// effects and redundant Hot Bath integration effects HUD-silent.

const PDZ_EFFECT_REGISTRIES = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')
const PDZ_EFFECT_LOCATION = Java.loadClass('net.minecraft.resources.ResourceLocation')
const PDZ_EFFECT_INSTANCE = Java.loadClass('net.minecraft.world.effect.MobEffectInstance')

global.pdzAddHiddenEffect = function(player, id, duration, amplifier) {
  try {
    let effect = PDZ_EFFECT_REGISTRIES.MOB_EFFECTS.getValue(new PDZ_EFFECT_LOCATION(String(id)))
    if (!effect) return false
    return player.addEffect(new PDZ_EFFECT_INSTANCE(effect,
      Math.max(1, Math.floor(Number(duration))), Math.max(0, Math.floor(Number(amplifier))),
      false, false, false))
  } catch (error) {
    return false
  }
}

const PDZ_BATH_VISIBLE_PRIORITY = {
  'farmersdelight:comfort': 100,
  'farmersdelight:nourishment': 90
}
const PDZ_BATH_REDUNDANT = {
  'minecraft:regeneration': true,
  'minecraft:resistance': true,
  'legendarysurvivaloverhaul:cold_resistance': true,
  'legendarysurvivaloverhaul:cold_immunity': true,
  'legendarysurvivaloverhaul:temperature_immunity': true
}

function pdzEffectBathing(player) {
  try { return String(player.level.getBlock(Math.floor(player.x), Math.floor(player.y), Math.floor(player.z)).id).indexOf('hotbath:') === 0 }
  catch (ignored) { return false }
}

// Hot Bath refreshes its integration effects every two seconds. Re-create only
// those known redundant effects as hidden instances, preserving duration and
// strength. Comfort/Nourishment remains the single visible bath indicator.
PlayerEvents.tick(event => {
  let player = event.player
  if (player.level.clientSide || player.age % 20 !== 0 || !pdzEffectBathing(player)) return
  let visible = []
  try {
    player.getActiveEffects().forEach(instance => {
      let id = String(PDZ_EFFECT_REGISTRIES.MOB_EFFECTS.getKey(instance.getEffect()))
      if (PDZ_BATH_VISIBLE_PRIORITY[id]) visible.push(id)
      if (!PDZ_BATH_REDUNDANT[id] || !instance.showIcon()) return
      let duration = Number(instance.getDuration()), amplifier = Number(instance.getAmplifier())
      player.removeEffect(id)
      global.pdzAddHiddenEffect(player, id, duration, amplifier)
    })
  } catch (ignored) {}
})

console.info('[PROJECT DEADZONE][Effects] HUD visibility policy v0.1 loaded.')
