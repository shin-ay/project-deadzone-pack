// PROJECT DEADZONE automatic prepared-food buffs v0.1
// Prepared dishes advertise and grant their benefit directly; commands are not required.

function dzFoodBuffId(stack) {
  try { return String(stack.id).toLowerCase() } catch (ignored) { return "" }
}

function dzFoodBuffKind(stack) {
  if (!global.pdzIsPreparedMeal || !global.pdzIsPreparedMeal(stack)) return ""
  let id = dzFoodBuffId(stack)
  if (["soup", "stew", "chowder", "curry", "ramen", "broth"].some(token => id.indexOf(token) >= 0)) return "recovery"
  if (["sandwich", "burger", "pasta", "noodle", "rice", "wrap", "pie", "roast", "ham", "chops", "fish_and_chips", "mash", "platter", "feast"].some(token => id.indexOf(token) >= 0)) return "work"
  return "expedition"
}

ItemEvents.foodEaten(event => {
  let player = event.player
  if (!player) return
  let kind = dzFoodBuffKind(event.item)
  if (!kind) return

  if (kind === "recovery") {
    player.potionEffects.add("minecraft:regeneration", 300, 0, false, false)
    player.potionEffects.add("farmersdelight:comfort", 3600, 0, false, false)
    player.tell(Text.of("回復料理：再生 I（15秒）／快適 I（3分）").green())
  } else if (kind === "work") {
    player.potionEffects.add("minecraft:haste", 3600, 0, false, false)
    player.potionEffects.add("minecraft:saturation", 1, 0, false, false)
    player.tell(Text.of("作業料理：採掘速度上昇 I（3分）／満腹度回復").gold())
  } else {
    player.potionEffects.add("minecraft:speed", 3600, 0, false, false)
    player.potionEffects.add("minecraft:resistance", 900, 0, false, false)
    player.tell(Text.of("遠征料理：移動速度上昇 I（3分）／耐性 I（45秒）").aqua())
  }
})

console.info("[PROJECT DEADZONE][Food Buffs] v0.1 loaded.")

