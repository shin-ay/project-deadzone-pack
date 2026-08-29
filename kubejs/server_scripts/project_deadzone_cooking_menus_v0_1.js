// PROJECT DEADZONE cooking menus v0.1
// Diet handles long-term nutrition; this script rewards deliberate prepared-meal combinations.

const DZ_MENU_DIET_API = Java.loadClass("com.illusivesoulworks.diet.api.DietApi")
const DZ_MENU_DIET_CAPABILITY = Java.loadClass("com.illusivesoulworks.diet.common.capability.DietCapability")

const DZ_MENU_WINDOW_MS = 30 * 60 * 1000
const DZ_MENU_COOLDOWN_MS = 20 * 60 * 1000

const DZ_MENU_QUESTS = {
  intro: "6D4D010000000101",
  prepared: "6D4D010000000102",
  expedition: "6D4D010000000103",
  recovery: "6D4D010000000104",
  work: "6D4D010000000105",
  mastery: "6D4D010000000106",
  balanced: "6D4D010000000107",
  community: "6D4D010000000108",
  colony: "6D4D010000000109"
}

const DZ_MENU_PLANS = {
  expedition: {
    name: "遠征献立", groups: ["fruits", "grains", "proteins", "vegetables"], style: null,
    description: "3種類の料理で果物・穀物・タンパク質・野菜を揃える。Speed I 8分 / Resistance I 3分。"
  },
  recovery: {
    name: "回復献立", groups: ["fruits", "proteins", "vegetables"], style: "warm",
    description: "3種類の料理で果物・タンパク質・野菜を揃え、温かい料理を1皿含める。Regeneration I 45秒 / Absorption・Comfort I 8分。"
  },
  work: {
    name: "作業献立", groups: ["grains", "proteins", "vegetables"], style: "hearty",
    description: "3種類の料理で穀物・タンパク質・野菜を揃え、主食料理を1皿含める。Haste I 8分 / Saturation。"
  }
}

let dzMenuDietErrorLogged = false

function dzMenuFoodId(stack) {
  try { return String(stack.id).toLowerCase() } catch (ignored) { return "" }
}

global.pdzIsPreparedMeal = stack => {
  let id = dzMenuFoodId(stack)
  if (!id) return false
  let namespace = id.split(":")[0]
  if (namespace === "pamhc2foodextended") return true
  if (["farmersdelight", "aquaculturedelight", "alexsdelight", "moredelight", "cogs_delight", "cogsdelight", "pamhc2foodcore", "minecolonies"].indexOf(namespace) < 0) return false
  let name = id.split(":")[1] || ""
  return [
    "soup", "stew", "chowder", "sandwich", "burger", "pasta", "noodle", "rice",
    "salad", "roll", "wrap", "toast", "pie", "cake", "cookie", "pudding", "roast",
    "skewer", "dumpling", "omelet", "breakfast", "meal", "plate", "fish_and_chips",
    "ham", "chops", "bacon", "sausage", "mash", "curry", "sushi", "stuffed",
    "glazed", "platter", "feast", "chicken", "cutlet"
  ].some(token => name.indexOf(token) >= 0)
}

global.pdzIsFishMeal = stack => {
  let id = dzMenuFoodId(stack)
  return global.pdzIsPreparedMeal(stack) && ["fish", "cod", "salmon", "tuna", "seafood", "sushi", "chowder"].some(token => id.indexOf(token) >= 0)
}

function dzMenuIsWarm(id) {
  return ["soup", "stew", "chowder", "curry", "pasta", "noodle", "rice", "roast"].some(token => id.indexOf(token) >= 0)
}

function dzMenuIsHearty(id) {
  return ["sandwich", "burger", "pasta", "noodle", "rice", "wrap", "pie", "roast", "ham", "chops", "fish_and_chips", "mash"].some(token => id.indexOf(token) >= 0)
}

function dzMenuGroups(player, stack) {
  let names = []
  try {
    DZ_MENU_DIET_API.getInstance().getGroups(player, stack).forEach(group => {
      let name = String(group.getName()).toLowerCase()
      if (name.indexOf(":") >= 0) name = name.split(":").pop()
      if (names.indexOf(name) < 0) names.push(name)
    })
  } catch (error) {
    if (!dzMenuDietErrorLogged) {
      dzMenuDietErrorLogged = true
      console.error("[PROJECT DEADZONE][Cooking Menus] Diet group lookup failed: " + error)
    }
  }
  return names
}

function dzMenuTracker(player) {
  try { return DZ_MENU_DIET_CAPABILITY.get(player).resolve().orElse(null) } catch (ignored) { return null }
}

function dzMenuDietValues(player) {
  let tracker = dzMenuTracker(player)
  let result = {fruits: 0, grains: 0, proteins: 0, sugars: 0, vegetables: 0}
  if (tracker) tracker.getValues().entrySet().forEach(entry => {
    let name = String(entry.getKey()).toLowerCase()
    if (name.indexOf(":") >= 0) name = name.split(":").pop()
    if (result[name] !== undefined) result[name] = Number(entry.getValue())
  })
  return result
}

