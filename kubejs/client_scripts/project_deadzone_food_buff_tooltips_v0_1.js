// PROJECT DEADZONE prepared-food buff tooltips v0.1

function dzFoodTipKind(stack) {
  let id = String(stack.id).toLowerCase()
  if (!id) return ""
  let parts = id.split(":")
  let namespace = parts[0]
  let name = parts[1] || ""
  let supported = namespace === "pamhc2foodextended" || [
    "farmersdelight", "aquaculturedelight", "alexsdelight", "moredelight",
    "cogs_delight", "cogsdelight", "pamhc2foodcore", "minecolonies"
  ].indexOf(namespace) >= 0
  if (!supported) return ""
  let dish = [
    "soup", "stew", "chowder", "sandwich", "burger", "pasta", "noodle", "rice",
    "salad", "roll", "wrap", "toast", "pie", "cake", "cookie", "pudding", "roast",
    "skewer", "dumpling", "omelet", "breakfast", "meal", "plate", "fish_and_chips",
    "ham", "chops", "bacon", "sausage", "mash", "curry", "sushi", "stuffed",
    "glazed", "platter", "feast", "chicken", "cutlet"
  ].some(token => name.indexOf(token) >= 0)
  if (!dish) return ""
  if (["soup", "stew", "chowder", "curry", "ramen", "broth"].some(token => name.indexOf(token) >= 0)) return "recovery"
  if (["sandwich", "burger", "pasta", "noodle", "rice", "wrap", "pie", "roast", "ham", "chops", "fish_and_chips", "mash", "platter", "feast"].some(token => name.indexOf(token) >= 0)) return "work"
  return "expedition"
}

ItemEvents.tooltip(event => {
  event.addAdvanced(Ingredient.all, (stack, advanced, text) => {
    let kind = dzFoodTipKind(stack)
    if (kind === "recovery") {
      text.add(Text.green("【料理効果：回復】"))
      text.add(Text.gray("食べると 再生 I（15秒）／快適 I（3分）"))
    } else if (kind === "work") {
      text.add(Text.gold("【料理効果：作業】"))
      text.add(Text.gray("食べると 採掘速度上昇 I（3分）／満腹度回復"))
    } else if (kind === "expedition") {
      text.add(Text.aqua("【料理効果：遠征】"))
      text.add(Text.gray("食べると 移動速度上昇 I（3分）／耐性 I（45秒）"))
    }
  })
})

