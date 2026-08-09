// PROJECT DEADZONE hydration bridge v0.1
// Connects reusable canteens and the pack's non-vanilla drinks to
// Thirst Was Taken. Vanilla bottles keep the mod's native handling.

const PDZ_HYDRATION_CAPS = Java.loadClass(
  "dev.ghen.thirst.foundation.common.capability.ModCapabilities"
)

function pdzHydrationRestore(player, amount, quenched) {
  if (!player || player.level.clientSide) return false
  try {
    let thirst = player.getCapability(PDZ_HYDRATION_CAPS.PLAYER_THIRST)
      .resolve().orElse(null)
    if (!thirst) return false
    let oldThirst = Number(thirst.getThirst())
    let oldQuenched = Number(thirst.getQuenched())
    thirst.setThirst(Math.min(20, oldThirst + amount))
    thirst.setQuenched(Math.min(20, oldQuenched + quenched))
    thirst.updateThirstData(player)
    return Number(thirst.getThirst()) > oldThirst || Number(thirst.getQuenched()) > oldQuenched
  } catch (ignored) {
    return false
  }
}

function pdzCanteenHydration(id) {
  if (id.indexOf("simply_canteens:") !== 0) return 0
  if (id.indexOf("full_") < 0 && id.indexOf("half_full_") < 0 &&
      id.indexOf("one_") < 0 && id.indexOf("two_") < 0 &&
      id.indexOf("three_") < 0 && id.indexOf("four_") < 0) return 0
  if (id.indexOf("diamond") >= 0) return 6
  if (id.indexOf("gold") >= 0) return 5
  if (id.indexOf("iron") >= 0) return 4
  return 3
}

// Simply Canteens uses right-click state transitions instead of ordinary food
// consumption, so it needs its own bridge.
ItemEvents.rightClicked(event => {
  let player = event.player
  if (!player || player.level.clientSide) return
  let id = String(event.item.id)
  let amount = pdzCanteenHydration(id)
  if (amount <= 0) return
  let ready = player.persistentData.getInt("pdz_canteen_hydration_ready")
  if (player.age < ready) return
  player.persistentData.putInt("pdz_canteen_hydration_ready", player.age + 12)
  if (pdzHydrationRestore(player, amount, amount * 0.75)) {
    player.runCommandSilent("playsound minecraft:entity.generic.drink player @s ~ ~ ~ 0.35 1.1")
  }
})

function pdzDrinkHydration(id) {
  // Apocalypse Now survival drinks.
  if (id === "apocalypsenow:water" || id === "apocalypsenow:canned_water") return 5
  if (id === "apocalypsenow:military_canteen" || id === "apocalypsenow:iron_canteen") return 5
  if (id === "apocalypsenow:contaminated_water") return 2
  if (id.indexOf("apocalypsenow:") === 0) {
    if (id.indexOf("juice") >= 0) return 3
    if (id.indexOf("soda") >= 0 || id.indexOf("energy_drink") >= 0) return 2
    if (id.indexOf("coffee") >= 0 || id.indexOf("beer") >= 0) return 1
  }
  // Farmer's Delight and Pam's drink families. These were food-only before
  // this bridge, which made crafted drinks inferior to a plain water bottle.
  if (id === "farmersdelight:melon_juice" || id === "farmersdelight:milk_bottle") return 3
  if (id.indexOf("pamhc2food") === 0) {
    if (id.indexOf("freshwater") >= 0 || id.indexOf("juiceitem") >= 0) return 3
    if (id.indexOf("teaitem") >= 0 || id.indexOf("sodaitem") >= 0 ||
        id.indexOf("coffee") >= 0 || id.indexOf("energydrink") >= 0 ||
        id.indexOf("milkitem") >= 0 || id.indexOf("hotchocolate") >= 0) return 2
  }
  return 0
}

ItemEvents.foodEaten(event => {
  let player = event.entity
  if (!player || !player.isPlayer() || player.level.clientSide) return
  let id = String(event.item.id)
  let amount = pdzDrinkHydration(id)
  if (amount <= 0) return
  pdzHydrationRestore(player, amount, Math.max(1, amount * 0.5))
})

ServerEvents.commandRegistry(event => {
  const {commands: Commands} = event
  event.register(Commands.literal("deadzonehydration")
    .then(Commands.literal("status").executes(ctx => {
      let p = ctx.source.player
      try {
        let thirst = p.getCapability(PDZ_HYDRATION_CAPS.PLAYER_THIRST).resolve().orElse(null)
        if (!thirst) return 0
        p.tell(Text.of("水分 " + thirst.getThirst() + "/20 / 潤い " + thirst.getQuenched() + "/20").aqua())
        return 1
      } catch (ignored) { return 0 }
    }))
    .then(Commands.literal("give_test").requires(s => s.hasPermission(2)).executes(ctx => {
      let p = ctx.source.player
      p.give(Item.of("simply_canteens:full_copper_canteen"))
      p.give(Item.of("apocalypsenow:canned_water", 2))
      p.give(Item.of("farmersdelight:melon_juice", 2))
      p.tell(Text.of("水分連携テスト飲料を支給しました。").green())
      return 1
    })))
})
