// PROJECT DEADZONE life quality lot tooltips v0.1

ItemEvents.tooltip(event => {
  event.add("kubejs:seasonal_supply_lot_standard", [
    Text.gray("旬の供給品 3種類 x6 を検品したロット"),
    Text.darkGray("/deadzonecontracts でマヤへ納品")
  ])
  event.add("kubejs:seasonal_supply_lot_select", [
    Text.green("旬の供給品 5種類 x8 を検品したロット"),
    Text.darkGray("標準よりMoney・XP・Supply評判が増加")
  ])
  event.add("kubejs:seasonal_supply_lot_prime", [
    Text.aqua("旬の供給品 7種類 x10 を検品した最高等級"),
    Text.darkGray("MineColonies料理を含む特選報酬")
  ])
  event.add("kubejs:catch_lot_standard", [
    Text.gray("異なる3魚種を検品した漁獲ロット"),
    Text.darkGray("Fillet加工前の魚を使用")
  ])
  event.add("kubejs:catch_lot_select", [
    Text.green("異なる5魚種を検品した漁獲ロット"),
    Text.darkGray("複数の水域を使うと揃えやすい")
  ])
  event.add("kubejs:catch_lot_prime", [
    Text.aqua("異なる7魚種＋希少魚2種の最高等級"),
    Text.darkGray("MineColonies料理を含む特選報酬")
  ])
})