function dzMenuDishes(player) {
  let raw = String(player.persistentData.getString("dz_menu_dishes"))
  return raw ? raw.split("|").filter(id => id) : []
}

function dzMenuResetProgress(player) {
  player.persistentData.putString("dz_menu_dishes", "")
  ;["fruits", "grains", "proteins", "vegetables"].forEach(group => player.persistentData.putBoolean("dz_menu_group_" + group, false))
  player.persistentData.putBoolean("dz_menu_style_warm", false)
  player.persistentData.putBoolean("dz_menu_style_hearty", false)
}

function dzMenuExpire(player, announce) {
  let active = String(player.persistentData.getString("dz_menu_active"))
  if (!active) return false
  if (Date.now() - player.persistentData.getLong("dz_menu_started") <= DZ_MENU_WINDOW_MS) return false
  player.persistentData.remove("dz_menu_active")
  dzMenuResetProgress(player)
  if (announce) player.tell(Text.of("献立の制限時間30分を過ぎました。新しい献立を開始してください。").yellow())
  return true
}

function dzMenuStart(player, key) {
  let plan = DZ_MENU_PLANS[key]
  if (!plan) return 0
  let remaining = player.persistentData.getLong("dz_menu_next") - Date.now()
  if (remaining > 0) {
    player.tell(Text.of("次の献立ボーナスまで " + Math.ceil(remaining / 60000) + "分です。").red())
    return 0
  }
  player.persistentData.putString("dz_menu_active", key)
  player.persistentData.putLong("dz_menu_started", Date.now())
  dzMenuResetProgress(player)
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_MENU_QUESTS.intro)
  player.tell(Text.of(plan.name + "を開始しました。30分以内に異なる調理済み料理を3皿食べてください。").green())
  player.tell(Text.of(plan.description).gray())
  return 1
}

function dzMenuHasRequirements(player, key) {
  let plan = DZ_MENU_PLANS[key]
  if (!plan || dzMenuDishes(player).length < 3) return false
  for (let i = 0; i < plan.groups.length; i++) {
    if (!player.persistentData.getBoolean("dz_menu_group_" + plan.groups[i])) return false
  }
  return !plan.style || player.persistentData.getBoolean("dz_menu_style_" + plan.style)
}

function dzMenuSyncQuests(player) {
  ;["expedition", "recovery", "work"].forEach(key => {
    if (player.persistentData.getInt("dz_menu_complete_" + key) > 0) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_MENU_QUESTS[key])
  })
  let mastered = ["expedition", "recovery", "work"].every(key => player.persistentData.getInt("dz_menu_complete_" + key) > 0)
  if (mastered) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_MENU_QUESTS.mastery)
  if (player.persistentData.getInt("dz_menu_community_contracts") > 0) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_MENU_QUESTS.community)
  if (player.persistentData.getInt("dz_menu_colony_contracts") > 0) player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_MENU_QUESTS.colony)
  let values = dzMenuDietValues(player)
  if (["fruits", "grains", "proteins", "vegetables"].every(group => values[group] >= 0.6)) {
    player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_MENU_QUESTS.balanced)
  }
}

function dzMenuComplete(player, key) {
  let plan = DZ_MENU_PLANS[key]
  if (key === "expedition") {
    player.potionEffects.add("minecraft:speed", 9600, 0, false, false)
    player.potionEffects.add("minecraft:resistance", 3600, 0, false, false)
  } else if (key === "recovery") {
    player.potionEffects.add("minecraft:regeneration", 900, 0, false, false)
    player.potionEffects.add("minecraft:absorption", 9600, 0, false, false)
    player.potionEffects.add("farmersdelight:comfort", 9600, 0, false, false)
    if (typeof dzHealthRecordRecoveryMenu === "function") dzHealthRecordRecoveryMenu(player)
  } else if (key === "work") {
    player.potionEffects.add("minecraft:haste", 9600, 0, false, false)
    player.potionEffects.add("minecraft:saturation", 1, 0, false, false)
  }
  player.persistentData.putInt("dz_menu_complete_" + key, player.persistentData.getInt("dz_menu_complete_" + key) + 1)
  player.persistentData.putLong("dz_menu_next", Date.now() + DZ_MENU_COOLDOWN_MS)
  player.persistentData.remove("dz_menu_active")
  dzMenuResetProgress(player)
  if(global.pdzUnifiedProgressionAward)global.pdzUnifiedProgressionAward(player,'cooking',8,true)
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_MENU_QUESTS[key])
  dzMenuSyncQuests(player)
  player.tell(Text.of(plan.name + "完成。" + plan.description).gold())
}

function dzMenuRecordFood(player, stack) {
  if (!global.pdzIsPreparedMeal(stack)) return
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_MENU_QUESTS.prepared)
  dzMenuExpire(player, true)
  let active = String(player.persistentData.getString("dz_menu_active"))
  if (!active || !DZ_MENU_PLANS[active]) {
    dzMenuSyncQuests(player)
    return
  }
  let id = dzMenuFoodId(stack)
  let dishes = dzMenuDishes(player)
  if (dishes.indexOf(id) >= 0) return
  dishes.push(id)
  player.persistentData.putString("dz_menu_dishes", dishes.join("|"))
  dzMenuGroups(player, stack).forEach(group => {
    if (["fruits", "grains", "proteins", "vegetables"].indexOf(group) >= 0) player.persistentData.putBoolean("dz_menu_group_" + group, true)
  })
  if (dzMenuIsWarm(id)) player.persistentData.putBoolean("dz_menu_style_warm", true)
  if (dzMenuIsHearty(id)) player.persistentData.putBoolean("dz_menu_style_hearty", true)
  player.tell(Text.of(DZ_MENU_PLANS[active].name + "：料理 " + dishes.length + "/3 を記録（" + id + "）").aqua())
  if (dzMenuHasRequirements(player, active)) dzMenuComplete(player, active)
  else dzMenuSyncQuests(player)
}

function dzMenuPercent(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100)
}

function dzMenuStatus(player) {
  dzMenuExpire(player, true)
  let values = dzMenuDietValues(player)
  player.server.runCommandSilent("ftbquests change_progress " + player.username + " complete " + DZ_MENU_QUESTS.intro)
  player.tell(Text.of("=== PDZ 食事・献立 ===").gold())
  player.tell(Text.of("Diet  果物" + dzMenuPercent(values.fruits) + "% / 穀物" + dzMenuPercent(values.grains) + "% / タンパク質" + dzMenuPercent(values.proteins) + "% / 野菜" + dzMenuPercent(values.vegetables) + "% / 糖分" + dzMenuPercent(values.sugars) + "%").green())
  let active = String(player.persistentData.getString("dz_menu_active"))
  if (active && DZ_MENU_PLANS[active]) {
    player.tell(Text.of("進行中: " + DZ_MENU_PLANS[active].name + "｜料理 " + dzMenuDishes(player).length + "/3").aqua())
    player.tell(Text.of(DZ_MENU_PLANS[active].description).gray())
  } else {
    let remaining = Math.max(0, player.persistentData.getLong("dz_menu_next") - Date.now())
    if (remaining > 0) player.tell(Text.of("次の献立開始まで " + Math.ceil(remaining / 60000) + "分").gray())
    else player.tell(Text.of("献立を選び、30分以内に異なる料理を3皿食べます。").yellow())
  }
  Object.keys(DZ_MENU_PLANS).forEach(key => player.tell(Text.of("[" + DZ_MENU_PLANS[key].name + "] ").aqua().clickRunCommand("/deadzonemenu choose_" + key).hover(Text.of(DZ_MENU_PLANS[key].description))))
  player.tell(Text.of("[生活供給依頼]").green().clickRunCommand("/deadzonecontracts"))
  return 1
}

ItemEvents.foodEaten(event => {
  let player = event.entity
  if (!player || !player.isPlayer || !player.isPlayer() || player.level.clientSide) return
  dzMenuRecordFood(player, event.item)
  player.server.scheduleInTicks(5, callback => dzMenuSyncQuests(player))
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  let root = Commands.literal("deadzonemenu")
  root.executes(ctx => dzMenuStatus(ctx.source.player))
  root.then(Commands.literal("status").executes(ctx => dzMenuStatus(ctx.source.player)))
  Object.keys(DZ_MENU_PLANS).forEach(key => root.then(Commands.literal("choose_" + key).executes(ctx => dzMenuStart(ctx.source.player, key))))
  root.then(Commands.literal("cancel").executes(ctx => {
    let player = ctx.source.player
    player.persistentData.remove("dz_menu_active")
    dzMenuResetProgress(player)
    player.tell(Text.of("進行中の献立を取り消しました。完成クールダウンは変わりません。").yellow())
    return 1
  }))
  root.then(Commands.literal("reset_test").requires(source => source.hasPermission(2)).executes(ctx => {
    let player = ctx.source.player
    ;["expedition", "recovery", "work"].forEach(key => player.persistentData.remove("dz_menu_complete_" + key))
    ;["dz_menu_next", "dz_menu_community_contracts", "dz_menu_colony_contracts"].forEach(key => player.persistentData.remove(key))
    player.persistentData.remove("dz_menu_active")
    dzMenuResetProgress(player)
    player.tell(Text.of("個人の献立試験記録を初期化しました。Diet栄養値は変更していません。").yellow())
    return 1
  }))
  event.register(root)
})

PlayerEvents.loggedIn(event => event.player.server.scheduleInTicks(140, callback => dzMenuSyncQuests(event.player)))

console.info("[PROJECT DEADZONE][Cooking Menus] v0.1 loaded.")
